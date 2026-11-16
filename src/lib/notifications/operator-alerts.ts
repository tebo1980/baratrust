import crypto from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  acquisitionContactLogs,
  acquisitionProspects,
  ownerResponses,
  realityChecks,
  websiteCustomerInquiries,
  type OwnerQuestionnaireAnswers,
} from '@/db/schema';
import { DEFAULT_OPERATOR_EMAILS, sanitizeConfiguredSecret } from '../auth/operator';
import {
  redactSensitiveMailError,
  sendInternalCpanelSmtpAlert,
  type AckMailerOutcome,
  type InternalCpanelAlertInput,
} from '../customer-intake/ack-mailer';
import {
  claimInquiryOperatorAlertForRecovery,
  extractOperatorAlertStatusFromFlags,
  OPERATOR_ALERT_STALE_LOCK_MS,
  writeInquiryOperatorAlertStatus,
  type DurableOperatorAlertStatus,
  type WebsiteInquiryRecordDto,
} from '../customer-intake/service';

export type OperatorAlertType =
  | 'CONTACT_INQUIRY'
  | 'REALITY_CHECK_DISCUSS'
  | 'REALITY_CHECK_QUESTIONNAIRE'
  | 'BUSINESS_PULSE_PURCHASE';

export type OperatorAlertDispatchStatus =
  | 'SENT'
  | 'SKIPPED_DUPLICATE'
  | 'SKIPPED_INELIGIBLE'
  | 'FAILED_RETRYABLE'
  | 'UNCERTAIN_DELIVERY_LOCKED';

export interface OperatorAlertResult {
  status: OperatorAlertDispatchStatus;
  eventKey: string;
  alertType: OperatorAlertType;
  provider: AckMailerOutcome['provider'] | null;
  messageId: string | null;
  recipientCount: number;
  error: string | null;
}

export interface OperatorAlertLedgerEntry {
  eventKey: string;
  alertType: OperatorAlertType;
  status: 'IN_FLIGHT' | 'SENT' | 'FAILED_RETRYABLE' | 'UNCERTAIN_DELIVERY_LOCKED';
  attempts: number;
  lastProvider: AckMailerOutcome['provider'] | null;
  lastMessageId: string | null;
  lastError: string | null;
  updatedAt: string;
}

export type OperatorAlertTransportOverride = (
  input: InternalCpanelAlertInput & { alertType: OperatorAlertType; eventKey: string }
) => Promise<AckMailerOutcome>;

interface GlobalOperatorAlertSingleton {
  testTransport: OperatorAlertTransportOverride | null;
  ledger: Map<string, OperatorAlertLedgerEntry>;
}

const GLOBAL_ALERT_STATE_KEY = '__baratrustOperatorAlertsSingleton_v1' as const;

function getAlertSingleton(): GlobalOperatorAlertSingleton {
  const g = globalThis as unknown as Record<string, GlobalOperatorAlertSingleton | undefined>;
  if (!g[GLOBAL_ALERT_STATE_KEY]) {
    g[GLOBAL_ALERT_STATE_KEY] = {
      testTransport: null,
      ledger: new Map<string, OperatorAlertLedgerEntry>(),
    };
  }
  return g[GLOBAL_ALERT_STATE_KEY]!;
}

export function setOperatorAlertTestTransport(
  fn: OperatorAlertTransportOverride | null
): void {
  getAlertSingleton().testTransport = fn;
}

export function resetOperatorAlertStateForTests(): void {
  const state = getAlertSingleton();
  state.testTransport = null;
  state.ledger.clear();
}

/**
 * Clears in-memory serverless alert state while preserving any registered test transport,
 * authentically simulating a Vercel serverless cold start between requests.
 */
export function simulateOperatorAlertColdStartForTests(): void {
  getAlertSingleton().ledger.clear();
}

export function getOperatorAlertLedgerEntry(
  eventKey: string
): OperatorAlertLedgerEntry | undefined {
  return getAlertSingleton().ledger.get(eventKey);
}

export function listFailedOperatorAlerts(): OperatorAlertLedgerEntry[] {
  return Array.from(getAlertSingleton().ledger.values()).filter(
    (entry) => entry.status === 'FAILED_RETRYABLE'
  );
}

function parseValidEmails(raw?: string | null): string[] {
  const cleaned = sanitizeConfiguredSecret(raw);
  if (!cleaned) return [];
  return Array.from(
    new Set(
      cleaned
        .split(/[,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(s))
    )
  );
}

/**
 * Resolves approved operator notification recipients from environment configuration:
 * 1. Explicit `OPERATOR_NOTIFICATION_EMAIL` (comma-separated) if configured.
 * 2. Configured `OPERATOR_EMAILS` (which in Production contains verified operator emails for Todd & Noelah),
 *    preserving `DEFAULT_OPERATOR_EMAILS` (`todd@baratrust.com`) if Todd is not already represented.
 * 3. `DEFAULT_OPERATOR_EMAILS` (`['todd@baratrust.com']`).
 */
export function resolveApprovedOperatorAlertRecipients(): string[] {
  const explicitNotif = parseValidEmails(process.env.OPERATOR_NOTIFICATION_EMAIL);
  if (explicitNotif.length > 0) {
    return explicitNotif;
  }

  const configuredOperators = parseValidEmails(process.env.OPERATOR_EMAILS);
  if (configuredOperators.length > 0) {
    const hasToddRepresentation = configuredOperators.some(
      (addr) => addr === 'todd@baratrust.com' || addr === 'tebo1980@gmail.com'
    );
    if (hasToddRepresentation) {
      return configuredOperators;
    }
    return Array.from(new Set([...DEFAULT_OPERATOR_EMAILS, ...configuredOperators]));
  }

  return [...DEFAULT_OPERATOR_EMAILS];
}

function redactPaymentAndSsnAndSecrets(raw: string, maxLen = 700): string {
  const noSsn = raw.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]');
  const noCard = noSsn.replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED-CARD]');
  let safe = noCard;

  const sensitiveValues = [
    process.env.RESEND_API_KEY,
    process.env.CPANEL_SMTP_PASS,
    process.env.HUNTER_INQUIRY_SYNC_SECRET,
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.WEBHOOK_SECRET_KEY,
    process.env.CLERK_SECRET_KEY,
    process.env.CLERK_WEBHOOK_SECRET,
    process.env.DATABASE_URL,
    process.env.POSTGRES_PASSWORD,
    process.env.POSTGRES_URL,
  ].filter((v): v is string => Boolean(v && v.trim().length >= 4));

  for (const secret of sensitiveValues) {
    const trimmed = secret.trim();
    safe = safe.split(secret).join('[REDACTED]');
    if (trimmed !== secret) {
      safe = safe.split(trimmed).join('[REDACTED]');
    }
  }

  const trimmedSafe = safe.trim();
  if (trimmedSafe.length <= maxLen) return trimmedSafe;
  return `${trimmedSafe.slice(0, maxLen)}…`;
}

