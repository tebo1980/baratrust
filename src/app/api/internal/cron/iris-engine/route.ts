import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { irisSequences, selfProspectingLeads } from '@/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { draftReply } from '@/lib/self-prospecting/drafter';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Fetch up to 50 rows from irisSequences where status = 'queued' AND nextRunAt <= NOW()
    const sequences = await db.select({
        sequence: irisSequences,
        lead: selfProspectingLeads,
      })
      .from(irisSequences)
      .innerJoin(selfProspectingLeads, eq(irisSequences.prospectId, selfProspectingLeads.id))
      .where(
        and(
          eq(irisSequences.status, 'queued'),
          lte(irisSequences.nextRunAt, new Date())
        )
      )
      .limit(50);

    const processedSequences = [];

    for (const { sequence, lead } of sequences) {
      // 2. Check: For each sequence, verify if the lead has replied. If yes, mark the sequence 'cancelled'.
      if (lead.repliedAt !== null) {
        await db.update(irisSequences)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(irisSequences.id, sequence.id));
        processedSequences.push({ id: sequence.id, status: 'cancelled' });
        continue;
      }

      // 3. Draft & Dispatch: If no reply, use our Gemini service to draft the contextual message based on currentStep
      const stepContext = `\n\nThis is a follow-up message for step ${sequence.currentStep} in a 3-step cadence.`;
      const draftResult = await draftReply({
        postText: (lead.postFullText || lead.postExcerpt || "") + stepContext,
        author: lead.author,
        subreddit: lead.subreddit,
        matchedKeywords: (lead.matchedKeywords as string[]) || [],
        platform: lead.sourcePlatform
      });

      console.log(`[IRIS ENGINE] Dispatched step ${sequence.currentStep} for prospect ${lead.id}: ${draftResult.message}`);

      // 4. Increment: Bump currentStep, advance nextRunAt (e.g., +2 days for D3), or mark 'completed' if it was step 3.
      let nextStatus = 'queued';
      let nextRun = new Date();
      let nextStep = sequence.currentStep + 1;

      if (sequence.currentStep === 1) {
        nextRun.setDate(nextRun.getDate() + 2); // Wait 2 days for step 2 (D3)
      } else if (sequence.currentStep === 2) {
        nextRun.setDate(nextRun.getDate() + 4); // Wait 4 days for step 3 (D7)
      } else if (sequence.currentStep >= 3) {
        nextStatus = 'completed';
      }

      await db.update(irisSequences)
        .set({
          status: nextStatus,
          currentStep: nextStatus === 'completed' ? sequence.currentStep : nextStep,
          nextRunAt: nextRun,
          updatedAt: new Date(),
        })
        .where(eq(irisSequences.id, sequence.id));

      processedSequences.push({ id: sequence.id, status: nextStatus, nextRunAt: nextRun });
    }

    return NextResponse.json({
      success: true,
      processedCount: processedSequences.length,
      details: processedSequences
    });

  } catch (err) {
    console.error('Iris Engine Cron Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
}
