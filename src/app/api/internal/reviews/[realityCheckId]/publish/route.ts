import { NextResponse } from 'next/server';
import { eq, and, ne, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { realityChecks, humanReviews } from '@/db/schema';
import { getOperatorUser } from '@/lib/auth/operator';
import { sendRealityCheckDeliveryEmail } from '@/lib/email/delivery';

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

    // 2. Fetch existing human review
    const [review] = await db
      .select()
      .from(humanReviews)
      .where(eq(humanReviews.realityCheckId, realityCheckId))
      .limit(1);

    if (!review) {
      return NextResponse.json(
        { error: 'Publish blocked: Human review must be started before publishing.' },
        { status: 400 }
      );
    }

    // 2b. Safeguard: Fast-path Idempotency Check
    // Catches sequential re-publishes before any processing
    if (review.status === 'published' || review.publishedReport || check.status === 'PUBLISHED') {
      return NextResponse.json({
        success: true,
        alreadyPublished: true,
        shareToken: check.shareToken,
        shareUrl: `/report/${check.shareToken}`,
        publishedAt: review.publishedAt ? new Date(review.publishedAt).toISOString() : new Date().toISOString(),
        emailDelivered: !!review.emailDeliveredAt,
        emailRecipient: check.email,
        message: 'This Reality Check report is already published. Duplicate publication and duplicate email delivery blocked.',
      });
    }

    // 3. Safeguard: Validate Top 3 Fixes are present
    const topFixes = review.topFixes || [];
    const validFixesCount = topFixes.filter(f => f.title && f.title.trim().length > 0).length;
    if (validFixesCount < 3) {
      return NextResponse.json(
        { error: `Publish blocked: All Top 3 Things We Would Fix First are required (found ${validFixesCount}/3).` },
        { status: 400 }
      );
    }

    // 4. Safeguard: Validate Report Draft exists and core sections are populated
    const draft = review.reportDraft;
    if (!draft) {
      return NextResponse.json(
        { error: 'Publish blocked: Please generate and review a report draft before publishing.' },
        { status: 400 }
      );
    }

    if (!draft.executiveSummary || draft.executiveSummary.trim().length < 20) {
      return NextResponse.json(
        { error: 'Publish blocked: Executive summary is empty or too short.' },
        { status: 400 }
      );
    }

    if (!draft.topFixesSummary || draft.topFixesSummary.trim().length === 0) {
      return NextResponse.json(
        { error: 'Publish blocked: Top fixes summary is required.' },
        { status: 400 }
      );
    }

    if (!draft.notWorthSpendingOnSummary || draft.notWorthSpendingOnSummary.trim().length === 0) {
      return NextResponse.json(
        { error: 'Publish blocked: "What NOT to spend money on" summary is required.' },
        { status: 400 }
      );
    }

    const now = new Date();

    // 5. Freeze published report snapshot including topFixes and opportunities to guarantee immutability
    const publishedContent = {
      ...draft,
      frozenTopFixes: JSON.parse(JSON.stringify(topFixes)),
      frozenOpportunities: JSON.parse(JSON.stringify(review.opportunitiesFound || [])),
    };

    // 5b. ATOMIC STATE TRANSITION & CONCURRENCY GUARD:
    // Only ONE request may win the race to transition status from unpublished to published.
    // By conditionally updating `humanReviews` WHERE status != 'published' AND publishedReport IS NULL,
    // Postgres guarantees that if two concurrent requests reach this line simultaneously, exactly one row
    // is updated and returned. The losing concurrent request updates 0 rows and receives an empty array.
    const [claimedReview] = await db
      .update(humanReviews)
      .set({
        status: 'published',
        publishedReport: publishedContent,
        publishedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(humanReviews.id, review.id),
          ne(humanReviews.status, 'published'),
          isNull(humanReviews.publishedReport)
        )
      )
      .returning();

    // If another concurrent request beat us to the update, claimedReview will be undefined.
    if (!claimedReview) {
      // Re-fetch latest review state for accurate timestamps and delivery info
      const [latestReview] = await db
        .select()
        .from(humanReviews)
        .where(eq(humanReviews.id, review.id))
        .limit(1);

      return NextResponse.json({
        success: true,
        alreadyPublished: true,
        shareToken: check.shareToken,
        shareUrl: `/report/${check.shareToken}`,
        publishedAt: latestReview?.publishedAt ? new Date(latestReview.publishedAt).toISOString() : now.toISOString(),
        emailDelivered: !!latestReview?.emailDeliveredAt,
        emailRecipient: check.email,
        message: 'This Reality Check report was already published by a concurrent request. Duplicate publication and duplicate email delivery blocked.',
      });
    }

    // 6. Update reality_checks status to PUBLISHED (only executed by the winning request)
    await db
      .update(realityChecks)
      .set({
        status: 'PUBLISHED',
        updatedAt: now,
      })
      .where(
        and(
          eq(realityChecks.id, check.id),
          ne(realityChecks.status, 'PUBLISHED')
        )
      );

    // 7. Send delivery email to owner (STRICTLY ONCE — executed solely by the winning request)
    const emailResult = await sendRealityCheckDeliveryEmail({
      ownerEmail: check.email,
      ownerName: check.ownerName,
      businessName: check.businessName,
      shareToken: check.shareToken,
    });

    const isAccepted = emailResult.status === 'ACCEPTED_BY_PROVIDER';

    const updatedAudit = {
      ...(review.reportAudit || {}),
      reportPublishedAt: now.toISOString(),
      publishingOperator: operator.email,
      deliveryEmailStatus: emailResult.status,
      deliveryEmailSentAt: isAccepted ? emailResult.deliveredAt : null,
      deliveryEmailMessageId: emailResult.messageId || null,
      deliveryEmailError: emailResult.error || null,
    };

    // 8. Update human_reviews with email delivery audit results
    await db
      .update(humanReviews)
      .set({
        emailDeliveredAt: isAccepted && emailResult.deliveredAt ? new Date(emailResult.deliveredAt) : null,
        reportAudit: updatedAudit,
        updatedAt: new Date(),
      })
      .where(eq(humanReviews.id, review.id));

    return NextResponse.json({
      success: true,
      shareToken: check.shareToken,
      shareUrl: `/report/${check.shareToken}`,
      publishedAt: now.toISOString(),
      emailStatus: emailResult.status,
      emailDelivered: isAccepted,
      emailRecipient: check.email,
      emailError: emailResult.error || null,
      message: isAccepted
        ? 'Reality Check published successfully and notification dispatched to owner.'
        : `Reality Check published. Email delivery status: ${emailResult.status}. ${emailResult.error ? `(${emailResult.error})` : ''}`,
    });
  } catch (err: any) {
    console.error('[PUBLISH_ROUTE_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to publish report' }, { status: 500 });
  }
}
