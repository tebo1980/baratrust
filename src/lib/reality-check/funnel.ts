import { z } from 'zod';
import { sanitizePlainText } from '@/lib/security/public-guard';

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
  // Hidden honeypot field — never filled by human visitors
  websiteConfirm: z.string().max(200).optional().nullable(),
});

export const PreferredFollowUpMethodEnum = z.enum(['EMAIL', 'PHONE', 'INTRO_CALL']);
export type PreferredFollowUpMethod = z.infer<typeof PreferredFollowUpMethodEnum>;

/**
 * Step 3 ("Discuss My Results" / Follow-Up): Attach email (and optional contact preference,
 * phone, note, businessName, ownerName, cityState) to an existing Reality Check via its
 * unguessable shareToken, transitioning it into the operator follow-up / review queue.
 */
export const RequestHumanReviewSchema = z.object({
  shareToken: z.string().trim().min(16, 'Valid scan token is required').max(128),
  email: z.string().trim().email('Please enter a valid email address').max(200),
  businessName: z.string().trim().max(200).optional().nullable(),
  ownerName: z.string().trim().max(100).optional().nullable(),
  cityState: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  preferredContactMethod: PreferredFollowUpMethodEnum.optional().nullable(),
  followUpNote: z.string().trim().max(1500).optional().nullable(),
  // Hidden honeypot field — never filled by human visitors
  websiteConfirm: z.string().max(200).optional().nullable(),
});

const PRESERVED_ADVANCED_STATUSES = new Set([
  'IN_REVIEW',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'completed',
]);

const IMMUTABLE_FOLLOWUP_STATUSES = new Set([
  'PUBLISHED',
  'completed',
  'archived',
]);

