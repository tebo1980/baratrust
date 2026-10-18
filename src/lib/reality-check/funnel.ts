import { z } from 'zod';

/**
 * Step 1: URL-first submission (also supports full or partial fields for backwards compatibility).
 * Does NOT require email, phone, ownerName, businessName, cityState, businessType, or primaryHeadache upfront.
 */
export const RealityCheckSubmissionSchema = z.object({
  website: z
    .string()
    .trim()
    .min(1, 'Please enter your business website, Google Business, or Facebook link')
    .max(500),
  businessName: z.string().trim().max(200).optional().nullable(),
  cityState: z.string().trim().max(100).optional().nullable(),
  ownerName: z.string().trim().max(100).optional().nullable(),
  email: z
    .union([
      z.string().trim().email('Please enter a valid email address').max(200),
      z.literal(''),
      z.null(),
      z.undefined(),
    ])
    .optional(),
  phone: z.string().trim().max(50).optional().nullable(),
  businessType: z.string().trim().max(100).optional().nullable(),
  primaryHeadache: z.string().trim().max(2000).optional().nullable(),
});

/**
 * Step 3: Attach email (and optional businessName / ownerName / cityState) to an existing Reality Check
 * via its unguessable shareToken, transitioning it into the human-review queue.
 */
export const RequestHumanReviewSchema = z.object({
  shareToken: z.string().trim().min(16, 'Valid scan token is required').max(128),
  email: z.string().trim().email('Please enter a valid email address').max(200),
  businessName: z.string().trim().max(200).optional().nullable(),
  ownerName: z.string().trim().max(100).optional().nullable(),
  cityState: z.string().trim().max(100).optional().nullable(),
});

const PRESERVED_ADVANCED_STATUSES = new Set([
  'IN_REVIEW',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'completed',
]);

/**
 * Anonymous URL-only scans remain in 'AUTO_SCAN_COMPLETE' so they do not clutter
 * Todd & Noelah's active human-review queue until an email is provided.
 */
export function resolveInitialRealityCheckStatus(
  email?: string | null
): 'NEEDS_HUMAN_REVIEW' | 'AUTO_SCAN_COMPLETE' {
  return email && email.trim().length > 0 ? 'NEEDS_HUMAN_REVIEW' : 'AUTO_SCAN_COMPLETE';
}

/**
 * Transitions a Reality Check into 'NEEDS_HUMAN_REVIEW' when email is attached,
 * while preserving advanced statuses if already in review or published.
 */
export function resolvePatchedRealityCheckStatus(currentStatus: string): string {
  return PRESERVED_ADVANCED_STATUSES.has(currentStatus) ? currentStatus : 'NEEDS_HUMAN_REVIEW';
}

/**
 * Determines whether a Reality Check belongs in the active operator human-review queue
 * vs. the secondary "Auto-Scans Only" view.
 */
export function isActiveHumanReviewQueueItem(check: {
  email?: string | null;
  status: string;
}): boolean {
  if (check.email && check.email.trim().length > 0) return true;
  return (
    check.status === 'NEEDS_HUMAN_REVIEW' ||
    check.status === 'IN_REVIEW' ||
    check.status === 'READY_TO_PUBLISH' ||
    check.status === 'PUBLISHED' ||
    check.status === 'completed'
  );
}

export interface ExistingClaimState {
  email: string | null;
  businessName: string | null;
  ownerName: string | null;
  cityState: string | null;
  status: string;
}

export interface IncomingClaimInput {
  email: string;
  businessName?: string | null;
  ownerName?: string | null;
  cityState?: string | null;
}

export type HumanReviewClaimEvaluation =
  | {
      allowed: false;
      reason: 'EMAIL_CLAIM_CONFLICT';
      httpStatus: 409;
      error: string;
    }
  | {
      allowed: true;
      isInitialClaim: boolean;
      email: string;
      businessName: string | null;
      ownerName: string | null;
      cityState: string | null;
      nextStatus: string;
    };

/**
 * Enforces human-review email claim integrity:
 * - First valid email claims the anonymous URL scan and transitions it to 'NEEDS_HUMAN_REVIEW'.
 * - Retries using the same normalized email are safely idempotent and may backfill still-null
 *   optional fields without overwriting already-established owner/business identity fields.
 * - Any attempt to claim or overwrite an already-claimed Reality Check with a DIFFERENT email
 *   is rejected with 409 EMAIL_CLAIM_CONFLICT so capability-token possession cannot hijack a review.
 */
export function evaluateHumanReviewClaim(
  existing: ExistingClaimState,
  incoming: IncomingClaimInput
): HumanReviewClaimEvaluation {
  const cleanIncomingEmail = incoming.email.toLowerCase().trim();
  const existingEmail =
    existing.email && existing.email.trim().length > 0
      ? existing.email.toLowerCase().trim()
      : null;

  if (existingEmail !== null && existingEmail !== cleanIncomingEmail) {
    return {
      allowed: false,
      reason: 'EMAIL_CLAIM_CONFLICT',
      httpStatus: 409,
      error:
        'Human review has already been requested for this scan by another email address. Please run a new scan if you need a separate review.',
    };
  }

  const cleanBusinessName =
    incoming.businessName && incoming.businessName.trim().length > 0
      ? incoming.businessName.trim()
      : null;
  const cleanOwnerName =
    incoming.ownerName && incoming.ownerName.trim().length > 0
      ? incoming.ownerName.trim()
      : null;
  const cleanCityState =
    incoming.cityState && incoming.cityState.trim().length > 0
      ? incoming.cityState.trim()
      : null;

  const existingBusinessName =
    existing.businessName && existing.businessName.trim().length > 0
      ? existing.businessName.trim()
      : null;
  const existingOwnerName =
    existing.ownerName && existing.ownerName.trim().length > 0
      ? existing.ownerName.trim()
      : null;
  const existingCityState =
    existing.cityState && existing.cityState.trim().length > 0
      ? existing.cityState.trim()
      : null;

  const isInitialClaim = existingEmail === null;

  // On initial claim: allow the requester to provide or override provisional scanner-derived business/city fields.
  // On same-email retry: only backfill fields that are still null; never overwrite established identity fields.
  const resolvedBusinessName = isInitialClaim
    ? cleanBusinessName || existingBusinessName || null
    : existingBusinessName || cleanBusinessName || null;
  const resolvedOwnerName = isInitialClaim
    ? cleanOwnerName || existingOwnerName || null
    : existingOwnerName || cleanOwnerName || null;
  const resolvedCityState = isInitialClaim
    ? cleanCityState || existingCityState || null
    : existingCityState || cleanCityState || null;

  return {
    allowed: true,
    isInitialClaim,
    email: cleanIncomingEmail,
    businessName: resolvedBusinessName,
    ownerName: resolvedOwnerName,
    cityState: resolvedCityState,
    nextStatus: resolvePatchedRealityCheckStatus(existing.status),
  };
}
