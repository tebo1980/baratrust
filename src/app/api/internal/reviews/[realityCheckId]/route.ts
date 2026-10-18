import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { 
  realityChecks, 
  humanReviews, 
  HumanReviewOpportunity, 
  HumanReviewTopFix,
  RealityCheckStatus
} from '@/db/schema';
import { getOperatorUser, isOperatorEmail } from '@/lib/auth/operator';

export const dynamic = 'force-dynamic';

const OpportunitySchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Opportunity title is required'),
  type: z.string().default('General'),
  description: z.string().default(''),
  suggestedAction: z.string().optional(),
  potentialImpact: z.string().optional(),
  evidenceLabel: z.literal('OPPORTUNITY_FOUND').default('OPPORTUNITY_FOUND'),
});

const TopFixSchema = z.object({
  priority: z.number().int().min(1).max(3),
  title: z.string().default(''),
  whyItMatters: z.string().default(''),
  suggestedAction: z.string().default(''),
  evidenceLabel: z.literal('BARATRUST_REVIEW').default('BARATRUST_REVIEW'),
});

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
  reportDraft: z.any().optional().nullable(),
});

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

    // Ensure all opportunities carry the OPPORTUNITY_FOUND label
    const formattedOpportunities: HumanReviewOpportunity[] = data.opportunitiesFound.map((opp) => ({
      ...opp,
      evidenceLabel: 'OPPORTUNITY_FOUND' as const,
    }));

    // Ensure top fixes carry the BARATRUST_REVIEW label
    const formattedTopFixes: HumanReviewTopFix[] = data.topFixes.map((fix, idx) => ({
      ...fix,
      priority: fix.priority || idx + 1,
      evidenceLabel: 'BARATRUST_REVIEW' as const,
    }));

    const reviewerEmail = data.reviewerEmail || operator.email;
    const reviewerName = data.reviewerName || operator.name;
    const isPublishing = data.status === 'published' || data.realityCheckStatus === 'PUBLISHED';
    const now = new Date();

    // Check if human review already exists
    const [existingReview] = await db
      .select()
      .from(humanReviews)
      .where(eq(humanReviews.realityCheckId, realityCheckId))
      .limit(1);

    let reviewId = existingReview?.id;

    if (existingReview) {
      await db
        .update(humanReviews)
        .set({
          reviewerEmail,
          reviewerName,
          status: data.status,
          findabilityTest: data.findabilityTest ?? null,
          reputationSummary: data.reputationSummary ?? null,
          socialPresenceReview: data.socialPresenceReview ?? null,
          competitorComparison: data.competitorComparison ?? null,
          lostOpportunityHunt: data.lostOpportunityHunt ?? null,
          opportunitiesFound: formattedOpportunities,
          topFixes: formattedTopFixes,
          notSpendMoneyOn: data.notSpendMoneyOn ?? null,
          toddNotes: data.toddNotes ?? null,
          ...(data.reportDraft ? { 
            reportDraft: data.reportDraft,
            reportAudit: {
              ...(existingReview.reportAudit || {}),
              lastReportEditAt: now.toISOString(),
            }
          } : {}),
          publishedAt: isPublishing ? (existingReview.publishedAt || now) : null,
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
          status: data.status,
          findabilityTest: data.findabilityTest ?? null,
          reputationSummary: data.reputationSummary ?? null,
          socialPresenceReview: data.socialPresenceReview ?? null,
          competitorComparison: data.competitorComparison ?? null,
          lostOpportunityHunt: data.lostOpportunityHunt ?? null,
          opportunitiesFound: formattedOpportunities,
          topFixes: formattedTopFixes,
          notSpendMoneyOn: data.notSpendMoneyOn ?? null,
          toddNotes: data.toddNotes ?? null,
          reportDraft: data.reportDraft ?? null,
          reportAudit: data.reportDraft ? { lastReportEditAt: now.toISOString() } : null,
          publishedAt: isPublishing ? now : null,
        })
        .returning();
      reviewId = newReview.id;
    }

    // Update parent reality check status
    await db
      .update(realityChecks)
      .set({
        status: data.realityCheckStatus as RealityCheckStatus,
        updatedAt: now,
      })
      .where(eq(realityChecks.id, realityCheckId));

    return NextResponse.json({
      success: true,
      reviewId,
      status: data.status,
      realityCheckStatus: data.realityCheckStatus,
      updatedAt: now.toISOString(),
      message: 'Human review draft successfully persisted.',
    });
  } catch (err: any) {
    console.error('[HUMAN_REVIEW_SAVE_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to save human review' }, { status: 500 });
  }
}
