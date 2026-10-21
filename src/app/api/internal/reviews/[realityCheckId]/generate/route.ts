import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { 
  realityChecks, 
  scanFindings, 
  ownerResponses, 
  humanReviews 
} from '@/db/schema';
import { getOperatorUser } from '@/lib/auth/operator';
import { 
  synthesizeReportWithGemini, 
  SynthesisEvidencePackage 
} from '@/lib/gemini/synthesizer';

export const dynamic = 'force-dynamic';

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

    // 1. Fetch reality check record
    const [check] = await db
      .select()
      .from(realityChecks)
      .where(eq(realityChecks.id, realityCheckId))
      .limit(1);

    if (!check) {
      return NextResponse.json({ error: 'Reality check record not found' }, { status: 404 });
    }

    // 2. Fetch scan findings
    const findings = await db
      .select()
      .from(scanFindings)
      .where(eq(scanFindings.realityCheckId, realityCheckId));

    // 3. Fetch owner questionnaire responses
    const [ownerResp] = await db
      .select()
      .from(ownerResponses)
      .where(eq(ownerResponses.realityCheckId, realityCheckId))
      .limit(1);

    // 4. Fetch human review notes
    const [existingReview] = await db
      .select()
      .from(humanReviews)
      .where(eq(humanReviews.realityCheckId, realityCheckId))
      .limit(1);

    const isHostedProfile = check.scoreBreakdown?.sourceType === 'hosted_profile';
    const cleanTargetLabel = isHostedProfile
      ? check.scoreBreakdown?.platformLabel
        ? `your ${check.scoreBreakdown.platformLabel}`
        : check.website.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
      : check.website.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0] || check.website;

    // Build complete, source-labeled evidence package
    const evidencePkg: SynthesisEvidencePackage = {
      business: {
        name: check.businessName || cleanTargetLabel,
        website: check.website,
        cityState: check.cityState || 'Local Area',
        ownerName: check.ownerName || 'Business Owner',
        businessType: check.businessType,
        primaryHeadache: check.primaryHeadache,
      },
      scanner: {
        overallScore: check.overallScore,
        coverage: check.scoreBreakdown?.coverage?.overall,
        confidence: check.scoreBreakdown?.coverage?.confidence,
        findings: findings.map((f) => ({
          category: f.category,
          checkKey: f.checkKey,
          title: f.title,
          state: f.state,
          scoreContribution: f.scoreContribution,
          maxPoints: f.maxPoints,
          supportingDetail: f.supportingDetail,
        })),
      },
      ownerProvided: ownerResp?.responses || null,
      humanReview: {
        findabilityTest: existingReview?.findabilityTest || null,
        reputationSummary: existingReview?.reputationSummary || null,
        socialPresenceReview: existingReview?.socialPresenceReview || null,
        competitorComparison: existingReview?.competitorComparison || null,
        lostOpportunityHunt: existingReview?.lostOpportunityHunt || null,
        opportunitiesFound: existingReview?.opportunitiesFound || [],
        topFixes: existingReview?.topFixes || [],
        notSpendMoneyOn: existingReview?.notSpendMoneyOn || null,
        toddNotes: existingReview?.toddNotes || null,
        humanIntelligence: existingReview?.humanIntelligence || null,
      },
    };

    // Synthesize report using Gemini
    const { report, modelUsed, generatedAt } = await synthesizeReportWithGemini(evidencePkg);

    const now = new Date();
    const updatedAudit = {
      ...(existingReview?.reportAudit || {}),
      geminiDraftGeneratedAt: generatedAt,
      geminiModelUsed: modelUsed,
      lastReportEditAt: generatedAt,
    };

    // Upsert into human_reviews
    if (existingReview) {
      await db
        .update(humanReviews)
        .set({
          reportDraft: report,
          reportAudit: updatedAudit,
          updatedAt: now,
        })
        .where(eq(humanReviews.id, existingReview.id));
    } else {
      await db.insert(humanReviews).values({
        realityCheckId,
        reviewerEmail: operator.email,
        reviewerName: operator.name,
        status: 'draft',
        reportDraft: report,
        reportAudit: updatedAudit,
      });
    }

    return NextResponse.json({
      success: true,
      report,
      audit: updatedAudit,
      modelUsed,
      generatedAt,
      message: 'Draft report synthesized successfully.',
    });
  } catch (err: any) {
    console.error('[GEMINI_GENERATE_ROUTE_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to generate report' }, { status: 500 });
  }
}
