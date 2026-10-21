import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { 
  realityChecks, 
  humanReviews, 
  HumanReviewOpportunity, 
  HumanReviewTopFix,
  HumanIntelligenceLayer,
  HumanEvidenceCitation,
  RealityCheckStatus
} from '@/db/schema';
import { getOperatorUser, isOperatorEmail } from '@/lib/auth/operator';

export const dynamic = 'force-dynamic';

const EvidenceCitationSchema = z.object({
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
  note: z.string().optional(),
  observedAt: z.string().optional(),
  clientVisible: z.boolean().optional(),
}).optional().nullable();

const OpportunitySchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Opportunity title is required'),
  type: z.string().default('General'),
  description: z.string().default(''),
  suggestedAction: z.string().optional(),
  potentialImpact: z.string().optional(),
  evidence: EvidenceCitationSchema,
  evidenceLabel: z.literal('OPPORTUNITY_FOUND').default('OPPORTUNITY_FOUND'),
});

const TopFixSchema = z.object({
  priority: z.number().int().min(1).max(3),
  title: z.string().default(''),
  whyItMatters: z.string().default(''),
  suggestedAction: z.string().default(''),
  evidence: EvidenceCitationSchema,
  evidenceLabel: z.literal('BARATRUST_REVIEW').default('BARATRUST_REVIEW'),
});

const BrandRealitySchema = z.object({
  apparentBrandMessage: z.string().optional(),
  messageClarity: z.enum(['OBVIOUS', 'SOMEWHAT_CLEAR', 'UNCLEAR', 'UNKNOWN']).optional(),
  consistencyNotes: z.string().optional(),
  brandCustomerMismatch: z.string().optional(),
  strongestBrandOpportunity: z.string().optional(),
  mysteryShopImpression: z.string().optional(),
  evidence: EvidenceCitationSchema,
}).optional().nullable();

const CustomerVoiceSchema = z.object({
  topLoves: z.array(z.string()).max(5).optional(),
  topComplaints: z.array(z.string()).max(5).optional(),
  recurringThemes: z.string().optional(),
  unmarketedStrengths: z.string().optional(),
  evidence: EvidenceCitationSchema,
}).optional().nullable();

const AdPresenceSchema = z.preprocess(
  (val) => (val === 'YES' ? 'OBSERVED' : val === 'NO' ? 'NOT_OBSERVED' : val),
  z.enum(['OBSERVED', 'NOT_OBSERVED', 'UNKNOWN']).optional()
);

const AdvertisingFunnelSchema = z.object({
  adPresence: AdPresenceSchema,
  platformsObserved: z.string().optional(),
  offerSummary: z.string().optional(),
  landingPageQuality: z.string().optional(),
  adToFunnelMismatch: z.string().optional(),
  recommendation: z.enum(['CONTINUE', 'IMPROVE_FUNNEL_FIRST', 'DEPRIORITIZE_ADS', 'UNKNOWN']).optional(),
  recommendationNote: z.string().optional(),
  evidence: EvidenceCitationSchema,
}).optional().nullable();

const GhostFootprintItemSchema = z.object({
  id: z.string(),
  assetType: z.string().default('Other Legacy Asset'),
  summary: z.string().default(''),
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
  evidenceNote: z.string().optional(),
  observedAt: z.string().optional(),
  clientVisible: z.boolean().optional(),
  customerImpact: z.string().optional(),
  recommendedFix: z.string().optional(),
  evidenceLabel: z.literal('BARATRUST_REVIEW').default('BARATRUST_REVIEW'),
});

const HumanIntelligenceSchema = z.object({
  brandReality: BrandRealitySchema,
  customerVoice: CustomerVoiceSchema,
  advertisingFunnel: AdvertisingFunnelSchema,
  ghostFootprint: z.array(GhostFootprintItemSchema).optional(),
}).optional().nullable();

