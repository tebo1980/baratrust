import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { realityChecks, ownerResponses, OwnerQuestionnaireAnswers } from '@/db/schema';
import {
  checkPublicRateLimit,
  FOLLOWUP_CLAIM_COOKIE_NAME,
  getClientIpKey,
  isHoneypotTriggered,
  readCookieFromHeader,
  sanitizePlainText,
  verifyFollowUpClaimToken,
} from '@/lib/security/public-guard';

export const dynamic = 'force-dynamic';

const LOCKED_QUESTIONNAIRE_STATUSES = new Set([
  'IN_REVIEW',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'completed',
  'archived',
]);

const QuestionnaireSubmissionSchema = z.object({
  shareToken: z.string().trim().min(16, 'Valid share token is required').max(128),
  email: z.string().trim().email().max(200).optional().nullable(),
  websiteConfirm: z.string().max(200).optional().nullable(),
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
    const ipKey = getClientIpKey(req);
    const rate = checkPublicRateLimit({
      scope: 'questionnaire_get',
      ipKey,
      maxRequests: 25,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const shareToken = searchParams.get('shareToken')?.trim();

    if (!shareToken || shareToken.length < 16) {
      return NextResponse.json({ error: 'Valid share token is required' }, { status: 400 });
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

    // Only expose private saved questionnaire answers to the verified claimant session
    const claimCookie = readCookieFromHeader(req.headers.get('cookie'), FOLLOWUP_CLAIM_COOKIE_NAME);
    const isVerifiedClaimant =
      Boolean(check.email) &&
      verifyFollowUpClaimToken({
        cookieToken: claimCookie,
        shareToken,
        expectedEmail: check.email,
      });

    return NextResponse.json({
      success: true,
      business: {
        businessName: check.businessName || null,
        website: check.website,
        cityState: check.cityState || null,
        businessType: check.businessType || null,
        primaryHeadache: isVerifiedClaimant ? check.primaryHeadache || null : null,
        status: check.status,
        humanReviewRequested: Boolean(check.email),
        questionnaireLocked: LOCKED_QUESTIONNAIRE_STATUSES.has(check.status),
        questionnaireSubmitted: Boolean(existing),
      },
      responses: isVerifiedClaimant && existing ? existing.responses : null,
    });
  } catch (err: any) {
    console.error('[QUESTIONNAIRE_GET_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ipKey = getClientIpKey(req);
    const rate = checkPublicRateLimit({
      scope: 'questionnaire_post',
      ipKey,
      maxRequests: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait a few minutes.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (isHoneypotTriggered(body?.websiteConfirm)) {
      return NextResponse.json({ success: true, ignored: true });
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

    // Questionnaire is only available after follow-up has been requested with an email
    if (!check.email) {
      return NextResponse.json(
        { error: 'Please request follow-up with your email before submitting owner context.' },
        { status: 400 }
      );
    }

    // Block modifications once review is in progress or published
    if (LOCKED_QUESTIONNAIRE_STATUSES.has(check.status)) {
      return NextResponse.json(
        { error: 'This Reality Check is already in review or published and can no longer be modified.' },
        { status: 409 }
      );
    }

    // Verify caller authorization via HttpOnly claim cookie OR matching claimed email
    const claimCookie = readCookieFromHeader(req.headers.get('cookie'), FOLLOWUP_CLAIM_COOKIE_NAME);
    const hasValidClaimCookie = verifyFollowUpClaimToken({
      cookieToken: claimCookie,
      shareToken: data.shareToken,
      expectedEmail: check.email,
    });
    const hasMatchingEmail =
      Boolean(data.email) && data.email!.trim().toLowerCase() === check.email.trim().toLowerCase();

    if (!hasValidClaimCookie && !hasMatchingEmail) {
      return NextResponse.json(
        {
          error:
            'Session verification required to update this follow-up record. Please confirm the email address used when requesting follow-up.',
          code: 'CLAIMANT_VERIFICATION_REQUIRED',
        },
        { status: 403 }
      );
    }

    // 2. Prepare structured response object with mandatory evidence label
    const questionnairePayload: OwnerQuestionnaireAnswers = {
      customerAcquisition: sanitizePlainText(data.customerAcquisition, { maxLength: 2000, multiline: true }) || '',
      biggestProblem: sanitizePlainText(data.biggestProblem, { maxLength: 2000, multiline: true }) || '',
      missedInquiries: sanitizePlainText(data.missedInquiries, { maxLength: 2000, multiline: true }) || '',
      followUpProcess: sanitizePlainText(data.followUpProcess, { maxLength: 2000, multiline: true }) || '',
      currentMarketingSpend: sanitizePlainText(data.currentMarketingSpend, { maxLength: 2000, multiline: true }) || '',
      repetitiveAdminWaste: sanitizePlainText(data.repetitiveAdminWaste, { maxLength: 2000, multiline: true }) || '',
      growthOpportunity: sanitizePlainText(data.growthOpportunity, { maxLength: 2000, multiline: true }) || '',
      freeEmployeeRole: sanitizePlainText(data.freeEmployeeRole, { maxLength: 2000, multiline: true }) || '',
      additionalNotes: sanitizePlainText(data.additionalNotes, { maxLength: 3000, multiline: true }) || '',
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