function resolveCanonicalBaseUrl(): string {
  const raw = sanitizeConfiguredSecret(process.env.NEXT_PUBLIC_SITE_URL);
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '');
  }
  return 'https://www.baratrust.com';
}

export async function dispatchOperatorAlert(params: {
  eventKey: string;
  alertType: OperatorAlertType;
  referenceId: string;
  replyToEmail?: string | null;
  subject: string;
  bodyText: string;
  isRetrySubmission?: boolean;
  persistedStatus?: DurableOperatorAlertStatus | null;
  ledgerOverride?: Map<string, OperatorAlertLedgerEntry>;
}): Promise<OperatorAlertResult> {
  const singleton = getAlertSingleton();
  const activeLedger = params.ledgerOverride ?? singleton.ledger;
  const existing = activeLedger.get(params.eventKey);

  // 1. Durable database marker check (survives Vercel cold starts & blocks active IN_FLIGHT claims)
  if (
    params.persistedStatus === 'SENT' ||
    params.persistedStatus === 'UNCERTAIN_DELIVERY_LOCKED' ||
    params.persistedStatus === 'IN_FLIGHT'
  ) {
    return {
      status: 'SKIPPED_DUPLICATE',
      eventKey: params.eventKey,
      alertType: params.alertType,
      provider: existing?.lastProvider ?? 'CPANEL_SMTP_TLS',
      messageId: existing?.lastMessageId ?? null,
      recipientCount: 0,
      error: null,
    };
  }

  // 2. Warm in-memory check (prevents concurrent double-sends on the same Lambda instance)
  if (
    existing &&
    (existing.status === 'SENT' ||
      existing.status === 'UNCERTAIN_DELIVERY_LOCKED' ||
      existing.status === 'IN_FLIGHT')
  ) {
    return {
      status: 'SKIPPED_DUPLICATE',
      eventKey: params.eventKey,
      alertType: params.alertType,
      provider: existing.lastProvider,
      messageId: existing.lastMessageId,
      recipientCount: 0,
      error: null,
    };
  }

  // 3. Duplicate suppression on retries:
  // If durable `persistedStatus === 'FAILED_RETRYABLE'`, NEVER suppress — allow recovery even after a cold start!
  if (
    params.isRetrySubmission &&
    params.persistedStatus !== 'FAILED_RETRYABLE' &&
    (!existing || existing.status !== 'FAILED_RETRYABLE')
  ) {
    return {
      status: 'SKIPPED_DUPLICATE',
      eventKey: params.eventKey,
      alertType: params.alertType,
      provider: existing?.lastProvider ?? null,
      messageId: existing?.lastMessageId ?? null,
      recipientCount: 0,
      error: null,
    };
  }

  const recipients = resolveApprovedOperatorAlertRecipients();
  const safeSubject = redactPaymentAndSsnAndSecrets(
    params.subject.replace(/[\r\n]+/g, ' '),
    180
  );
  const safeBody = redactPaymentAndSsnAndSecrets(params.bodyText, 4000);
  const nextAttempts = (existing?.attempts ?? 0) + 1;

  activeLedger.set(params.eventKey, {
    eventKey: params.eventKey,
    alertType: params.alertType,
    status: 'IN_FLIGHT',
    attempts: nextAttempts,
    lastProvider: existing?.lastProvider ?? null,
    lastMessageId: null,
    lastError: null,
    updatedAt: new Date().toISOString(),
  });

  let outcome: AckMailerOutcome;
  try {
    if (singleton.testTransport) {
      outcome = await singleton.testTransport({
        eventKey: params.eventKey,
        alertType: params.alertType,
        referenceId: params.referenceId,
        recipients,
        replyToEmail: params.replyToEmail,
        subject: safeSubject,
        bodyText: safeBody,
      });
    } else if (process.env.NODE_ENV === 'test' || process.env.TEST_ENV === 'true') {
      activeLedger.delete(params.eventKey);
      return {
        status: 'SKIPPED_INELIGIBLE',
        eventKey: params.eventKey,
        alertType: params.alertType,
        provider: null,
        messageId: null,
        recipientCount: 0,
        error: null,
      };
    } else {
      outcome = await sendInternalCpanelSmtpAlert({
        referenceId: params.referenceId,
        recipients,
        replyToEmail: params.replyToEmail,
        subject: safeSubject,
        bodyText: safeBody,
      });
    }
  } catch (err) {
    outcome = {
      outcome: 'FAILED_RETRYABLE',
      provider: singleton.testTransport ? 'MOCK_ADAPTER' : 'CPANEL_SMTP_TLS',
      messageId: null,
      error: redactSensitiveMailError(err),
    };
  }

  if (outcome.outcome === 'SENT') {
    activeLedger.set(params.eventKey, {
      eventKey: params.eventKey,
      alertType: params.alertType,
      status: 'SENT',
      attempts: nextAttempts,
      lastProvider: outcome.provider,
      lastMessageId: outcome.messageId,
      lastError: null,
      updatedAt: new Date().toISOString(),
    });
    return {
      status: 'SENT',
      eventKey: params.eventKey,
      alertType: params.alertType,
      provider: outcome.provider,
      messageId: outcome.messageId,
      recipientCount: recipients.length,
      error: null,
    };
  }

  const safeError = redactSensitiveMailError(
    outcome.error || 'Operator notification delivery failed.'
  );
  const ledgerStatus =
    outcome.outcome === 'UNCERTAIN_DELIVERY_LOCKED'
      ? 'UNCERTAIN_DELIVERY_LOCKED'
      : 'FAILED_RETRYABLE';

  activeLedger.set(params.eventKey, {
    eventKey: params.eventKey,
    alertType: params.alertType,
    status: ledgerStatus,
    attempts: nextAttempts,
    lastProvider: outcome.provider,
    lastMessageId: null,
    lastError: safeError,
    updatedAt: new Date().toISOString(),
  });

  console.error(
    '[OPERATOR_ALERT_FAILURE]',
    JSON.stringify({
      alertType: params.alertType,
      eventKey: params.eventKey,
      referenceId: params.referenceId,
      status: ledgerStatus,
      provider: outcome.provider,
      recipientCount: recipients.length,
      attempts: nextAttempts,
      error: safeError,
    })
  );

  return {
    status: ledgerStatus,
    eventKey: params.eventKey,
    alertType: params.alertType,
    provider: outcome.provider,
    messageId: null,
    recipientCount: recipients.length,
    error: safeError,
  };
}