const SaveReviewSchema = z.object({
  status: z.enum(['draft', 'in_review', 'ready_to_publish', 'published']).default('draft'),
  realityCheckStatus: z.enum([
    'NEW',
    'AUTO_SCAN_COMPLETE',
    'NEEDS_HUMAN_REVIEW',
    'IN_REVIEW',
    'READY_TO_PUBLISH',
    'PUBLISHED',
  ]).default('IN_REVIEW'),
  reviewerEmail: z.string().optional(),
  reviewerName: z.string().optional(),
  findabilityTest: z.string().optional().nullable(),
  reputationSummary: z.string().optional().nullable(),
  socialPresenceReview: z.string().optional().nullable(),
  competitorComparison: z.string().optional().nullable(),
  lostOpportunityHunt: z.string().optional().nullable(),
  opportunitiesFound: z.array(OpportunitySchema).default([]),
  topFixes: z.array(TopFixSchema).default([]),
  notSpendMoneyOn: z.string().optional().nullable(),
  toddNotes: z.string().optional().nullable(),
  humanIntelligence: HumanIntelligenceSchema,
  reportDraft: z.any().optional().nullable(),
});

function normalizeEvidenceCitation(
  ev?: HumanEvidenceCitation | null,
  defaultDate?: string
): HumanEvidenceCitation | null {
  if (!ev) return null;
  const source = ev.source?.trim() || undefined;
  const sourceUrl = ev.sourceUrl?.trim() || undefined;
  const note = ev.note?.trim() || undefined;
  if (!source && !sourceUrl && !note) return null;
  return {
    source,
    sourceUrl,
    note,
    observedAt: ev.observedAt?.trim() || defaultDate,
    clientVisible: Boolean(ev.clientVisible),
  };
}

