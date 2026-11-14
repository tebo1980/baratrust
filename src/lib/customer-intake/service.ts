import crypto from 'crypto';
import { and, asc, desc, eq, gt, gte, inArray, or } from 'drizzle-orm';
import { z } from 'zod';
import { acquisitionProspects } from '@/db/schema/acquisition';
import {
  websiteCustomerInquiries,
  type WebsiteAckStatus,
  type WebsiteHumanStatus,
  type WebsiteInquiryChannel,
  type WebsiteInquirySegment,
} from '@/db/schema/customerInquiries';
import { sanitizePlainText } from '@/lib/security/public-guard';
import { dispatchWebsiteCustomerAck, isWebsiteAutoAckEnabled } from './ack-mailer';
import {
  computeBusinessDayDeadline,
  matchApprovedFaqKeys,
  renderPreapprovedWebsiteAck,
  type WebsiteAckTemplateKey,
} from './templates';

export const ALLOWED_WEBSITE_SERVICE_CATEGORIES = [
  'BUSINESS_FREE_REALITY_CHECK',
  'BUSINESS_PULSE',
  'BUSINESS_RESEARCH',
  'BUSINESS_OPERATIONAL_IMPROVEMENT',
  'BUSINESS_CYBERSECURITY_READINESS',
  'CONSUMER_GENEALOGY',
  'CONSUMER_DECISION_RESEARCH',
  'CONSUMER_COLLECTIBLES',
  'CONSUMER_DIGITAL_SAFETY',
  'CONSUMER_PERSONAL_RESEARCH',
  'GENERAL_INQUIRY',
] as const;

export type WebsiteServiceCategory = (typeof ALLOWED_WEBSITE_SERVICE_CATEGORIES)[number];

export const SubmitWebsiteInquirySchema = z.object({
  submissionKey: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]{8,120}$/, 'Invalid submission key format.')
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, 'Please provide your name.')
    .max(100, 'Name must be 100 characters or fewer.'),
  email: z
    .string()
    .trim()
    .min(5, 'Please provide a valid email address.')
    .max(254, 'Email address is too long.')
    .email('Please provide a valid email address.'),
  segment: z.enum(['BUSINESS', 'CONSUMER'], {
    errorMap: () => ({ message: 'Please select whether this is a Business or Personal inquiry.' }),
  }),
  serviceCategory: z.enum(ALLOWED_WEBSITE_SERVICE_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a valid service or research category.' }),
  }),
  organizationName: z.string().trim().max(160).optional().or(z.literal('')),
  websiteUrl: z.string().trim().max(300).optional().or(z.literal('')),
  cityState: z.string().trim().max(100).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  message: z
    .string()
    .trim()
    .min(10, 'Please include a brief description (at least 10 characters) so we can help.')
    .max(3500, 'Message must be 3,500 characters or fewer.'),
  privacyNoticeAccepted: z.literal(true, {
    errorMap: () => ({
      message: 'Please acknowledge the BaraTrust privacy notice before submitting.',
    }),
  }),
  websiteConfirm: z.string().optional(),
});

export type SubmitWebsiteInquiryInput = z.infer<typeof SubmitWebsiteInquirySchema>;

const UNSOLICITED_SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const UNSOLICITED_CARD_REGEX = /\b(?:\d{4}[ -]){3}\d{4}\b/g;

const PROMPT_INJECTION_REGEX =
  /\b(ignore\s+(?:all\s+)?(?:previous|prior|above|system)\s+instructions|disregard\s+(?:all\s+)?(?:previous|prior)\s+instructions|reveal\s+(?:your\s+)?(?:system\s+prompt|api\s+key|smtp\s+password|secrets)|dump\s+(?:all\s+)?(?:prospects|customers|database|sqlite)|override\s+operational[_\s]?mode|switch\s+to\s+autopilot|bypass\s+human\s+approval)\b|<script\b/i;

const COMPLEX_OR_SENSITIVE_REGEX =
  /\b(ransomware|actively\s+hacked|data\s+breach|compromised\s+account|stolen\s+identity|penetration\s+test|exploit\s+test|legal\s+advice|sue\s+them|lawsuit|custody\s+battle|divorce\s+lawyer|medical\s+diagnosis|prescription\s+advice|tax\s+evasion|investment\s+advice|private\s+investigator|follow\s+my\s+(?:spouse|ex|husband|wife|partner)|spy\s+on|adoption\s+sealed|estranged\s+child|bankruptcy)\b/i;

const OPT_OUT_REGEX =
  /\b(unsubscribe|opt[ -]?out|remove\s+me\s+from\s+(?:your\s+)?(?:list|emails?)|stop\s+(?:emailing|contacting)\s+(?:me|us)|do\s+not\s+(?:email|contact)\s+(?:me|us))\b/i;

