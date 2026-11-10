"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { formatEasternDate } from "@/lib/format-date";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  Copy,
  Mail,
  Send,
  Ban,
  Calendar,
  Search,
  RefreshCw,
  ShieldCheck,
  ArrowDownToLine,
  MessageSquare,
  Trash2,
} from "lucide-react";
import {
  buildManualEmailComposeLinks,
  type AcquisitionPillar,
  type ProspectContactMethod,
  type ProspectPermissionStatus,
  type ProspectSourceUrl,
  type ProspectStage,
} from "@/lib/acquisition/service";
import type { AcquisitionMeasurementSummary } from "@/lib/acquisition/metrics";

export interface SerializedContactLog {
  id: string;
  prospectId: string;
  actorEmail: string;
  channel: string;
  direction: string;
  actionType: string;
  summary: string;
  createdAt: string;
}

export interface SerializedProspect {
  id: string;
  businessName: string;
  location: string;
  industry: string;
  websiteUrl: string | null;
  sourceUrls: ProspectSourceUrl[];
  researchNotes: string | null;
  realityCheckId: string | null;
  fitScore: number | null;
  fitExplanation: string | null;
  assessmentStatus: string;
  primaryPillar: string | null;
  evidenceObservation: string | null;
  decisionMakerName: string | null;
  decisionMakerRole: string | null;
  decisionMakerSource: string | null;
  contactMethod: string;
  contactValue: string | null;
  permissionStatus: string;
  outreachSubject: string | null;
  outreachDraft: string | null;
  draftStatus: string;
  approvedBy: string | null;
  approvedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  optOut: boolean;
  optOutAt: string | null;
  optOutReason: string | null;
  nextFollowUpAt: string | null;
  stage: string;
  outreachSentAt: string | null;
  conversationStartedAt: string | null;
  meetingBookedAt: string | null;
  meetingAttendedAt: string | null;
  convertedToPulseAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  contactLogs: SerializedContactLog[];
}

export interface UnimportedDiscussLead {
  id: string;
  businessName: string;
  website: string;
  cityState: string;
  ownerName: string | null;
  email: string;
  phone: string | null;
  primaryHeadache: string | null;
  overallScore: number | null;
  status: string;
  createdAt: string;
}

const STAGE_LABELS: Record<string, string> = {
  RESEARCHED: "Researched",
  APPROVED_FOR_OUTREACH: "Approved for Outreach",
  OUTREACH_SENT: "Outreach Sent",
  CONVERSATION_STARTED: "Conversation Started",
  MEETING_BOOKED: "Meeting Booked",
  MEETING_ATTENDED: "Meeting Attended",
  CUSTOMER_ACQUIRED: "Pulse Customer ($99/mo)",
  NOT_A_FIT: "Not a Fit",
  OPTED_OUT: "Opted Out / DNC",
};

function toDateInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function AcquisitionWorkspace({
  initialMeasurements,
  initialDiscussLeads,
  initialProspects,
}: {
  initialMeasurements: AcquisitionMeasurementSummary;
  initialDiscussLeads: UnimportedDiscussLead[];
  initialProspects: SerializedProspect[];
}) {
  const [measurements, setMeasurements] =
    useState<AcquisitionMeasurementSummary>(initialMeasurements);
  const [discussLeads, setDiscussLeads] =
    useState<UnimportedDiscussLead[]>(initialDiscussLeads);
  const [prospects, setProspects] = useState<SerializedProspect[]>(initialProspects);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProspects[0]?.id ?? null
  );

  // List filters
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBizName, setNewBizName] = useState("");
  const [newLocation, setNewLocation] = useState("New Albany, IN");
  const [newIndustry, setNewIndustry] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newContactMethod, setNewContactMethod] = useState<ProspectContactMethod>("EMAIL");
  const [newContactValue, setNewContactValue] = useState("");
  const [newPermission, setNewPermission] =
    useState<ProspectPermissionStatus>("PUBLIC_BUSINESS_CONTACT");

  // Busy & status banners
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  const [copiedBanner, setCopiedBanner] = useState(false);

  const selectedProspect = useMemo(
    () => prospects.find((p) => p.id === selectedId) || null,
    [prospects, selectedId]
  );

  // Editable form state synced to selectedProspect
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editWebsiteUrl, setEditWebsiteUrl] = useState("");
  const [editSources, setEditSources] = useState<ProspectSourceUrl[]>([]);
  const [newSourceLabel, setNewSourceLabel] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [editResearchNotes, setEditResearchNotes] = useState("");
  const [editFitScore, setEditFitScore] = useState<string>("");
  const [editFitExplanation, setEditFitExplanation] = useState("");
  const [editPrimaryPillar, setEditPrimaryPillar] = useState<string>("");
  const [editEvidenceObs, setEditEvidenceObs] = useState("");
  const [editDmName, setEditDmName] = useState("");
  const [editDmRole, setEditDmRole] = useState("");
  const [editDmSource, setEditDmSource] = useState("");
  const [editContactMethod, setEditContactMethod] =
    useState<ProspectContactMethod>("NONE");
  const [editContactValue, setEditContactValue] = useState("");
  const [editPermission, setEditPermission] =
    useState<ProspectPermissionStatus>("NEEDS_VERIFICATION");
  const [editNextFollowUp, setEditNextFollowUp] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editDraft, setEditDraft] = useState("");

  // Log Outreach Sent & Contact Note state
  const [sentChannel, setSentChannel] = useState<
    "EMAIL" | "PHONE" | "IN_PERSON" | "CONTACT_FORM" | "LINKEDIN"
  >("EMAIL");
  const [sentSummary, setSentSummary] = useState("");
  const [sentFollowUpDate, setSentFollowUpDate] = useState("");

  const [noteDirection, setNoteDirection] = useState<"INBOUND" | "OUTBOUND" | "INTERNAL">(
    "INBOUND"
  );
  const [noteChannel, setNoteChannel] = useState<
    "EMAIL" | "PHONE" | "IN_PERSON" | "CONTACT_FORM" | "LINKEDIN" | "MEETING"
  >("EMAIL");
  const [noteSummary, setNoteSummary] = useState("");
  const [optOutReasonInput, setOptOutReasonInput] = useState("");

  const hydratedProspectIdRef = useRef<string | null>(null);

  const hydrateFormFromProspect = useCallback((p: SerializedProspect) => {
    hydratedProspectIdRef.current = p.id;
    setEditBusinessName(p.businessName);
    setEditLocation(p.location);
    setEditIndustry(p.industry);
    setEditWebsiteUrl(p.websiteUrl || "");
    setEditSources(p.sourceUrls || []);
    setNewSourceLabel("");
    setNewSourceUrl("");
    setEditResearchNotes(p.researchNotes || "");
    setEditFitScore(
      p.fitScore !== null && p.fitScore !== undefined ? String(p.fitScore) : ""
    );
    setEditFitExplanation(p.fitExplanation || "");
    setEditPrimaryPillar(p.primaryPillar || "");
    setEditEvidenceObs(p.evidenceObservation || "");
    setEditDmName(p.decisionMakerName || "");
    setEditDmRole(p.decisionMakerRole || "");
    setEditDmSource(p.decisionMakerSource || "");
    setEditContactMethod((p.contactMethod as ProspectContactMethod) || "NONE");
    setEditContactValue(p.contactValue || "");
    setEditPermission(
      (p.permissionStatus as ProspectPermissionStatus) || "NEEDS_VERIFICATION"
    );
    setEditNextFollowUp(toDateInputValue(p.nextFollowUpAt));
    setEditSubject(p.outreachSubject || "");
    setEditDraft(p.outreachDraft || "");
    if (p.contactMethod && p.contactMethod !== "NONE") {
      setSentChannel(
        p.contactMethod as
          | "EMAIL"
          | "PHONE"
          | "IN_PERSON"
          | "CONTACT_FORM"
          | "LINKEDIN"
      );
    } else {
      setSentChannel("EMAIL");
    }
  }, []);

  // Only auto-hydrate when switching to a different selected prospect ID
  useEffect(() => {
    if (!selectedProspect) {
      hydratedProspectIdRef.current = null;
      return;
    }
    if (hydratedProspectIdRef.current !== selectedProspect.id) {
      hydrateFormFromProspect(selectedProspect);
    }
  }, [selectedProspect, hydrateFormFromProspect]);

  const refreshMetricsAndQueue = async () => {
    try {
      const res = await fetch("/api/internal/acquisition", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setMeasurements(data.measurements);
        setDiscussLeads(data.unimportedDiscussLeads || []);
      }
    } catch {
      // Non-blocking
    }
  };

  const replaceProspectInState = (updated: SerializedProspect) => {
    setProspects((prev) => {
      const exists = prev.some((p) => p.id === updated.id);
      if (!exists) return [updated, ...prev];
      return prev.map((p) => (p.id === updated.id ? updated : p));
    });
    hydrateFormFromProspect(updated);
    void refreshMetricsAndQueue();
  };

  const filteredProspects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return prospects.filter((p) => {
      if (stageFilter !== "ALL" && p.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        p.businessName.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.industry.toLowerCase().includes(q) ||
        (p.contactValue || "").toLowerCase().includes(q)
      );
    });
  }, [prospects, searchQuery, stageFilter]);

  const hasUnsavedDraftChanges = useMemo(() => {
    if (!selectedProspect) return false;
    return (
      (selectedProspect.outreachSubject || "").trim() !== editSubject.trim() ||
      (selectedProspect.outreachDraft || "").trim() !== editDraft.trim()
    );
  }, [selectedProspect, editSubject, editDraft]);

  const isOutreachUnlocked = Boolean(
    selectedProspect &&
      !selectedProspect.optOut &&
      selectedProspect.permissionStatus !== "DO_NOT_CONTACT" &&
      selectedProspect.draftStatus === "APPROVED_FOR_OUTREACH" &&
      !hasUnsavedDraftChanges &&
      selectedProspect.outreachDraft &&
      selectedProspect.outreachDraft.trim().length > 0
  );

  const manualComposeLinks = useMemo(() => {
    if (!selectedProspect || !isOutreachUnlocked) return null;
    if (!editContactValue || !editContactValue.includes("@")) return null;
    return buildManualEmailComposeLinks({
      toEmail: editContactValue,
      subject: editSubject,
      body: editDraft,
    });
  }, [selectedProspect, isOutreachUnlocked, editContactValue, editSubject, editDraft]);

  const handleImportDiscussLead = async (realityCheckId: string) => {
    setBusyAction(`import-${realityCheckId}`);
    setStatusBanner(null);
    try {
      const res = await fetch("/api/internal/acquisition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importFromRealityCheckId: realityCheckId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not import follow-up request.");
      }
      setSelectedId(data.prospect.id);
      replaceProspectInState(data.prospect);
      setStatusBanner({
        kind: "ok",
        text: `Imported "${data.prospect.businessName}" into the Acquisition Pipeline.`,
      });
    } catch (err: any) {
      setStatusBanner({ kind: "err", text: err.message });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction("create");
    setStatusBanner(null);
    try {
      const res = await fetch("/api/internal/acquisition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: newBizName,
          location: newLocation,
          industry: newIndustry,
          websiteUrl: newWebsite || null,
          researchNotes: newNotes || null,
          contactMethod: newContactMethod,
          contactValue: newContactValue || null,
          permissionStatus: newPermission,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not create prospect.");
      }
      setShowCreateModal(false);
      setNewBizName("");
      setNewIndustry("");
      setNewWebsite("");
      setNewNotes("");
      setNewContactValue("");
      setSelectedId(data.prospect.id);
      replaceProspectInState(data.prospect);
      setStatusBanner({
        kind: "ok",
        text: `Added researched prospect "${data.prospect.businessName}".`,
      });
    } catch (err: any) {
      setStatusBanner({ kind: "err", text: err.message });
    } finally {
      setBusyAction(null);
    }
  };

  const collectMergedSources = (): ProspectSourceUrl[] => {
    if (newSourceLabel.trim() && newSourceUrl.trim()) {
      const formattedUrl = /^https?:\/\//i.test(newSourceUrl.trim())
        ? newSourceUrl.trim()
        : `https://${newSourceUrl.trim()}`;
      const merged = [
        ...editSources,
        { label: newSourceLabel.trim(), url: formattedUrl },
      ];
      setEditSources(merged);
      setNewSourceLabel("");
      setNewSourceUrl("");
      return merged;
    }
    return editSources;
  };

  const buildUpdateFieldsPayload = (sourcesToSave: ProspectSourceUrl[]) => {
    const parsedScore =
      editFitScore.trim() === "" ? null : Number.parseInt(editFitScore, 10);
    return {
      action: "UPDATE_FIELDS" as const,
      businessName: editBusinessName,
      location: editLocation,
      industry: editIndustry,
      websiteUrl: editWebsiteUrl || null,
      sourceUrls: sourcesToSave,
      researchNotes: editResearchNotes || null,
      fitScore: Number.isFinite(parsedScore) ? parsedScore : null,
      fitExplanation: editFitExplanation || null,
      primaryPillar: (editPrimaryPillar as AcquisitionPillar) || null,
      evidenceObservation: editEvidenceObs || null,
      decisionMakerName: editDmName || null,
      decisionMakerRole: editDmRole || null,
      decisionMakerSource: editDmSource || null,
      contactMethod: editContactMethod,
      contactValue: editContactValue || null,
      permissionStatus: editPermission,
      outreachSubject: editSubject || null,
      outreachDraft: editDraft || null,
      nextFollowUpAt: editNextFollowUp
        ? new Date(`${editNextFollowUp}T13:00:00Z`).toISOString()
        : null,
    };
  };

  const hasDirtyNonDraftFields = (sourcesToCheck: ProspectSourceUrl[]): boolean => {
    if (!selectedProspect) return false;
    const savedScoreStr =
      selectedProspect.fitScore !== null && selectedProspect.fitScore !== undefined
        ? String(selectedProspect.fitScore)
        : "";
    return (
      selectedProspect.businessName !== editBusinessName ||
      selectedProspect.location !== editLocation ||
      selectedProspect.industry !== editIndustry ||
      (selectedProspect.websiteUrl || "") !== editWebsiteUrl ||
      JSON.stringify(selectedProspect.sourceUrls || []) !==
        JSON.stringify(sourcesToCheck) ||
      (selectedProspect.researchNotes || "") !== editResearchNotes ||
      savedScoreStr !== editFitScore.trim() ||
      (selectedProspect.fitExplanation || "") !== editFitExplanation ||
      (selectedProspect.primaryPillar || "") !== editPrimaryPillar ||
      (selectedProspect.evidenceObservation || "") !== editEvidenceObs ||
      (selectedProspect.decisionMakerName || "") !== editDmName ||
      (selectedProspect.decisionMakerRole || "") !== editDmRole ||
      (selectedProspect.decisionMakerSource || "") !== editDmSource ||
      (selectedProspect.contactMethod || "NONE") !== editContactMethod ||
      (selectedProspect.contactValue || "") !== editContactValue ||
      (selectedProspect.permissionStatus || "NEEDS_VERIFICATION") !==
        editPermission ||
      toDateInputValue(selectedProspect.nextFollowUpAt) !== editNextFollowUp
    );
  };

  const runPatchAction = async (payload: Record<string, unknown>, okMessage: string) => {
    if (!selectedProspect) return;
    setBusyAction(String(payload.action));
    setStatusBanner(null);
    try {
      // Persist any unsaved research/contact/pillar edits before VERIFY_ASSESSMENT or APPROVE_DRAFT so nothing typed is lost
      if (
        payload.action === "VERIFY_ASSESSMENT" ||
        payload.action === "APPROVE_DRAFT"
      ) {
        const mergedSources = collectMergedSources();
        if (hasDirtyNonDraftFields(mergedSources)) {
          const preSaveRes = await fetch(
            `/api/internal/acquisition/${selectedProspect.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(buildUpdateFieldsPayload(mergedSources)),
            }
          );
          const preSaveData = await preSaveRes.json();
          if (!preSaveRes.ok || !preSaveData.success) {
            throw new Error(preSaveData.error || "Could not save pending field edits.");
          }
        }
      }

      const res = await fetch(`/api/internal/acquisition/${selectedProspect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Update failed.");
      }
      replaceProspectInState(data.prospect);
      setStatusBanner({ kind: "ok", text: okMessage });
    } catch (err: any) {
      setStatusBanner({ kind: "err", text: err.message });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunAiAssist = async () => {
    if (!selectedProspect) return;
    setBusyAction("AI_ASSIST");
    setStatusBanner(null);
    try {
      // Auto-save any unsaved research notes, attached source URLs, or contact edits BEFORE running AI Assist
      const mergedSources = collectMergedSources();
      if (hasDirtyNonDraftFields(mergedSources) || hasUnsavedDraftChanges) {
        const preSaveRes = await fetch(
          `/api/internal/acquisition/${selectedProspect.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildUpdateFieldsPayload(mergedSources)),
          }
        );
        const preSaveData = await preSaveRes.json();
        if (!preSaveRes.ok || !preSaveData.success) {
          throw new Error(preSaveData.error || "Could not save research notes before AI assist.");
        }
      }

      const res = await fetch(
        `/api/internal/acquisition/${selectedProspect.id}/assist`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "AI assist failed.");
      }
      replaceProspectInState(data.prospect);
      setStatusBanner({
        kind: "ok",
        text: "Generated unverified AI fit score & outreach draft. Please review and approve before outreach.",
      });
    } catch (err: any) {
      setStatusBanner({ kind: "err", text: err.message });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveFields = () => {
    const mergedSources = collectMergedSources();
    void runPatchAction(
      buildUpdateFieldsPayload(mergedSources),
      hasUnsavedDraftChanges &&
        selectedProspect?.draftStatus === "APPROVED_FOR_OUTREACH"
        ? "Saved changes. Draft approval was reset because message wording changed — re-approve when ready."
        : "Saved prospect research & details."
    );
  };

  const handleAddSource = () => {
    if (!newSourceLabel.trim() || !newSourceUrl.trim()) return;
    const formattedUrl = /^https?:\/\//i.test(newSourceUrl.trim())
      ? newSourceUrl.trim()
      : `https://${newSourceUrl.trim()}`;
    setEditSources((prev) => [
      ...prev,
      { label: newSourceLabel.trim(), url: formattedUrl },
    ]);
    setNewSourceLabel("");
    setNewSourceUrl("");
  };

  const handleCopyApprovedDraft = async () => {
    if (!isOutreachUnlocked) return;
    const text = editSubject.trim()
      ? `Subject: ${editSubject.trim()}\n\n${editDraft}`
      : editDraft;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBanner(true);
      setTimeout(() => setCopiedBanner(false), 3000);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div className="space-y-6">
      {/* PART C: CONVERSION & ACQUISITION MEASUREMENT SCOREBOARD */}
      <section aria-label="Acquisition Measurements" className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#8fa396]">
            Prospects Researched
          </div>
          <div className="text-2xl font-bold text-[#F0EBE0] mt-1">
            {measurements.prospectsResearched}
          </div>
          <div className="text-[11px] text-[#bac9bf] mt-1">In acquisition pipeline</div>
        </div>

        <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#8fa396]">
            Approved for Outreach
          </div>
          <div className="text-2xl font-bold text-[#7be0b8] mt-1">
            {measurements.prospectsApprovedForOutreach}
          </div>
          <div className="text-[11px] text-[#bac9bf] mt-1">Human-approved 1:1</div>
        </div>

        <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#8fa396]">
            Conversations Started
          </div>
          <div className="text-2xl font-bold text-[#F0EBE0] mt-1">
            {measurements.conversationsStarted}
          </div>
          <div className="text-[11px] text-[#bac9bf] mt-1">Deduplicated total</div>
        </div>

        <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#8fa396]">
            Confirmed Meetings
          </div>
          <div className="text-2xl font-bold text-[#F0EBE0] mt-1">
            {measurements.meetingsBooked}{" "}
            <span className="text-sm font-normal text-[#bac9bf]">
              ({measurements.meetingsAttended} attended)
            </span>
          </div>
          <div className="text-[11px] text-[#8fa396] mt-1">
            Unconfirmed booking clicks: {measurements.unconfirmedBookingClicks}
          </div>
        </div>

        <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#8fa396]">
            Reality Checks
          </div>
          <div className="text-2xl font-bold text-[#F0EBE0] mt-1">
            {measurements.realityChecksFollowUpRequests}{" "}
            <span className="text-sm font-normal text-[#bac9bf]">
              follow-ups / {measurements.realityChecksTotalScans} scans
            </span>
          </div>
          <div className="text-[11px] text-[#bac9bf] mt-1">“Discuss My Results”</div>
        </div>

        <div className="bg-[#16231c] border border-[#7be0b8]/40 rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#7be0b8]">
            Pulse Customers
          </div>
          <div className="text-2xl font-bold text-[#7be0b8] mt-1">
            {measurements.businessPulseCustomersAcquired}
          </div>
          <div className="text-[11px] text-[#bac9bf] mt-1">Deduplicated ($99/mo)</div>
        </div>
      </section>

      {/* INBOUND "DISCUSS MY RESULTS" STRIP */}
      {discussLeads.length > 0 && (
        <section className="bg-[#13221a] border border-[#7be0b8]/35 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-[#7be0b8]" />
              <h2 className="text-sm font-bold text-[#F0EBE0]">
                Inbound “Discuss My Results” Follow-Up Requests ({discussLeads.length})
              </h2>
            </div>
            <span className="text-xs text-[#bac9bf]">
              Visitors who ran a Free Reality Check and asked Todd &amp; Noelah to follow up
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {discussLeads.slice(0, 6).map((lead) => (
              <div
                key={lead.id}
                className="bg-[#0e1712] border border-[#2c3e33] rounded-lg p-3.5 flex items-start justify-between gap-3"
              >
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-[#F0EBE0] text-sm">
                    {lead.businessName}{" "}
                    <span className="text-[#8fa396] font-normal">({lead.cityState})</span>
                  </div>
                  <div className="text-[#bac9bf]">
                    {lead.ownerName ? `${lead.ownerName} · ` : ""}
                    {lead.email}
                    {lead.phone ? ` · ${lead.phone}` : ""}
                  </div>
                  {lead.primaryHeadache && (
                    <div className="text-[#7be0b8] italic">{lead.primaryHeadache}</div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busyAction === `import-${lead.id}`}
                  onClick={() => handleImportDiscussLead(lead.id)}
                  className="px-3 py-1.5 bg-[#7be0b8] hover:bg-[#93e9c7] text-[#092016] font-bold rounded-lg text-xs whitespace-nowrap transition-colors"
                >
                  {busyAction === `import-${lead.id}` ? "Importing..." : "Import"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {statusBanner && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-xs font-medium flex items-center justify-between border ${
            statusBanner.kind === "ok"
              ? "bg-[#162c22] border-[#7be0b8]/40 text-[#c8f5e2]"
              : "bg-[#2c1515] border-[#f28b82]/40 text-[#fca5a5]"
          }`}
        >
          <span>{statusBanner.text}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="underline ml-4 opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* MAIN TWO-COLUMN OPERATOR WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: PROSPECT QUEUE */}
        <aside className="lg:col-span-4 bg-[#16231c] border border-[#2c3e33] rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[#F0EBE0]">
              Researched Prospects ({filteredProspects.length})
            </h2>
            <button
              type="button"
              onClick={() => setShowCreateModal((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7be0b8] hover:bg-[#93e9c7] text-[#092016] font-bold rounded-lg text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Prospect
            </button>
          </div>

          {showCreateModal && (
            <form
              onSubmit={handleCreateProspect}
              className="bg-[#0e1712] border border-[#36493d] rounded-xl p-3.5 space-y-3 text-xs"
            >
              <div className="font-bold text-[#7be0b8] uppercase tracking-wider text-[11px]">
                New Researched Local Business
              </div>
              <input
                type="text"
                required
                placeholder="Business name *"
                value={newBizName}
                onChange={(e) => setNewBizName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="City, State *"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
                />
                <input
                  type="text"
                  required
                  placeholder="Industry (e.g., Retail) *"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
                />
              </div>
              <input
                type="text"
                placeholder="Public website or page URL (optional)"
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newContactMethod}
                  onChange={(e) =>
                    setNewContactMethod(e.target.value as ProspectContactMethod)
                  }
                  className="w-full px-2.5 py-2 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
                >
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Phone</option>
                  <option value="IN_PERSON">In Person</option>
                  <option value="CONTACT_FORM">Website Form</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="NONE">No Contact Yet</option>
                </select>
                <select
                  value={newPermission}
                  onChange={(e) =>
                    setNewPermission(e.target.value as ProspectPermissionStatus)
                  }
                  className="w-full px-2.5 py-2 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
                >
                  <option value="PUBLIC_BUSINESS_CONTACT">Public Business Contact</option>
                  <option value="INBOUND_REQUEST">Inbound Request</option>
                  <option value="WARM_REFERRAL">Warm Referral</option>
                  <option value="PRIOR_RELATIONSHIP">Prior Relationship</option>
                  <option value="NEEDS_VERIFICATION">Needs Verification</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Public business email or phone (optional)"
                value={newContactValue}
                onChange={(e) => setNewContactValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
              />
              <textarea
                rows={3}
                placeholder="Initial public research notes (what stood out across Protect, Improve, Grow, or Save)..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busyAction === "create"}
                  className="flex-1 py-2 bg-[#7be0b8] text-[#092016] font-bold rounded-lg"
                >
                  {busyAction === "create" ? "Saving..." : "Save Prospect"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 bg-[#22342a] text-[#bac9bf] rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Search & Stage Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8fa396] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, city, industry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-xs text-[#F0EBE0]"
              />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-xs text-[#F0EBE0]"
            >
              <option value="ALL">All Pipeline Stages</option>
              {Object.entries(STAGE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Prospect List */}
          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {filteredProspects.length === 0 ? (
              <div className="text-xs text-[#8fa396] text-center py-8">
                No prospects match this filter yet. Click <strong>+ Add Prospect</strong> to log a researched local business.
              </div>
            ) : (
              filteredProspects.map((p) => {
                const isSelected = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-colors space-y-1.5 ${
                      isSelected
                        ? "bg-[#1e3127] border-[#7be0b8]/60"
                        : "bg-[#0e1712] border-[#2c3e33] hover:border-[#3d5647]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-[#F0EBE0]">
                        {p.businessName}
                      </span>
                      {p.fitScore !== null && (
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                            p.assessmentStatus === "UNVERIFIED_AI"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-[#7be0b8]/15 text-[#7be0b8] border border-[#7be0b8]/30"
                          }`}
                        >
                          Fit {p.fitScore}
                          {p.assessmentStatus === "UNVERIFIED_AI" ? "*" : ""}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#bac9bf]">
                      {p.industry} · {p.location}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] font-mono text-[#7be0b8]">
                        {STAGE_LABELS[p.stage] || p.stage}
                      </span>
                      {p.nextFollowUpAt && (
                        <span className="text-[11px] text-[#8fa396] inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {toDateInputValue(p.nextFollowUpAt)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: SELECTED PROSPECT DETAIL WORKSPACE */}
        <section className="lg:col-span-8 space-y-5">
          {!selectedProspect ? (
            <div className="bg-[#16231c] border border-[#2c3e33] rounded-2xl p-10 text-center space-y-3">
              <h3 className="text-lg font-bold text-[#F0EBE0]">
                Select or Add a Researched Prospect
              </h3>
              <p className="text-sm text-[#bac9bf] max-w-md mx-auto">
                Research local Southern Indiana &amp; Louisville businesses from legitimate public sources, organize notes and fit scores, approve human 1-to-1 outreach, and track conversations.
              </p>
            </div>
          ) : (
            <>
              {/* Header Bar */}
              <div className="bg-[#16231c] border border-[#2c3e33] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-[#F0EBE0]">
                      {selectedProspect.businessName}
                    </h2>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#7be0b8]/12 border border-[#7be0b8]/30 text-[#7be0b8]">
                      {STAGE_LABELS[selectedProspect.stage] || selectedProspect.stage}
                    </span>
                    {selectedProspect.optOut && (
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#E05A5A]/20 border border-[#E05A5A]/40 text-[#fca5a5]">
                        OPTED OUT — DO NOT CONTACT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#bac9bf]">
                    {selectedProspect.industry} · {selectedProspect.location}
                    {selectedProspect.websiteUrl && (
                      <>
                        {" · "}
                        <a
                          href={selectedProspect.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7be0b8] underline inline-flex items-center gap-1"
                        >
                          Public Link <ExternalLink className="w-3 h-3" />
                        </a>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={
                      busyAction === "AI_ASSIST" ||
                      selectedProspect.optOut ||
                      selectedProspect.permissionStatus === "DO_NOT_CONTACT"
                    }
                    onClick={handleRunAiAssist}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#22342a] hover:bg-[#2b4135] border border-[#7be0b8]/40 text-[#7be0b8] font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    {busyAction === "AI_ASSIST" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    AI Organize, Fit &amp; Draft
                  </button>
                  <button
                    type="button"
                    disabled={busyAction === "UPDATE_FIELDS"}
                    onClick={handleSaveFields}
                    className="px-4 py-2 bg-[#7be0b8] hover:bg-[#93e9c7] text-[#092016] font-bold rounded-lg text-xs transition-colors"
                  >
                    {busyAction === "UPDATE_FIELDS" ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>

              {/* 1. FIT SCORE & EVIDENCE-BACKED OBSERVATION */}
              <div className="bg-[#16231c] border border-[#2c3e33] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#8fa396] font-mono">
                    1. Fit Score &amp; Evidence-Backed Observation
                  </h3>

                  {selectedProspect.assessmentStatus === "UNVERIFIED_AI" ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        UNVERIFIED AI ASSESSMENT
                      </span>
                      <button
                        type="button"
                        disabled={busyAction === "VERIFY_ASSESSMENT"}
                        onClick={() =>
                          runPatchAction(
                            {
                              action: "VERIFY_ASSESSMENT",
                              fitScore:
                                editFitScore.trim() === ""
                                  ? null
                                  : Number.parseInt(editFitScore, 10),
                              fitExplanation: editFitExplanation || null,
                            },
                            "Marked fit assessment as Human Reviewed."
                          )
                        }
                        className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded text-xs"
                      >
                        Mark Human Reviewed
                      </button>
                    </div>
                  ) : selectedProspect.assessmentStatus === "HUMAN_REVIEWED" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded bg-[#7be0b8]/15 border border-[#7be0b8]/35 text-[#7be0b8]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Human Reviewed ({selectedProspect.reviewedBy || "Operator"})
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-[#8fa396]">
                      Not yet scored
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <label className="space-y-1 block">
                    <span className="text-[#bac9bf]">Fit Score (0–100)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editFitScore}
                      onChange={(e) => setEditFitScore(e.target.value)}
                      placeholder="e.g. 82"
                      className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    />
                  </label>

                  <label className="space-y-1 block sm:col-span-2">
                    <span className="text-[#bac9bf]">Primary Pillar Angle</span>
                    <select
                      value={editPrimaryPillar}
                      onChange={(e) => setEditPrimaryPillar(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    >
                      <option value="">Select primary pillar...</option>
                      <option value="PROTECT">PROTECT — Prevent risk / reputation / info drift</option>
                      <option value="IMPROVE">IMPROVE — Customer journey &amp; conversion</option>
                      <option value="GROW">GROW — Local events, partnerships &amp; demand</option>
                      <option value="SAVE">SAVE — Supplier / vendor value &amp; cost checks</option>
                    </select>
                  </label>
                </div>

                <label className="space-y-1 block text-xs">
                  <span className="text-[#bac9bf]">Fit Explanation</span>
                  <textarea
                    rows={2}
                    value={editFitExplanation}
                    onChange={(e) => setEditFitExplanation(e.target.value)}
                    placeholder="Why is this business a genuine fit (even if healthy)?"
                    className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                  />
                </label>

                <label className="space-y-1 block text-xs">
                  <span className="text-[#bac9bf]">
                    Evidence-Backed Observation or Opportunity (must be grounded in public evidence)
                  </span>
                  <textarea
                    rows={2}
                    value={editEvidenceObs}
                    onChange={(e) => setEditEvidenceObs(e.target.value)}
                    placeholder="Specific public observation, upcoming regional event match, or customer-journey detail..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                  />
                </label>
              </div>

              {/* 2. BUSINESS PROFILE, PUBLIC SOURCES & RESEARCH NOTES */}
              <div className="bg-[#16231c] border border-[#2c3e33] rounded-2xl p-5 space-y-4 text-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#8fa396] font-mono">
                  2. Public Sources &amp; Research Notes
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-[#bac9bf]">Business Name</span>
                    <input
                      type="text"
                      value={editBusinessName}
                      onChange={(e) => setEditBusinessName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[#bac9bf]">Location</span>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[#bac9bf]">Industry</span>
                    <input
                      type="text"
                      value={editIndustry}
                      onChange={(e) => setEditIndustry(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    />
                  </label>
                </div>

                <label className="space-y-1 block">
                  <span className="text-[#bac9bf]">Primary Website / Public Page URL</span>
                  <input
                    type="text"
                    value={editWebsiteUrl}
                    onChange={(e) => setEditWebsiteUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                  />
                </label>

                <div className="space-y-2">
                  <span className="text-[#bac9bf] block">
                    Public Source URLs (legitimate public pages only — no private Facebook group scraping)
                  </span>
                  {editSources.length > 0 && (
                    <ul className="space-y-1.5">
                      {editSources.map((src, idx) => (
                        <li
                          key={`${src.url}-${idx}`}
                          className="flex items-center justify-between gap-2 bg-[#0e1712] border border-[#2c3e33] rounded-lg px-3 py-1.5"
                        >
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#7be0b8] hover:underline truncate inline-flex items-center gap-1.5"
                          >
                            <strong>{src.label}:</strong> {src.url}{" "}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              setEditSources((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-[#8fa396] hover:text-[#fca5a5]"
                            title="Remove source"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      placeholder="Label (e.g. Google Maps, Event Packet)"
                      value={newSourceLabel}
                      onChange={(e) => setNewSourceLabel(e.target.value)}
                      className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    />
                    <input
                      type="text"
                      placeholder="https://..."
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    />
                    <button
                      type="button"
                      onClick={handleAddSource}
                      className="px-3 py-1.5 bg-[#22342a] hover:bg-[#2b4135] text-[#F0EBE0] rounded-lg font-semibold"
                    >
                      + Attach URL
                    </button>
                  </div>
                </div>

                <label className="space-y-1 block">
                  <span className="text-[#bac9bf]">Research Notes</span>
                  <textarea
                    rows={4}
                    value={editResearchNotes}
                    onChange={(e) => setEditResearchNotes(e.target.value)}
                    placeholder="Document public observations, seasonal context, local events, or Reality Check notes..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                  />
                </label>
              </div>

              {/* 3. DECISION-MAKER, CONTACT PERMISSION & FOLLOW-UP / OPT-OUT */}
              <div className="bg-[#16231c] border border-[#2c3e33] rounded-2xl p-5 space-y-4 text-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#8fa396] font-mono">
                  3. Decision-Maker, Contact Method &amp; Permission Safeguards
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-[#bac9bf]">Decision-Maker Name</span>
                    <input
                      type="text"
                      value={editDmName}
                      onChange={(e) => setEditDmName(e.target.value)}
                      placeholder="Where legitimately public"
                      className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[#bac9bf]">Role</span>
                    <input
                      type="text"
                      value={editDmRole}
                      onChange={(e) => setEditDmRole(e.target.value)}
                      placeholder="Owner / General Manager"
                      className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[#bac9bf]">Public Source of Name</span>
                    <input
                      type="text"
                      value={editDmSource}
                      onChange={(e) => setEditDmSource(e.target.value)}
                      placeholder="e.g. Website About page"
                      className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-[#bac9bf]">Contact Method (No SMS)</span>
                    <select
                      value={editContactMethod}
                      onChange={(e) =>
                        setEditContactMethod(e.target.value as ProspectContactMethod)
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    >
                      <option value="EMAIL">Email</option>
                      <option value="PHONE">Phone Call</option>
                      <option value="IN_PERSON">In-Person Visit</option>
                      <option value="CONTACT_FORM">Public Contact Form</option>
                      <option value="LINKEDIN">LinkedIn</option>
                      <option value="NONE">None Selected</option>
                    </select>
                  </label>

                  <label className="space-y-1 block sm:col-span-2">
                    <span className="text-[#bac9bf]">Contact Address / Phone / URL</span>
                    <input
                      type="text"
                      value={editContactValue}
                      onChange={(e) => setEditContactValue(e.target.value)}
                      placeholder="owner@business.com or 502-..."
                      className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-[#bac9bf]">Next Follow-Up Date</span>
                    <input
                      type="date"
                      value={editNextFollowUp}
                      onChange={(e) => setEditNextFollowUp(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    />
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
                  <label className="space-y-1 block flex-1">
                    <span className="text-[#bac9bf]">Permission / Basis Status</span>
                    <select
                      value={editPermission}
                      onChange={(e) =>
                        setEditPermission(e.target.value as ProspectPermissionStatus)
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                    >
                      <option value="PUBLIC_BUSINESS_CONTACT">Public Business Contact</option>
                      <option value="INBOUND_REQUEST">Inbound “Discuss My Results” Request</option>
                      <option value="WARM_REFERRAL">Warm Local Referral</option>
                      <option value="PRIOR_RELATIONSHIP">Prior Relationship</option>
                      <option value="NEEDS_VERIFICATION">Needs Verification</option>
                      <option value="DO_NOT_CONTACT">Do Not Contact</option>
                    </select>
                  </label>

                  {!selectedProspect.optOut && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Opt-out reason (optional)"
                        value={optOutReasonInput}
                        onChange={(e) => setOptOutReasonInput(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                      />
                      <button
                        type="button"
                        disabled={busyAction === "MARK_OPT_OUT"}
                        onClick={() =>
                          runPatchAction(
                            {
                              action: "MARK_OPT_OUT",
                              reason:
                                optOutReasonInput ||
                                "Marked opted out / Do Not Contact",
                            },
                            "Prospect permanently marked Opted Out / Do Not Contact."
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#2c1515] hover:bg-[#3b1c1c] border border-[#E05A5A]/40 text-[#fca5a5] font-semibold rounded-lg whitespace-nowrap"
                      >
                        <Ban className="w-3.5 h-3.5" /> Opt Out / DNC
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. HUMAN-APPROVED OUTREACH DRAFT & MANUAL COMPOSE */}
              <div className="bg-[#16231c] border border-[#2c3e33] rounded-2xl p-5 space-y-4 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#8fa396] font-mono">
                    4. Human-Approved 1-to-1 Outreach Draft
                  </h3>

                  {selectedProspect.draftStatus === "APPROVED_FOR_OUTREACH" &&
                  !hasUnsavedDraftChanges ? (
                    <span className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded bg-[#7be0b8]/15 border border-[#7be0b8]/40 text-[#7be0b8]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approved by {selectedProspect.approvedBy || "Operator"}
                    </span>
                  ) : hasUnsavedDraftChanges ? (
                    <span className="inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300">
                      Unsaved Draft Edits — Re-Approve Required
                    </span>
                  ) : (
                    <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#0e1712] border border-[#2c3e33] text-[#bac9bf]">
                      Status: {selectedProspect.draftStatus} (Approval Required)
                    </span>
                  )}
                </div>

                <label className="space-y-1 block">
                  <span className="text-[#bac9bf]">Subject Line</span>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="Quick local note for..."
                    disabled={selectedProspect.optOut}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0]"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-[#bac9bf]">
                    1-to-1 Outreach Message (plain English, evidence-backed, zero pressure)
                  </span>
                  <textarea
                    rows={6}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    placeholder="Write or refine a personal 1-to-1 note..."
                    disabled={selectedProspect.optOut}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e1712] border border-[#2c3e33] text-[#F0EBE0] leading-relaxed"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={
                      busyAction === "APPROVE_DRAFT" ||
                      selectedProspect.optOut ||
                      editPermission === "DO_NOT_CONTACT" ||
                      editDraft.trim().length < 10
                    }
                    onClick={() =>
                      runPatchAction(
                        {
                          action: "APPROVE_DRAFT",
                          outreachSubject: editSubject || null,
                          outreachDraft: editDraft,
                        },
                        "Outreach draft approved for manual 1-to-1 sending."
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7be0b8] hover:bg-[#93e9c7] text-[#092016] font-bold rounded-lg disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Draft for Manual Outreach
                  </button>

                  <span className="text-[11px] text-[#8fa396]">
                    Opening Gmail/Mail or copying never marks an email as sent automatically.
                  </span>
                </div>

                {/* MANUAL COMPOSE & EXPLICIT LOG SENT PANEL */}
                <div className="border-t border-[#2c3e33] pt-4 space-y-3">
                  <div className="font-semibold text-[#F0EBE0]">
                    Manual Send Actions{" "}
                    {!isOutreachUnlocked && (
                      <span className="text-amber-300 font-normal">
                        (Locked until draft is human-approved with no unsaved edits)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {manualComposeLinks ? (
                      <>
                        <a
                          href={manualComposeLinks.gmailComposeHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#22342a] hover:bg-[#2b4135] border border-[#36493d] text-[#F0EBE0] font-semibold rounded-lg"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#7be0b8]" /> Open Gmail Compose
                        </a>
                        <a
                          href={manualComposeLinks.mailtoHref}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#22342a] hover:bg-[#2b4135] border border-[#36493d] text-[#F0EBE0] font-semibold rounded-lg"
                        >
                          <Mail className="w-3.5 h-3.5" /> Open Mail App (mailto)
                        </a>
                      </>
                    ) : (
                      <span className="text-[11px] text-[#8fa396] py-2">
                        {isOutreachUnlocked
                          ? "Add an email address in Contact Value to enable Gmail / mailto compose links."
                          : "Approve draft above to unlock Gmail compose, mailto, Copy, and Log Sent."}
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={!isOutreachUnlocked}
                      onClick={handleCopyApprovedDraft}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#22342a] hover:bg-[#2b4135] border border-[#36493d] text-[#F0EBE0] font-semibold rounded-lg disabled:opacity-40"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedBanner ? "Copied!" : "Copy Approved Draft"}
                    </button>
                  </div>

                  {/* Explicit Log Outreach Sent */}
                  {isOutreachUnlocked && (
                    <div className="bg-[#0e1712] border border-[#2c3e33] rounded-xl p-3.5 flex flex-wrap items-end gap-2.5">
                      <label className="space-y-1">
                        <span className="text-[#bac9bf] block">Channel Used</span>
                        <select
                          value={sentChannel}
                          onChange={(e) => setSentChannel(e.target.value as any)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
                        >
                          <option value="EMAIL">Email</option>
                          <option value="PHONE">Phone Call</option>
                          <option value="IN_PERSON">In Person</option>
                          <option value="CONTACT_FORM">Website Form</option>
                          <option value="LINKEDIN">LinkedIn</option>
                        </select>
                      </label>
                      <label className="space-y-1 flex-1 min-w-[180px]">
                        <span className="text-[#bac9bf] block">Send Note (optional)</span>
                        <input
                          type="text"
                          placeholder="e.g. Sent personal Gmail note to owner"
                          value={sentSummary}
                          onChange={(e) => setSentSummary(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[#bac9bf] block">Next Follow-Up</span>
                        <input
                          type="date"
                          value={sentFollowUpDate}
                          onChange={(e) => setSentFollowUpDate(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={busyAction === "LOG_OUTREACH_SENT"}
                        onClick={() => {
                          void runPatchAction(
                            {
                              action: "LOG_OUTREACH_SENT",
                              channel: sentChannel,
                              summary: sentSummary || undefined,
                              nextFollowUpAt: sentFollowUpDate
                                ? new Date(`${sentFollowUpDate}T13:00:00Z`).toISOString()
                                : undefined,
                            },
                            "Logged manual outreach as sent."
                          );
                          setSentSummary("");
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7be0b8] hover:bg-[#93e9c7] text-[#092016] font-bold rounded-lg"
                      >
                        <Send className="w-3.5 h-3.5" /> Log Outreach Sent
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. OUTCOME MILESTONES & CONTACT HISTORY LOG */}
              <div className="bg-[#16231c] border border-[#2c3e33] rounded-2xl p-5 space-y-4 text-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#8fa396] font-mono">
                  5. Outcome Tracking &amp; Contact History
                </h3>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["CONVERSATION_STARTED", "Conversation Started"],
                      ["MEETING_BOOKED", "Confirmed Meeting Booked"],
                      ["MEETING_ATTENDED", "Meeting Attended"],
                      ["CUSTOMER_ACQUIRED", "Business Pulse Customer ($99/mo)"],
                      ["NOT_A_FIT", "Not a Fit"],
                    ] as [ProspectStage, string][]
                  ).map(([st, label]) => (
                    <button
                      key={st}
                      type="button"
                      disabled={
                        busyAction === "UPDATE_OUTCOME" ||
                        (selectedProspect.optOut && st !== "NOT_A_FIT")
                      }
                      onClick={() =>
                        runPatchAction(
                          { action: "UPDATE_OUTCOME", stage: st },
                          `Marked outcome: ${label}`
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                        selectedProspect.stage === st
                          ? "bg-[#7be0b8] text-[#092016] border-[#7be0b8]"
                          : "bg-[#0e1712] hover:bg-[#1e3127] text-[#F0EBE0] border-[#2c3e33]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Add Contact / Reply Note */}
                <div className="bg-[#0e1712] border border-[#2c3e33] rounded-xl p-3.5 space-y-2.5">
                  <div className="font-semibold text-[#F0EBE0] inline-flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#7be0b8]" />
                    Log Reply, Call, or Meeting Note
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={noteDirection}
                      onChange={(e) => setNoteDirection(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
                    >
                      <option value="INBOUND">Inbound Reply / Owner Spoke</option>
                      <option value="OUTBOUND">Outbound Follow-Up</option>
                      <option value="INTERNAL">Internal Note</option>
                    </select>
                    <select
                      value={noteChannel}
                      onChange={(e) => setNoteChannel(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
                    >
                      <option value="EMAIL">Email</option>
                      <option value="PHONE">Phone</option>
                      <option value="IN_PERSON">In Person</option>
                      <option value="MEETING">Meeting</option>
                      <option value="CONTACT_FORM">Contact Form</option>
                      <option value="LINKEDIN">LinkedIn</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Summary of reply, conversation, or follow-up..."
                      value={noteSummary}
                      onChange={(e) => setNoteSummary(e.target.value)}
                      className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-[#16231c] border border-[#2c3e33] text-[#F0EBE0]"
                    />
                    <button
                      type="button"
                      disabled={!noteSummary.trim() || busyAction === "LOG_CONTACT_NOTE"}
                      onClick={() => {
                        void runPatchAction(
                          {
                            action: "LOG_CONTACT_NOTE",
                            direction: noteDirection,
                            channel: noteChannel,
                            summary: noteSummary,
                            markConversationStarted: noteDirection === "INBOUND",
                          },
                          "Logged contact history entry."
                        );
                        setNoteSummary("");
                      }}
                      className="px-3.5 py-1.5 bg-[#22342a] hover:bg-[#2b4135] text-[#7be0b8] border border-[#7be0b8]/30 font-bold rounded-lg"
                    >
                      Add Log
                    </button>
                  </div>
                </div>

                {/* History Feed */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedProspect.contactLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-[#0e1712] border border-[#2c3e33] rounded-lg px-3.5 py-2.5 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="text-[#F0EBE0]">{log.summary}</div>
                        <div className="text-[11px] text-[#8fa396] font-mono">
                          {log.direction} · {log.channel} · {log.actionType} · by{" "}
                          {log.actorEmail}
                        </div>
                      </div>
                      <span className="text-[11px] text-[#8fa396] font-mono whitespace-nowrap">
                        {formatEasternDate(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <div className="text-[11px] text-[#8fa396] flex flex-wrap items-center justify-between gap-2 pt-2">
        <span>
          Safeguards active: Human approval required before outreach · Opt-outs enforced · No SMS or automated outbound sending · Booking clicks separated from confirmed meetings.
        </span>
        <Link href="/internal/reviews" className="text-[#7be0b8] hover:underline">
          Open Reality Check Review Studio &rarr;
        </Link>
      </div>
    </div>
  );
}
