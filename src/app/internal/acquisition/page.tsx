import Link from "next/link";
import { desc } from "drizzle-orm";
import { ShieldAlert } from "lucide-react";
import { db } from "@/db";
import {
  acquisitionProspects,
  acquisitionContactLogs,
  publicConversionEvents,
  realityChecks,
  businesses,
} from "@/db/schema";
import { getOperatorUser } from "@/lib/auth/operator";
import { ensureAcquisitionSchema } from "@/lib/acquisition/schema-bootstrap";
import { computeAcquisitionMeasurements } from "@/lib/acquisition/metrics";
import AcquisitionWorkspace, {
  type SerializedContactLog,
  type SerializedProspect,
  type UnimportedDiscussLead,
} from "./AcquisitionWorkspace";

export const dynamic = "force-dynamic";

function toIso(val?: Date | string | null): string | null {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default async function OperatorAcquisitionPage() {
  const operator = await getOperatorUser();

  if (!operator || !operator.isOperator) {
    return (
      <div className="min-h-screen bg-[#0b120e] text-[#F0EBE0] flex items-center justify-center p-6 font-[family-name:var(--font-body)]">
        <div className="max-w-md w-full bg-[#16231c] border border-[#E05A5A]/30 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-[#E05A5A]/12 border border-[#E05A5A]/30 text-[#f28b82] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] text-[#F0EBE0]">
              Operator Access Required
            </h2>
            <p className="text-sm text-[#bac9bf] leading-relaxed">
              This internal Acquisition Engine workspace is reserved for verified BaraTrust operators (Todd &amp; Noelah). Your account ({operator?.email || "unauthenticated"}) is not authorized.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <Link
              href="/sign-in"
              className="w-full py-3 bg-[#7be0b8] hover:bg-[#93e9c7] text-[#092016] font-bold rounded-lg text-sm transition-colors text-center"
            >
              Sign In With Operator Account
            </Link>
            <Link
              href="/"
              className="w-full py-3 text-[#bac9bf] hover:text-[#F0EBE0] text-xs transition-colors text-center"
            >
              Return to BaraTrust Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

  const logsByProspect = new Map<string, SerializedContactLog[]>();
  for (const log of logs) {
    const list = logsByProspect.get(log.prospectId) || [];
    list.push({
      id: log.id,
      prospectId: log.prospectId,
      actorEmail: log.actorEmail,
      channel: log.channel,
      direction: log.direction,
      actionType: log.actionType,
      summary: log.summary,
      createdAt: toIso(log.createdAt) || new Date().toISOString(),
    });
    logsByProspect.set(log.prospectId, list);
  }

  const serializedProspects: SerializedProspect[] = prospects.map((p) => ({
    id: p.id,
    businessName: p.businessName,
    location: p.location,
    industry: p.industry,
    websiteUrl: p.websiteUrl,
    sourceUrls: p.sourceUrls || [],
    researchNotes: p.researchNotes,
    realityCheckId: p.realityCheckId,
    fitScore: p.fitScore,
    fitExplanation: p.fitExplanation,
    assessmentStatus: p.assessmentStatus,
    primaryPillar: p.primaryPillar,
    evidenceObservation: p.evidenceObservation,
    decisionMakerName: p.decisionMakerName,
    decisionMakerRole: p.decisionMakerRole,
    decisionMakerSource: p.decisionMakerSource,
    contactMethod: p.contactMethod,
    contactValue: p.contactValue,
    permissionStatus: p.permissionStatus,
    outreachSubject: p.outreachSubject,
    outreachDraft: p.outreachDraft,
    draftStatus: p.draftStatus,
    approvedBy: p.approvedBy,
    approvedAt: toIso(p.approvedAt),
    reviewedBy: p.reviewedBy,
    reviewedAt: toIso(p.reviewedAt),
    optOut: p.optOut,
    optOutAt: toIso(p.optOutAt),
    optOutReason: p.optOutReason,
    nextFollowUpAt: toIso(p.nextFollowUpAt),
    stage: p.stage,
    outreachSentAt: toIso(p.outreachSentAt),
    conversationStartedAt: toIso(p.conversationStartedAt),
    meetingBookedAt: toIso(p.meetingBookedAt),
    meetingAttendedAt: toIso(p.meetingAttendedAt),
    convertedToPulseAt: toIso(p.convertedToPulseAt),
    createdBy: p.createdBy,
    createdAt: toIso(p.createdAt) || new Date().toISOString(),
    updatedAt: toIso(p.updatedAt) || new Date().toISOString(),
    contactLogs: logsByProspect.get(p.id) || [],
  }));

  const importedRcIds = new Set(
    prospects.map((p) => p.realityCheckId).filter((id): id is string => Boolean(id))
  );
  const existingEmails = new Set(
    prospects
      .map((p) => p.contactValue?.trim().toLowerCase())
      .filter((em): em is string => Boolean(em && em.includes("@")))
  );

  const discussLeads: UnimportedDiscussLead[] = checks
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
        rc.website.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0] ||
        rc.website,
      website: rc.website,
      cityState: rc.cityState || "Southern Indiana / Louisville",
      ownerName: rc.ownerName || null,
      email: rc.email!,
      phone: rc.phone || null,
      primaryHeadache: rc.primaryHeadache || null,
      overallScore: rc.overallScore,
      status: rc.status,
      createdAt: toIso(rc.createdAt) || new Date().toISOString(),
    }));

  return (
    <div className="min-h-screen bg-[#0b120e] text-[#F0EBE0] font-[family-name:var(--font-body)] selection:bg-[#7be0b8]/25">
      <header className="border-b border-[#2c3e33] bg-[#101914]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#16231c] border border-[#36493d] flex items-center justify-center">
                <span className="text-[#7be0b8] font-bold text-base font-[family-name:var(--font-display)]">
                  B
                </span>
              </div>
              <span className="text-lg font-bold text-[#F0EBE0] font-[family-name:var(--font-display)] tracking-tight">
                Bara<span className="text-[#7be0b8]">Trust</span>
              </span>
            </Link>
            <span className="text-[#8fa396] text-xs">/</span>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold tracking-wider text-[#7be0b8] uppercase bg-[#7be0b8]/12 border border-[#7be0b8]/30 px-2.5 py-0.5 rounded-full">
                Acquisition Engine V1
              </span>
              <span className="text-xs text-[#bac9bf] hidden sm:inline">
                Human-Approved Outreach &amp; Conversion
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/internal/reviews"
              className="px-3 py-1.5 rounded-lg bg-[#16231c] hover:bg-[#1e3127] border border-[#2c3e33] text-[#7be0b8] font-semibold transition-colors"
            >
              Review Studio
            </Link>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#16231c] border border-[#2c3e33]">
              <span className="w-2 h-2 rounded-full bg-[#7be0b8] animate-pulse"></span>
              <span className="text-[#bac9bf]">Operator:</span>
              <span className="text-[#F0EBE0] font-semibold">{operator.name}</span>
              <span className="text-[#8fa396] font-mono text-[11px]">
                ({operator.email})
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AcquisitionWorkspace
          initialMeasurements={measurements}
          initialDiscussLeads={discussLeads}
          initialProspects={serializedProspects}
        />
      </main>
    </div>
  );
}