/**
 * Event A — Genuine new `/contact` website inquiry notification.
 */
export async function notifyOperatorsOfContactInquiry(
  inquiry: WebsiteInquiryRecordDto,
  options?: {
    isRetrySubmission?: boolean;
    persistedStatus?: DurableOperatorAlertStatus | null;
    ledgerOverride?: Map<string, OperatorAlertLedgerEntry>;
  }
): Promise<OperatorAlertResult> {
  const eventKey = `contact_inquiry:${inquiry.id}`;

  if (inquiry.humanStatus !== 'AWAITING_HUMAN_REVIEW') {
    return {
      status: 'SKIPPED_INELIGIBLE',
      eventKey,
      alertType: 'CONTACT_INQUIRY',
      provider: null,
      messageId: null,
      recipientCount: 0,
      error: null,
    };
  }

  const baseUrl = resolveCanonicalBaseUrl();
  const segmentLabel =
    inquiry.segment === 'CONSUMER' ? 'Consumer / Personal Research' : 'Business';
  const entityLabel =
    inquiry.organizationName || inquiry.customerName || inquiry.customerEmail;

  const subject = `[BaraTrust Inquiry] ${segmentLabel} — ${entityLabel}`;
  const lines = [
    `New BaraTrust website customer inquiry recorded and awaiting human review:`,
    ``,
    `Submitted At: ${inquiry.submittedAt}`,
    `Segment: ${segmentLabel}`,
    `Category: ${inquiry.serviceCategory}`,
    `Classification: ${inquiry.messageClassification}`,
    `Response Deadline: ${inquiry.followUpDueAt || 'Not set'} (${inquiry.commitmentBusinessDays} business day${inquiry.commitmentBusinessDays === 1 ? '' : 's'})`,
    `Customer Acknowledgment Status: ${inquiry.ackStatus}`,
    ``,
    `Customer Name: ${inquiry.customerName || 'Not provided'}`,
    ...(inquiry.organizationName ? [`Organization: ${inquiry.organizationName}`] : []),
    `Customer Email: ${inquiry.customerEmail}`,
    ...(inquiry.customerPhone ? [`Customer Phone: ${inquiry.customerPhone}`] : []),
    ...(inquiry.cityState ? [`Location: ${inquiry.cityState}`] : []),
    ...(inquiry.websiteUrl ? [`Website: ${inquiry.websiteUrl}`] : []),
    ``,
    `Message Excerpt:`,
    redactPaymentAndSsnAndSecrets(inquiry.message || '(empty)', 650),
    ``,
    `Internal Reference ID: ${inquiry.id}`,
    `Internal Acquisition Workspace: ${baseUrl}/internal/acquisition`,
    `(Also available via "Pull Website Inquiries Now" in BaraTrust Hunter.)`,
  ];

  return dispatchOperatorAlert({
    eventKey,
    alertType: 'CONTACT_INQUIRY',
    referenceId: inquiry.id,
    replyToEmail: inquiry.customerEmail,
    subject,
    bodyText: lines.join('\n'),
    isRetrySubmission: options?.isRetrySubmission,
    persistedStatus: options?.persistedStatus,
    ledgerOverride: options?.ledgerOverride,
  });
}

/**
 * Event B1 — Genuine new Reality Check "Discuss My Results" follow-up request.
 */
export async function notifyOperatorsOfRealityCheckDiscuss(
  info: {
    realityCheckId: string;
    businessName: string | null;
    ownerName: string | null;
    email: string;
    phone: string | null;
    website: string;
    cityState: string | null;
    primaryHeadache: string | null;
    overallScore: number | null;
    scanStatus: string;
    reviewStatus: string;
    submittedAtIso?: string;
    followUpDueAtIso?: string | null;
  },
  options?: {
    isRetrySubmission?: boolean;
    persistedStatus?: DurableOperatorAlertStatus | null;
    ledgerOverride?: Map<string, OperatorAlertLedgerEntry>;
  }
): Promise<OperatorAlertResult> {
  const eventKey = `rc_discuss:${info.realityCheckId}`;
  const baseUrl = resolveCanonicalBaseUrl();
  const displayBiz = info.businessName || info.website;
  const scoreDisplay =
    info.overallScore !== null && info.overallScore !== undefined
      ? `${info.overallScore}/100 (automated scan only)`
      : 'Withheld / Pending Human Review';

  const subject = `[BaraTrust Reality Check] Discuss Results Requested — ${displayBiz}`;
  const lines = [
    `A visitor requested human follow-up on a Free Automated Reality Check:`,
    ``,
    `Response Type: Reality Check — Request to Discuss Results`,
    `Review Status: ${info.reviewStatus} (Automated scan only — NOT yet human-reviewed or published)`,
    `Submitted At: ${info.submittedAtIso || new Date().toISOString()}`,
    ...(info.followUpDueAtIso ? [`Response Deadline: ${info.followUpDueAtIso}`] : []),
    ``,
    `Business / Site: ${displayBiz}`,
    `Website URL: ${info.website}`,
    `Location: ${info.cityState || 'Not specified'}`,
    `Contact Name: ${info.ownerName || 'Not provided'}`,
    `Contact Email: ${info.email}`,
    ...(info.phone ? [`Contact Phone: ${info.phone}`] : []),
    `Scan Status: ${info.scanStatus}`,
    `Automated Score: ${scoreDisplay}`,
    `Follow-Up Note: ${redactPaymentAndSsnAndSecrets(
      info.primaryHeadache || 'Requested follow-up via Discuss My Results',
      500
    )}`,
    ``,
    `Reality Check ID: ${info.realityCheckId}`,
    `Internal Review Studio: ${baseUrl}/internal/reviews/${info.realityCheckId}`,
  ];

  return dispatchOperatorAlert({
    eventKey,
    alertType: 'REALITY_CHECK_DISCUSS',
    referenceId: info.realityCheckId,
    replyToEmail: info.email,
    subject,
    bodyText: lines.join('\n'),
    isRetrySubmission: options?.isRetrySubmission,
    persistedStatus: options?.persistedStatus,
    ledgerOverride: options?.ledgerOverride,
  });
}

