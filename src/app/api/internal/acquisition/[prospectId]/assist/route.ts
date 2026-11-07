import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { acquisitionProspects, acquisitionContactLogs } from '@/db/schema';
import { requireOperatorApiAuth } from '@/lib/auth/operator';
import { ensureAcquisitionSchema } from '@/lib/acquisition/schema-bootstrap';
import { generateProspectAiAssist } from '@/lib/acquisition/ai-assist';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  context: { params: Promise<{ prospectId: string }> }
) {
  const auth = await requireOperatorApiAuth();
  if (!auth.ok) return auth.response;

  try {
    await ensureAcquisitionSchema();
    const { prospectId } = await context.params;

    const [existing] = await db
      .select()
      .from(acquisitionProspects)
      .where(eq(acquisitionProspects.id, prospectId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });
    }

    if (existing.optOut || existing.permissionStatus === 'DO_NOT_CONTACT') {
      return NextResponse.json(
        { error: 'AI outreach drafting is disabled for opted-out or Do Not Contact prospects.' },
        { status: 400 }
      );
    }

    const assist = await generateProspectAiAssist({
      businessName: existing.businessName,
      location: existing.location,
      industry: existing.industry,
      websiteUrl: existing.websiteUrl,
      sourceUrls: existing.sourceUrls || [],
      researchNotes: existing.researchNotes,
      evidenceObservation: existing.evidenceObservation,
      decisionMakerName: existing.decisionMakerName,
    });

    const now = new Date();
    const nextNotes =
      existing.researchNotes && existing.researchNotes.trim().length > 0
        ? existing.researchNotes
        : assist.organizedNotes;

    const nextStage =
      existing.stage === 'APPROVED_FOR_OUTREACH' ? 'RESEARCHED' : existing.stage;

    await db
      .update(acquisitionProspects)
      .set({
        researchNotes: nextNotes,
        fitScore: assist.fitScore,
        fitExplanation: assist.fitExplanation,
        assessmentStatus: 'UNVERIFIED_AI',
        reviewedBy: null,
        reviewedAt: null,
        primaryPillar: assist.primaryPillar,
        evidenceObservation: assist.evidenceObservation,
        outreachSubject: assist.outreachSubject,
        outreachDraft: assist.outreachDraft,
        draftStatus: 'AI_DRAFTED',
        approvedBy: null,
        approvedAt: null,
        stage: nextStage,
        updatedAt: now,
      })
      .where(eq(acquisitionProspects.id, prospectId));

    await db.insert(acquisitionContactLogs).values({
      prospectId,
      actorEmail: auth.operator.email,
      channel: 'SYSTEM',
      direction: 'INTERNAL',
      actionType: 'AI_ASSIST_GENERATED',
      summary: `Generated unverified AI fit assessment (${assist.fitScore}/100, ${assist.primaryPillar}) and draft outreach (${assist.modelUsed}). Human review and approval required before outreach.`,
    });

    const [updated] = await db
      .select()
      .from(acquisitionProspects)
      .where(eq(acquisitionProspects.id, prospectId))
      .limit(1);

    const contactLogs = await db
      .select()
      .from(acquisitionContactLogs)
      .where(eq(acquisitionContactLogs.prospectId, prospectId))
      .orderBy(desc(acquisitionContactLogs.createdAt));

    return NextResponse.json({
      success: true,
      assistModel: assist.modelUsed,
      prospect: {
        ...updated,
        contactLogs,
      },
    });
  } catch (err: any) {
    console.error('[ACQUISITION_ASSIST_ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to run AI research & draft assistant.' },
      { status: 500 }
    );
  }
}
