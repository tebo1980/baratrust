import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { realityChecks, ownerResponses, OwnerQuestionnaireAnswers } from '@/db/schema';

export const dynamic = 'force-dynamic';

const QuestionnaireSubmissionSchema = z.object({
  shareToken: z.string().min(1, 'Share token is required'),
  customerAcquisition: z.string().max(2000).optional().nullable(),
  biggestProblem: z.string().max(2000).optional().nullable(),
  missedInquiries: z.string().max(2000).optional().nullable(),
  followUpProcess: z.string().max(2000).optional().nullable(),
  currentMarketingSpend: z.string().max(2000).optional().nullable(),
  repetitiveAdminWaste: z.string().max(2000).optional().nullable(),
  growthOpportunity: z.string().max(2000).optional().nullable(),
  freeEmployeeRole: z.string().max(2000).optional().nullable(),
  additionalNotes: z.string().max(3000).optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shareToken = searchParams.get('shareToken');

    if (!shareToken) {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 });
    }

    const [check] = await db
      .select()
      .from(realityChecks)
      .where(eq(realityChecks.shareToken, shareToken))
      .limit(1);

    if (!check) {
      return NextResponse.json({ error: 'Reality check not found' }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(ownerResponses)
      .where(eq(ownerResponses.realityCheckId, check.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      business: {
        id: check.id,
        businessName: check.businessName,
        website: check.website,
        cityState: check.cityState,
        ownerName: check.ownerName,
        businessType: check.businessType,
        primaryHeadache: check.primaryHeadache,
        status: check.status,
      },
      responses: existing ? existing.responses : null,
    });
  } catch (err: any) {
    console.error('[QUESTIONNAIRE_GET_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const validation = QuestionnaireSubmissionSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Validation failed';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = validation.data;

    // 1. Look up the reality check by shareToken
    const [check] = await db
      .select()
      .from(realityChecks)
      .where(eq(realityChecks.shareToken, data.shareToken))
      .limit(1);

    if (!check) {
      return NextResponse.json({ error: 'Reality check record not found for this token' }, { status: 404 });
    }

    // 2. Prepare structured response object with mandatory evidence label
    const questionnairePayload: OwnerQuestionnaireAnswers = {
      customerAcquisition: data.customerAcquisition?.trim() || '',
      biggestProblem: data.biggestProblem?.trim() || '',
      missedInquiries: data.missedInquiries?.trim() || '',
      followUpProcess: data.followUpProcess?.trim() || '',
      currentMarketingSpend: data.currentMarketingSpend?.trim() || '',
      repetitiveAdminWaste: data.repetitiveAdminWaste?.trim() || '',
      growthOpportunity: data.growthOpportunity?.trim() || '',
      freeEmployeeRole: data.freeEmployeeRole?.trim() || '',
      additionalNotes: data.additionalNotes?.trim() || '',
      evidenceLabel: 'OWNER_PROVIDED',
      submittedAt: new Date().toISOString(),
    };

    // 3. Upsert into owner_responses
    const [existing] = await db
      .select()
      .from(ownerResponses)
      .where(eq(ownerResponses.realityCheckId, check.id))
      .limit(1);

    if (existing) {
      await db
        .update(ownerResponses)
        .set({
          responses: questionnairePayload,
          updatedAt: new Date(),
        })
        .where(eq(ownerResponses.id, existing.id));
    } else {
      await db.insert(ownerResponses).values({
        realityCheckId: check.id,
        responses: questionnairePayload,
      });
    }

    // 4. Update reality check status if it's currently in an early automated state
    if (check.status === 'NEW' || check.status === 'AUTO_SCAN_COMPLETE' || check.status === 'pending_review') {
      await db
        .update(realityChecks)
        .set({
          status: 'NEEDS_HUMAN_REVIEW',
          updatedAt: new Date(),
        })
        .where(eq(realityChecks.id, check.id));
    }

    return NextResponse.json({
      success: true,
      message: 'Questionnaire responses successfully recorded.',
      evidenceLabel: 'OWNER_PROVIDED',
    });
  } catch (err: any) {
    console.error('[QUESTIONNAIRE_POST_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to submit questionnaire' }, { status: 500 });
  }
}