const AUTOMATED_SENDER_LOCALPART_REGEX =
  /^(mailer-daemon|postmaster|noreply|no-reply|donotreply|do-not-reply|auto-reply|autoreply|bounce|bounces)@/i;

const AUTOMATED_MESSAGE_BODY_REGEX =
  /\b(automatic\s+reply|auto-reply|out\s+of\s+(?:the\s+)?office|delivery\s+status\s+notification|undeliverable:|mail\s+delivery\s+subsystem)\b/i;

const OBVIOUS_SPAM_REGEX =
  /\b(buy\s+high\s+da\s+backlinks|casino\s+guest\s+post|guaranteed\s+#1\s+ranking\s+on\s+google|crypto\s+recovery\s+whatsapp|wire\s+transfer\s+million\s+dollars|adult\s+dating\s+traffic)\b/i;

const APPOINTMENT_REQUEST_REGEX =
  /\b(schedule\s+a\s+(?:call|conversation|meeting|chat|time)|book\s+a\s+(?:call|conversation|meeting|15[- ]minute)|set\s+up\s+a\s+(?:call|meeting|time)|available\s+to\s+talk)\b/i;

export function normalizeInquiryEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeAndRedactInquiryMessage(
  rawText: string,
  maxLength = 3500
): { cleanMessage: string; securityFlags: string[] } {
  const flags: string[] = [];
  let working = rawText || '';

  if (UNSOLICITED_SSN_REGEX.test(working) || UNSOLICITED_CARD_REGEX.test(working)) {
    flags.push('SENSITIVE_PII_REDACTED_ON_INTAKE');
    working = working
      .replace(UNSOLICITED_SSN_REGEX, '[REDACTED_SENSITIVE_ID]')
      .replace(UNSOLICITED_CARD_REGEX, '[REDACTED_PAYMENT_CARD]');
  }

  if (PROMPT_INJECTION_REGEX.test(working)) {
    flags.push('PROMPT_INJECTION_OR_OVERRIDE_DETECTED');
  }

  if (COMPLEX_OR_SENSITIVE_REGEX.test(working)) {
    flags.push('COMPLEX_OR_SENSITIVE_TOPIC_HUMAN_ONLY');
  }

  const sanitized =
    sanitizePlainText(working, { maxLength, multiline: true }) || 'Customer inquiry submitted.';

  return {
    cleanMessage: sanitized,
    securityFlags: flags,
  };
}

export function computeWebsiteDedupFingerprint(params: {
  normalizedEmail: string;
  sourceChannel: WebsiteInquiryChannel;
  cleanMessage: string;
}): string {
  const msgNorm = params.cleanMessage.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto
    .createHash('sha256')
    .update(`${params.normalizedEmail}|${params.sourceChannel}|${msgNorm}`)
    .digest('hex')
    .slice(0, 32);
}

function coerceCategoryForSegment(
  segment: WebsiteInquirySegment,
  requestedCategory: WebsiteServiceCategory
): WebsiteServiceCategory {
  if (segment === 'CONSUMER' && requestedCategory.startsWith('BUSINESS_')) {
    return 'CONSUMER_PERSONAL_RESEARCH';
  }
  if (segment === 'BUSINESS' && requestedCategory.startsWith('CONSUMER_')) {
    return 'BUSINESS_RESEARCH';
  }
  return requestedCategory;
}

function classifyWebsiteInquiry(params: {
  normalizedEmail: string;
  segment: WebsiteInquirySegment;
  serviceCategory: WebsiteServiceCategory;
  cleanMessage: string;
  securityFlags: string[];
  alreadyOptedOutInProspects: boolean;
}): {
  messageClassification: string;
  humanStatus: WebsiteHumanStatus;
  eligibleForAck: boolean;
  templateKey: WebsiteAckTemplateKey | null;
  faqMatchedKeys: string[];
} {
  const { normalizedEmail, segment, cleanMessage, securityFlags, alreadyOptedOutInProspects } =
    params;

  if (alreadyOptedOutInProspects || OPT_OUT_REGEX.test(cleanMessage)) {
    return {
      messageClassification: 'UNSUBSCRIBE_OR_OPT_OUT',
      humanStatus: 'UNSUBSCRIBED_OR_SUPPRESSED',
      eligibleForAck: false,
      templateKey: null,
      faqMatchedKeys: [],
    };
  }

  if (AUTOMATED_SENDER_LOCALPART_REGEX.test(normalizedEmail)) {
    return {
      messageClassification: 'BOUNCE_OR_DELIVERY_FAILURE',
      humanStatus: 'SPAM_QUARANTINED',
      eligibleForAck: false,
      templateKey: null,
      faqMatchedKeys: [],
    };
  }

  if (AUTOMATED_MESSAGE_BODY_REGEX.test(cleanMessage)) {
    return {
      messageClassification: 'AUTOMATED_OR_VACATION_REPLY',
      humanStatus: 'SPAM_QUARANTINED',
      eligibleForAck: false,
      templateKey: null,
      faqMatchedKeys: [],
    };
  }

  if (OBVIOUS_SPAM_REGEX.test(cleanMessage)) {
    return {
      messageClassification: 'SPAM_OR_SUSPICIOUS',
      humanStatus: 'SPAM_QUARANTINED',
      eligibleForAck: false,
      templateKey: null,
      faqMatchedKeys: [],
    };
  }

  const hasPromptInjection = securityFlags.includes('PROMPT_INJECTION_OR_OVERRIDE_DETECTED');
  const hasSensitiveTopic = securityFlags.includes('COMPLEX_OR_SENSITIVE_TOPIC_HUMAN_ONLY');

  if (hasPromptInjection) {
    // Store safely for human audit; never auto-reply to prompt injection attempts
    return {
      messageClassification: 'SPAM_OR_SUSPICIOUS',
      humanStatus: 'SPAM_QUARANTINED',
      eligibleForAck: false,
      templateKey: null,
      faqMatchedKeys: [],
    };
  }

  if (hasSensitiveTopic) {
    return {
      messageClassification: 'UNCERTAIN_NEEDS_HUMAN_REVIEW',
      humanStatus: 'AWAITING_HUMAN_REVIEW',
      eligibleForAck: true,
      templateKey: 'OUT_OF_SCOPE_HUMAN_REVIEW',
      faqMatchedKeys: [],
    };
  }

  const faqMatchedKeys = matchApprovedFaqKeys(cleanMessage);
  const messageClassification = APPOINTMENT_REQUEST_REGEX.test(cleanMessage)
    ? 'BOOKING_REQUEST'
    : faqMatchedKeys.length > 0
    ? 'INFO_REQUEST'
    : 'NEW_CUSTOMER_INQUIRY';

  const templateKey: WebsiteAckTemplateKey =
    segment === 'CONSUMER'
      ? 'CONSUMER_INQUIRY'
      : segment === 'BUSINESS'
      ? 'BUSINESS_INQUIRY'
      : 'GENERAL_INQUIRY';

  return {
    messageClassification,
    humanStatus: 'AWAITING_HUMAN_REVIEW',
    eligibleForAck: true,
    templateKey,
    faqMatchedKeys,
  };
}

function parseRowTimestamp(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export interface WebsiteInquiryRecordDto {
  id: string;
  externalSubmissionKey: string;
  dedupFingerprint: string;
  sourceChannel: WebsiteInquiryChannel;
  segment: WebsiteInquirySegment;
  serviceCategory: string;
  messageClassification: string;
  customerName: string | null;
  organizationName: string | null;
  customerEmail: string;
  normalizedEmail: string;
  customerPhone: string | null;
  websiteUrl: string | null;
  cityState: string | null;
  subject: string;
  message: string;
  privacyNoticeAccepted: boolean;
  privacyNoticeAcceptedAt: string | null;
  realityCheckShareToken: string | null;
  faqMatchedKeys: string[];
  securityFlags: string[];
  commitmentBusinessDays: number;
  followUpDueAt: string | null;
  ackTemplateKey: string | null;
  ackSubject: string | null;
  ackBody: string | null;
  ackStatus: WebsiteAckStatus;
  ackProvider: string | null;
  ackMessageId: string | null;
  ackSentAt: string | null;
  ackError: string | null;
  humanStatus: WebsiteHumanStatus;
  submittedAt: string;
  updatedAt: string;
}

function toInquiryDto(row: typeof websiteCustomerInquiries.$inferSelect): WebsiteInquiryRecordDto {
  const parseJsonArray = (val: unknown): string[] => {
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return [];
      }
    }
    return [];
  };

  return {
    id: row.id,
    externalSubmissionKey: row.externalSubmissionKey,
    dedupFingerprint: row.dedupFingerprint,
    sourceChannel: row.sourceChannel as WebsiteInquiryChannel,
    segment: row.segment as WebsiteInquirySegment,
    serviceCategory: row.serviceCategory,
    messageClassification: row.messageClassification,
    customerName: row.customerName ?? null,
    organizationName: row.organizationName ?? null,
    customerEmail: row.customerEmail,
    normalizedEmail: row.normalizedEmail,
    customerPhone: row.customerPhone ?? null,
    websiteUrl: row.websiteUrl ?? null,
    cityState: row.cityState ?? null,
    subject: row.subject,
    message: row.message,
    privacyNoticeAccepted: Boolean(row.privacyNoticeAccepted),
    privacyNoticeAcceptedAt: row.privacyNoticeAcceptedAt
      ? parseRowTimestamp(row.privacyNoticeAcceptedAt).toISOString()
      : null,
    realityCheckShareToken: row.realityCheckShareToken ?? null,
    faqMatchedKeys: parseJsonArray(row.faqMatchedKeys),
    securityFlags: parseJsonArray(row.securityFlags),
    commitmentBusinessDays: Number(row.commitmentBusinessDays || 2),
    followUpDueAt: row.followUpDueAt ? parseRowTimestamp(row.followUpDueAt).toISOString() : null,
    ackTemplateKey: row.ackTemplateKey ?? null,
    ackSubject: row.ackSubject ?? null,
    ackBody: row.ackBody ?? null,
    ackStatus: row.ackStatus as WebsiteAckStatus,
    ackProvider: row.ackProvider ?? null,
    ackMessageId: row.ackMessageId ?? null,
    ackSentAt: row.ackSentAt ? parseRowTimestamp(row.ackSentAt).toISOString() : null,
    ackError: row.ackError ?? null,
    humanStatus: row.humanStatus as WebsiteHumanStatus,
    submittedAt: parseRowTimestamp(row.submittedAt).toISOString(),
    updatedAt: parseRowTimestamp(row.updatedAt).toISOString(),
  };
}