export function computeQuestionnaireAnswersHash(
  answers: Partial<OwnerQuestionnaireAnswers> | null | undefined
): string {
  const canonical = JSON.stringify({
    customerAcquisition: (answers?.customerAcquisition || '').trim(),
    biggestProblem: (answers?.biggestProblem || '').trim(),
    missedInquiries: (answers?.missedInquiries || '').trim(),
    followUpProcess: (answers?.followUpProcess || '').trim(),
    currentMarketingSpend: (answers?.currentMarketingSpend || '').trim(),
    repetitiveAdminWaste: (answers?.repetitiveAdminWaste || '').trim(),
    growthOpportunity: (answers?.growthOpportunity || '').trim(),
    freeEmployeeRole: (answers?.freeEmployeeRole || '').trim(),
    additionalNotes: (answers?.additionalNotes || '').trim(),
  });
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24);
}

export function questionnaireStateTagForStatus(
  status: DurableOperatorAlertStatus
): string {
  if (status === 'SENT') return 'OP_Q_ALERT_SENT';
  if (status === 'UNCERTAIN_DELIVERY_LOCKED') return 'OP_Q_ALERT_UNCERTAIN_LOCKED';
  if (status === 'IN_FLIGHT') return 'OP_Q_ALERT_IN_FLIGHT';
  return 'OP_Q_ALERT_FAILED_RETRYABLE';
}

/**
 * Atomically claims a `FAILED_RETRYABLE` questionnaire operator alert in `owner_responses.responses`
 * (`OP_Q_ALERT_FAILED_RETRYABLE` -> `OP_Q_ALERT_IN_FLIGHT`), preserving `<90s` active locks
 * and quarantining `>=90s` crashed locks to `UNCERTAIN_DELIVERY_LOCKED`.
 */
export async function claimQuestionnaireOperatorAlertForRecovery(
  dbClient: any,
  ownerResponseId: string,
  nowMs = Date.now()
): Promise<'CLAIMED' | 'ALREADY_HANDLED' | 'ACTIVE_IN_FLIGHT' | 'QUARANTINED_STALE_LOCK'> {
  const [row] = await dbClient
    .select()
    .from(ownerResponses)
    .where(eq(ownerResponses.id, ownerResponseId))
    .limit(1);
  if (!row) return 'ALREADY_HANDLED';

  const parsedResp: OwnerQuestionnaireAnswers =
    typeof row.responses === 'string' ? JSON.parse(row.responses) : row.responses || {};
  const meta = parsedResp?.operatorAlertMeta;
  if (!meta) return 'ALREADY_HANDLED';

  if (meta.status === 'IN_FLIGHT') {
    const startedMs = meta.inFlightSinceMs ?? null;
    if (startedMs !== null && nowMs - startedMs < OPERATOR_ALERT_STALE_LOCK_MS) {
      return 'ACTIVE_IN_FLIGHT';
    }
    await dbClient
      .update(ownerResponses)
      .set({
        responses: {
          ...parsedResp,
          operatorAlertMeta: {
            ...meta,
            status: 'UNCERTAIN_DELIVERY_LOCKED',
            stateTag: 'OP_Q_ALERT_UNCERTAIN_LOCKED',
            inFlightSinceMs: null,
            updatedAt: new Date(nowMs).toISOString(),
            lastError:
              'Interrupted IN_FLIGHT operator alert exceeded 90s ceiling; automatic retry locked.',
          },
        },
      })
      .where(
        and(
          eq(ownerResponses.id, ownerResponseId),
          sql`CAST(${ownerResponses.responses} AS text) LIKE ${'%OP_Q_ALERT_IN_FLIGHT%'}`
        )
      );
    return 'QUARANTINED_STALE_LOCK';
  }

  if (meta.status !== 'FAILED_RETRYABLE') {
    return 'ALREADY_HANDLED';
  }

  const claimed = await dbClient
    .update(ownerResponses)
    .set({
      responses: {
        ...parsedResp,
        operatorAlertMeta: {
          ...meta,
          status: 'IN_FLIGHT',
          stateTag: 'OP_Q_ALERT_IN_FLIGHT',
          inFlightSinceMs: nowMs,
          updatedAt: new Date(nowMs).toISOString(),
        },
      },
    })
    .where(
      and(
        eq(ownerResponses.id, ownerResponseId),
        sql`CAST(${ownerResponses.responses} AS text) LIKE ${'%OP_Q_ALERT_FAILED_RETRYABLE%'}`
      )
    )
    .returning({ id: ownerResponses.id });

  return claimed.length > 0 ? 'CLAIMED' : 'ALREADY_HANDLED';
}

/**
 * Event B2 — Genuine new (or substantively updated) Reality Check Owner Questionnaire submission.
 */
