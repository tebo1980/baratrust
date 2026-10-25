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

export interface PublicFunnelFinding {
  category: string;
  checkKey: string;
  title: string;
  state: 'PASS' | 'FAIL' | 'UNKNOWN';
  scoreContribution?: number;
  maxPoints?: number;
  supportingDetail: string;
}

export type PublicFindingBadgeText =
  | 'PASS'
  | 'ATTENTION'
  | 'HUMAN CHECK'
  | 'INFO · OBSERVED'
  | 'INFO · NOT OBSERVED';

export type PublicFindingBadgeModifier =
  | 'finding-badge--pass'
  | 'finding-badge--attention'
  | 'finding-badge--human';

/**
 * Resolves the public badge text and CSS modifier for a finding card.
 * On standalone websites, zero-point informational checks (maxPoints === 0)
 * render as 'INFO · OBSERVED' or 'INFO · NOT OBSERVED' rather than 'PASS' or 'HUMAN CHECK'.
 */
export function resolvePublicFindingBadge(
  finding: Pick<PublicFunnelFinding, 'state' | 'maxPoints'> & { checkKey?: string },
  isHostedProfile = false
): {
  badgeText: PublicFindingBadgeText;
  badgeModifier: PublicFindingBadgeModifier;
  isInformational: boolean;
} {
  const isBrowserCheck =
    typeof finding.checkKey === 'string' && finding.checkKey.startsWith('browser_');
  const isInformational = !isHostedProfile && (finding.maxPoints ?? 0) === 0;

  if (isInformational && isBrowserCheck) {
    if (finding.state === 'FAIL') {
      return {
        badgeText: 'ATTENTION',
        badgeModifier: 'finding-badge--attention',
        isInformational: true,
      };
    }
    if (finding.state === 'UNKNOWN') {
      return {
        badgeText: 'HUMAN CHECK',
        badgeModifier: 'finding-badge--human',
        isInformational: true,
      };
    }
    return {
      badgeText: 'INFO · OBSERVED',
      badgeModifier: 'finding-badge--human',
      isInformational: true,
    };
  }

  if (isInformational) {
    return {
      badgeText: finding.state === 'PASS' ? 'INFO · OBSERVED' : 'INFO · NOT OBSERVED',
      badgeModifier: 'finding-badge--human',
      isInformational: true,
    };
  }

  if (finding.state === 'PASS') {
    return {
      badgeText: 'PASS',
      badgeModifier: 'finding-badge--pass',
      isInformational: false,
    };
  }
  if (finding.state === 'FAIL') {
    return {
      badgeText: 'ATTENTION',
      badgeModifier: 'finding-badge--attention',
      isInformational: false,
    };
  }
  return {
    badgeText: 'HUMAN CHECK',
    badgeModifier: 'finding-badge--human',
    isInformational: false,
  };
}

/**
 * Partitions scan findings for the public Reality Check funnel:
 * - Exclusively counts scored checks (maxPoints > 0) in passingFindings, failingFindings,
 *   and unknownFindings so zero-point informational or browser checks never inflate passing or
 *   human-verification counts or alter the automated numeric score.
 * - Surfaces up to 1 actionable browser-rendered warning (overflow, desktop/mobile disparity,
 *   or sparse render) in highlightedFindings while keeping static informational checks out of
 *   the initial 6-card highlight list.
 */
