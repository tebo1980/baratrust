import { z } from 'zod';
import type {
  AcquisitionPillar,
  AssessmentStatus,
  OutreachDraftStatus,
  ProspectContactMethod,
  ProspectPermissionStatus,
  ProspectSourceUrl,
  ProspectStage,
} from '@/db/schema/acquisition';
import { sanitizePlainText } from '@/lib/security/public-guard';

export const ALLOWED_PILLARS = ['PROTECT', 'IMPROVE', 'GROW', 'SAVE'] as const;

// SMS is intentionally excluded per compliance safeguards.
export const ALLOWED_CONTACT_METHODS = [
  'EMAIL',
  'PHONE',
  'IN_PERSON',
  'CONTACT_FORM',
  'LINKEDIN',
  'NONE',
] as const;

export const ALLOWED_PERMISSION_STATUSES = [
  'PUBLIC_BUSINESS_CONTACT',
  'INBOUND_REQUEST',
  'WARM_REFERRAL',
  'PRIOR_RELATIONSHIP',
  'NEEDS_VERIFICATION',
  'DO_NOT_CONTACT',
] as const;

export const ALLOWED_STAGES = [
  'RESEARCHED',
  'APPROVED_FOR_OUTREACH',
  'OUTREACH_SENT',
  'CONVERSATION_STARTED',
  'MEETING_BOOKED',
  'MEETING_ATTENDED',
  'CUSTOMER_ACQUIRED',
  'NOT_A_FIT',
  'OPTED_OUT',
] as const;

export function sanitizePublicSourceUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export const SourceUrlItemSchema = z.object({
  label: z.string().trim().min(1).max(160),
  url: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((u) => sanitizePublicSourceUrl(u) !== null, 'Public http/https URL required'),
  observedAt: z.string().trim().max(40).optional(),
});

export const CreateProspectSchema = z.object({
  businessName: z.string().trim().min(1, 'Business name is required').max(200),
  location: z.string().trim().min(1, 'Location is required').max(140),
  industry: z.string().trim().min(1, 'Industry is required').max(120),
  websiteUrl: z.string().trim().max(500).optional().nullable(),
  sourceUrls: z.array(SourceUrlItemSchema).max(15).optional(),
  researchNotes: z.string().max(5000).optional().nullable(),
  realityCheckId: z.string().uuid().optional().nullable(),
  fitScore: z.number().int().min(0).max(100).optional().nullable(),
  fitExplanation: z.string().max(2000).optional().nullable(),
  primaryPillar: z.enum(ALLOWED_PILLARS).optional().nullable(),
  evidenceObservation: z.string().max(2000).optional().nullable(),
  decisionMakerName: z.string().max(140).optional().nullable(),
  decisionMakerRole: z.string().max(120).optional().nullable(),
  decisionMakerSource: z.string().max(300).optional().nullable(),
  contactMethod: z.enum(ALLOWED_CONTACT_METHODS).optional(),
  contactValue: z.string().max(300).optional().nullable(),
  permissionStatus: z.enum(ALLOWED_PERMISSION_STATUSES).optional(),
  outreachSubject: z.string().max(240).optional().nullable(),
  outreachDraft: z.string().max(4000).optional().nullable(),
});