export async function notifyOperatorsOfRealityCheckQuestionnaire(
  info: {
    realityCheckId: string;
    businessName: string | null;
    website: string;
    cityState: string | null;
    ownerName: string | null;
    email: string;
    reviewStatus: string;
    isUpdate: boolean;
    answersHash: string;
    responses: OwnerQuestionnaireAnswers;
  },
  options?: {
    isRetrySubmission?: boolean;
    persistedStatus?: DurableOperatorAlertStatus | null;
    ledgerOverride?: Map<string, OperatorAlertLedgerEntry>;
  }
): Promise<OperatorAlertResult> {
  const eventKey = `rc_questionnaire:${info.realityCheckId}:${info.answersHash}`;
  const baseUrl = resolveCanonicalBaseUrl();
  const displayBiz = info.businessName || info.website;

  const questionEntries: Array<[string, string | undefined]> = [
    ['Customer Acquisition', info.responses.customerAcquisition],
    ['Biggest Problem', info.responses.biggestProblem],
    ['Missed Inquiries', info.responses.missedInquiries],
    ['Follow-Up Process', info.responses.followUpProcess],
    ['Current Marketing Spend', info.responses.currentMarketingSpend],
    ['Repetitive Admin / Waste', info.responses.repetitiveAdminWaste],
    ['Growth Opportunity', info.responses.growthOpportunity],
    ['If Free Extra Role', info.responses.freeEmployeeRole],
    ['Additional Notes', info.responses.additionalNotes],
  ];
  const answered = questionEntries.filter((entry): entry is [string, string] =>
    Boolean(entry[1] && entry[1].trim())
  );

  const typeLabel = info.isUpdate
    ? 'Reality Check — Updated Owner Questionnaire'
    : 'Reality Check — Owner Questionnaire Submission';

  const subject = `[BaraTrust Reality Check] ${
    info.isUpdate ? 'Updated ' : ''
  }Owner Questionnaire — ${displayBiz}`;

  const highlightLines = answered
    .slice(0, 4)
    .map(
      ([label, val]) => `- ${label}: ${redactPaymentAndSsnAndSecrets(val, 180)}`
    );

  const lines = [
    `An owner submitted context via the Reality Check Owner Questionnaire:`,
    ``,
    `Response Type: ${typeLabel}`,
    `Review Status: ${info.reviewStatus} (Unreviewed owner-provided context — report has NOT been human-reviewed or published)`,
    `Submitted At: ${info.responses.submittedAt}`,
    `Questions Answered: ${answered.length} of ${questionEntries.length}`,
    ``,
    `Business / Site: ${displayBiz}`,
    `Website URL: ${info.website}`,
    `Location: ${info.cityState || 'Not specified'}`,
    `Contact Name: ${info.ownerName || 'Not provided'}`,
    `Contact Email: ${info.email}`,
    ...(highlightLines.length > 0 ? [``, `Key Owner Context Highlights:`, ...highlightLines] : []),
    ``,
    `Reality Check ID: ${info.realityCheckId}`,
    `Internal Review Studio: ${baseUrl}/internal/reviews/${info.realityCheckId}`,
  ];

  return dispatchOperatorAlert({
    eventKey,
    alertType: 'REALITY_CHECK_QUESTIONNAIRE',
    referenceId: info.realityCheckId,
    replyToEmail: info.email,
    subject,
    bodyText: lines.join('\n'),
    isRetrySubmission: options?.isRetrySubmission,
    persistedStatus: options?.persistedStatus,
    ledgerOverride: options?.ledgerOverride,
  });
}

/**
 * Event C — Verified paid Business Pulse ($99/month) Stripe subscription purchase.
 */
export async function notifyOperatorsOfBusinessPulsePurchase(
  info: {
    sessionId: string;
    prospectId: string;
    businessName: string;
    customerName: string;
    customerEmail: string | null;
    location: string | null;
    subscriptionId: string | null;
    recordedAtIso: string;
  },
  options?: {
    isRetrySubmission?: boolean;
    persistedStatus?: DurableOperatorAlertStatus | null;
    ledgerOverride?: Map<string, OperatorAlertLedgerEntry>;
  }
): Promise<OperatorAlertResult> {
  const eventKey = `stripe_pulse_checkout:${info.sessionId}`;
  const baseUrl = resolveCanonicalBaseUrl();

  const subject = `[BaraTrust Customer Acquired] Business Pulse ($99/mo) — ${info.businessName}`;
  const lines = [
    `A verified BaraTrust Business Pulse ($99/month) subscription has been recorded:`,
    ``,
    `Recorded At: ${info.recordedAtIso}`,
    `Offering: Business Pulse ($99/month recurring)`,
    `Onboarding Status: CUSTOMER_ACQUIRED — Human onboarding follow-up required (no automated marketing sent)`,
    ``,
    `Business Name: ${info.businessName}`,
    `Customer Name: ${info.customerName}`,
    `Customer Email: ${info.customerEmail || 'Not provided'}`,
    ...(info.location ? [`Location: ${info.location}`] : []),
    `Subscription Reference: ${info.subscriptionId || 'Recorded'}`,
    `Prospect ID: ${info.prospectId}`,
    ``,
    `Internal Acquisition Workspace: ${baseUrl}/internal/acquisition`,
  ];

  return dispatchOperatorAlert({
    eventKey,
    alertType: 'BUSINESS_PULSE_PURCHASE',
    referenceId: info.prospectId,
    replyToEmail: info.customerEmail,
    subject,
    bodyText: lines.join('\n'),
    isRetrySubmission: options?.isRetrySubmission,
    persistedStatus: options?.persistedStatus,
    ledgerOverride: options?.ledgerOverride,
  });
}

export function extractStripeAlertStatusFromSummary(
  summary?: string | null
): DurableOperatorAlertStatus | null {
  if (!summary) return null;
  if (summary.includes('[op_alert:SENT]')) return 'SENT';
  if (summary.includes('[op_alert:UNCERTAIN_DELIVERY_LOCKED]')) {
    return 'UNCERTAIN_DELIVERY_LOCKED';
  }
  if (/\[op_alert:IN_FLIGHT(?::\d+)?\]/.test(summary)) return 'IN_FLIGHT';
  if (summary.includes('[op_alert:FAILED_RETRYABLE]')) return 'FAILED_RETRYABLE';
  return null;
}

