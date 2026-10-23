import {
  EvaluatedFinding,
  CategoryKey,
  CategoryScore,
  ScoreBreakdown,
  ConfidenceLevel,
  PlatformClassification,
} from './types';

export const CATEGORY_CONFIG: Record<CategoryKey, { label: string; weight: number }> = {
  digital_presence: { label: 'Digital Presence', weight: 0.20 },
  customer_journey: { label: 'Customer Journey', weight: 0.25 },
  trust_reputation: { label: 'Trust & Reputation', weight: 0.20 },
  local_discovery: { label: 'Local Discovery', weight: 0.20 },
  opportunity_capture: { label: 'Opportunity Capture', weight: 0.15 },
};

function getConfidenceLevel(coveragePercent: number): ConfidenceLevel {
  if (coveragePercent >= 80) return 'HIGH';
  if (coveragePercent >= 50) return 'MEDIUM';
  if (coveragePercent > 0) return 'LOW';
  return 'INSUFFICIENT';
}

/**
 * Calculates category scores, coverage, and the overall weighted score from deterministic findings.
 * - category score = performance on evidence we can legitimately evaluate
 * - category coverage/confidence = percentage of expected evidence actually evaluated
 * - does not invent failing evidence when something is UNKNOWN
 * - withholds numeric overallScore for hosted third-party profiles/pages or when
 *   static HTML coverage / category diversity is insufficient (e.g. client-rendered SPA shells)
 */
export function calculateScores(
  findings: EvaluatedFinding[],
  platform?: PlatformClassification
): {
  overallScore: number | null;
  overallCoverage: number;
  confidence: ConfidenceLevel;
  scoreBreakdown: ScoreBreakdown | null;
  categoryScores: CategoryScore[];
} {
  const isHostedProfile = Boolean(platform?.isHostedProfile);

  const categoryScores: CategoryScore[] = (Object.keys(CATEGORY_CONFIG) as CategoryKey[]).map(cat => {
    const catFindings = findings.filter(f => f.category === cat);
    // Scored checks (exclude informational observations from point totals)
    const scoredFindings = catFindings.filter(f => !f.isInformational && f.maxPoints > 0);
    const totalMax = scoredFindings.reduce((sum, f) => sum + f.maxPoints, 0) || 100;

    const evaluatedFindings = scoredFindings.filter(f => f.state !== 'UNKNOWN');
    const evaluatedMax = evaluatedFindings.reduce((sum, f) => sum + f.maxPoints, 0);
    const earned = scoredFindings.reduce((sum, f) => sum + (f.state === 'PASS' ? f.scoreContribution : 0), 0);

    const coveragePercent = totalMax > 0 
      ? Math.min(100, Math.max(0, Math.round((evaluatedMax / totalMax) * 100))) 
      : 0;

    const confidence = getConfidenceLevel(coveragePercent);

    let score: number | null = null;
    if (!isHostedProfile && evaluatedMax > 0) {
      score = Math.min(100, Math.max(0, Math.round((earned / evaluatedMax) * 100)));
    }

    return {
      category: cat,
      label: CATEGORY_CONFIG[cat].label,
      weight: CATEGORY_CONFIG[cat].weight,
      score,
      coveragePercent,
      confidence,
      earnedPoints: earned,
      evaluatedMaxPoints: evaluatedMax,
      maxPoints: totalMax,
      evaluableCheckCount: evaluatedFindings.length,
      totalCheckCount: scoredFindings.length,
      unknownCheckCount: scoredFindings.filter(f => f.state === 'UNKNOWN').length,
    };
  });

  // Calculate weighted overall coverage
  const overallCoverage = Math.round(
    categoryScores.reduce((sum, cs) => sum + cs.coveragePercent * cs.weight, 0)
  );

  const overallConfidence = getConfidenceLevel(overallCoverage);

  // Epistemic score-withholding rule:
  // A numeric overall website score is only defensible when:
  // 1. The target is a standalone website (!isHostedProfile)
  // 2. Overall weighted coverage reaches at least MEDIUM confidence (overallCoverage >= 50)
  // 3. At least 3 of the 5 categories have meaningful evaluable coverage (coveragePercent >= 50),
  //    preventing HTTP/<head>-only Digital Presence + 1 stray check on a client-rendered SPA shell
  //    from masquerading as a full website score
  // 4. At least one core customer-facing body category (Customer Journey or Trust & Reputation)
  //    has evaluable evidence (score !== null)
  // 5. Evaluable category weights represent at least 60% of total weight (evaluableWeight >= 0.60)
  const categoriesWithMeaningfulCoverage = categoryScores.filter(
    (cs) => cs.score !== null && cs.coveragePercent >= 50
  ).length;
  const hasCoreBodyCategory = categoryScores.some(
    (cs) =>
      (cs.category === 'customer_journey' || cs.category === 'trust_reputation') &&
      cs.score !== null &&
      cs.coveragePercent > 0
  );

  let weightedSum = 0;
  let evaluableWeight = 0;
  for (const cs of categoryScores) {
    if (cs.score !== null) {
      weightedSum += cs.score * cs.weight;
      evaluableWeight += cs.weight;
    }
  }

  let overallScore: number | null = null;
  if (
    !isHostedProfile &&
    overallCoverage >= 50 &&
    categoriesWithMeaningfulCoverage >= 3 &&
    hasCoreBodyCategory &&
    evaluableWeight >= 0.6
  ) {
    overallScore = Math.min(100, Math.max(0, Math.round(weightedSum / evaluableWeight)));
  }

  const dp = categoryScores.find(c => c.category === 'digital_presence');
  const cj = categoryScores.find(c => c.category === 'customer_journey');
  const tr = categoryScores.find(c => c.category === 'trust_reputation');
  const ld = categoryScores.find(c => c.category === 'local_discovery');
  const oc = categoryScores.find(c => c.category === 'opportunity_capture');

  const scoreBreakdown: ScoreBreakdown = {
    digitalPresence: dp?.score ?? null,
    customerJourney: cj?.score ?? null,
    trustReputation: tr?.score ?? null,
    localDiscovery: ld?.score ?? null,
    opportunityCapture: oc?.score ?? null,
    sourceType: platform?.sourceType ?? 'standalone_website',
    platformKey: platform?.platformKey ?? null,
    platformLabel: platform?.platformLabel ?? null,
    coverage: {
      overall: overallCoverage,
      confidence: overallConfidence,
      digitalPresence: dp?.coveragePercent ?? 0,
      customerJourney: cj?.coveragePercent ?? 0,
      trustReputation: tr?.coveragePercent ?? 0,
      localDiscovery: ld?.coveragePercent ?? 0,
      opportunityCapture: oc?.coveragePercent ?? 0,
    },
  };

  return {
    overallScore,
    overallCoverage,
    confidence: overallConfidence,
    scoreBreakdown: overallCoverage > 0 || isHostedProfile ? scoreBreakdown : null,
    categoryScores,
  };
}