export const ProspectActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('UPDATE_FIELDS'),
    businessName: z.string().trim().min(1).max(200).optional(),
    location: z.string().trim().min(1).max(140).optional(),
    industry: z.string().trim().min(1).max(120).optional(),
    websiteUrl: z.string().trim().max(500).optional().nullable(),
    sourceUrls: z.array(SourceUrlItemSchema).max(15).optional(),
    researchNotes: z.string().max(5000).optional().nullable(),
    fitScore: z.number().int().min(0).max(100).optional().nullable(),
    fitExplanation: z.string().max(2000).optional().nullable(),
    markAssessmentReviewed: z.boolean().optional(),
    primaryPillar: z.enum(ALLOWED_PILLARS).optional().nullable(),
    evidenceObservation: z.string().max(2000).optional().nullable(),
    decisionMakerName: z.string().max(140).optional().nullable(),
    decisionMakerRole: z.string().max(120).optional().nullable(),
    decisionMakerSource: z.string().max(300).optional().nullable(),
    contactMethod: z.enum(ALLOWED_CONTACT_METHODS).optional(),
    contactValue: z.string().max(300).optional().nullable(),
    permissionStatus: z.enum(ALLOWED_PERMISSION_STATUSES).optional(),
    outreachSubject: z.string().max(240).optional().nullable(),
    outreachDraft: z.string().max(4000).optional().nullable(),
    nextFollowUpAt: z.string().trim().max(60).optional().nullable(),
  }),
  z.object({
    action: z.literal('VERIFY_ASSESSMENT'),
    fitScore: z.number().int().min(0).max(100).optional().nullable(),
    fitExplanation: z.string().max(2000).optional().nullable(),
  }),
  z.object({
    action: z.literal('APPROVE_DRAFT'),
    outreachSubject: z.string().max(240).optional().nullable(),
    outreachDraft: z.string().trim().min(10, 'Outreach draft cannot be empty').max(4000),
  }),
  z.object({
    action: z.literal('LOG_OUTREACH_SENT'),
    channel: z.enum(['EMAIL', 'PHONE', 'IN_PERSON', 'CONTACT_FORM', 'LINKEDIN']),
    summary: z.string().trim().max(1000).optional(),
    nextFollowUpAt: z.string().trim().max(60).optional().nullable(),
  }),
  z.object({
    action: z.literal('LOG_CONTACT_NOTE'),
    channel: z.enum(['EMAIL', 'PHONE', 'IN_PERSON', 'CONTACT_FORM', 'LINKEDIN', 'MEETING']),
    direction: z.enum(['INBOUND', 'OUTBOUND', 'INTERNAL']),
    summary: z.string().trim().min(1).max(2000),
    markConversationStarted: z.boolean().optional(),
    nextFollowUpAt: z.string().trim().max(60).optional().nullable(),
  }),
  z.object({
    action: z.literal('UPDATE_OUTCOME'),
    stage: z.enum([
      'CONVERSATION_STARTED',
      'MEETING_BOOKED',
      'MEETING_ATTENDED',
      'CUSTOMER_ACQUIRED',
      'NOT_A_FIT',
      'RESEARCHED',
    ]),
    summary: z.string().trim().max(1000).optional(),
    nextFollowUpAt: z.string().trim().max(60).optional().nullable(),
  }),
  z.object({
    action: z.literal('MARK_OPT_OUT'),
    reason: z.string().trim().max(500).optional(),
  }),
]);

export interface ProspectComplianceSnapshot {
  optOut: boolean;
  permissionStatus: ProspectPermissionStatus | string;
  draftStatus: OutreachDraftStatus | string;
  outreachDraft: string | null;
  contactMethod: ProspectContactMethod | string;
  contactValue?: string | null;
}

export interface OutreachEligibility {
  allowed: boolean;
  reason?: string;
}

/**
 * Enforces strict human-approval, permission, and opt-out rules before manual outreach.
 */
export function evaluateOutreachEligibility(
  prospect: ProspectComplianceSnapshot
): OutreachEligibility {
  if (prospect.optOut) {
    return {
      allowed: false,
      reason: 'Prospect has opted out. Outreach is permanently disabled.',
    };
  }
  if (prospect.permissionStatus === 'DO_NOT_CONTACT') {
    return {
      allowed: false,
      reason: 'Prospect is marked Do Not Contact. Outreach is blocked.',
    };
  }
  if (prospect.contactMethod === 'SMS') {
    return {
      allowed: false,
      reason: 'SMS outreach is not permitted.',
    };
  }
  if (!prospect.outreachDraft || !prospect.outreachDraft.trim()) {
    return {
      allowed: false,
      reason: 'An outreach draft is required before approval or outreach.',
    };
  }
  if (prospect.draftStatus !== 'APPROVED_FOR_OUTREACH') {
    return {
      allowed: false,
      reason: 'Human approval by Todd or Noelah is required before initiating or logging outreach.',
    };
  }
  return { allowed: true };
}