export function extractStripeInFlightTimestampFromSummary(
  summary?: string | null
): number | null {
  if (!summary) return null;
  const m = /\[op_alert:IN_FLIGHT:(\d+)\]/.exec(summary);
  if (!m) return null;
  const parsed = Number(m[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function applyStripeAlertStatusMarker(
  summary: string,
  status: Exclude<DurableOperatorAlertStatus, 'IN_FLIGHT'>
): string {
  const stripped = summary
    .replace(
      /\s*\[op_alert:(?:SENT|FAILED_RETRYABLE|UNCERTAIN_DELIVERY_LOCKED|IN_FLIGHT(?::\d+)?)\]/g,
      ''
    )
    .replace(/\.$/, '')
    .trim();
  return `${stripped} [op_alert:${status}].`;
}

export function applyStripeAlertInFlightMarker(summary: string, nowMs: number): string {
  const stripped = summary
    .replace(
      /\s*\[op_alert:(?:SENT|FAILED_RETRYABLE|UNCERTAIN_DELIVERY_LOCKED|IN_FLIGHT(?::\d+)?)\]/g,
      ''
    )
    .replace(/\.$/, '')
    .trim();
  return `${stripped} [op_alert:IN_FLIGHT:${nowMs}].`;
}

/**
 * Atomically claims a `FAILED_RETRYABLE` Stripe purchase operator alert in `acquisition_contact_logs.summary`
 * (`[op_alert:FAILED_RETRYABLE]` -> `[op_alert:IN_FLIGHT:<nowMs>]`), preserving `<90s` active locks
 * and quarantining `>=90s` crashed locks to `UNCERTAIN_DELIVERY_LOCKED`.
 */
export async function claimStripeOperatorAlertForRecovery(
  dbClient: any,
  logRowId: string,
  nowMs = Date.now()
): Promise<'CLAIMED' | 'ALREADY_HANDLED' | 'ACTIVE_IN_FLIGHT' | 'QUARANTINED_STALE_LOCK'> {
  const [row] = await dbClient
    .select({ id: acquisitionContactLogs.id, summary: acquisitionContactLogs.summary })
    .from(acquisitionContactLogs)
    .where(eq(acquisitionContactLogs.id, logRowId))
    .limit(1);
  if (!row) return 'ALREADY_HANDLED';

  const st = extractStripeAlertStatusFromSummary(row.summary);
  if (st === 'IN_FLIGHT') {
    const startedMs = extractStripeInFlightTimestampFromSummary(row.summary);
    if (startedMs !== null && nowMs - startedMs < OPERATOR_ALERT_STALE_LOCK_MS) {
      return 'ACTIVE_IN_FLIGHT';
    }
    await dbClient
      .update(acquisitionContactLogs)
      .set({
        summary: applyStripeAlertStatusMarker(row.summary, 'UNCERTAIN_DELIVERY_LOCKED'),
      })
      .where(
        and(
          eq(acquisitionContactLogs.id, logRowId),
          sql`${acquisitionContactLogs.summary} LIKE ${'%[op_alert:IN_FLIGHT%'}`
        )
      );
    return 'QUARANTINED_STALE_LOCK';
  }

  if (st !== 'FAILED_RETRYABLE') {
    return 'ALREADY_HANDLED';
  }

  const claimed = await dbClient
    .update(acquisitionContactLogs)
    .set({
      summary: applyStripeAlertInFlightMarker(row.summary, nowMs),
    })
    .where(
      and(
        eq(acquisitionContactLogs.id, logRowId),
        sql`${acquisitionContactLogs.summary} LIKE ${'%[op_alert:FAILED_RETRYABLE]%'}`
      )
    )
    .returning({ id: acquisitionContactLogs.id });

  return claimed.length > 0 ? 'CLAIMED' : 'ALREADY_HANDLED';
}

export interface DurableOperatorAlertGapItem {
  alertType: OperatorAlertType;
  recordId: string;
  status: 'FAILED_RETRYABLE' | 'UNCERTAIN_DELIVERY_LOCKED' | 'IN_FLIGHT';
  label: string;
  recordedAt: string;
  internalPath: string;
}

export interface DurableOperatorAlertHealthSummary {
  failedRetryableCount: number;
  uncertainLockedCount: number;
  inFlightCount: number;
  items: DurableOperatorAlertGapItem[];
}

/**
 * Queries Neon Postgres directly so Todd or Noelah can identify any missed, in-flight, or uncertain
 * operator notifications even after a Vercel serverless cold start.
 */
export async function inspectDurableOperatorAlertGaps(
  dbClient: any
): Promise<DurableOperatorAlertHealthSummary> {
  const items: DurableOperatorAlertGapItem[] = [];

  try {
    const inqRows = await dbClient
      .select()
      .from(websiteCustomerInquiries)
      .orderBy(desc(websiteCustomerInquiries.submittedAt))
      .limit(100);

    for (const row of inqRows) {
      if (row.humanStatus !== 'AWAITING_HUMAN_REVIEW') continue;
      const st = extractOperatorAlertStatusFromFlags(row.securityFlags);
      if (
        st === 'FAILED_RETRYABLE' ||
        st === 'UNCERTAIN_DELIVERY_LOCKED' ||
        st === 'IN_FLIGHT'
      ) {
        const isRc = row.sourceChannel === 'REALITY_CHECK_FUNNEL';
        items.push({
          alertType: isRc ? 'REALITY_CHECK_DISCUSS' : 'CONTACT_INQUIRY',
          recordId: isRc && row.realityCheckId ? row.realityCheckId : row.id,
          status: st,
          label: row.organizationName || row.customerName || row.subject,
          recordedAt:
            row.submittedAt instanceof Date
              ? row.submittedAt.toISOString()
              : String(row.submittedAt),
          internalPath:
            isRc && row.realityCheckId
              ? `/internal/reviews/${row.realityCheckId}`
              : '/internal/acquisition',
        });
      }
    }
  } catch {
    // Non-fatal if table empty/unavailable
  }

  try {
    const respRows = await dbClient
      .select()
      .from(ownerResponses)
      .orderBy(desc(ownerResponses.updatedAt))
      .limit(100);

    for (const row of respRows) {
      const parsedResp: OwnerQuestionnaireAnswers =
        typeof row.responses === 'string'
          ? JSON.parse(row.responses)
          : row.responses || {};
      const st = parsedResp?.operatorAlertMeta?.status;
      if (
        st === 'FAILED_RETRYABLE' ||
        st === 'UNCERTAIN_DELIVERY_LOCKED' ||
        st === 'IN_FLIGHT'
      ) {
        items.push({
          alertType: 'REALITY_CHECK_QUESTIONNAIRE',
          recordId: row.realityCheckId,
          status: st,
          label: `Owner Questionnaire (${row.realityCheckId.slice(0, 8)})`,
          recordedAt:
            parsedResp.operatorAlertMeta?.updatedAt ||
            (row.updatedAt instanceof Date
              ? row.updatedAt.toISOString()
              : String(row.updatedAt)),
          internalPath: `/internal/reviews/${row.realityCheckId}`,
        });
      }
    }
  } catch {
    // Non-fatal
  }

  try {
    const logRows = await dbClient
      .select()
      .from(acquisitionContactLogs)
      .where(eq(acquisitionContactLogs.actionType, 'STRIPE_CHECKOUT_COMPLETED'))
      .orderBy(desc(acquisitionContactLogs.createdAt))
      .limit(100);

    for (const row of logRows) {
      const st = extractStripeAlertStatusFromSummary(row.summary);
      if (
        st === 'FAILED_RETRYABLE' ||
        st === 'UNCERTAIN_DELIVERY_LOCKED' ||
        st === 'IN_FLIGHT'
      ) {
        items.push({
          alertType: 'BUSINESS_PULSE_PURCHASE',
          recordId: row.prospectId,
          status: st,
          label: `Business Pulse Purchase (${row.prospectId.slice(0, 8)})`,
          recordedAt:
            row.createdAt instanceof Date
              ? row.createdAt.toISOString()
              : String(row.createdAt),
          internalPath: '/internal/acquisition',
        });
      }
    }
  } catch {
    // Non-fatal
  }

  return {
    failedRetryableCount: items.filter((i) => i.status === 'FAILED_RETRYABLE').length,
    uncertainLockedCount: items.filter((i) => i.status === 'UNCERTAIN_DELIVERY_LOCKED').length,
    inFlightCount: items.filter((i) => i.status === 'IN_FLIGHT').length,
    items,
  };
}

/**
 * Concurrency-safe Neon recovery:
 * Atomically claims each `FAILED_RETRYABLE` record (`FAILED_RETRYABLE` -> `IN_FLIGHT`) in Postgres
 * before touching SMTP so concurrent serverless instances can never both send the same alert.
 * Preserves `<90s` active locks and safely quarantines `>=90s` interrupted locks as `UNCERTAIN_DELIVERY_LOCKED`.
 */
export async function recoverFailedOperatorAlertsFromDb(
  dbClient: any,
  options?: {
    nowMs?: number;
    isolatedLedger?: Map<string, OperatorAlertLedgerEntry>;
  }
): Promise<{
  attemptedCount: number;
  recoveredCount: number;
  failedCount: number;
  quarantinedStaleCount: number;
  skippedConcurrentCount: number;
}> {
  const nowMs = options?.nowMs ?? Date.now();
  const ledgerOverride = options?.isolatedLedger;

  let attemptedCount = 0;
  let recoveredCount = 0;
  let failedCount = 0;
  let quarantinedStaleCount = 0;
  let skippedConcurrentCount = 0;

  // 1. Recover failed /contact and Reality Check Discuss alerts from website_customer_inquiries
  const inqRows = await dbClient
    .select()
    .from(websiteCustomerInquiries)
    .orderBy(desc(websiteCustomerInquiries.submittedAt))
    .limit(100);

  for (const row of inqRows) {
    if (row.humanStatus !== 'AWAITING_HUMAN_REVIEW') continue;
    const st = extractOperatorAlertStatusFromFlags(row.securityFlags);
    if (st !== 'FAILED_RETRYABLE' && st !== 'IN_FLIGHT') continue;

    const claim = await claimInquiryOperatorAlertForRecovery(dbClient, row.id, nowMs);
    if (claim === 'QUARANTINED_STALE_LOCK') {
      quarantinedStaleCount += 1;
      continue;
    }
    if (claim !== 'CLAIMED') {
      skippedConcurrentCount += 1;
      continue;
    }

    attemptedCount += 1;
    let res: OperatorAlertResult;

    if (row.sourceChannel === 'REALITY_CHECK_FUNNEL' && row.realityCheckId) {
      const [rc] = await dbClient
        .select()
        .from(realityChecks)
        .where(eq(realityChecks.id, row.realityCheckId))
        .limit(1);

      res = await notifyOperatorsOfRealityCheckDiscuss(
        {
          realityCheckId: row.realityCheckId,
          businessName: rc?.businessName ?? row.organizationName ?? null,
          ownerName: rc?.ownerName ?? row.customerName ?? null,
          email: row.customerEmail,
          phone: row.customerPhone ?? null,
          website: rc?.website || row.websiteUrl || row.customerEmail,
          cityState: row.cityState ?? null,
          primaryHeadache: rc?.primaryHeadache ?? row.message ?? null,
          overallScore: rc?.overallScore ?? null,
          scanStatus: rc?.scanStatus || 'completed',
          reviewStatus: rc?.status || 'NEEDS_HUMAN_REVIEW',
          submittedAtIso:
            row.submittedAt instanceof Date
              ? row.submittedAt.toISOString()
              : String(row.submittedAt),
          followUpDueAtIso:
            row.followUpDueAt instanceof Date
              ? row.followUpDueAt.toISOString()
              : row.followUpDueAt
              ? String(row.followUpDueAt)
              : null,
        },
        {
          isRetrySubmission: true,
          persistedStatus: 'FAILED_RETRYABLE',
          ledgerOverride,
        }
      );
    } else {
      const dto: WebsiteInquiryRecordDto = {
        id: row.id,
        externalSubmissionKey: row.externalSubmissionKey,
        dedupFingerprint: row.dedupFingerprint,
        sourceChannel: row.sourceChannel,
        segment: row.segment,
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
        privacyNoticeAcceptedAt: null,
        realityCheckShareToken: row.realityCheckShareToken ?? null,
        faqMatchedKeys: [],
        securityFlags: [],
        commitmentBusinessDays: Number(row.commitmentBusinessDays || 2),
        followUpDueAt:
          row.followUpDueAt instanceof Date
            ? row.followUpDueAt.toISOString()
            : row.followUpDueAt
            ? String(row.followUpDueAt)
            : null,
        ackTemplateKey: row.ackTemplateKey ?? null,
        ackSubject: row.ackSubject ?? null,
        ackBody: row.ackBody ?? null,
        ackStatus: row.ackStatus,
        ackProvider: row.ackProvider ?? null,
        ackMessageId: row.ackMessageId ?? null,
        ackSentAt: null,
        ackError: row.ackError ?? null,
        humanStatus: row.humanStatus,
        submittedAt:
          row.submittedAt instanceof Date
            ? row.submittedAt.toISOString()
            : String(row.submittedAt),
        updatedAt:
          row.updatedAt instanceof Date
            ? row.updatedAt.toISOString()
            : String(row.updatedAt),
      };

      res = await notifyOperatorsOfContactInquiry(dto, {
        isRetrySubmission: true,
        persistedStatus: 'FAILED_RETRYABLE',
        ledgerOverride,
      });
    }

    if (res.status === 'SENT') {
      await writeInquiryOperatorAlertStatus(dbClient, row.id, 'SENT');
      recoveredCount += 1;
    } else if (res.status === 'UNCERTAIN_DELIVERY_LOCKED') {
      await writeInquiryOperatorAlertStatus(dbClient, row.id, 'UNCERTAIN_DELIVERY_LOCKED');
      failedCount += 1;
    } else {
      await writeInquiryOperatorAlertStatus(dbClient, row.id, 'FAILED_RETRYABLE');
      failedCount += 1;
    }
  }

  // 2. Recover failed Owner Questionnaire alerts from owner_responses
  const respRows = await dbClient
    .select()
    .from(ownerResponses)
    .orderBy(desc(ownerResponses.updatedAt))
    .limit(100);

  for (const row of respRows) {
    const parsedResp: OwnerQuestionnaireAnswers =
      typeof row.responses === 'string' ? JSON.parse(row.responses) : row.responses || {};
    const st = parsedResp?.operatorAlertMeta?.status;
    if (st !== 'FAILED_RETRYABLE' && st !== 'IN_FLIGHT') continue;

    const claim = await claimQuestionnaireOperatorAlertForRecovery(
      dbClient,
      row.id,
      nowMs
    );
    if (claim === 'QUARANTINED_STALE_LOCK') {
      quarantinedStaleCount += 1;
      continue;
    }
    if (claim !== 'CLAIMED') {
      skippedConcurrentCount += 1;
      continue;
    }

    const [rc] = await dbClient
      .select()
      .from(realityChecks)
      .where(eq(realityChecks.id, row.realityCheckId))
      .limit(1);
    if (!rc || !rc.email) {
      await dbClient
        .update(ownerResponses)
        .set({
          responses: {
            ...parsedResp,
            operatorAlertMeta: {
              ...parsedResp.operatorAlertMeta!,
              status: 'FAILED_RETRYABLE',
              stateTag: 'OP_Q_ALERT_FAILED_RETRYABLE',
              inFlightSinceMs: null,
              updatedAt: new Date(nowMs).toISOString(),
            },
          },
        })
        .where(eq(ownerResponses.id, row.id));
      continue;
    }

    attemptedCount += 1;
    const answersHash =
      parsedResp.operatorAlertMeta?.answersHash ||
      computeQuestionnaireAnswersHash(parsedResp);

    const res = await notifyOperatorsOfRealityCheckQuestionnaire(
      {
        realityCheckId: rc.id,
        businessName: rc.businessName,
        website: rc.website,
        cityState: rc.cityState,
        ownerName: rc.ownerName,
        email: rc.email,
        reviewStatus: rc.status,
        isUpdate: false,
        answersHash,
        responses: parsedResp,
      },
      {
        isRetrySubmission: true,
        persistedStatus: 'FAILED_RETRYABLE',
        ledgerOverride,
      }
    );

    const nextStatus: Exclude<DurableOperatorAlertStatus, 'IN_FLIGHT'> =
      res.status === 'SENT'
        ? 'SENT'
        : res.status === 'UNCERTAIN_DELIVERY_LOCKED'
        ? 'UNCERTAIN_DELIVERY_LOCKED'
        : 'FAILED_RETRYABLE';

    await dbClient
      .update(ownerResponses)
      .set({
        responses: {
          ...parsedResp,
          operatorAlertMeta: {
            status: nextStatus,
            stateTag: questionnaireStateTagForStatus(nextStatus),
            inFlightSinceMs: null,
            answersHash,
            updatedAt: new Date(nowMs).toISOString(),
            lastError: res.error,
          },
        },
      })
      .where(eq(ownerResponses.id, row.id));

    if (nextStatus === 'SENT') recoveredCount += 1;
    else failedCount += 1;
  }

  // 3. Recover failed Business Pulse purchase alerts from acquisition_contact_logs
  const logRows = await dbClient
    .select()
    .from(acquisitionContactLogs)
    .where(eq(acquisitionContactLogs.actionType, 'STRIPE_CHECKOUT_COMPLETED'))
    .orderBy(desc(acquisitionContactLogs.createdAt))
    .limit(100);

  for (const row of logRows) {
    const st = extractStripeAlertStatusFromSummary(row.summary);
    if (st !== 'FAILED_RETRYABLE' && st !== 'IN_FLIGHT') continue;

    const claim = await claimStripeOperatorAlertForRecovery(dbClient, row.id, nowMs);
    if (claim === 'QUARANTINED_STALE_LOCK') {
      quarantinedStaleCount += 1;
      continue;
    }
    if (claim !== 'CLAIMED') {
      skippedConcurrentCount += 1;
      continue;
    }

    const [prospect] = await dbClient
      .select()
      .from(acquisitionProspects)
      .where(eq(acquisitionProspects.id, row.prospectId))
      .limit(1);
    if (!prospect) {
      await dbClient
        .update(acquisitionContactLogs)
        .set({
          summary: applyStripeAlertStatusMarker(row.summary, 'FAILED_RETRYABLE'),
        })
        .where(eq(acquisitionContactLogs.id, row.id));
      continue;
    }

    attemptedCount += 1;
    const sessionMatch = /\[session:([^\]]+)\]/.exec(row.summary || '');
    const subMatch = /\[subscription:([^\]]+)\]/.exec(row.summary || '');
    const sessionId = sessionMatch ? sessionMatch[1] : row.id;
    const subscriptionId = subMatch ? subMatch[1] : null;

    const res = await notifyOperatorsOfBusinessPulsePurchase(
      {
        sessionId,
        prospectId: prospect.id,
        businessName: prospect.businessName,
        customerName: prospect.decisionMakerName || 'Business Pulse Member',
        customerEmail: prospect.contactValue,
        location: prospect.location,
        subscriptionId,
        recordedAtIso:
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt),
      },
      {
        isRetrySubmission: true,
        persistedStatus: 'FAILED_RETRYABLE',
        ledgerOverride,
      }
    );

    const nextStatus: Exclude<DurableOperatorAlertStatus, 'IN_FLIGHT'> =
      res.status === 'SENT'
        ? 'SENT'
        : res.status === 'UNCERTAIN_DELIVERY_LOCKED'
        ? 'UNCERTAIN_DELIVERY_LOCKED'
        : 'FAILED_RETRYABLE';

    await dbClient
      .update(acquisitionContactLogs)
      .set({
        summary: applyStripeAlertStatusMarker(row.summary, nextStatus),
      })
      .where(eq(acquisitionContactLogs.id, row.id));

    if (nextStatus === 'SENT') recoveredCount += 1;
    else failedCount += 1;
  }

  return {
    attemptedCount,
    recoveredCount,
    failedCount,
    quarantinedStaleCount,
    skippedConcurrentCount,
  };
}