export function partitionFunnelFindings<T extends PublicFunnelFinding>(
  findings: T[],
  isHostedProfile = false
): {
  scoredPool: T[];
  informationalFindings: T[];
  passingFindings: T[];
  failingFindings: T[];
  unknownFindings: T[];
  highlightedFindings: T[];
  allScoredFindingsOrdered: T[];
  allFindingsOrdered: T[];
  hiddenFailingCount: number;
} {
  const scoredPool = isHostedProfile
    ? findings
    : findings.filter((f) => (f.maxPoints ?? 0) > 0);
  const rawInformational = isHostedProfile
    ? []
    : findings.filter((f) => (f.maxPoints ?? 0) === 0);

  // Order browser-rendered observations before static informational checks
  const informationalFindings = [
    ...rawInformational.filter((f) => typeof f.checkKey === 'string' && f.checkKey.startsWith('browser_')),
    ...rawInformational.filter((f) => !(typeof f.checkKey === 'string' && f.checkKey.startsWith('browser_'))),
  ];

  const actionableBrowserFindings = isHostedProfile
    ? []
    : informationalFindings.filter(
        (f) =>
          typeof f.checkKey === 'string' &&
          f.checkKey.startsWith('browser_') &&
          (f.state === 'FAIL' ||
            (f.state === 'UNKNOWN' && f.checkKey !== 'browser_render_experience'))
      );

  const passingFindings = scoredPool.filter((f) => f.state === 'PASS');
  const failingFindings = [...scoredPool.filter((f) => f.state === 'FAIL')].sort(
    (a, b) => (b.maxPoints || 0) - (a.maxPoints || 0)
  );
  const unknownFindings = scoredPool.filter((f) => f.state === 'UNKNOWN');

  const highlightedFindings = isHostedProfile
    ? [...passingFindings.slice(0, 4), ...unknownFindings.slice(0, 3)].slice(0, 6)
    : [
        ...failingFindings.slice(0, 3),
        ...passingFindings.slice(0, 3),
        ...unknownFindings.slice(0, actionableBrowserFindings.length > 0 ? 1 : 2),
        ...actionableBrowserFindings.slice(0, 1),
      ].slice(0, 6);

  const allScoredFindingsOrdered = isHostedProfile
    ? [...passingFindings, ...unknownFindings]
    : [...failingFindings, ...unknownFindings, ...passingFindings];

  const allFindingsOrdered = [...allScoredFindingsOrdered, ...informationalFindings];

  const hiddenFailingCount = Math.max(
    0,
    failingFindings.length - highlightedFindings.filter((f) => f.state === 'FAIL').length
  );

  return {
    scoredPool,
    informationalFindings,
    passingFindings,
    failingFindings,
    unknownFindings,
    highlightedFindings,
    allScoredFindingsOrdered,
    allFindingsOrdered,
    hiddenFailingCount,
  };
}

/**
 * Formats the public Reality Check score headline and coverage explanation.
 */
export function buildFunnelScoreSummary(params: {
  overallScore: number;
  overallCoverage: number;
  passingCount: number;
  failingCount: number;
  unknownCount: number;
}): {
  headline: string;
  explanation: string;
} {
  const { overallScore, overallCoverage, passingCount, failingCount, unknownCount } = params;
  const headline =
    overallCoverage < 100
      ? `Automated Score: ${overallScore} / 100 on Evaluated Signals`
      : `Automated Score: ${overallScore} / 100`;

  const explanation =
    overallCoverage < 100
      ? `Score reflects performance on the ${overallCoverage}% of scored checks observable from static HTML (${passingCount} passing, ${failingCount} flagged). The remaining ${
          100 - overallCoverage
        }% (${unknownCount} ${
          unknownCount === 1 ? 'check' : 'checks'
        }) was not evaluated automatically and is deferred to human review.`
      : `Our scanner verified 100% of scored checks (${passingCount} passing, ${failingCount} ${
          failingCount === 1 ? 'area' : 'areas'
        } flagged).`;

  return { headline, explanation };
}

/**
 * Distinguishes newly generated scan snapshots (POST /api/reality-check) from
 * restored historical scan snapshots (GET /api/reality-check?shareToken=...)
 * so users and operators can tell whether they are viewing a saved point-in-time
 * scan or a freshly executed scan without mutating historical findings.
 */
export function resolveFunnelSnapshotHeader(params: {
  isHostedProfile: boolean;
  restoredFromSavedScan?: boolean;
}): {
  eyebrow: string;
  resetActionLabel: string;
} {
  const { isHostedProfile, restoredFromSavedScan = false } = params;
  if (restoredFromSavedScan) {
    return {
      eyebrow: isHostedProfile ? 'Restored Hosted Profile Scan' : 'Restored Scan Snapshot',
      resetActionLabel: 'Run a fresh scan or try another link',
    };
  }
  return {
    eyebrow: isHostedProfile ? 'Limited Automated Scan' : 'Automated Scan Snapshot',
    resetActionLabel: 'Scan a different link',
  };
}