/**
 * Evaluates whether a draft can be approved by an operator.
 */
export function evaluateDraftApprovalEligibility(params: {
  optOut: boolean;
  permissionStatus: string;
  outreachDraft?: string | null;
}): OutreachEligibility {
  if (params.optOut || params.permissionStatus === 'DO_NOT_CONTACT') {
    return {
      allowed: false,
      reason: 'Cannot approve outreach for an opted-out or Do Not Contact prospect.',
    };
  }
  if (!params.outreachDraft || params.outreachDraft.trim().length < 10) {
    return {
      allowed: false,
      reason: 'Please review and provide a complete outreach message before approving.',
    };
  }
  return { allowed: true };
}

/**
 * Determines the resulting draft status when fields are edited:
 * If a previously approved draft's subject or body changes, approval is invalidated (`EDITED`)
 * so updated wording must be explicitly re-approved before outreach.
 */
export function resolveEditedDraftStatus(params: {
  previousStatus: OutreachDraftStatus | string;
  previousSubject: string | null;
  previousBody: string | null;
  nextSubject: string | null;
  nextBody: string | null;
}): {
  draftStatus: OutreachDraftStatus;
  resetApproval: boolean;
} {
  const prevSubj = (params.previousSubject || '').trim();
  const prevBody = (params.previousBody || '').trim();
  const nextSubj = (params.nextSubject || '').trim();
  const nextBody = (params.nextBody || '').trim();

  if (!nextBody) {
    return { draftStatus: 'NONE', resetApproval: true };
  }

  const changed = prevSubj !== nextSubj || prevBody !== nextBody;
  if (params.previousStatus === 'APPROVED_FOR_OUTREACH' && changed) {
    return { draftStatus: 'EDITED', resetApproval: true };
  }
  if (params.previousStatus === 'APPROVED_FOR_OUTREACH' && !changed) {
    return { draftStatus: 'APPROVED_FOR_OUTREACH', resetApproval: false };
  }
  if (params.previousStatus === 'AI_DRAFTED' && !changed) {
    return { draftStatus: 'AI_DRAFTED', resetApproval: false };
  }
  return { draftStatus: 'EDITED', resetApproval: false };
}

/**
 * Builds manual-only compose links (`mailto:` and Gmail web compose).
 * IMPORTANT: Generating or opening these links NEVER marks an email as sent.
 */
export function buildManualEmailComposeLinks(params: {
  toEmail: string;
  subject?: string | null;
  body: string;
}): {
  mailtoHref: string;
  gmailComposeHref: string;
} | null {
  const cleanTo = params.toEmail.trim();
  if (!cleanTo || !cleanTo.includes('@')) return null;

  const subject = sanitizePlainText(params.subject, { maxLength: 240 }) || 'Quick question from BaraTrust';
  const body = sanitizePlainText(params.body, { maxLength: 4000, multiline: true }) || '';

  const mailtoHref = `mailto:${encodeURIComponent(cleanTo)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  const gmailComposeHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    cleanTo
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { mailtoHref, gmailComposeHref };
}

export function normalizeSourceUrls(items?: ProspectSourceUrl[] | null): ProspectSourceUrl[] {
  if (!Array.isArray(items)) return [];
  const out: ProspectSourceUrl[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const cleanUrl = sanitizePublicSourceUrl(item?.url);
    const cleanLabel = sanitizePlainText(item?.label, { maxLength: 160 });
    if (!cleanUrl || !cleanLabel) continue;
    if (seen.has(cleanUrl)) continue;
    seen.add(cleanUrl);
    out.push({
      label: cleanLabel,
      url: cleanUrl,
      ...(item.observedAt ? { observedAt: sanitizePlainText(item.observedAt, { maxLength: 40 }) || undefined } : {}),
    });
  }
  return out;
}

export type {
  AcquisitionPillar,
  AssessmentStatus,
  OutreachDraftStatus,
  ProspectContactMethod,
  ProspectPermissionStatus,
  ProspectSourceUrl,
  ProspectStage,
};
