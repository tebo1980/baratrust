import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { acquisitionProspects, acquisitionContactLogs } from '@/db/schema';
import { requireOperatorApiAuth } from '@/lib/auth/operator';
import { ensureAcquisitionSchema } from '@/lib/acquisition/schema-bootstrap';
import {
  evaluateDraftApprovalEligibility,
  evaluateOutreachEligibility,
  normalizeSourceUrls,
  ProspectActionSchema,
  resolveEditedDraftStatus,
  sanitizePublicSourceUrl,
} from '@/lib/acquisition/service';
import { sanitizePlainText } from '@/lib/security/public-guard';

export const dynamic = 'force-dynamic';

function parseOptionalDate(raw?: string | null): Date | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw.trim() === '') return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

async function fetchProspectWithLogs(prospectId: string) {
  const [prospect] = await db
    .select()
    .from(acquisitionProspects)
    .where(eq(acquisitionProspects.id, prospectId))
    .limit(1);

  if (!prospect) return null;

  const contactLogs = await db
    .select()
    .from(acquisitionContactLogs)
    .where(eq(acquisitionContactLogs.prospectId, prospectId))
    .orderBy(desc(acquisitionContactLogs.createdAt));

  return { ...prospect, contactLogs };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ prospectId: string }> }
) {
  const auth = await requireOperatorApiAuth();
  if (!auth.ok) return auth.response;

  try {
    await ensureAcquisitionSchema();
    const { prospectId } = await context.params;
    const record = await fetchProspectWithLogs(prospectId);
    if (!record) {
      return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, prospect: record });
  } catch (err: any) {
    console.error('[ACQUISITION_DETAIL_GET_ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to load prospect.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const validation = ProspectActionSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || 'Invalid action payload.';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const input = validation.data;
    const now = new Date();

    if (input.action === 'UPDATE_FIELDS') {
      const nextWebsite =
        input.websiteUrl !== undefined
          ? input.websiteUrl
            ? sanitizePublicSourceUrl(input.websiteUrl)
            : null
          : existing.websiteUrl;

      if (input.websiteUrl && input.websiteUrl.trim() && !nextWebsite) {
        return NextResponse.json(
          { error: 'Website URL must be a valid public http/https link.' },
          { status: 400 }
        );
      }

      const nextSubject =
        input.outreachSubject !== undefined
          ? sanitizePlainText(input.outreachSubject, { maxLength: 240 })
          : existing.outreachSubject;
      const nextBody =
        input.outreachDraft !== undefined
          ? sanitizePlainText(input.outreachDraft, { maxLength: 4000, multiline: true })
          : existing.outreachDraft;

      const draftResolution = resolveEditedDraftStatus({
        previousStatus: existing.draftStatus,
        previousSubject: existing.outreachSubject,
        previousBody: existing.outreachDraft,
        nextSubject,
        nextBody,
      });

      const nextPermission = input.permissionStatus ?? existing.permissionStatus;
      const forceInvalidateApproval =
        draftResolution.resetApproval ||
        nextPermission === 'DO_NOT_CONTACT' ||
        existing.optOut;

      let nextAssessmentStatus = existing.assessmentStatus;
      let nextReviewedBy = existing.reviewedBy;
      let nextReviewedAt = existing.reviewedAt;

      if (input.markAssessmentReviewed) {
        nextAssessmentStatus = 'HUMAN_REVIEWED';
        nextReviewedBy = auth.operator.email;
        nextReviewedAt = now;
      } else if (
        existing.assessmentStatus === 'NONE' &&
        input.fitScore !== undefined &&
        input.fitScore !== null
      ) {
        nextAssessmentStatus = 'HUMAN_REVIEWED';
        nextReviewedBy = auth.operator.email;
        nextReviewedAt = now;
      }

      let nextStage = existing.stage;
      if (nextPermission === 'DO_NOT_CONTACT' && !existing.optOut) {
        nextStage = 'OPTED_OUT';
      } else if (forceInvalidateApproval && existing.stage === 'APPROVED_FOR_OUTREACH') {
        nextStage = 'RESEARCHED';
      }

      const parsedFollowUp = parseOptionalDate(input.nextFollowUpAt);

      await db
        .update(acquisitionProspects)
        .set({
          businessName:
            input.businessName !== undefined
              ? sanitizePlainText(input.businessName, { maxLength: 200 }) || existing.businessName
              : existing.businessName,
          location:
            input.location !== undefined
              ? sanitizePlainText(input.location, { maxLength: 140 }) || existing.location
              : existing.location,
          industry:
            input.industry !== undefined
              ? sanitizePlainText(input.industry, { maxLength: 120 }) || existing.industry
              : existing.industry,
          websiteUrl: nextWebsite,
          sourceUrls:
            input.sourceUrls !== undefined
              ? normalizeSourceUrls(input.sourceUrls)
              : existing.sourceUrls,
          researchNotes:
            input.researchNotes !== undefined
              ? sanitizePlainText(input.researchNotes, { maxLength: 5000, multiline: true })
              : existing.researchNotes,
          fitScore: input.fitScore !== undefined ? input.fitScore : existing.fitScore,
          fitExplanation:
            input.fitExplanation !== undefined
              ? sanitizePlainText(input.fitExplanation, { maxLength: 2000, multiline: true })
              : existing.fitExplanation,
          assessmentStatus: nextAssessmentStatus,
          reviewedBy: nextReviewedBy,
          reviewedAt: nextReviewedAt,
          primaryPillar:
            input.primaryPillar !== undefined ? input.primaryPillar : existing.primaryPillar,
          evidenceObservation:
            input.evidenceObservation !== undefined
              ? sanitizePlainText(input.evidenceObservation, { maxLength: 2000, multiline: true })
              : existing.evidenceObservation,
          decisionMakerName:
            input.decisionMakerName !== undefined
              ? sanitizePlainText(input.decisionMakerName, { maxLength: 140 })
              : existing.decisionMakerName,
          decisionMakerRole:
            input.decisionMakerRole !== undefined
              ? sanitizePlainText(input.decisionMakerRole, { maxLength: 120 })
              : existing.decisionMakerRole,
          decisionMakerSource:
            input.decisionMakerSource !== undefined
              ? sanitizePlainText(input.decisionMakerSource, { maxLength: 300 })
              : existing.decisionMakerSource,
          contactMethod: input.contactMethod ?? existing.contactMethod,
          contactValue:
            input.contactValue !== undefined
              ? sanitizePlainText(input.contactValue, { maxLength: 300 })
              : existing.contactValue,
          permissionStatus: nextPermission,
          outreachSubject: nextSubject,
          outreachDraft: nextBody,
          draftStatus:
            nextPermission === 'DO_NOT_CONTACT' || existing.optOut
              ? nextBody
                ? 'EDITED'
                : 'NONE'
              : draftResolution.draftStatus,
          approvedBy: forceInvalidateApproval ? null : existing.approvedBy,
          approvedAt: forceInvalidateApproval ? null : existing.approvedAt,
          nextFollowUpAt:
            parsedFollowUp !== undefined ? parsedFollowUp : existing.nextFollowUpAt,
          stage: nextStage,
          updatedAt: now,
        })
        .where(eq(acquisitionProspects.id, prospectId));

      await db.insert(acquisitionContactLogs).values({
        prospectId,
        actorEmail: auth.operator.email,
        channel: 'SYSTEM',
        direction: 'INTERNAL',
        actionType: 'FIELDS_UPDATED',
        summary: draftResolution.resetApproval
          ? 'Updated prospect details and outreach draft (previous draft approval cleared pending re-review).'
          : 'Updated prospect research and contact details.',
      });

      const updated = await fetchProspectWithLogs(prospectId);
      return NextResponse.json({ success: true, prospect: updated });
    }

    if (input.action === 'VERIFY_ASSESSMENT') {
      await db
        .update(acquisitionProspects)
        .set({
          fitScore: input.fitScore !== undefined ? input.fitScore : existing.fitScore,
          fitExplanation:
            input.fitExplanation !== undefined
              ? sanitizePlainText(input.fitExplanation, { maxLength: 2000, multiline: true })
              : existing.fitExplanation?.replace(/^\[UNVERIFIED AI ASSESSMENT\]\s*/i, '') ||
                existing.fitExplanation,
          assessmentStatus: 'HUMAN_REVIEWED',
          reviewedBy: auth.operator.email,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(acquisitionProspects.id, prospectId));

      await db.insert(acquisitionContactLogs).values({
        prospectId,
        actorEmail: auth.operator.email,
        channel: 'SYSTEM',
        direction: 'INTERNAL',
        actionType: 'ASSESSMENT_VERIFIED',
        summary: `Human-verified prospect fit assessment (${input.fitScore ?? existing.fitScore ?? 'n/a'}/100).`,
      });

      const updated = await fetchProspectWithLogs(prospectId);
      return NextResponse.json({ success: true, prospect: updated });
    }

    if (input.action === 'APPROVE_DRAFT') {
      const cleanDraft = sanitizePlainText(input.outreachDraft, {
        maxLength: 4000,
        multiline: true,
      });
      const cleanSubject =
        input.outreachSubject !== undefined
          ? sanitizePlainText(input.outreachSubject, { maxLength: 240 })
          : existing.outreachSubject;

      const approvalCheck = evaluateDraftApprovalEligibility({
        optOut: existing.optOut,
        permissionStatus: existing.permissionStatus,
        outreachDraft: cleanDraft,
      });

      if (!approvalCheck.allowed) {
        return NextResponse.json({ error: approvalCheck.reason }, { status: 400 });
      }

      const nextStage =
        existing.stage === 'RESEARCHED' ? 'APPROVED_FOR_OUTREACH' : existing.stage;

      await db
        .update(acquisitionProspects)
        .set({
          outreachSubject: cleanSubject,
          outreachDraft: cleanDraft,
          draftStatus: 'APPROVED_FOR_OUTREACH',
          approvedBy: auth.operator.email,
          approvedAt: now,
          stage: nextStage,
          updatedAt: now,
        })
        .where(eq(acquisitionProspects.id, prospectId));

      await db.insert(acquisitionContactLogs).values({
        prospectId,
        actorEmail: auth.operator.email,
        channel: 'SYSTEM',
        direction: 'INTERNAL',
        actionType: 'DRAFT_APPROVED',
        summary: `Approved outreach draft for manual 1-to-1 contact.`,
      });

      const updated = await fetchProspectWithLogs(prospectId);
      return NextResponse.json({ success: true, prospect: updated });
    }

    if (input.action === 'LOG_OUTREACH_SENT') {
      const eligibility = evaluateOutreachEligibility(existing);
      if (!eligibility.allowed) {
        return NextResponse.json({ error: eligibility.reason }, { status: 400 });
      }

      const parsedFollowUp = parseOptionalDate(input.nextFollowUpAt);
      const nextStage =
        existing.stage === 'RESEARCHED' || existing.stage === 'APPROVED_FOR_OUTREACH'
          ? 'OUTREACH_SENT'
          : existing.stage;

      await db
        .update(acquisitionProspects)
        .set({
          outreachSentAt: existing.outreachSentAt || now,
          stage: nextStage,
          nextFollowUpAt:
            parsedFollowUp !== undefined ? parsedFollowUp : existing.nextFollowUpAt,
          updatedAt: now,
        })
        .where(eq(acquisitionProspects.id, prospectId));

      await db.insert(acquisitionContactLogs).values({
        prospectId,
        actorEmail: auth.operator.email,
        channel: input.channel,
        direction: 'OUTBOUND',
        actionType: 'OUTREACH_SENT',
        summary:
          sanitizePlainText(input.summary, { maxLength: 1000, multiline: true }) ||
          `Logged manual 1-to-1 outreach via ${input.channel}.`,
      });

      const updated = await fetchProspectWithLogs(prospectId);
      return NextResponse.json({ success: true, prospect: updated });
    }

    if (input.action === 'LOG_CONTACT_NOTE') {
      if (existing.optOut && input.direction === 'OUTBOUND') {
        return NextResponse.json(
          { error: 'Outbound contact cannot be logged for an opted-out prospect.' },
          { status: 400 }
        );
      }

      const startsConversation =
        Boolean(input.markConversationStarted) || input.direction === 'INBOUND';
      const parsedFollowUp = parseOptionalDate(input.nextFollowUpAt);

      let nextStage = existing.stage;
      if (
        startsConversation &&
        (existing.stage === 'RESEARCHED' ||
          existing.stage === 'APPROVED_FOR_OUTREACH' ||
          existing.stage === 'OUTREACH_SENT')
      ) {
        nextStage = 'CONVERSATION_STARTED';
      }

      await db
        .update(acquisitionProspects)
        .set({
          conversationStartedAt: startsConversation
            ? existing.conversationStartedAt || now
            : existing.conversationStartedAt,
          stage: nextStage,
          nextFollowUpAt:
            parsedFollowUp !== undefined ? parsedFollowUp : existing.nextFollowUpAt,
          updatedAt: now,
        })
        .where(eq(acquisitionProspects.id, prospectId));

      await db.insert(acquisitionContactLogs).values({
        prospectId,
        actorEmail: auth.operator.email,
        channel: input.channel,
        direction: input.direction,
        actionType: 'CONTACT_NOTE',
        summary: sanitizePlainText(input.summary, { maxLength: 2000, multiline: true })!,
      });

      const updated = await fetchProspectWithLogs(prospectId);
      return NextResponse.json({ success: true, prospect: updated });
    }

    if (input.action === 'UPDATE_OUTCOME') {
      if (existing.optOut && input.stage !== 'NOT_A_FIT') {
        return NextResponse.json(
          { error: 'Prospect has opted out and cannot be moved back into active outreach.' },
          { status: 400 }
        );
      }

      const parsedFollowUp = parseOptionalDate(input.nextFollowUpAt);

      let conversationStartedAt = existing.conversationStartedAt;
      let meetingBookedAt = existing.meetingBookedAt;
      let meetingAttendedAt = existing.meetingAttendedAt;
      let convertedToPulseAt = existing.convertedToPulseAt;

      if (
        input.stage === 'CONVERSATION_STARTED' ||
        input.stage === 'MEETING_BOOKED' ||
        input.stage === 'MEETING_ATTENDED' ||
        input.stage === 'CUSTOMER_ACQUIRED'
      ) {
        conversationStartedAt = conversationStartedAt || now;
      }
      if (input.stage === 'MEETING_BOOKED' || input.stage === 'MEETING_ATTENDED') {
        meetingBookedAt = meetingBookedAt || now;
      }
      if (input.stage === 'MEETING_ATTENDED') {
        meetingAttendedAt = meetingAttendedAt || now;
      }
      if (input.stage === 'CUSTOMER_ACQUIRED') {
        convertedToPulseAt = convertedToPulseAt || now;
      }

      await db
        .update(acquisitionProspects)
        .set({
          stage: input.stage,
          conversationStartedAt,
          meetingBookedAt,
          meetingAttendedAt,
          convertedToPulseAt,
          nextFollowUpAt:
            parsedFollowUp !== undefined ? parsedFollowUp : existing.nextFollowUpAt,
          updatedAt: now,
        })
        .where(eq(acquisitionProspects.id, prospectId));

      await db.insert(acquisitionContactLogs).values({
        prospectId,
        actorEmail: auth.operator.email,
        channel:
          input.stage === 'MEETING_BOOKED' || input.stage === 'MEETING_ATTENDED'
            ? 'MEETING'
            : 'SYSTEM',
        direction: 'INTERNAL',
        actionType: 'OUTCOME_UPDATED',
        summary:
          sanitizePlainText(input.summary, { maxLength: 1000, multiline: true }) ||
          `Updated outcome stage to ${input.stage}.`,
      });

      const updated = await fetchProspectWithLogs(prospectId);
      return NextResponse.json({ success: true, prospect: updated });
    }

    if (input.action === 'MARK_OPT_OUT') {
      const reason =
        sanitizePlainText(input.reason, { maxLength: 500 }) ||
        'Marked opted out / Do Not Contact by operator.';

      await db
        .update(acquisitionProspects)
        .set({
          optOut: true,
          optOutAt: now,
          optOutReason: reason,
          permissionStatus: 'DO_NOT_CONTACT',
          stage: 'OPTED_OUT',
          draftStatus: existing.outreachDraft ? 'EDITED' : 'NONE',
          approvedBy: null,
          approvedAt: null,
          nextFollowUpAt: null,
          updatedAt: now,
        })
        .where(eq(acquisitionProspects.id, prospectId));

      await db.insert(acquisitionContactLogs).values({
        prospectId,
        actorEmail: auth.operator.email,
        channel: 'SYSTEM',
        direction: 'INTERNAL',
        actionType: 'OPT_OUT_RECORDED',
        summary: `Opt-out / Do Not Contact enforced: ${reason}`,
      });

      const updated = await fetchProspectWithLogs(prospectId);
      return NextResponse.json({ success: true, prospect: updated });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err: any) {
    console.error('[ACQUISITION_PATCH_ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update prospect.' },
      { status: 500 }
    );
  }
}
