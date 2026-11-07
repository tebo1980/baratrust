import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  acquisitionProspects,
  acquisitionContactLogs,
  publicConversionEvents,
  realityChecks,
  businesses,
} from '@/db/schema';
import { requireOperatorApiAuth } from '@/lib/auth/operator';
import { ensureAcquisitionSchema } from '@/lib/acquisition/schema-bootstrap';
import {
  CreateProspectSchema,
  normalizeSourceUrls,
  sanitizePublicSourceUrl,
} from '@/lib/acquisition/service';
import { computeAcquisitionMeasurements } from '@/lib/acquisition/metrics';
import { sanitizePlainText } from '@/lib/security/public-guard';

export const dynamic = 'force-dynamic';

const ImportRealityCheckSchema = z.object({
  importFromRealityCheckId: z.string().uuid(),
});

export async function GET() {
  const auth = await requireOperatorApiAuth();
  if (!auth.ok) return auth.response;

  try {
    await ensureAcquisitionSchema();

    const prospects = await db
      .select()
      .from(acquisitionProspects)
      .orderBy(desc(acquisitionProspects.updatedAt));

    const logs = await db
      .select()
      .from(acquisitionContactLogs)
      .orderBy(desc(acquisitionContactLogs.createdAt));

    const checks = await db
      .select()
      .from(realityChecks)
      .orderBy(desc(realityChecks.createdAt));

    let memberRows: {
      id: number;
      businessName: string;
      ownerEmail: string | null;
      tier: string | null;
      isActive: boolean | null;
      stripeSubscriptionId: string | null;
    }[] = [];
    try {
      memberRows = await db
        .select({
          id: businesses.id,
          businessName: businesses.businessName,
          ownerEmail: businesses.ownerEmail,
          tier: businesses.tier,
          isActive: businesses.isActive,
          stripeSubscriptionId: businesses.stripeSubscriptionId,
        })
        .from(businesses);
    } catch {
      memberRows = [];
    }

    const conversionEvents = await db.select().from(publicConversionEvents);

    const measurements = computeAcquisitionMeasurements({
      prospects,
      realityChecks: checks,
      businesses: memberRows,
      conversionEvents,
    });

    const logsByProspect = new Map<string, typeof logs>();
    for (const log of logs) {
      const list = logsByProspect.get(log.prospectId) || [];
      list.push(log);
      logsByProspect.set(log.prospectId, list);
    }

    const importedRcIds = new Set(
      prospects.map((p) => p.realityCheckId).filter((id): id is string => Boolean(id))
    );
    const existingEmails = new Set(
      prospects
        .map((p) => p.contactValue?.trim().toLowerCase())
        .filter((em): em is string => Boolean(em && em.includes('@')))
    );

    const unimportedDiscussLeads = checks
      .filter((rc) => {
        if (!rc.email || !rc.email.trim()) return false;
        if (importedRcIds.has(rc.id)) return false;
        if (existingEmails.has(rc.email.trim().toLowerCase())) return false;
        return true;
      })
      .map((rc) => ({
        id: rc.id,
        businessName:
          rc.businessName ||
          rc.website.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0] ||
          rc.website,
        website: rc.website,
        cityState: rc.cityState || 'Southern Indiana / Louisville',
        ownerName: rc.ownerName || null,
        email: rc.email!,
        phone: rc.phone || null,
        primaryHeadache: rc.primaryHeadache || null,
        overallScore: rc.overallScore,
        status: rc.status,
        createdAt: rc.createdAt ? new Date(rc.createdAt).toISOString() : new Date().toISOString(),
      }));

    return NextResponse.json({
      success: true,
      operator: {
        email: auth.operator.email,
        name: auth.operator.name,
      },
      measurements,
      unimportedDiscussLeads,
      prospects: prospects.map((p) => ({
        ...p,
        contactLogs: logsByProspect.get(p.id) || [],
      })),
    });
  } catch (err: any) {
    console.error('[ACQUISITION_GET_ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to load acquisition workspace.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireOperatorApiAuth();
  if (!auth.ok) return auth.response;

  try {
    await ensureAcquisitionSchema();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Mode 1: 1-click import from an inbound "Discuss My Results" Reality Check record
    const importParsed = ImportRealityCheckSchema.safeParse(body);
    if (importParsed.success) {
      const rcId = importParsed.data.importFromRealityCheckId;
      const [rc] = await db
        .select()
        .from(realityChecks)
        .where(eq(realityChecks.id, rcId))
        .limit(1);

      if (!rc) {
        return NextResponse.json({ error: 'Reality Check record not found.' }, { status: 404 });
      }

      const [existingImported] = await db
        .select()
        .from(acquisitionProspects)
        .where(eq(acquisitionProspects.realityCheckId, rc.id))
        .limit(1);

      if (existingImported) {
        const existingLogs = await db
          .select()
          .from(acquisitionContactLogs)
          .where(eq(acquisitionContactLogs.prospectId, existingImported.id))
          .orderBy(desc(acquisitionContactLogs.createdAt));

        return NextResponse.json({
          success: true,
          alreadyImported: true,
          prospect: {
            ...existingImported,
            contactLogs: existingLogs,
          },
        });
      }

      const cleanUrl = sanitizePublicSourceUrl(rc.normalizedUrl || rc.website);
      const fallbackName =
        rc.businessName ||
        rc.website.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0] ||
        'Inbound Reality Check Business';

      const notesParts = [
        `Inbound Reality Check follow-up requested (${rc.status}).`,
        rc.overallScore !== null
          ? `Automated Reality Check Score: ${rc.overallScore}/100.`
          : `Automated Reality Check Score: Withheld / Deferred for human review.`,
        rc.primaryHeadache ? `Visitor Follow-Up Note: ${rc.primaryHeadache}` : null,
      ].filter(Boolean);

      const now = new Date();
      const [created] = await db
        .insert(acquisitionProspects)
        .values({
          businessName: sanitizePlainText(fallbackName, { maxLength: 200 }) || 'Local Business',
          location:
            sanitizePlainText(rc.cityState, { maxLength: 140 }) ||
            'Southern Indiana / Greater Louisville',
          industry: sanitizePlainText(rc.businessType, { maxLength: 120 }) || 'Local Business',
          websiteUrl: cleanUrl,
          sourceUrls: cleanUrl
            ? [{ label: 'Submitted Reality Check Link', url: cleanUrl }]
            : [],
          researchNotes: notesParts.join('\n'),
          realityCheckId: rc.id,
          assessmentStatus: 'NONE',
          evidenceObservation: rc.primaryHeadache
            ? sanitizePlainText(rc.primaryHeadache, { maxLength: 1000, multiline: true })
            : 'Requested personal follow-up after running a Free Reality Check.',
          decisionMakerName: sanitizePlainText(rc.ownerName, { maxLength: 140 }),
          decisionMakerRole: rc.ownerName ? 'Owner / Requestor' : null,
          decisionMakerSource: 'Inbound Discuss My Results form',
          contactMethod: rc.email ? 'EMAIL' : rc.phone ? 'PHONE' : 'NONE',
          contactValue: rc.email || rc.phone || null,
          permissionStatus: 'INBOUND_REQUEST',
          draftStatus: 'NONE',
          stage: 'CONVERSATION_STARTED',
          conversationStartedAt: now,
          createdBy: auth.operator.email,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const [logEntry] = await db
        .insert(acquisitionContactLogs)
        .values({
          prospectId: created.id,
          actorEmail: auth.operator.email,
          channel: 'SYSTEM',
          direction: 'INBOUND',
          actionType: 'DISCUSS_RESULTS_IMPORTED',
          summary: `Imported inbound "Discuss My Results" follow-up request (${rc.email || 'no email'}).`,
        })
        .returning();

      return NextResponse.json(
        {
          success: true,
          prospect: {
            ...created,
            contactLogs: [logEntry],
          },
        },
        { status: 201 }
      );
    }

    // Mode 2: Create manual prospect record
    const validation = CreateProspectSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || 'Invalid prospect fields.';
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const data = validation.data;
    const cleanWebsiteUrl = sanitizePublicSourceUrl(data.websiteUrl);
    if (data.websiteUrl && data.websiteUrl.trim() && !cleanWebsiteUrl) {
      return NextResponse.json(
        { error: 'Website URL must be a valid public http/https link.' },
        { status: 400 }
      );
    }

    const cleanSources = normalizeSourceUrls(data.sourceUrls);
    if (cleanWebsiteUrl && !cleanSources.some((s) => s.url === cleanWebsiteUrl)) {
      cleanSources.unshift({ label: 'Primary Website', url: cleanWebsiteUrl });
    }

    const hasOperatorFit = data.fitScore !== undefined && data.fitScore !== null;
    const cleanDraft = sanitizePlainText(data.outreachDraft, {
      maxLength: 4000,
      multiline: true,
    });
    const now = new Date();

    const [created] = await db
      .insert(acquisitionProspects)
      .values({
        businessName: sanitizePlainText(data.businessName, { maxLength: 200 })!,
        location: sanitizePlainText(data.location, { maxLength: 140 })!,
        industry: sanitizePlainText(data.industry, { maxLength: 120 })!,
        websiteUrl: cleanWebsiteUrl,
        sourceUrls: cleanSources,
        researchNotes: sanitizePlainText(data.researchNotes, {
          maxLength: 5000,
          multiline: true,
        }),
        realityCheckId: data.realityCheckId || null,
        fitScore: data.fitScore ?? null,
        fitExplanation: sanitizePlainText(data.fitExplanation, {
          maxLength: 2000,
          multiline: true,
        }),
        assessmentStatus: hasOperatorFit ? 'HUMAN_REVIEWED' : 'NONE',
        reviewedBy: hasOperatorFit ? auth.operator.email : null,
        reviewedAt: hasOperatorFit ? now : null,
        primaryPillar: data.primaryPillar || null,
        evidenceObservation: sanitizePlainText(data.evidenceObservation, {
          maxLength: 2000,
          multiline: true,
        }),
        decisionMakerName: sanitizePlainText(data.decisionMakerName, { maxLength: 140 }),
        decisionMakerRole: sanitizePlainText(data.decisionMakerRole, { maxLength: 120 }),
        decisionMakerSource: sanitizePlainText(data.decisionMakerSource, { maxLength: 300 }),
        contactMethod: data.contactMethod || 'NONE',
        contactValue: sanitizePlainText(data.contactValue, { maxLength: 300 }),
        permissionStatus: data.permissionStatus || 'NEEDS_VERIFICATION',
        outreachSubject: sanitizePlainText(data.outreachSubject, { maxLength: 240 }),
        outreachDraft: cleanDraft,
        draftStatus: cleanDraft ? 'EDITED' : 'NONE',
        stage: data.permissionStatus === 'DO_NOT_CONTACT' ? 'OPTED_OUT' : 'RESEARCHED',
        createdBy: auth.operator.email,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const [logEntry] = await db
      .insert(acquisitionContactLogs)
      .values({
        prospectId: created.id,
        actorEmail: auth.operator.email,
        channel: 'SYSTEM',
        direction: 'INTERNAL',
        actionType: 'PROSPECT_CREATED',
        summary: `Added researched prospect: ${created.businessName} (${created.location}).`,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        prospect: {
          ...created,
          contactLogs: [logEntry],
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[ACQUISITION_POST_ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create prospect.' },
      { status: 500 }
    );
  }
}