export async function POST(
  req: Request,
  { params }: { params: { realityCheckId: string } }
) {
  try {
    const operator = await getOperatorUser();
    if (!operator || !operator.isOperator) {
      return NextResponse.json(
        { error: 'Unauthorized: Operator review privileges required' },
        { status: 403 }
      );
    }

    const { realityCheckId } = params;
    if (!realityCheckId) {
      return NextResponse.json({ error: 'Reality check ID is required' }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const validation = SaveReviewSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg = validation.error.issues[0]?.message || 'Validation error';
      return NextResponse.json({ error: errorMsg, details: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;

    // Verify reality check exists
    const [check] = await db
      .select()
      .from(realityChecks)
      .where(eq(realityChecks.id, realityCheckId))
      .limit(1);

    if (!check) {
      return NextResponse.json({ error: 'Reality check record not found' }, { status: 404 });
    }

    const reviewerEmail = data.reviewerEmail || operator.email;
    const reviewerName = data.reviewerName || operator.name;
    const now = new Date();
    const todayDateStr = now.toISOString().slice(0, 10);

    // Ensure all opportunities carry the OPPORTUNITY_FOUND label and normalized evidence
    const formattedOpportunities: HumanReviewOpportunity[] = data.opportunitiesFound.map((opp) => ({
      ...opp,
      evidence: normalizeEvidenceCitation(opp.evidence, todayDateStr),
      evidenceLabel: 'OPPORTUNITY_FOUND' as const,
    }));

    // Ensure top fixes carry the BARATRUST_REVIEW label and normalized evidence
    const formattedTopFixes: HumanReviewTopFix[] = data.topFixes.map((fix, idx) => ({
      ...fix,
      priority: fix.priority || idx + 1,
      evidence: normalizeEvidenceCitation(fix.evidence, todayDateStr),
      evidenceLabel: 'BARATRUST_REVIEW' as const,
    }));

    const formattedHumanIntelligence: HumanIntelligenceLayer | null | undefined =
      data.humanIntelligence === undefined
        ? undefined
        : data.humanIntelligence === null
        ? null
        : {
            brandReality: data.humanIntelligence.brandReality
              ? {
                  ...data.humanIntelligence.brandReality,
                  evidence: normalizeEvidenceCitation(
                    data.humanIntelligence.brandReality.evidence,
                    todayDateStr
                  ),
                }
              : null,
            customerVoice: data.humanIntelligence.customerVoice
              ? {
                  ...data.humanIntelligence.customerVoice,
                  topLoves: (data.humanIntelligence.customerVoice.topLoves || [])
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 3),
                  topComplaints: (data.humanIntelligence.customerVoice.topComplaints || [])
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 3),
                  evidence: normalizeEvidenceCitation(
                    data.humanIntelligence.customerVoice.evidence,
                    todayDateStr
                  ),
                }
              : null,
            advertisingFunnel: data.humanIntelligence.advertisingFunnel
              ? {
                  ...data.humanIntelligence.advertisingFunnel,
                  adPresence: data.humanIntelligence.advertisingFunnel.adPresence || 'UNKNOWN',
                  recommendation:
                    data.humanIntelligence.advertisingFunnel.recommendation || 'UNKNOWN',
                  evidence: normalizeEvidenceCitation(
                    data.humanIntelligence.advertisingFunnel.evidence,
                    todayDateStr
                  ),
                }
              : null,
            ghostFootprint: (data.humanIntelligence.ghostFootprint || [])
              .filter(
                (g) =>
                  (g.summary && g.summary.trim().length > 0) ||
                  (g.sourceUrl && g.sourceUrl.trim().length > 0) ||
                  (g.evidenceNote && g.evidenceNote.trim().length > 0)
              )
              .map((g) => ({
                ...g,
                observedAt: g.observedAt?.trim() || todayDateStr,
                clientVisible: Boolean(g.clientVisible),
                evidenceLabel: 'BARATRUST_REVIEW' as const,
              })),
          };

    // Check if human review already exists
    const [existingReview] = await db
      .select()
      .from(humanReviews)
      .where(eq(humanReviews.realityCheckId, realityCheckId))
      .limit(1);

    let reviewId = existingReview?.id;

    // Safeguard: Never allow a draft save to downgrade an already-published report or clear publishedAt
    const alreadyPublished =
      existingReview?.status === 'published' ||
      Boolean(existingReview?.publishedReport) ||
      check.status === 'PUBLISHED';

    const effectiveReviewStatus = alreadyPublished
      ? 'published'
      : data.status === 'published'
      ? 'ready_to_publish'
      : data.status;

    const effectiveCheckStatus: RealityCheckStatus = alreadyPublished
      ? 'PUBLISHED'
      : data.realityCheckStatus === 'PUBLISHED'
      ? 'READY_TO_PUBLISH'
      : (data.realityCheckStatus as RealityCheckStatus);

    if (existingReview) {
      await db
        .update(humanReviews)
        .set({
          reviewerEmail,
          reviewerName,
          status: effectiveReviewStatus,
          findabilityTest: data.findabilityTest ?? null,
          reputationSummary: data.reputationSummary ?? null,
          socialPresenceReview: data.socialPresenceReview ?? null,
          competitorComparison: data.competitorComparison ?? null,
          lostOpportunityHunt: data.lostOpportunityHunt ?? null,
          opportunitiesFound: formattedOpportunities,
          topFixes: formattedTopFixes,
          notSpendMoneyOn: data.notSpendMoneyOn ?? null,
          toddNotes: data.toddNotes ?? null,
          ...(formattedHumanIntelligence !== undefined
            ? { humanIntelligence: formattedHumanIntelligence }
            : {}),
          ...(data.reportDraft ? { 
            reportDraft: data.reportDraft,
            reportAudit: {
              ...(existingReview.reportAudit || {}),
              lastReportEditAt: now.toISOString(),
            }
          } : {}),
          publishedAt: existingReview.publishedAt || null,
          updatedAt: now,
        })
        .where(eq(humanReviews.id, existingReview.id));
    } else {
      const [newReview] = await db
        .insert(humanReviews)
        .values({
          realityCheckId,
          reviewerEmail,
          reviewerName,
          status: effectiveReviewStatus,
          findabilityTest: data.findabilityTest ?? null,
          reputationSummary: data.reputationSummary ?? null,
          socialPresenceReview: data.socialPresenceReview ?? null,
          competitorComparison: data.competitorComparison ?? null,
          lostOpportunityHunt: data.lostOpportunityHunt ?? null,
          opportunitiesFound: formattedOpportunities,
          topFixes: formattedTopFixes,
          notSpendMoneyOn: data.notSpendMoneyOn ?? null,
          toddNotes: data.toddNotes ?? null,
          humanIntelligence: formattedHumanIntelligence ?? null,
          reportDraft: data.reportDraft ?? null,
          reportAudit: data.reportDraft ? { lastReportEditAt: now.toISOString() } : null,
          publishedAt: null,
        })
        .returning();
      reviewId = newReview.id;
    }

    // Update parent reality check status
    await db
      .update(realityChecks)
      .set({
        status: effectiveCheckStatus,
        updatedAt: now,
      })
      .where(eq(realityChecks.id, realityCheckId));

    return NextResponse.json({
      success: true,
      reviewId,
      status: effectiveReviewStatus,
      realityCheckStatus: effectiveCheckStatus,
      updatedAt: now.toISOString(),
      message: 'Human review draft successfully persisted.',
    });
  } catch (err: any) {
    console.error('[HUMAN_REVIEW_SAVE_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to save human review' }, { status: 500 });
  }
}