/**
 * Anonymous URL-only scans remain in 'AUTO_SCAN_COMPLETE' so they do not clutter
 * Todd & Noelah's active human-review queue until follow-up is requested.
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

export function formatDiscussResultsContext(params: {
  preferredContactMethod?: PreferredFollowUpMethod | null;
  followUpNote?: string | null;
}): string | null {
  const cleanNote = sanitizePlainText(params.followUpNote, { maxLength: 1400, multiline: true });
  const methodLabel =
    params.preferredContactMethod === 'PHONE'
      ? 'Preferred: Phone call'
      : params.preferredContactMethod === 'INTRO_CALL'
      ? 'Preferred: 15-min intro call'
      : params.preferredContactMethod === 'EMAIL'
      ? 'Preferred: Email'
      : null;

  if (methodLabel && cleanNote) {
    return `[${methodLabel}] ${cleanNote}`;
  }
  if (cleanNote) {
    return cleanNote;
  }
  if (methodLabel) {
    return `[${methodLabel}] Requested follow-up to discuss Reality Check results.`;
  }
  return null;
}

export interface ExistingClaimState {
  email: string | null;
  businessName: string | null;
  ownerName: string | null;
  cityState: string | null;
  phone?: string | null;
  primaryHeadache?: string | null;
  status: string;
}

export interface IncomingClaimInput {
  email: string;
  businessName?: string | null;
  ownerName?: string | null;
  cityState?: string | null;
  phone?: string | null;
  preferredContactMethod?: PreferredFollowUpMethod | null;
  followUpNote?: string | null;
}

export type HumanReviewClaimEvaluation =
  | {
      allowed: false;
      reason: 'EMAIL_CLAIM_CONFLICT' | 'RECORD_LOCKED';
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
      phone: string | null;
      primaryHeadache: string | null;
      nextStatus: string;
    };

/**
 * Enforces human-review / "Discuss My Results" claim integrity:
 * - Published or archived Reality Checks are immutable and reject follow-up mutations (409 RECORD_LOCKED).
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
  if (IMMUTABLE_FOLLOWUP_STATUSES.has(existing.status)) {
    return {
      allowed: false,
      reason: 'RECORD_LOCKED',
      httpStatus: 409,
      error:
        'This Reality Check record has already been finalized and cannot be modified. Please run a new scan or contact Todd & Noelah directly.',
    };
  }

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
        'Follow-up has already been requested for this scan by another email address. Please run a new scan if you need a separate review.',
    };
  }

  const cleanBusinessName = sanitizePlainText(incoming.businessName, { maxLength: 200 });
  const cleanOwnerName = sanitizePlainText(incoming.ownerName, { maxLength: 100 });
  const cleanCityState = sanitizePlainText(incoming.cityState, { maxLength: 100 });
  const cleanPhone = sanitizePlainText(incoming.phone, { maxLength: 50 });
  const cleanDiscussContext = formatDiscussResultsContext({
    preferredContactMethod: incoming.preferredContactMethod,
    followUpNote: incoming.followUpNote,
  });

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
  const existingPhone =
    existing.phone && existing.phone.trim().length > 0
      ? existing.phone.trim()
      : null;
  const existingHeadache =
    existing.primaryHeadache && existing.primaryHeadache.trim().length > 0
      ? existing.primaryHeadache.trim()
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
  const resolvedPhone = isInitialClaim
    ? cleanPhone || existingPhone || null
    : existingPhone || cleanPhone || null;
  const resolvedHeadache = isInitialClaim
    ? cleanDiscussContext || existingHeadache || null
    : existingHeadache || cleanDiscussContext || null;

  return {
    allowed: true,
    isInitialClaim,
    email: cleanIncomingEmail,
    businessName: resolvedBusinessName,
    ownerName: resolvedOwnerName,
    cityState: resolvedCityState,
    phone: resolvedPhone,
    primaryHeadache: resolvedHeadache,
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
  observedValue?: any;
  evidenceSource?: string | null;
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
  finding: Pick<PublicFunnelFinding, 'state' | 'maxPoints'> & {
    checkKey?: string;
    supportingDetail?: string | null;
    observedValue?: any;
  },
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
    if (finding.state === 'FAIL') {
      return {
        badgeText: 'ATTENTION',
        badgeModifier: 'finding-badge--attention',
        isInformational: true,
      };
    }
    const detail = (finding.supportingDetail || '').trim();
    const obsState = finding.observedValue?.observationState;
    if (obsState === 'NOT_OBSERVED') {
      return {
        badgeText: 'INFO · NOT OBSERVED',
        badgeModifier: 'finding-badge--human',
        isInformational: true,
      };
    }
    const isDeferredUnknown =
      finding.state === 'UNKNOWN' &&
      (obsState === 'UNKNOWN' ||
        finding.observedValue?.isClientRenderedSpa === true ||
        finding.observedValue?.viewportDiscrepancy === true ||
        finding.observedValue?.status === 'SCAN_DEFERRED' ||
        /^(?:client-rendered|check deferred|could not\b)/i.test(detail) ||
        /deferred to (?:browser or )?human review/i.test(detail));
    if (isDeferredUnknown) {
      return {
        badgeText: 'HUMAN CHECK',
        badgeModifier: 'finding-badge--human',
        isInformational: true,
      };
    }
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

export type FindingDisplayPriority = 'HIGH' | 'NORMAL' | 'LOW';

const HIGH_PRIORITY_CHECK_KEYS = new Set<string>([
  'inquiry_or_contact_path',
  'lead_capture_form',
  'quote_or_action_path',
  'cta_keywords_found',
  'phone_number_visible',
  'has_tel_link',
  'https_enabled',
  'page_responds',
  'mobile_viewport',
  'declared_domain_mismatch',
  'terms_privacy',
  'menu_or_services',
  'address_signals',
  'browser_horizontal_overflow',
  'browser_sparse_render',
  'browser_viewport_comparison',
  'profile_phone_or_contact',
  'profile_action_cta',
  'profile_hours_visible',
]);

const LOW_PRIORITY_CHECK_KEYS = new Set<string>([
  'has_favicon',
  'about_team_signals',
  'opengraph_presence',
  'meta_description',
  'social_links',
  'public_pricing_observed',
  'online_booking_observed',
  'reviews_testimonials',
  'map_embed_present',
  'email_list_capture',
  'lead_magnet_observed',
  'after_hours_messaging',
]);

/**
 * Deterministic display priority map separating detection state (PASS / ATTENTION / HUMAN CHECK / INFO)
 * from headline prominence (HIGH / NORMAL / LOW). Presentation-only; never alters numeric scores.
 */