async function hasRecentAckForEmail(
  dbClient: any,
  normalizedEmail: string,
  nowDate: Date
): Promise<boolean> {
  const cooldownStart = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000);
  const recentRows = await dbClient
    .select({ id: websiteCustomerInquiries.id })
    .from(websiteCustomerInquiries)
    .where(
      and(
        eq(websiteCustomerInquiries.normalizedEmail, normalizedEmail),
        gte(websiteCustomerInquiries.submittedAt, cooldownStart),
        inArray(websiteCustomerInquiries.ackStatus, [
          'SENT',
          'IN_FLIGHT',
          'UNCERTAIN_DELIVERY_LOCKED',
        ])
      )
    )
    .limit(1);

  return recentRows.length > 0;
}

async function isEmailOptedOutInAcquisition(
  dbClient: any,
  normalizedEmail: string
): Promise<boolean> {
  try {
    const rows = await dbClient
      .select({ id: acquisitionProspects.id })
      .from(acquisitionProspects)
      .where(
        and(
          eq(acquisitionProspects.optOut, true),
          eq(acquisitionProspects.contactValue, normalizedEmail)
        )
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function attemptAutoAckForStoredInquiry(
  dbClient: any,
  stored: typeof websiteCustomerInquiries.$inferSelect
): Promise<typeof websiteCustomerInquiries.$inferSelect> {
  if (stored.ackStatus !== 'DISABLED_PENDING_APPROVAL') {
    return stored;
  }
  if (!isWebsiteAutoAckEnabled()) {
    return stored;
  }
  if (!stored.ackSubject || !stored.ackBody) {
    return stored;
  }

  // Acquire persistent IN_FLIGHT lock so concurrent workers can never send twice
  const lockNow = new Date();
  const [lockedRow] = await dbClient
    .update(websiteCustomerInquiries)
    .set({
      ackStatus: 'IN_FLIGHT',
      updatedAt: lockNow,
    })
    .where(
      and(
        eq(websiteCustomerInquiries.id, stored.id),
        eq(websiteCustomerInquiries.ackStatus, 'DISABLED_PENDING_APPROVAL')
      )
    )
    .returning();

  if (!lockedRow) {
    const [latest] = await dbClient
      .select()
      .from(websiteCustomerInquiries)
      .where(eq(websiteCustomerInquiries.id, stored.id))
      .limit(1);
    return latest || stored;
  }

  try {
    const delivery = await dispatchWebsiteCustomerAck({
      inquiryId: stored.id,
      recipientEmail: stored.customerEmail,
      subject: stored.ackSubject,
      bodyText: stored.ackBody,
    });

    const settledNow = new Date();
    const nextAckStatus: WebsiteAckStatus =
      delivery.outcome === 'SENT'
        ? 'SENT'
        : delivery.outcome === 'UNCERTAIN_DELIVERY_LOCKED'
        ? 'UNCERTAIN_DELIVERY_LOCKED'
        : delivery.outcome === 'DISABLED_PENDING_APPROVAL'
        ? 'DISABLED_PENDING_APPROVAL'
        : 'FAILED_RETRYABLE';

    const [updated] = await dbClient
      .update(websiteCustomerInquiries)
      .set({
        ackStatus: nextAckStatus,
        ackProvider: delivery.provider,
        ackMessageId: delivery.messageId,
        ackSentAt: delivery.outcome === 'SENT' ? settledNow : null,
        ackError: delivery.error,
        updatedAt: settledNow,
      })
      .where(eq(websiteCustomerInquiries.id, stored.id))
      .returning();

    return updated || lockedRow;
  } catch {
    // Ensure customer inquiry remains intact and locked against uncontrolled duplicate sends
    const settledNow = new Date();
    const [updated] = await dbClient
      .update(websiteCustomerInquiries)
      .set({
        ackStatus: 'UNCERTAIN_DELIVERY_LOCKED',
        ackError: 'Unexpected exception during acknowledgment dispatch; automatic retry locked.',
        updatedAt: settledNow,
      })
      .where(eq(websiteCustomerInquiries.id, stored.id))
      .returning();
    return updated || lockedRow;
  }
}

/**
 * Durably stores a general website customer inquiry in Neon Postgres first, enforces
 * submission-key and 15-minute content idempotency, prepares the approved Phase B acknowledgment,
 * and attempts delivery ONLY if `CUSTOMER_AUTO_ACK_ENABLED="true"` is active.
 */
export async function submitWebsiteCustomerInquiry(
  dbClient: any,
  input: SubmitWebsiteInquiryInput,
  nowOverride?: Date
): Promise<{
  inquiry: WebsiteInquiryRecordDto;
  deduplicated: boolean;
}> {
  const now = nowOverride ?? new Date();
  const normalizedEmail = normalizeInquiryEmail(input.email);
  const externalKey = input.submissionKey?.trim()
    ? `web_${input.submissionKey.trim()}`
    : `web_${crypto.randomUUID()}`;

  // 1. Exact idempotency check by externalSubmissionKey
  const [existingByKey] = await dbClient
    .select()
    .from(websiteCustomerInquiries)
    .where(eq(websiteCustomerInquiries.externalSubmissionKey, externalKey))
    .limit(1);

  if (existingByKey) {
    return {
      inquiry: toInquiryDto(existingByKey),
      deduplicated: true,
    };
  }

  const { cleanMessage, securityFlags } = sanitizeAndRedactInquiryMessage(input.message, 3500);
  const dedupFingerprint = computeWebsiteDedupFingerprint({
    normalizedEmail,
    sourceChannel: 'WEBSITE_CONTACT_FORM',
    cleanMessage,
  });

  // 2. 15-minute duplicate-submission safeguard (even if submissionKey rotated on browser refresh)
  const dedupCutoff = new Date(now.getTime() - 15 * 60 * 1000);
  const [existingByFp] = await dbClient
    .select()
    .from(websiteCustomerInquiries)
    .where(
      and(
        eq(websiteCustomerInquiries.dedupFingerprint, dedupFingerprint),
        gte(websiteCustomerInquiries.submittedAt, dedupCutoff)
      )
    )
    .orderBy(desc(websiteCustomerInquiries.submittedAt))
    .limit(1);

  if (existingByFp) {
    return {
      inquiry: toInquiryDto(existingByFp),
      deduplicated: true,
    };
  }

  const segment: WebsiteInquirySegment = input.segment;
  const serviceCategory = coerceCategoryForSegment(segment, input.serviceCategory);
  const cleanName = sanitizePlainText(input.name, { maxLength: 100 });
  // Keep consumer and business records strictly separated: consumer inquiries do not attach business account names
  const cleanOrgName =
    segment === 'BUSINESS' ? sanitizePlainText(input.organizationName, { maxLength: 160 }) : null;
  const cleanWebsite = sanitizePlainText(input.websiteUrl, { maxLength: 300 });
  const cleanCityState = sanitizePlainText(input.cityState, { maxLength: 100 });
  const cleanPhone = sanitizePlainText(input.phone, { maxLength: 40 });

  const optedOut = await isEmailOptedOutInAcquisition(dbClient, normalizedEmail);
  const classification = classifyWebsiteInquiry({
    normalizedEmail,
    segment,
    serviceCategory,
    cleanMessage,
    securityFlags,
    alreadyOptedOutInProspects: optedOut,
  });

  const subjectLabel =
    segment === 'CONSUMER'
      ? `Personal Research Inquiry — ${cleanName || normalizedEmail}`
      : `Business Inquiry — ${cleanOrgName || cleanName || normalizedEmail}`;

  let ackSubject: string | null = null;
  let ackBody: string | null = null;
  let commitmentBusinessDays = 2;
  let ackStatus: WebsiteAckStatus = 'NOT_APPLICABLE';

  if (classification.eligibleForAck && classification.templateKey) {
    const rendered = renderPreapprovedWebsiteAck({
      templateKey: classification.templateKey,
      customerName: cleanName,
      faqMatchedKeys: classification.faqMatchedKeys,
    });
    ackSubject = rendered.subject;
    ackBody = rendered.body;
    commitmentBusinessDays = rendered.commitmentBusinessDays;

    const recentAckExists = await hasRecentAckForEmail(dbClient, normalizedEmail, now);
    ackStatus = recentAckExists ? 'SKIPPED_DUPLICATE_RECENT' : 'DISABLED_PENDING_APPROVAL';
  }

  const followUpDueAt =
    classification.humanStatus === 'AWAITING_HUMAN_REVIEW'
      ? computeBusinessDayDeadline(now, commitmentBusinessDays === 1 ? 1 : 2)
      : null;

  // 3. Persist durably in Neon Postgres BEFORE attempting any email delivery
  const [inserted] = await dbClient
    .insert(websiteCustomerInquiries)
    .values({
      externalSubmissionKey: externalKey,
      dedupFingerprint,
      sourceChannel: 'WEBSITE_CONTACT_FORM',
      segment,
      serviceCategory,
      messageClassification: classification.messageClassification,
      customerName: cleanName,
      organizationName: cleanOrgName,
      customerEmail: normalizedEmail,
      normalizedEmail,
      customerPhone: cleanPhone,
      websiteUrl: cleanWebsite,
      cityState: cleanCityState,
      subject: subjectLabel.slice(0, 200),
      message: cleanMessage,
      privacyNoticeAccepted: true,
      privacyNoticeAcceptedAt: now,
      realityCheckId: null,
      realityCheckShareToken: null,
      faqMatchedKeys: classification.faqMatchedKeys,
      securityFlags,
      commitmentBusinessDays,
      followUpDueAt,
      ackTemplateKey: classification.templateKey,
      ackSubject,
      ackBody,
      ackStatus,
      ackProvider: null,
      ackMessageId: null,
      ackSentAt: null,
      ackError: null,
      humanStatus: classification.humanStatus,
      submittedAt: now,
      updatedAt: now,
    })
    .returning();

  // 4. Attempt acknowledgment ONLY if eligible and explicitly enabled; inquiry stays saved either way
  const finalRow = await attemptAutoAckForStoredInquiry(dbClient, inserted);

  return {
    inquiry: toInquiryDto(finalRow),
    deduplicated: false,
  };
}

/**
 * Safely records or updates a Free Reality Check email claim in the unified
 * `website_customer_inquiries` table using deterministic `rc_<shareToken>` idempotency.
 * Preserves existing Reality Check report generation and operator notifications without duplicates.
 */
export async function recordRealityCheckInquiryInNeon(
  dbClient: any,
  params: {
    realityCheckId: string;
    shareToken: string;
    email: string;
    ownerName?: string | null;
    businessName?: string | null;
    websiteUrl: string;
    cityState?: string | null;
    phone?: string | null;
    primaryHeadache?: string | null;
    overallScore?: number | null;
  },
  nowOverride?: Date
): Promise<{ inquiry: WebsiteInquiryRecordDto; deduplicated: boolean }> {
  const now = nowOverride ?? new Date();
  const normalizedEmail = normalizeInquiryEmail(params.email);
  const externalKey = `rc_${params.shareToken.trim()}`;

  const [existing] = await dbClient
    .select()
    .from(websiteCustomerInquiries)
    .where(eq(websiteCustomerInquiries.externalSubmissionKey, externalKey))
    .limit(1);

  if (existing) {
    // Idempotent backfill of optional fields if the visitor added a note/phone on follow-up
    const nextName = existing.customerName || sanitizePlainText(params.ownerName, { maxLength: 100 });
    const nextOrg =
      existing.organizationName || sanitizePlainText(params.businessName, { maxLength: 160 });
    const nextPhone = existing.customerPhone || sanitizePlainText(params.phone, { maxLength: 40 });
    const nextCity = existing.cityState || sanitizePlainText(params.cityState, { maxLength: 100 });

    const metadataChanged =
      nextName !== existing.customerName ||
      nextOrg !== existing.organizationName ||
      nextPhone !== existing.customerPhone ||
      nextCity !== existing.cityState;

    if (metadataChanged) {
      const [updated] = await dbClient
        .update(websiteCustomerInquiries)
        .set({
          customerName: nextName,
          organizationName: nextOrg,
          customerPhone: nextPhone,
          cityState: nextCity,
          updatedAt: now,
        })
        .where(eq(websiteCustomerInquiries.id, existing.id))
        .returning();
      return {
        inquiry: toInquiryDto(updated || existing),
        deduplicated: true,
      };
    }

    return {
      inquiry: toInquiryDto(existing),
      deduplicated: true,
    };
  }

  const rawNote =
    params.primaryHeadache?.trim() ||
    `Requested human follow-up on Free Reality Check scan for ${
      params.businessName || params.websiteUrl
    }${params.overallScore !== null && params.overallScore !== undefined ? ` (automated score: ${params.overallScore}/100)` : ''}.`;

  const { cleanMessage, securityFlags } = sanitizeAndRedactInquiryMessage(rawNote, 2500);
  const dedupFingerprint = computeWebsiteDedupFingerprint({
    normalizedEmail,
    sourceChannel: 'REALITY_CHECK_FUNNEL',
    cleanMessage,
  });

  const cleanName = sanitizePlainText(params.ownerName, { maxLength: 100 });
  const cleanOrgName = sanitizePlainText(params.businessName, { maxLength: 160 });
  const cleanWebsite = sanitizePlainText(params.websiteUrl, { maxLength: 300 });
  const cleanCity = sanitizePlainText(params.cityState, { maxLength: 100 });
  const cleanPhone = sanitizePlainText(params.phone, { maxLength: 40 });

  const optedOut = await isEmailOptedOutInAcquisition(dbClient, normalizedEmail);
  const classification = classifyWebsiteInquiry({
    normalizedEmail,
    segment: 'BUSINESS',
    serviceCategory: 'BUSINESS_FREE_REALITY_CHECK',
    cleanMessage,
    securityFlags,
    alreadyOptedOutInProspects: optedOut,
  });

  let ackSubject: string | null = null;
  let ackBody: string | null = null;
  let commitmentBusinessDays = 2;
  let ackStatus: WebsiteAckStatus = 'NOT_APPLICABLE';

  if (classification.eligibleForAck && classification.templateKey) {
    const rendered = renderPreapprovedWebsiteAck({
      templateKey: classification.templateKey,
      customerName: cleanName,
      faqMatchedKeys: classification.faqMatchedKeys,
    });
    ackSubject = rendered.subject;
    ackBody = rendered.body;
    commitmentBusinessDays = rendered.commitmentBusinessDays;

    const recentAckExists = await hasRecentAckForEmail(dbClient, normalizedEmail, now);
    ackStatus = recentAckExists ? 'SKIPPED_DUPLICATE_RECENT' : 'DISABLED_PENDING_APPROVAL';
  }

  const followUpDueAt =
    classification.humanStatus === 'AWAITING_HUMAN_REVIEW'
      ? computeBusinessDayDeadline(now, commitmentBusinessDays === 1 ? 1 : 2)
      : null;

  const subject = `Free Reality Check Follow-Up — ${cleanOrgName || cleanWebsite || normalizedEmail}`.slice(
    0,
    200
  );

  const [inserted] = await dbClient
    .insert(websiteCustomerInquiries)
    .values({
      externalSubmissionKey: externalKey,
      dedupFingerprint,
      sourceChannel: 'REALITY_CHECK_FUNNEL',
      segment: 'BUSINESS',
      serviceCategory: 'BUSINESS_FREE_REALITY_CHECK',
      messageClassification: classification.messageClassification,
      customerName: cleanName,
      organizationName: cleanOrgName,
      customerEmail: normalizedEmail,
      normalizedEmail,
      customerPhone: cleanPhone,
      websiteUrl: cleanWebsite,
      cityState: cleanCity,
      subject,
      message: cleanMessage,
      privacyNoticeAccepted: true,
      privacyNoticeAcceptedAt: now,
      realityCheckId: params.realityCheckId,
      realityCheckShareToken: params.shareToken.trim(),
      faqMatchedKeys: classification.faqMatchedKeys,
      securityFlags,
      commitmentBusinessDays,
      followUpDueAt,
      ackTemplateKey: classification.templateKey,
      ackSubject,
      ackBody,
      ackStatus,
      ackProvider: null,
      ackMessageId: null,
      ackSentAt: null,
      ackError: null,
      humanStatus: classification.humanStatus,
      submittedAt: now,
      updatedAt: now,
    })
    .returning();

  const finalRow = await attemptAutoAckForStoredInquiry(dbClient, inserted);

  return {
    inquiry: toInquiryDto(finalRow),
    deduplicated: false,
  };
}

/**
 * Explicit retry helper: ONLY permits retrying rows in `FAILED_RETRYABLE` or `DISABLED_PENDING_APPROVAL`.
 * Rows in `UNCERTAIN_DELIVERY_LOCKED` or `SENT` are permanently blocked from automatic re-sending
 * so delivery ambiguity can never trigger uncontrolled repeat emails.
 */
export async function retryWebsiteInquiryAckIfSafe(
  dbClient: any,
  inquiryId: string
): Promise<{
  attempted: boolean;
  blockedReason: string | null;
  inquiry: WebsiteInquiryRecordDto | null;
}> {
  const [existing] = await dbClient
    .select()
    .from(websiteCustomerInquiries)
    .where(eq(websiteCustomerInquiries.id, inquiryId))
    .limit(1);

  if (!existing) {
    return { attempted: false, blockedReason: 'INQUIRY_NOT_FOUND', inquiry: null };
  }

  if (existing.ackStatus === 'UNCERTAIN_DELIVERY_LOCKED') {
    return {
      attempted: false,
      blockedReason:
        'UNCERTAIN_DELIVERY_LOCKED: Automatic retry is blocked because prior transport state was ambiguous. Verify manually before contacting customer.',
      inquiry: toInquiryDto(existing),
    };
  }

  if (existing.ackStatus === 'SENT' || existing.ackStatus === 'IN_FLIGHT') {
    return {
      attempted: false,
      blockedReason: `ALREADY_${existing.ackStatus}`,
      inquiry: toInquiryDto(existing),
    };
  }

  if (
    existing.ackStatus !== 'FAILED_RETRYABLE' &&
    existing.ackStatus !== 'DISABLED_PENDING_APPROVAL'
  ) {
    return {
      attempted: false,
      blockedReason: `NOT_RETRYABLE_${existing.ackStatus}`,
      inquiry: toInquiryDto(existing),
    };
  }

  if (!isWebsiteAutoAckEnabled()) {
    return {
      attempted: false,
      blockedReason: 'CUSTOMER_AUTO_ACK_DISABLED',
      inquiry: toInquiryDto(existing),
    };
  }

  // Reset `FAILED_RETRYABLE` -> `DISABLED_PENDING_APPROVAL` atomically so `attemptAutoAckForStoredInquiry` can lock `IN_FLIGHT`
  if (existing.ackStatus === 'FAILED_RETRYABLE') {
    await dbClient
      .update(websiteCustomerInquiries)
      .set({ ackStatus: 'DISABLED_PENDING_APPROVAL', updatedAt: new Date() })
      .where(
        and(
          eq(websiteCustomerInquiries.id, existing.id),
          eq(websiteCustomerInquiries.ackStatus, 'FAILED_RETRYABLE')
        )
      );
  }

  const [reloaded] = await dbClient
    .select()
    .from(websiteCustomerInquiries)
    .where(eq(websiteCustomerInquiries.id, existing.id))
    .limit(1);

  if (!reloaded) {
    return { attempted: false, blockedReason: 'INQUIRY_NOT_FOUND', inquiry: null };
  }

  const settled = await attemptAutoAckForStoredInquiry(dbClient, reloaded);
  return {
    attempted: true,
    blockedReason: null,
    inquiry: toInquiryDto(settled),
  };
}

/**
 * Deterministic, composite-cursor pull query for Hunter local synchronization.
 * Ordered strictly by `(updated_at ASC, id ASC)` so interrupted syncs resume cleanly
 * without skipping or duplicating rows sharing identical timestamps.
 */
export async function listWebsiteInquiriesForHunterSync(
  dbClient: any,
  params: {
    cursorUpdatedAt?: string | null;
    cursorId?: string | null;
    limit?: number;
  }
): Promise<{
  items: WebsiteInquiryRecordDto[];
  nextCursor: { updatedAt: string; id: string } | null;
  hasMore: boolean;
}> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(params.limit ?? 50)));
  const cursorIso = params.cursorUpdatedAt?.trim() || null;
  const cursorId = params.cursorId?.trim() || null;

  let whereClause = undefined;
  if (cursorIso) {
    const parsedCursorDate = new Date(cursorIso);
    if (!Number.isNaN(parsedCursorDate.getTime())) {
      if (cursorId) {
        whereClause = or(
          gt(websiteCustomerInquiries.updatedAt, parsedCursorDate),
          and(
            eq(websiteCustomerInquiries.updatedAt, parsedCursorDate),
            gt(websiteCustomerInquiries.id, cursorId)
          )
        );
      } else {
        whereClause = gt(websiteCustomerInquiries.updatedAt, parsedCursorDate);
      }
    }
  }

  const query = dbClient
    .select()
    .from(websiteCustomerInquiries)
    .orderBy(asc(websiteCustomerInquiries.updatedAt), asc(websiteCustomerInquiries.id))
    .limit(safeLimit + 1);

  const rows = whereClause ? await query.where(whereClause) : await query;

  const hasMore = rows.length > safeLimit;
  const pageRows = hasMore ? rows.slice(0, safeLimit) : rows;
  const items = pageRows.map(toInquiryDto);
  const lastItem = items.length > 0 ? items[items.length - 1] : null;

  return {
    items,
    nextCursor: lastItem ? { updatedAt: lastItem.updatedAt, id: lastItem.id } : null,
    hasMore,
  };
}