export function getFindingDisplayPriority(finding: {
  checkKey?: string;
  maxPoints?: number;
  state?: 'PASS' | 'FAIL' | 'UNKNOWN';
}): FindingDisplayPriority {
  const key = finding.checkKey || '';
  if (HIGH_PRIORITY_CHECK_KEYS.has(key)) return 'HIGH';
  if (LOW_PRIORITY_CHECK_KEYS.has(key)) return 'LOW';
  return 'NORMAL';
}

function displayPriorityRank(priority: FindingDisplayPriority): number {
  if (priority === 'HIGH') return 2;
  if (priority === 'NORMAL') return 1;
  return 0;
}

function sortByDisplayRelevance<T extends PublicFunnelFinding>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const rankDiff =
      displayPriorityRank(getFindingDisplayPriority(b)) -
      displayPriorityRank(getFindingDisplayPriority(a));
    if (rankDiff !== 0) return rankDiff;
    return (b.maxPoints || 0) - (a.maxPoints || 0);
  });
}

/**
 * Partitions scan findings for the public Reality Check funnel:
 * - Exclusively counts scored checks (maxPoints > 0) in passingFindings, failingFindings,
 *   and unknownFindings so zero-point informational or browser checks never inflate passing or
 *   human-verification counts or alter the automated numeric score.
 * - Uses deterministic display priority (HIGH / NORMAL / LOW) so customer-impacting and
 *   credibility-impacting findings appear in the top 6 highlights while low-impact housekeeping
 *   checks (such as missing favicon) remain accessible in the expanded list.
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

  // Order actionable advisory & browser-rendered observations before passive static informational checks
  const informationalFindings = [
    ...sortByDisplayRelevance(
      rawInformational.filter(
        (f) => f.state === 'FAIL' || (typeof f.checkKey === 'string' && f.checkKey.startsWith('browser_'))
      )
    ),
    ...rawInformational.filter(
      (f) => !(f.state === 'FAIL' || (typeof f.checkKey === 'string' && f.checkKey.startsWith('browser_')))
    ),
  ];

  const actionableAdvisoryFindings = isHostedProfile
    ? []
    : sortByDisplayRelevance(
        informationalFindings.filter(
          (f) =>
            f.state === 'FAIL' ||
            (typeof f.checkKey === 'string' &&
              f.checkKey.startsWith('browser_') &&
              f.state === 'UNKNOWN' &&
              f.checkKey !== 'browser_render_experience')
        )
      );

  const getStaticPoolState = (f: T): 'PASS' | 'FAIL' | 'UNKNOWN' => {
    if (f.evidenceSource === 'BROWSER_RENDER') {
      const prior = f.observedValue?.staticState;
      return prior === 'PASS' || prior === 'FAIL' ? prior : 'UNKNOWN';
    }
    return f.state;
  };
  const passingFindings = scoredPool.filter((f) => getStaticPoolState(f) === 'PASS');
  const failingFindings = sortByDisplayRelevance(
    scoredPool.filter((f) => getStaticPoolState(f) === 'FAIL')
  );
  const unknownFindings = scoredPool.filter((f) => getStaticPoolState(f) === 'UNKNOWN');

  const displayPassingFindings = sortByDisplayRelevance(
    scoredPool.filter((f) => f.state === 'PASS')
  );
  const displayFailingFindings = sortByDisplayRelevance(
    scoredPool.filter((f) => f.state === 'FAIL')
  );
  const displayUnknownFindings = sortByDisplayRelevance(
    scoredPool.filter((f) => f.state === 'UNKNOWN')
  );

  let highlightedFindings: T[];
  if (isHostedProfile) {
    highlightedFindings = [
      ...displayPassingFindings.slice(0, 4),
      ...displayUnknownFindings.slice(0, 3),
    ].slice(0, 6);
  } else {
    const primaryFailing = displayFailingFindings.filter(
      (f) => getFindingDisplayPriority(f) !== 'LOW'
    );
    const lowPriorityFailing = displayFailingFindings.filter(
      (f) => getFindingDisplayPriority(f) === 'LOW'
    );
    const primaryPassing = displayPassingFindings.filter(
      (f) => getFindingDisplayPriority(f) !== 'LOW'
    );
    const lowPriorityPassing = displayPassingFindings.filter(
      (f) => getFindingDisplayPriority(f) === 'LOW'
    );
    const primaryUnknown = displayUnknownFindings.filter(
      (f) => getFindingDisplayPriority(f) !== 'LOW'
    );
    const lowPriorityUnknown = displayUnknownFindings.filter(
      (f) => getFindingDisplayPriority(f) === 'LOW'
    );

    const topFailing = primaryFailing.slice(0, 3);
    const advisoryQuota = Math.min(
      actionableAdvisoryFindings.length,
      Math.max(1, 3 - topFailing.length)
    );
    const topAdvisory = actionableAdvisoryFindings.slice(0, advisoryQuota);
    const topPassing = primaryPassing.slice(0, 3);

    const candidateOrder: T[] = [
      ...topFailing,
      ...topAdvisory,
      ...topPassing,
      ...primaryUnknown,
      ...primaryFailing.slice(3),
      ...actionableAdvisoryFindings.slice(advisoryQuota),
      ...primaryPassing.slice(3),
      ...lowPriorityFailing,
      ...lowPriorityUnknown,
      ...lowPriorityPassing,
    ];

    highlightedFindings = [];
    const seenKeys = new Set<string>();
    for (const item of candidateOrder) {
      if (highlightedFindings.length >= 6) break;
      const key = item.checkKey || item.title;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        highlightedFindings.push(item);
      }
    }
  }

  const allScoredFindingsOrdered = isHostedProfile
    ? [...displayPassingFindings, ...displayUnknownFindings]
    : [...displayFailingFindings, ...displayUnknownFindings, ...displayPassingFindings];

  const allFindingsOrdered = [...allScoredFindingsOrdered, ...informationalFindings];

  const hiddenFailingCount = Math.max(
    0,
    displayFailingFindings.length -
      highlightedFindings.filter((f) => (f.maxPoints ?? 0) > 0 && f.state === 'FAIL').length
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
 * Formats the public Reality Check score headline and point-weighted coverage explanation.
 * Ensures internal consistency between weighted static HTML coverage %, evaluated checks,
 * unknown checks, passing checks, and flagged checks — never emitting contradictory copy
 * such as "remaining X% (0 checks)".
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
  const evaluatedCount = passingCount + failingCount;
  const totalCount = evaluatedCount + unknownCount;
  const remainingCoverage = Math.max(0, 100 - overallCoverage);

  const headline =
    overallCoverage < 100 || unknownCount > 0
      ? `Automated Score: ${overallScore} / 100 on Evaluated Signals`
      : `Automated Score: ${overallScore} / 100`;

  let explanation: string;
  if (overallCoverage >= 100 && unknownCount === 0) {
    explanation = `Score reflects 100% of point-weighted static HTML scoring signals across all ${evaluatedCount} scored checks (${passingCount} passing, ${failingCount} ${
      failingCount === 1 ? 'area' : 'areas'
    } flagged).`;
  } else if (overallCoverage < 100 && unknownCount === 0) {
    explanation = `Score reflects ${overallCoverage}% of point-weighted static HTML scoring signals (${passingCount} passing, ${failingCount} flagged across all ${evaluatedCount} applicable scored ${
      evaluatedCount === 1 ? 'check' : 'checks'
    }; categories carry different scoring weights).`;
  } else if (overallCoverage >= 100 && unknownCount > 0) {
    explanation = `Score reflects ${overallCoverage}% of point-weighted static HTML scoring signals (${passingCount} passing, ${failingCount} flagged across ${evaluatedCount} of ${totalCount} scored checks), with ${unknownCount} ${
      unknownCount === 1 ? 'check' : 'checks'
    } deferred to human review.`;
  } else {
    explanation = `Score reflects ${overallCoverage}% of point-weighted static HTML scoring signals (${passingCount} passing, ${failingCount} flagged across ${evaluatedCount} of ${totalCount} scored checks). The remaining ${remainingCoverage}% of weighted points (${unknownCount} ${
      unknownCount === 1 ? 'check' : 'checks'
    }) is deferred to human review.`;
  }

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
