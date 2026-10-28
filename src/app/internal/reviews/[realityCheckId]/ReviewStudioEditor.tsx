"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Save, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  RefreshCw,
  Building2,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  AlertTriangle,
  Lightbulb,
  Check,
  Globe,
  Eye,
  Send,
  RotateCcw
} from "lucide-react";
import { 
  HumanReviewOpportunity, 
  HumanReviewTopFix, 
  FindingState,
  RealityCheckStatus,
  RealityCheckReportContent,
  ReportAuditMetadata,
  HumanIntelligenceLayer,
  BrandRealityInsights,
  CustomerVoiceInsights,
  AdvertisingFunnelInsights,
  GhostFootprintItem,
  HumanEvidenceCitation,
  BrandMessageClarity,
  AdPresenceState,
  AdFunnelRecommendation
} from "@/db/schema";

interface Props {
  check: any;
  findings: any[];
  ownerResponse: any | null;
  existingReview: any | null;
  operatorEmail: string;
  operatorName: string;
}

export default function ReviewStudioEditor({
  check,
  findings,
  ownerResponse,
  existingReview,
  operatorEmail,
  operatorName,
}: Props) {
  // Reviewer and Status state
  const [reviewStatus, setReviewStatus] = useState<string>(
    existingReview?.status || "draft"
  );
  const [realityCheckStatus, setRealityCheckStatus] = useState<RealityCheckStatus>(
    (check.status as RealityCheckStatus) || "IN_REVIEW"
  );
  const [reviewerName, setReviewerName] = useState(
    existingReview?.reviewerName || operatorName
  );
  const [reviewerEmail, setReviewerEmail] = useState(
    existingReview?.reviewerEmail || operatorEmail
  );

  // Workflow tab: 'investigation' | 'report'
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'investigation' | 'report'>('investigation');

  // Human review fields
  const [findabilityTest, setFindabilityTest] = useState(
    existingReview?.findabilityTest || ""
  );
  const [reputationSummary, setReputationSummary] = useState(
    existingReview?.reputationSummary || ""
  );
  const [socialPresenceReview, setSocialPresenceReview] = useState(
    existingReview?.socialPresenceReview || ""
  );
  const [competitorComparison, setCompetitorComparison] = useState(
    existingReview?.competitorComparison || ""
  );
  const [lostOpportunityHunt, setLostOpportunityHunt] = useState(
    existingReview?.lostOpportunityHunt || ""
  );

  // Opportunities Found (Dynamic array, evidence label OPPORTUNITY_FOUND)
  const [opportunities, setOpportunities] = useState<HumanReviewOpportunity[]>(
    existingReview?.opportunitiesFound && existingReview.opportunitiesFound.length > 0
      ? existingReview.opportunitiesFound
      : [
          {
            id: "opp-1",
            title: "",
            type: "Commercial Account",
            description: "",
            suggestedAction: "",
            potentialImpact: "High",
            evidenceLabel: "OPPORTUNITY_FOUND",
          },
        ]
  );

  // Top 3 Things We Would Fix First (Fixed 3 items, evidence label BARATRUST_REVIEW)
  const [topFixes, setTopFixes] = useState<HumanReviewTopFix[]>(
    existingReview?.topFixes && existingReview.topFixes.length === 3
      ? existingReview.topFixes
      : [
          {
            priority: 1,
            title: existingReview?.topFixes?.[0]?.title || "",
            whyItMatters: existingReview?.topFixes?.[0]?.whyItMatters || "",
            suggestedAction: existingReview?.topFixes?.[0]?.suggestedAction || "",
            evidenceLabel: "BARATRUST_REVIEW",
          },
          {
            priority: 2,
            title: existingReview?.topFixes?.[1]?.title || "",
            whyItMatters: existingReview?.topFixes?.[1]?.whyItMatters || "",
            suggestedAction: existingReview?.topFixes?.[1]?.suggestedAction || "",
            evidenceLabel: "BARATRUST_REVIEW",
          },
          {
            priority: 3,
            title: existingReview?.topFixes?.[2]?.title || "",
            whyItMatters: existingReview?.topFixes?.[2]?.whyItMatters || "",
            suggestedAction: existingReview?.topFixes?.[2]?.suggestedAction || "",
            evidenceLabel: "BARATRUST_REVIEW",
          },
        ]
  );

  // What NOT to spend money on
  const [notSpendMoneyOn, setNotSpendMoneyOn] = useState(
    existingReview?.notSpendMoneyOn || ""
  );

  // Final Todd & Noelah Notes
  const [toddNotes, setToddNotes] = useState(
    existingReview?.toddNotes || ""
  );

  // Human Intelligence Layer (Brand Reality, Customer Voice, Advertising Funnel, Ghost Footprint)
  const initialLoves: string[] = existingReview?.humanIntelligence?.customerVoice?.topLoves || [];
  const initialComplaints: string[] = existingReview?.humanIntelligence?.customerVoice?.topComplaints || [];

  const [brandReality, setBrandReality] = useState<BrandRealityInsights>({
    apparentBrandMessage: existingReview?.humanIntelligence?.brandReality?.apparentBrandMessage || "",
    messageClarity: existingReview?.humanIntelligence?.brandReality?.messageClarity || "UNKNOWN",
    consistencyNotes: existingReview?.humanIntelligence?.brandReality?.consistencyNotes || "",
    brandCustomerMismatch: existingReview?.humanIntelligence?.brandReality?.brandCustomerMismatch || "",
    strongestBrandOpportunity: existingReview?.humanIntelligence?.brandReality?.strongestBrandOpportunity || "",
    mysteryShopImpression: existingReview?.humanIntelligence?.brandReality?.mysteryShopImpression || "",
    evidence: existingReview?.humanIntelligence?.brandReality?.evidence || null,
  });

  const [customerVoice, setCustomerVoice] = useState<CustomerVoiceInsights>({
    topLoves: [
      initialLoves[0] || "",
      initialLoves[1] || "",
      initialLoves[2] || "",
    ],
    topComplaints: [
      initialComplaints[0] || "",
      initialComplaints[1] || "",
      initialComplaints[2] || "",
    ],
    recurringThemes: existingReview?.humanIntelligence?.customerVoice?.recurringThemes || "",
    unmarketedStrengths: existingReview?.humanIntelligence?.customerVoice?.unmarketedStrengths || "",
    evidence: existingReview?.humanIntelligence?.customerVoice?.evidence || null,
  });

  const rawAdPresence = existingReview?.humanIntelligence?.advertisingFunnel?.adPresence;
  const initialAdPresence: AdPresenceState =
    rawAdPresence === "YES" || rawAdPresence === "OBSERVED"
      ? "OBSERVED"
      : rawAdPresence === "NO" || rawAdPresence === "NOT_OBSERVED"
      ? "NOT_OBSERVED"
      : "UNKNOWN";

  const [advertisingFunnel, setAdvertisingFunnel] = useState<AdvertisingFunnelInsights>({
    adPresence: initialAdPresence,
    platformsObserved: existingReview?.humanIntelligence?.advertisingFunnel?.platformsObserved || "",
    offerSummary: existingReview?.humanIntelligence?.advertisingFunnel?.offerSummary || "",
    landingPageQuality: existingReview?.humanIntelligence?.advertisingFunnel?.landingPageQuality || "",
    adToFunnelMismatch: existingReview?.humanIntelligence?.advertisingFunnel?.adToFunnelMismatch || "",
    recommendation: existingReview?.humanIntelligence?.advertisingFunnel?.recommendation || "UNKNOWN",
    recommendationNote: existingReview?.humanIntelligence?.advertisingFunnel?.recommendationNote || "",
    evidence: existingReview?.humanIntelligence?.advertisingFunnel?.evidence || null,
  });

  const [ghostFootprint, setGhostFootprint] = useState<GhostFootprintItem[]>(
    existingReview?.humanIntelligence?.ghostFootprint && existingReview.humanIntelligence.ghostFootprint.length > 0
      ? existingReview.humanIntelligence.ghostFootprint
      : []
  );

  // Report Draft & Audit state
  const [reportDraft, setReportDraft] = useState<RealityCheckReportContent | null>(
    existingReview?.reportDraft || null
  );
  const [reportAudit, setReportAudit] = useState<ReportAuditMetadata | null>(
    existingReview?.reportAudit || null
  );

  // UI state
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(
    existingReview?.updatedAt ? new Date(existingReview.updatedAt).toLocaleTimeString() : null
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");
  const [publishSuccessMsg, setPublishSuccessMsg] = useState("");
  const [publishErrorMsg, setPublishErrorMsg] = useState("");
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Left sidebar tab: 'facts' | 'findings' | 'owner'
  const [activeDossierTab, setActiveDossierTab] = useState<'facts' | 'findings' | 'owner'>('findings');
  const [findingsSearch, setFindingsSearch] = useState("");
  const [expandedViewportPreview, setExpandedViewportPreview] = useState<'desktop' | 'mobile' | null>(null);
  const browserEvidence = check.scoreBreakdown?.browserEvidence || null;

  // Opportunity handlers
  const addOpportunity = () => {
    setOpportunities((prev) => [
      ...prev,
      {
        id: `opp-${Date.now()}`,
        title: "",
        type: "Local Partnership",
        description: "",
        suggestedAction: "",
        potentialImpact: "Medium",
        evidenceLabel: "OPPORTUNITY_FOUND",
      },
    ]);
  };

  const removeOpportunity = (index: number) => {
    setOpportunities((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOpportunity = (index: number, field: keyof HumanReviewOpportunity, value: any) => {
    setOpportunities((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateOpportunityEvidence = (
    index: number,
    field: keyof HumanEvidenceCitation,
    value: string | boolean
  ) => {
    setOpportunities((prev) => {
      const updated = [...prev];
      const currentEv = updated[index].evidence || {};
      updated[index] = {
        ...updated[index],
        evidence: { ...currentEv, [field]: value },
      };
      return updated;
    });
  };

  const updateTopFix = (index: number, field: keyof HumanReviewTopFix, value: any) => {
    setTopFixes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateTopFixEvidence = (
    index: number,
    field: keyof HumanEvidenceCitation,
    value: string | boolean
  ) => {
    setTopFixes((prev) => {
      const updated = [...prev];
      const currentEv = updated[index].evidence || {};
      updated[index] = {
        ...updated[index],
        evidence: { ...currentEv, [field]: value },
      };
      return updated;
    });
  };

  // Ghost Footprint / Legacy Asset handlers
  const addGhostFootprintItem = () => {
    setGhostFootprint((prev) => [
      ...prev,
      {
        id: `ghost-${Date.now()}`,
        assetType: "Abandoned Social Account",
        summary: "",
        source: "",
        sourceUrl: "",
        evidenceNote: "",
        observedAt: new Date().toISOString().split("T")[0],
        clientVisible: false,
        customerImpact: "",
        recommendedFix: "",
        evidenceLabel: "BARATRUST_REVIEW",
      },
    ]);
  };

  const removeGhostFootprintItem = (index: number) => {
    setGhostFootprint((prev) => prev.filter((_, i) => i !== index));
  };

  const updateGhostFootprintItem = (index: number, field: keyof GhostFootprintItem, value: any) => {
    setGhostFootprint((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateCustomerVoiceList = (field: 'topLoves' | 'topComplaints', idx: number, value: string) => {
    setCustomerVoice((prev) => {
      const list = [...(prev[field] || ["", "", ""])];
      list[idx] = value;
      return { ...prev, [field]: list };
    });
  };

  // Report Draft Field Handlers
  const updateDraftField = (field: keyof RealityCheckReportContent, value: any) => {
    setReportDraft((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  const addListItem = (field: 'whatsWorking' | 'whatsGettingInTheWay') => {
    if (!reportDraft) return;
    const current = reportDraft[field] || [];
    updateDraftField(field, [...current, ""]);
  };

  const updateListItem = (field: 'whatsWorking' | 'whatsGettingInTheWay', idx: number, value: string) => {
    if (!reportDraft) return;
    const current = [...(reportDraft[field] || [])];
    current[idx] = value;
    updateDraftField(field, current);
  };

  const removeListItem = (field: 'whatsWorking' | 'whatsGettingInTheWay', idx: number) => {
    if (!reportDraft) return;
    const current = (reportDraft[field] || []).filter((_, i) => i !== idx);
    updateDraftField(field, current);
  };

  // Save Draft to Server
  const handleSave = async (overrideStatus?: string, overrideCheckStatus?: RealityCheckStatus) => {
    if (saving) return;
    setSaving(true);
    setSaveSuccessMsg("");
    setSaveErrorMsg("");

    const targetStatus = overrideStatus || reviewStatus;
    const targetCheckStatus = overrideCheckStatus || realityCheckStatus;

    const payloadHumanIntelligence: HumanIntelligenceLayer = {
      brandReality,
      customerVoice: {
        ...customerVoice,
        topLoves: (customerVoice.topLoves || []).map((s) => s.trim()).filter(Boolean),
        topComplaints: (customerVoice.topComplaints || []).map((s) => s.trim()).filter(Boolean),
      },
      advertisingFunnel,
      ghostFootprint: ghostFootprint.filter((g) => g.summary.trim().length > 0),
    };

    try {
      const res = await fetch(`/api/internal/reviews/${check.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          realityCheckStatus: targetCheckStatus,
          reviewerEmail,
          reviewerName,
          findabilityTest,
          reputationSummary,
          socialPresenceReview,
          competitorComparison,
          lostOpportunityHunt,
          opportunitiesFound: opportunities.filter((o) => o.title.trim().length > 0),
          topFixes,
          notSpendMoneyOn,
          toddNotes,
          humanIntelligence: payloadHumanIntelligence,
          reportDraft,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to save review draft.");
      }

      setReviewStatus(targetStatus);
      setRealityCheckStatus(targetCheckStatus);
      const timeStr = new Date().toLocaleTimeString();
      setLastSaved(timeStr);
      setSaveSuccessMsg(`Review draft saved at ${timeStr}`);
      setTimeout(() => setSaveSuccessMsg(""), 5000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  // Generate Draft Report with Gemini
  const handleGenerateDraft = async () => {
    // If operator has already made edits to a report draft, confirm before replacing
    if (reportDraft && reportDraft.executiveSummary) {
      const confirmed = window.confirm(
        "Warning: You already have a report draft. Generating a new draft with Gemini will replace the current draft text with a fresh synthesis. Do you want to proceed?"
      );
      if (!confirmed) return;
    }

    // First save any current human investigation work so Gemini receives the latest edits
    await handleSave();

    setGenerating(true);
    setSaveSuccessMsg("");
    setSaveErrorMsg("");

    try {
      const res = await fetch(`/api/internal/reviews/${check.id}/generate`, {
        method: "POST",
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gemini synthesis failed.");
      }

      setReportDraft(result.report);
      setReportAudit(result.audit);
      setActiveWorkflowTab("report");
      setSaveSuccessMsg(`Draft synthesized using ${result.modelUsed}`);
      setTimeout(() => setSaveSuccessMsg(""), 6000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || "Failed to generate report draft.");
    } finally {
      setGenerating(false);
    }
  };

  // Publish Reality Check
  const handlePublish = async () => {
    // Pre-flight validation checks before persisting or marking published
    const validFixes = topFixes.filter((f) => f.title && f.title.trim().length > 0);
    if (validFixes.length < 3) {
      setPublishErrorMsg("Publish Blocked: All Top 3 Things We Would Fix First are required.");
      return;
    }

    if (!reportDraft || !reportDraft.executiveSummary || reportDraft.executiveSummary.trim().length < 20) {
      setPublishErrorMsg("Publish Blocked: Report draft must be generated and reviewed before publishing.");
      return;
    }

    const displayName = check.businessName || check.website;
    const recipientDesc = check.email
      ? `send the delivery notification email to ${check.ownerName ? `${check.ownerName} (${check.email})` : check.email}`
      : "generate the shareable public report link (no owner email is on file)";

    const confirmed = window.confirm(
      `Are you sure you want to PUBLISH this Reality Check for ${displayName}?\n\nThis will freeze the report and ${recipientDesc}.`
    );
    if (!confirmed) return;

    // Save the current draft state as ready_to_publish so the atomic /publish route can claim and freeze the snapshot
    await handleSave("ready_to_publish", "READY_TO_PUBLISH");

    setPublishing(true);
    setPublishErrorMsg("");
    setPublishSuccessMsg("");

    try {
      const res = await fetch(`/api/internal/reviews/${check.id}/publish`, {
        method: "POST",
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to publish report.");
      }

      setReviewStatus("published");
      setRealityCheckStatus("PUBLISHED");

      if (result.emailStatus === 'ACCEPTED_BY_PROVIDER') {
        setPublishSuccessMsg(`✓ Report published! Delivery email dispatched to ${result.emailRecipient}`);
      } else if (result.emailStatus === 'NOT_ATTEMPTED') {
        setPublishSuccessMsg(`✓ Report published! Note: No transactional email provider is configured, so delivery email was NOT sent. Share the link manually: /report/${result.shareToken}`);
      } else {
        setPublishSuccessMsg(`✓ Report published! Warning: Delivery email failed (${result.emailError || 'provider error'}). Share the link manually: /report/${result.shareToken}`);
      }
    } catch (err: any) {
      setPublishErrorMsg(err.message || "An error occurred while publishing.");
    } finally {
      setPublishing(false);
    }
  };

  const filteredFindings = findings.filter((f) => {
    if (!findingsSearch) return true;
    const q = findingsSearch.toLowerCase();
    return (
      f.title.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      (f.supportingDetail && f.supportingDetail.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">

      {/* Persistence & Control Bar */}
      <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sticky top-20 z-20 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#bac9bf]">Review Status:</span>
            <select
              value={realityCheckStatus}
              onChange={(e) => setRealityCheckStatus(e.target.value as RealityCheckStatus)}
              className="px-2.5 py-1.5 bg-[#101914] border border-[#36493d] rounded-lg text-xs font-mono text-[#F0EBE0] focus:outline-none focus:border-[#7be0b8]"
            >
              <option value="NEEDS_HUMAN_REVIEW">NEEDS_HUMAN_REVIEW</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="READY_TO_PUBLISH">READY_TO_PUBLISH</option>
              <option value="PUBLISHED">PUBLISHED</option>
            </select>
          </div>

          <div className="text-xs text-[#bac9bf] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#8fa396]" />
            <span>{lastSaved ? `Last saved: ${lastSaved}` : "Unsaved changes"}</span>
          </div>

          {saveSuccessMsg && (
            <span className="text-xs font-medium text-[#7be0b8] bg-[#7be0b8]/12 border border-[#7be0b8]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" /> {saveSuccessMsg}
            </span>
          )}

          {saveErrorMsg && (
            <span className="text-xs font-medium text-[#f28b82] bg-[#E05A5A]/12 border border-[#E05A5A]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {saveErrorMsg}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Generate Draft with Gemini */}
          <button
            type="button"
            onClick={handleGenerateDraft}
            disabled={generating || saving}
            className="px-3.5 py-2 bg-[#192b22] hover:bg-[#21382c] text-[#7be0b8] border border-[#7be0b8]/35 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#7be0b8]" />
                <span>{reportDraft ? "Regenerate Draft Report" : "Generate Draft Report"}</span>
              </>
            )}
          </button>

          {/* Preview Client Report */}
          <Link
            href={`/report/${check.shareToken}?preview=true`}
            target="_blank"
            className="px-3.5 py-2 bg-[#101914] hover:bg-[#1b2821] border border-[#36493d] text-[#F0EBE0] font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-[#bac9bf]" />
            <span>Preview Client Report</span>
          </Link>

          {/* Save Draft */}
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || generating}
            className="px-4 py-2 bg-[#22342a] hover:bg-[#2b4135] text-[#F0EBE0] border border-[#3d5446] font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-[#bac9bf]" />
                <span>Save Draft</span>
              </>
            )}
          </button>

          {/* Publish Reality Check */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || realityCheckStatus === 'PUBLISHED'}
            className={`px-4 py-2 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm ${
              realityCheckStatus === 'PUBLISHED'
                ? 'bg-[#7be0b8]/15 text-[#7be0b8] border border-[#7be0b8]/35 cursor-default'
                : 'bg-[#7be0b8] hover:bg-[#6bd4aa] text-[#10251a]'
            }`}
          >
            {publishing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Publishing &amp; Sending...</span>
              </>
            ) : realityCheckStatus === 'PUBLISHED' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Published &amp; Delivered</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Publish Reality Check</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Publish Alerts */}
      {publishSuccessMsg && (
        <div className="p-4 bg-[#131f19] border border-[#7be0b8]/40 rounded-xl text-[#F0EBE0] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#7be0b8]" />
            <span>{publishSuccessMsg}</span>
          </div>
          <Link
            href={`/report/${check.shareToken}`}
            target="_blank"
            className="text-[#7be0b8] hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Open Public Report</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {publishErrorMsg && (
        <div className="p-4 bg-[#131f19] border border-[#E05A5A]/45 rounded-xl text-[#f28b82] text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#f28b82]" />
          <span>{publishErrorMsg}</span>
        </div>
      )}

      {/* Main Grid: Left Evidence Dossier (5 cols) | Right Studio (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN: EVIDENCE DOSSIER */}
        <div className="lg:col-span-5 space-y-6">

          {/* Dossier Tabs */}
          <div className="flex items-center gap-2 border-b border-[#2c3e33] pb-3">
            <button
              onClick={() => setActiveDossierTab('findings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeDossierTab === 'findings'
                  ? 'bg-[#bac9bf]/15 text-[#F0EBE0] border border-[#36493d]'
                  : 'text-[#bac9bf] hover:text-[#F0EBE0] hover:bg-[#16231c]'
              }`}
            >
              <span className="font-mono text-[11px]">[AUTO_DETECTED]</span> ({findings.length})
            </button>
            <button
              onClick={() => setActiveDossierTab('owner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeDossierTab === 'owner'
                  ? 'bg-[#F0EBE0]/12 text-[#F0EBE0] border border-[#F0EBE0]/30'
                  : 'text-[#bac9bf] hover:text-[#F0EBE0] hover:bg-[#16231c]'
              }`}
            >
              <span className="font-mono text-[11px]">[OWNER_PROVIDED]</span> {ownerResponse ? '✓' : '(None)'}
            </button>
            <button
              onClick={() => setActiveDossierTab('facts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeDossierTab === 'facts'
                  ? 'bg-[#7be0b8]/15 text-[#7be0b8] border border-[#7be0b8]/35'
                  : 'text-[#bac9bf] hover:text-[#F0EBE0] hover:bg-[#16231c]'
              }`}
            >
              Business Profile
            </button>
          </div>

          {/* TAB 1: BUSINESS PROFILE */}
          {activeDossierTab === 'facts' && (
            <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl p-6 space-y-5">
              <div className="border-b border-[#2c3e33] pb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7be0b8]">Intake Dossier</span>
                <h3 className="text-xl font-bold font-[family-name:var(--font-display)] text-[#F0EBE0] mt-1">{check.businessName || check.website}</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 text-[#F0EBE0]">
                  <MapPin className="w-4 h-4 text-[#8fa396] flex-shrink-0" />
                  <span>{check.cityState || "Location not specified"}</span>
                </div>
                <div className="flex items-center gap-2 text-[#F0EBE0]">
                  <Globe className="w-4 h-4 text-[#8fa396] flex-shrink-0" />
                  <a
                    href={check.website.startsWith("http") ? check.website : `https://${check.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#7be0b8] hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>{check.website}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2 text-[#F0EBE0]">
                  <Building2 className="w-4 h-4 text-[#8fa396] flex-shrink-0" />
                  <span>{check.businessType || "Small Business"}</span>
                </div>
                <div className="flex items-center gap-2 text-[#F0EBE0]">
                  <Mail className="w-4 h-4 text-[#8fa396] flex-shrink-0" />
                  {check.email ? (
                    <a href={`mailto:${check.email}`} className="hover:text-[#7be0b8] underline">
                      {check.email}
                    </a>
                  ) : (
                    <span className="text-[#8fa396] italic">No email provided yet</span>
                  )}
                  {check.ownerName && <span className="text-[#bac9bf]">({check.ownerName})</span>}
                </div>
                {check.phone && (
                  <div className="flex items-center gap-2 text-[#F0EBE0]">
                    <Phone className="w-4 h-4 text-[#8fa396] flex-shrink-0" />
                    <a href={`tel:${check.phone}`} className="hover:text-[#7be0b8]">
                      {check.phone}
                    </a>
                  </div>
                )}
              </div>

              {check.primaryHeadache && (
                <div className="p-4 bg-[#131f19] border border-[#f6b971]/30 rounded-lg space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-[#f6b971] font-bold">
                    Primary Operational Headache (From Intake)
                  </span>
                  <p className="text-xs text-[#F0EBE0] italic leading-relaxed">
                    &quot;{check.primaryHeadache}&quot;
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUTOMATED SCAN FINDINGS */}
          {activeDossierTab === 'findings' && (
            <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl p-6 space-y-5">
              <div className="border-b border-[#2c3e33] pb-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-[#bac9bf]/10 border border-[#bac9bf]/25 text-[#c2d1c7] font-mono text-[10px] font-bold rounded-full">
                    [AUTO_DETECTED] EVIDENCE
                  </span>
                  <span className="text-xs text-[#bac9bf]">
                    Status: <strong className="text-[#F0EBE0] font-mono">{check.scanStatus}</strong>
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-bold font-[family-name:var(--font-display)] text-[#7be0b8]">
                      {check.overallScore !== null ? check.overallScore : "—"}
                    </span>
                    <span className="text-xs text-[#8fa396] font-mono"> / 100</span>
                  </div>
                  <span className="text-xs font-medium text-[#bac9bf]">
                    {check.scoreBreakdown?.coverage?.confidence || 'STANDARD'} • {check.scoreBreakdown?.coverage?.overall ?? 0}% Coverage
                  </span>
                </div>
              </div>

              {/* Compact Browser-Rendered Experience Section */}
              <div className="p-3.5 bg-[#131f19] border border-[#2c3e33] rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#c2d1c7] font-bold block">
                      [BROWSER_RENDER] RENDERED EXPERIENCE
                    </span>
                    <span className="text-[#F0EBE0] font-semibold">
                      Desktop (1440×900) &amp; Mobile (390×844)
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                      !browserEvidence
                        ? "bg-[#16231c] text-[#bac9bf] border border-[#2c3e33]"
                        : browserEvidence.status === "COMPLETED"
                        ? "bg-[#7be0b8]/12 text-[#7be0b8] border border-[#7be0b8]/30"
                        : browserEvidence.status === "BLOCKED"
                        ? "bg-[#f6b971]/12 text-[#f6b971] border border-[#f6b971]/30"
                        : "bg-[#16231c] text-[#bac9bf] border border-[#2c3e33]"
                    }`}
                  >
                    {browserEvidence ? browserEvidence.status : "NOT CAPTURED"}
                  </span>
                </div>

                {!browserEvidence ? (
                  <p className="text-[11px] text-[#bac9bf] leading-relaxed">
                    Browser-rendered desktop and mobile evidence was not captured for this earlier scan snapshot.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="text-[11px] text-[#bac9bf] flex items-center justify-between">
                      <span>
                        Captured:{" "}
                        {browserEvidence.capturedAt
                          ? new Date(browserEvidence.capturedAt).toLocaleString()
                          : "—"}
                      </span>
                      {typeof browserEvidence.totalDurationMs === "number" && (
                        <span className="font-mono text-[10px] text-[#8fa396]">{browserEvidence.totalDurationMs}ms</span>
                      )}
                    </div>

                    {/* Desktop & Mobile Viewport Cards */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {[browserEvidence.desktop, browserEvidence.mobile].map((vp) => {
                        if (!vp) return null;
                        const isExpanded = expandedViewportPreview === vp.viewportLabel;
                        return (
                          <div
                            key={vp.viewportLabel}
                            className="p-2.5 bg-[#16231c] border border-[#2c3e33] rounded-lg space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] uppercase font-bold text-[#F0EBE0]">
                                {vp.viewportLabel}{" "}
                                <span className="font-mono text-[10px] font-normal text-[#bac9bf]">
                                  ({vp.viewport?.width}×{vp.viewport?.height})
                                </span>
                              </span>
                              <span className="text-[10px] font-mono text-[#bac9bf]">
                                {vp.status}
                              </span>
                            </div>

                            {vp.screenshotDataUrl ? (
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedViewportPreview(
                                      isExpanded ? null : vp.viewportLabel
                                    )
                                  }
                                  className="w-full overflow-hidden rounded border border-[#36493d] hover:border-[#7be0b8]/60 transition-colors block text-left"
                                  title="Click to toggle larger screenshot preview"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={vp.screenshotDataUrl}
                                    alt={`Rendered ${vp.viewportLabel} viewport`}
                                    className="w-full h-24 object-cover object-top"
                                  />
                                </button>
                                <span className="text-[10px] text-[#8fa396] block">
                                  Click thumbnail to {isExpanded ? "collapse" : "enlarge"}
                                </span>
                              </div>
                            ) : (
                              <div className="h-16 rounded bg-[#101914] border border-[#2c3e33] flex items-center justify-center text-[10px] text-[#8fa396] text-center px-2">
                                {vp.screenshotPruneReason
                                  ? "Screenshot expired per retention policy (metrics preserved)"
                                  : vp.screenshotOmittedReason ||
                                    vp.failureReason ||
                                    "No screenshot captured"}
                              </div>
                            )}

                            {vp.status === "RENDERED" && (
                              <div className="text-[10px] font-mono text-[#bac9bf] space-y-0.5 pt-0.5">
                                <div>
                                  Text: {vp.visibleTextLength ?? 0} chars · Headings:{" "}
                                  {(vp.majorHeadings || []).length}
                                </div>
                                <div>
                                  CTA: {vp.primaryCtaObserved ? "Yes" : "No"} · Nav:{" "}
                                  {vp.navigationObserved ? "Yes" : "No"}
                                </div>
                                {vp.hasHorizontalOverflow && (
                                  <div className="text-[#f28b82] font-bold">
                                    Overflow: +{vp.horizontalOverflowPx}px
                                  </div>
                                )}
                                {(vp.mediaTextOverlaps || []).length > 0 && (
                                  <div className="text-[#f6b971] font-bold">
                                    Artwork-over-text: {(vp.mediaTextOverlaps || []).length} block(s)
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Enlarged Screenshot View */}
                    {expandedViewportPreview &&
                      browserEvidence[expandedViewportPreview]?.screenshotDataUrl && (
                        <div className="p-2.5 bg-[#16231c] border border-[#7be0b8]/40 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase text-[#7be0b8] font-bold">
                              Enlarged {expandedViewportPreview} Preview (
                              <span className="font-mono">
                                {browserEvidence[expandedViewportPreview].viewport?.width}×
                                {browserEvidence[expandedViewportPreview].viewport?.height}
                              </span>
                              )
                            </span>
                            <button
                              type="button"
                              onClick={() => setExpandedViewportPreview(null)}
                              className="text-[11px] text-[#bac9bf] hover:text-[#F0EBE0] underline"
                            >
                              Close Preview
                            </button>
                          </div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={browserEvidence[expandedViewportPreview].screenshotDataUrl!}
                            alt={`Enlarged ${expandedViewportPreview} screenshot`}
                            className="w-full rounded border border-[#36493d]"
                          />
                        </div>
                      )}

                    {/* Objective Layout Warnings & Disparity Notes */}
                    {(browserEvidence.comparison?.objectiveWarnings?.length > 0 ||
                      browserEvidence.comparison?.missingMobileElements?.length > 0 ||
                      browserEvidence.comparison?.missingDesktopElements?.length > 0) && (
                      <div className="p-2.5 bg-[#f6b971]/10 border border-[#f6b971]/30 rounded-lg space-y-1 text-[11px] text-[#F0EBE0]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#f6b971] block">
                          Objective Layout &amp; Viewport Findings
                        </span>
                        {(browserEvidence.comparison.objectiveWarnings || []).map(
                          (warn: string, idx: number) => (
                            <p key={`warn-${idx}`} className="leading-relaxed">
                              • {warn}
                            </p>
                          )
                        )}
                        {(browserEvidence.comparison.missingMobileElements || []).map(
                          (item: string, idx: number) => (
                            <p key={`mm-${idx}`} className="leading-relaxed text-[#bac9bf]">
                              • Mobile difference: {item}
                            </p>
                          )
                        )}
                        {(browserEvidence.comparison.missingDesktopElements || []).map(
                          (item: string, idx: number) => (
                            <p key={`md-${idx}`} className="leading-relaxed text-[#bac9bf]">
                              • Desktop difference: {item}
                            </p>
                          )
                        )}
                      </div>
                    )}

                    {/* AUTO / VERIFY / HUMAN Classified Browser Checks */}
                    {Array.isArray(browserEvidence.checks) && browserEvidence.checks.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {browserEvidence.checks.map((chk: any) => (
                          <div
                            key={chk.key}
                            className="p-2.5 bg-[#16231c] border border-[#2c3e33] rounded-lg flex items-start justify-between gap-2 text-[11px]"
                          >
                            <div>
                              <span className="font-semibold text-[#F0EBE0]">{chk.title}</span>
                              <p className="text-[#bac9bf] text-[10px] mt-0.5 leading-relaxed">
                                {chk.detail}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold flex-shrink-0 ${
                                chk.classification === "AUTO"
                                  ? "bg-[#bac9bf]/10 text-[#c2d1c7] border border-[#bac9bf]/25"
                                  : chk.classification === "VERIFY"
                                  ? "bg-[#f6b971]/12 text-[#f6b971] border border-[#f6b971]/30"
                                  : "bg-[#f6b971]/12 text-[#f6b971] border border-[#f6b971]/30"
                              }`}
                            >
                              {chk.classification} · {chk.state}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Search findings */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={findingsSearch}
                  onChange={(e) => setFindingsSearch(e.target.value)}
                  placeholder={`Filter ${findings.length} automated checks...`}
                  className="w-full px-3 py-1.5 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                />

                <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                  {filteredFindings.map((finding) => (
                    <div
                      key={finding.id || finding.checkKey}
                      className="p-3 bg-[#131f19] border border-[#2c3e33] rounded-lg space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#F0EBE0]">{finding.title}</span>
                        <FindingPill
                          checkKey={finding.checkKey}
                          state={finding.state as FindingState}
                          maxPoints={finding.maxPoints}
                          supportingDetail={finding.supportingDetail}
                          observedValue={finding.observedValue}
                        />
                      </div>
                      <div className="text-[11px] text-[#bac9bf] leading-relaxed">
                        {finding.supportingDetail}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#8fa396] pt-1">
                        <span>
                          {finding.category}
                          {finding.evidenceSource === 'BROWSER_RENDER' ? ' · [BROWSER_RENDER]' : ''}
                        </span>
                        <span>Pts: {finding.scoreContribution}/{finding.maxPoints}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OWNER PROVIDED CONTEXT */}
          {activeDossierTab === 'owner' && (
            <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl p-6 space-y-5">
              <div className="border-b border-[#2c3e33] pb-3 flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-[#F0EBE0]/10 border border-[#F0EBE0]/25 text-[#F0EBE0] font-mono text-[10px] font-bold rounded-full">
                  [OWNER_PROVIDED] CONTEXT
                </span>
                {ownerResponse?.submittedAt && (
                  <span className="text-[11px] text-[#bac9bf]">
                    {new Date(ownerResponse.submittedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {!ownerResponse ? (
                <div className="p-6 bg-[#131f19] border border-[#2c3e33] rounded-lg text-center space-y-2">
                  <p className="text-[#F0EBE0] font-semibold text-xs">No Questionnaire Submitted</p>
                  <p className="text-[#bac9bf] text-[11px] leading-relaxed">
                    The owner has not filled out the optional questionnaire yet. The Reality Check remains completely valid for your manual review.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-xs max-h-[600px] overflow-y-auto pr-1">
                  <OwnerQABlock
                    q="1. Where do most new customers come from?"
                    a={ownerResponse.customerAcquisition}
                  />
                  <OwnerQABlock
                    q="2. Biggest business problem right now?"
                    a={ownerResponse.biggestProblem}
                  />
                  <OwnerQABlock
                    q="3. Missed calls, messages, or inquiries?"
                    a={ownerResponse.missedInquiries}
                  />
                  <OwnerQABlock
                    q="4. Follow-up process for unclosed leads?"
                    a={ownerResponse.followUpProcess}
                  />
                  <OwnerQABlock
                    q="5. Current advertising / marketing spend?"
                    a={ownerResponse.currentMarketingSpend}
                  />
                  <OwnerQABlock
                    q="6. Repetitive admin task wasting time?"
                    a={ownerResponse.repetitiveAdminWaste}
                  />
                  <OwnerQABlock
                    q="7. Growth opportunity / target revenue stream?"
                    a={ownerResponse.growthOpportunity}
                  />
                  <OwnerQABlock
                    q="8. Free employee role?"
                    a={ownerResponse.freeEmployeeRole}
                  />
                  {ownerResponse.additionalNotes && (
                    <OwnerQABlock
                      q="Additional Owner Notes"
                      a={ownerResponse.additionalNotes}
                    />
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: WORKSPACE TABS */}
        <div className="lg:col-span-7 space-y-6">

          {/* Workflow Toggle Tabs */}
          <div className="flex items-center gap-3 border-b border-[#2c3e33] pb-3">
            <button
              onClick={() => setActiveWorkflowTab('investigation')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                activeWorkflowTab === 'investigation'
                  ? 'bg-[#7be0b8]/15 text-[#7be0b8] border border-[#7be0b8]/35'
                  : 'text-[#bac9bf] hover:text-[#F0EBE0] hover:bg-[#16231c]'
              }`}
            >
              <span>1. Human Investigation</span>
              <span className="text-[11px] text-[#8fa396] font-normal">({opportunities.length} opps, 3 fixes)</span>
            </button>
            <button
              onClick={() => setActiveWorkflowTab('report')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                activeWorkflowTab === 'report'
                  ? 'bg-[#7be0b8]/15 text-[#7be0b8] border border-[#7be0b8]/35'
                  : 'text-[#bac9bf] hover:text-[#F0EBE0] hover:bg-[#16231c]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#7be0b8]" />
              <span>2. Client Report Draft</span>
              {reportDraft ? (
                <span className="px-2 py-0.5 rounded-full bg-[#7be0b8]/15 border border-[#7be0b8]/30 text-[#7be0b8] text-[10px] font-bold">
                  Draft Ready
                </span>
              ) : (
                <span className="text-[11px] text-[#8fa396] font-normal">(Not generated)</span>
              )}
            </button>
          </div>

          {/* TAB 1: HUMAN INVESTIGATION */}
          {activeWorkflowTab === 'investigation' && (
            <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl p-6 md:p-8 space-y-8 shadow-2xl">
              <div className="border-b border-[#2c3e33] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="px-2.5 py-0.5 bg-[#f6b971]/12 border border-[#f6b971]/30 text-[#f6b971] font-mono text-[10px] font-bold rounded-full">
                    [BARATRUST_REVIEW] HUMAN INVESTIGATION
                  </span>
                  <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] text-[#F0EBE0] mt-1.5">
                    Todd &amp; Noelah Judgment &amp; Notes
                  </h2>
                </div>
                <div className="text-right text-xs text-[#bac9bf]">
                  <span>Reviewer: </span>
                  <span className="text-[#F0EBE0] font-semibold">{reviewerName}</span>
                </div>
              </div>

              {/* 1. Findability Test */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                    <span className="text-[#7be0b8] font-[family-name:var(--font-display)]">1.</span> Findability Test
                  </label>
                  <span className="text-[10px] font-mono text-[#f6b971] bg-[#f6b971]/12 border border-[#f6b971]/25 px-2 py-0.5 rounded-full">
                    [BARATRUST_REVIEW]
                  </span>
                </div>
                <p className="text-xs text-[#bac9bf] leading-relaxed">
                  How easy is the business to find when searching the way an actual customer would? Record search phrases tested, rankings, competitors appearing above them, and Google Maps presence.
                </p>
                <textarea
                  rows={3}
                  value={findabilityTest}
                  onChange={(e) => setFindabilityTest(e.target.value)}
                  placeholder="e.g. Searched 'emergency furnace repair New Albany'. Business did not appear in top 3 Google map pack. Competitor X held spots 1 and 2."
                  className="w-full px-4 py-3 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8] text-xs leading-relaxed"
                />
              </div>

              {/* 2. Reputation Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                    <span className="text-[#7be0b8] font-[family-name:var(--font-display)]">2.</span> Reputation Summary
                  </label>
                  <span className="text-[10px] font-mono text-[#f6b971] bg-[#f6b971]/12 border border-[#f6b971]/25 px-2 py-0.5 rounded-full">
                    [BARATRUST_REVIEW]
                  </span>
                </div>
                <p className="text-xs text-[#bac9bf] leading-relaxed">
                  Human observations of public reputation: review count, recurring praise, recurring complaints, owner response habits.
                </p>
                <textarea
                  rows={3}
                  value={reputationSummary}
                  onChange={(e) => setReputationSummary(e.target.value)}
                  placeholder="e.g. 4.8 stars across 42 Google reviews. Customers repeatedly praise punctual service and honest pricing. 0 owner responses in the last 12 months."
                  className="w-full px-4 py-3 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8] text-xs leading-relaxed"
                />
              </div>

              {/* 3. Social Presence Review */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                    <span className="text-[#7be0b8] font-[family-name:var(--font-display)]">3.</span> Social Presence Review
                  </label>
                  <span className="text-[10px] font-mono text-[#f6b971] bg-[#f6b971]/12 border border-[#f6b971]/25 px-2 py-0.5 rounded-full">
                    [BARATRUST_REVIEW]
                  </span>
                </div>
                <p className="text-xs text-[#bac9bf] leading-relaxed">
                  Platforms found, posting freshness, engagement observations, content strengths and weaknesses.
                </p>
                <textarea
                  rows={3}
                  value={socialPresenceReview}
                  onChange={(e) => setSocialPresenceReview(e.target.value)}
                  placeholder="e.g. Active Facebook page with 1.2k followers. Last post was 3 days ago. Instagram is dormant."
                  className="w-full px-4 py-3 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8] text-xs leading-relaxed"
                />
              </div>

              {/* 4. Competitor Comparison */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                    <span className="text-[#7be0b8] font-[family-name:var(--font-display)]">4.</span> Competitor Comparison (2–3 Key Rivals)
                  </label>
                  <span className="text-[10px] font-mono text-[#f6b971] bg-[#f6b971]/12 border border-[#f6b971]/25 px-2 py-0.5 rounded-full">
                    [BARATRUST_REVIEW]
                  </span>
                </div>
                <p className="text-xs text-[#bac9bf] leading-relaxed">
                  Detail 2–3 competitors: their name, why selected, where the competitor appears stronger, and where our client has the edge.
                </p>
                <textarea
                  rows={4}
                  value={competitorComparison}
                  onChange={(e) => setCompetitorComparison(e.target.value)}
                  placeholder="e.g.
1. Ace Mechanical — Ranked #1 locally. Has online booking widget. Weaker on customer reviews (3.9 stars).
2. Southern HVAC — Strong Facebook ads. Website lacks mobile tap-to-call.
Client Edge: Higher authentic review rating and direct owner trust."
                  className="w-full px-4 py-3 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8] text-xs leading-relaxed"
                />
              </div>

              {/* 5. Lost Opportunity Hunt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                    <span className="text-[#7be0b8] font-[family-name:var(--font-display)]">5.</span> Lost Opportunity Hunt (Friction &amp; Leakage)
                  </label>
                  <span className="text-[10px] font-mono text-[#f6b971] bg-[#f6b971]/12 border border-[#f6b971]/25 px-2 py-0.5 rounded-full">
                    [BARATRUST_REVIEW]
                  </span>
                </div>
                <p className="text-xs text-[#bac9bf] leading-relaxed">
                  Where is the business losing customers right now? Missed phone calls, buried quote buttons, lack of follow-up, confusing hours.
                </p>
                <textarea
                  rows={3}
                  value={lostOpportunityHunt}
                  onChange={(e) => setLostOpportunityHunt(e.target.value)}
                  placeholder="e.g. Phone number is plain text on mobile (cannot tap to call). The contact form asks for 9 fields before giving an estimate."
                  className="w-full px-4 py-3 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8] text-xs leading-relaxed"
                />
              </div>

              {/* HUMAN INTELLIGENCE LAYER (DEEP-DIVE MODULES) */}
              <div className="space-y-6 pt-4 border-t border-[#2c3e33]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="px-2.5 py-0.5 bg-[#7be0b8]/12 border border-[#7be0b8]/30 text-[#7be0b8] font-mono text-[10px] font-bold rounded-full">
                      [BARATRUST_REVIEW] HUMAN INTELLIGENCE LAYER
                    </span>
                    <h3 className="text-lg font-bold font-[family-name:var(--font-display)] text-[#F0EBE0] mt-1.5">
                      Brand Reality, Customer Voice, Ad Funnel &amp; Legacy Footprint
                    </h3>
                    <p className="text-xs text-[#bac9bf]">
                      Capture hands-on customer/business judgment. Leave any section blank if not applicable—empty modules are automatically omitted from the final report.
                    </p>
                  </div>
                </div>

                {/* Mystery-Shop Prompt Guide */}
                <div className="p-4 bg-[#131f19] border border-[#36493d] rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-[#7be0b8] font-bold uppercase tracking-wider">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Customer &amp; Business Mystery-Shop Prompts</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-[#bac9bf]">
                    <span>• Is the website/social presence pleasant &amp; attractive?</span>
                    <span>• Does it flow naturally for a real customer?</span>
                    <span>• Is anything confusing, awkward, or broken?</span>
                    <span>• Is it easy to buy, book, order, call, or visit?</span>
                    <span>• Does the business look trustworthy and current?</span>
                    <span>• Does the online story match what customers actually say?</span>
                  </div>
                </div>

                {/* 5A. Brand Reality */}
                <div className="p-5 bg-[#131f19] border border-[#2c3e33] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                      <span className="text-[#7be0b8] font-[family-name:var(--font-display)]">5A.</span> Brand Reality &amp; Mystery-Shop Judgment
                    </h4>
                    <span className="text-[10px] font-mono text-[#f6b971] bg-[#f6b971]/12 border border-[#f6b971]/25 px-2 py-0.5 rounded-full">
                      [BARATRUST_REVIEW]
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Apparent Brand / Message</label>
                      <input
                        type="text"
                        value={brandReality.apparentBrandMessage || ""}
                        onChange={(e) => setBrandReality({ ...brandReality, apparentBrandMessage: e.target.value })}
                        placeholder="What does this business appear to stand for at first glance?"
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Is Message Obvious?</label>
                      <select
                        value={brandReality.messageClarity || "UNKNOWN"}
                        onChange={(e) => setBrandReality({ ...brandReality, messageClarity: e.target.value as BrandMessageClarity })}
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] focus:outline-none focus:border-[#7be0b8]"
                      >
                        <option value="UNKNOWN">Not Evaluated / Unknown</option>
                        <option value="OBVIOUS">OBVIOUS — Clear immediately</option>
                        <option value="SOMEWHAT_CLEAR">SOMEWHAT_CLEAR — Mixed or diluted</option>
                        <option value="UNCLEAR">UNCLEAR — Confusing or generic</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">
                        Customer Experience &amp; Flow (Mystery-Shop Impression)
                      </label>
                      <textarea
                        rows={2}
                        value={brandReality.mysteryShopImpression || ""}
                        onChange={(e) => setBrandReality({ ...brandReality, mysteryShopImpression: e.target.value })}
                        placeholder="Is it pleasant, trustworthy, current, and easy to buy/book/order/call?"
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">
                        Brand / Customer Mismatch
                      </label>
                      <textarea
                        rows={2}
                        value={brandReality.brandCustomerMismatch || ""}
                        onChange={(e) => setBrandReality({ ...brandReality, brandCustomerMismatch: e.target.value })}
                        placeholder="e.g. Customers describe the business as quirky and family-friendly, but its website feels generic and corporate."
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">
                        Cross-Channel Consistency (Website / Social / Search)
                      </label>
                      <input
                        type="text"
                        value={brandReality.consistencyNotes || ""}
                        onChange={(e) => setBrandReality({ ...brandReality, consistencyNotes: e.target.value })}
                        placeholder="e.g. Instagram is warm and visual, but Google listing has outdated photos."
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">
                        Strongest Brand Opportunity
                      </label>
                      <input
                        type="text"
                        value={brandReality.strongestBrandOpportunity || ""}
                        onChange={(e) => setBrandReality({ ...brandReality, strongestBrandOpportunity: e.target.value })}
                        placeholder="e.g. Bring their warm in-store family personality onto the homepage."
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#2c3e33]">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={brandReality.evidence?.source || ""}
                        onChange={(e) =>
                          setBrandReality({
                            ...brandReality,
                            evidence: { ...(brandReality.evidence || {}), source: e.target.value },
                          })
                        }
                        placeholder="Evidence source (e.g. Homepage vs. Google Reviews)"
                        className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                      <input
                        type="text"
                        value={brandReality.evidence?.sourceUrl || ""}
                        onChange={(e) =>
                          setBrandReality({
                            ...brandReality,
                            evidence: { ...(brandReality.evidence || {}), sourceUrl: e.target.value },
                          })
                        }
                        placeholder="Source URL (optional)"
                        className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                      <input
                        type="text"
                        value={brandReality.evidence?.note || ""}
                        onChange={(e) =>
                          setBrandReality({
                            ...brandReality,
                            evidence: { ...(brandReality.evidence || {}), note: e.target.value },
                          })
                        }
                        placeholder="Short quote or evidence note (optional)"
                        className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-[11px] text-[#bac9bf] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(brandReality.evidence?.clientVisible)}
                        onChange={(e) =>
                          setBrandReality({
                            ...brandReality,
                            evidence: { ...(brandReality.evidence || {}), clientVisible: e.target.checked },
                          })
                        }
                        className="rounded border-[#36493d] text-[#7be0b8] focus:ring-[#7be0b8]/30"
                      />
                      <span>Show citation on client report (otherwise kept internal)</span>
                    </label>
                  </div>
                </div>

                {/* 5B. Customer Voice / Review Intelligence */}
                <div className="p-5 bg-[#131f19] border border-[#2c3e33] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                        <span className="text-[#7be0b8] font-[family-name:var(--font-display)]">5B.</span> Customer Voice / Review Intelligence
                      </h4>
                      <p className="text-[11px] text-[#bac9bf]">
                        What real customers repeatedly praise or complain about (no exact review counts required unless verified).
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#f6b971] bg-[#f6b971]/12 border border-[#f6b971]/25 px-2 py-0.5 rounded-full">
                      [BARATRUST_REVIEW]
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold text-[#7be0b8]">
                        Top 3 Things Customers Love
                      </label>
                      {[0, 1, 2].map((i) => (
                        <input
                          key={`love-${i}`}
                          type="text"
                          value={customerVoice.topLoves?.[i] || ""}
                          onChange={(e) => updateCustomerVoiceList("topLoves", i, e.target.value)}
                          placeholder={`Customer praise #${i + 1} (e.g. Homemade salsa bar)`}
                          className="w-full px-3 py-1.5 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                        />
                      ))}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold text-[#f6b971]">
                        Top 3 Recurring Complaints / Friction Points
                      </label>
                      {[0, 1, 2].map((i) => (
                        <input
                          key={`complaint-${i}`}
                          type="text"
                          value={customerVoice.topComplaints?.[i] || ""}
                          onChange={(e) => updateCustomerVoiceList("topComplaints", i, e.target.value)}
                          placeholder={`Friction point #${i + 1} (e.g. Hard to reach by phone at lunch)`}
                          className="w-full px-3 py-1.5 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#f6b971]"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">
                        Recurring Customer Themes
                      </label>
                      <textarea
                        rows={2}
                        value={customerVoice.recurringThemes || ""}
                        onChange={(e) => setCustomerVoice({ ...customerVoice, recurringThemes: e.target.value })}
                        placeholder="Patterns in how customers describe their experience..."
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#7be0b8] mb-1">
                        Hidden / Unmarketed Strengths Customers Praise
                      </label>
                      <textarea
                        rows={2}
                        value={customerVoice.unmarketedStrengths || ""}
                        onChange={(e) => setCustomerVoice({ ...customerVoice, unmarketedStrengths: e.target.value })}
                        placeholder="Services or strengths customers rave about that the business barely promotes..."
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#2c3e33]">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={customerVoice.evidence?.source || ""}
                        onChange={(e) =>
                          setCustomerVoice({
                            ...customerVoice,
                            evidence: { ...(customerVoice.evidence || {}), source: e.target.value },
                          })
                        }
                        placeholder="Evidence source (e.g. Google Reviews, Facebook)"
                        className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                      <input
                        type="text"
                        value={customerVoice.evidence?.sourceUrl || ""}
                        onChange={(e) =>
                          setCustomerVoice({
                            ...customerVoice,
                            evidence: { ...(customerVoice.evidence || {}), sourceUrl: e.target.value },
                          })
                        }
                        placeholder="Source URL (optional)"
                        className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                      <input
                        type="text"
                        value={customerVoice.evidence?.note || ""}
                        onChange={(e) =>
                          setCustomerVoice({
                            ...customerVoice,
                            evidence: { ...(customerVoice.evidence || {}), note: e.target.value },
                          })
                        }
                        placeholder="Short quote or evidence note (optional)"
                        className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-[11px] text-[#bac9bf] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(customerVoice.evidence?.clientVisible)}
                        onChange={(e) =>
                          setCustomerVoice({
                            ...customerVoice,
                            evidence: { ...(customerVoice.evidence || {}), clientVisible: e.target.checked },
                          })
                        }
                        className="rounded border-[#36493d] text-[#7be0b8] focus:ring-[#7be0b8]/30"
                      />
                      <span>Show citation on client report (otherwise kept internal)</span>
                    </label>
                  </div>
                </div>

                {/* 5C. Advertising Presence & Funnel */}
                <div className="p-5 bg-[#131f19] border border-[#2c3e33] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                      <span className="text-[#7be0b8] font-[family-name:var(--font-display)]">5C.</span> Advertising Presence &amp; Funnel
                    </h4>
                    <span className="text-[10px] font-mono text-[#f6b971] bg-[#f6b971]/12 border border-[#f6b971]/25 px-2 py-0.5 rounded-full">
                      [BARATRUST_REVIEW]
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Public Ad Evidence</label>
                      <select
                        value={advertisingFunnel.adPresence || "UNKNOWN"}
                        onChange={(e) =>
                          setAdvertisingFunnel({ ...advertisingFunnel, adPresence: e.target.value as AdPresenceState })
                        }
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] focus:outline-none focus:border-[#7be0b8]"
                      >
                        <option value="UNKNOWN">UNKNOWN — Not checked / unclear</option>
                        <option value="OBSERVED">OBSERVED — Active ads observed in public channels</option>
                        <option value="NOT_OBSERVED">NOT_OBSERVED — None observed in checked channels</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Platforms Observed</label>
                      <input
                        type="text"
                        value={advertisingFunnel.platformsObserved || ""}
                        onChange={(e) => setAdvertisingFunnel({ ...advertisingFunnel, platformsObserved: e.target.value })}
                        placeholder="e.g. Meta Ad Library, Google Local Ads"
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Ad Spend Recommendation</label>
                      <select
                        value={advertisingFunnel.recommendation || "UNKNOWN"}
                        onChange={(e) =>
                          setAdvertisingFunnel({
                            ...advertisingFunnel,
                            recommendation: e.target.value as AdFunnelRecommendation,
                          })
                        }
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] focus:outline-none focus:border-[#7be0b8]"
                      >
                        <option value="UNKNOWN">No specific ad recommendation</option>
                        <option value="IMPROVE_FUNNEL_FIRST">IMPROVE_FUNNEL_FIRST — Fix landing/follow-up first</option>
                        <option value="DEPRIORITIZE_ADS">DEPRIORITIZE_ADS — Pause/avoid paid ads for now</option>
                        <option value="CONTINUE">CONTINUE — Funnel supports current ads</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">What They Are Promoting (Offer)</label>
                      <input
                        type="text"
                        value={advertisingFunnel.offerSummary || ""}
                        onChange={(e) => setAdvertisingFunnel({ ...advertisingFunnel, offerSummary: e.target.value })}
                        placeholder="e.g. $49 seasonal tune-up special"
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Landing Page / Destination Quality</label>
                      <input
                        type="text"
                        value={advertisingFunnel.landingPageQuality || ""}
                        onChange={(e) => setAdvertisingFunnel({ ...advertisingFunnel, landingPageQuality: e.target.value })}
                        placeholder="e.g. Drops traffic on generic homepage with no mention of the offer"
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Ad-to-Funnel Mismatch / Leakage</label>
                      <input
                        type="text"
                        value={advertisingFunnel.adToFunnelMismatch || ""}
                        onChange={(e) => setAdvertisingFunnel({ ...advertisingFunnel, adToFunnelMismatch: e.target.value })}
                        placeholder="Where paid clicks are likely leaking..."
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Recommendation Note</label>
                      <input
                        type="text"
                        value={advertisingFunnel.recommendationNote || ""}
                        onChange={(e) => setAdvertisingFunnel({ ...advertisingFunnel, recommendationNote: e.target.value })}
                        placeholder="Practical guidance on their ad spend..."
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#2c3e33]">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={advertisingFunnel.evidence?.source || ""}
                        onChange={(e) =>
                          setAdvertisingFunnel({
                            ...advertisingFunnel,
                            evidence: { ...(advertisingFunnel.evidence || {}), source: e.target.value },
                          })
                        }
                        placeholder="Evidence source (e.g. Meta Ad Library)"
                        className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                      <input
                        type="text"
                        value={advertisingFunnel.evidence?.sourceUrl || ""}
                        onChange={(e) =>
                          setAdvertisingFunnel({
                            ...advertisingFunnel,
                            evidence: { ...(advertisingFunnel.evidence || {}), sourceUrl: e.target.value },
                          })
                        }
                        placeholder="Source URL (optional)"
                        className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                      <input
                        type="text"
                        value={advertisingFunnel.evidence?.note || ""}
                        onChange={(e) =>
                          setAdvertisingFunnel({
                            ...advertisingFunnel,
                            evidence: { ...(advertisingFunnel.evidence || {}), note: e.target.value },
                          })
                        }
                        placeholder="Short quote or evidence note (optional)"
                        className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-[11px] text-[#bac9bf] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(advertisingFunnel.evidence?.clientVisible)}
                        onChange={(e) =>
                          setAdvertisingFunnel({
                            ...advertisingFunnel,
                            evidence: { ...(advertisingFunnel.evidence || {}), clientVisible: e.target.checked },
                          })
                        }
                        className="rounded border-[#36493d] text-[#7be0b8] focus:ring-[#7be0b8]/30"
                      />
                      <span>Show citation on client report (otherwise kept internal)</span>
                    </label>
                  </div>
                </div>

                {/* 5D. Ghost Footprint / Legacy Assets */}
                <div className="p-5 bg-[#131f19] border border-[#2c3e33] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                        <span className="text-[#7be0b8] font-[family-name:var(--font-display)]">5D.</span> Ghost Footprint / Legacy Assets
                      </h4>
                      <p className="text-[11px] text-[#bac9bf]">
                        Abandoned social accounts, duplicate listings, old domains, outdated menus/PDFs, or dead links that confuse customers.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addGhostFootprintItem}
                      className="px-3 py-1.5 bg-[#16231c] hover:bg-[#1b2821] text-[#f6b971] border border-[#f6b971]/35 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Legacy Asset</span>
                    </button>
                  </div>

                  {ghostFootprint.length === 0 ? (
                    <p className="text-[11px] text-[#8fa396] italic">
                      No ghost footprint or legacy asset issues recorded. Click &quot;Add Legacy Asset&quot; if you found abandoned pages, old addresses/numbers, or duplicate listings.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {ghostFootprint.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-4 bg-[#16231c] border border-[#f6b971]/30 rounded-xl space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#f6b971]/12 border border-[#f6b971]/25 text-[#f6b971] font-mono text-[10px] font-bold">
                              [BARATRUST_REVIEW] LEGACY ASSET #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeGhostFootprintItem(idx)}
                              className="text-[#8fa396] hover:text-[#f28b82] transition-colors p-1"
                              title="Remove legacy asset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Asset Type</label>
                              <select
                                value={item.assetType}
                                onChange={(e) => updateGhostFootprintItem(idx, "assetType", e.target.value)}
                                className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] focus:outline-none focus:border-[#7be0b8]"
                              >
                                <option value="Abandoned Social Account">Abandoned Social Account</option>
                                <option value="Duplicate Listing">Duplicate Listing</option>
                                <option value="Old Website / Domain">Old Website / Domain</option>
                                <option value="Outdated Menu / Pricing PDF">Outdated Menu / Pricing PDF</option>
                                <option value="Old Address / Phone / Branding">Old Address / Phone / Branding</option>
                                <option value="Dead Link / Event Page">Dead Link / Event Page</option>
                                <option value="Unclaimed Directory Profile">Unclaimed Directory Profile</option>
                                <option value="Other Legacy Asset">Other Legacy Asset</option>
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">What Was Found *</label>
                              <input
                                type="text"
                                value={item.summary}
                                onChange={(e) => updateGhostFootprintItem(idx, "summary", e.target.value)}
                                placeholder="e.g. Old 2019 Facebook page still ranks #2 on Google with disconnected phone number"
                                className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Customer Impact</label>
                              <input
                                type="text"
                                value={item.customerImpact || ""}
                                onChange={(e) => updateGhostFootprintItem(idx, "customerImpact", e.target.value)}
                                placeholder="How this confuses or misleads customers..."
                                className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Recommended Cleanup Action</label>
                              <input
                                type="text"
                                value={item.recommendedFix || ""}
                                onChange={(e) => updateGhostFootprintItem(idx, "recommendedFix", e.target.value)}
                                placeholder="e.g. Merge or unpublish duplicate page and update phone number"
                                className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                              />
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-[#2c3e33]">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={item.source || ""}
                                onChange={(e) => updateGhostFootprintItem(idx, "source", e.target.value)}
                                placeholder="Source (e.g. Google Search, Yelp, Facebook)"
                                className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                              />
                              <input
                                type="text"
                                value={item.sourceUrl || ""}
                                onChange={(e) => updateGhostFootprintItem(idx, "sourceUrl", e.target.value)}
                                placeholder="Source URL (optional)"
                                className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                              />
                              <input
                                type="text"
                                value={item.evidenceNote || ""}
                                onChange={(e) => updateGhostFootprintItem(idx, "evidenceNote", e.target.value)}
                                placeholder="Evidence note / quote (optional)"
                                className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                              />
                            </div>
                            <label className="inline-flex items-center gap-2 text-[11px] text-[#bac9bf] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(item.clientVisible)}
                                onChange={(e) => updateGhostFootprintItem(idx, "clientVisible", e.target.checked)}
                                className="rounded border-[#36493d] text-[#7be0b8] focus:ring-[#7be0b8]/30"
                              />
                              <span>Show citation on client report (otherwise kept internal)</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Opportunities Found (Dynamic List) */}
              <div className="space-y-3 pt-2 border-t border-[#2c3e33]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                      <span className="text-[#7be0b8] font-[family-name:var(--font-display)]">6.</span> Opportunities Found (Including Hidden Opportunities)
                    </label>
                    <p className="text-xs text-[#bac9bf]">
                      Concrete revenue, hidden strengths, or operational opportunities Todd &amp; Noelah discovered during review.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addOpportunity}
                    className="px-3 py-1.5 bg-[#192b22] hover:bg-[#21382c] text-[#7be0b8] border border-[#7be0b8]/35 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Opportunity</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {opportunities.map((opp, idx) => (
                    <div
                      key={opp.id || idx}
                      className="p-4 bg-[#131f19] border border-[#7be0b8]/30 rounded-xl space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#7be0b8]/12 border border-[#7be0b8]/30 text-[#7be0b8] font-mono text-[10px] font-bold">
                          [OPPORTUNITY_FOUND] #{idx + 1}
                        </span>
                        {opportunities.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOpportunity(idx)}
                            className="text-[#8fa396] hover:text-[#f28b82] transition-colors p-1"
                            title="Remove opportunity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Opportunity Title *</label>
                          <input
                            type="text"
                            value={opp.title}
                            onChange={(e) => updateOpportunity(idx, "title", e.target.value)}
                            placeholder="e.g. Promote Customer-Favorite Catering Trays on Homepage"
                            className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Type</label>
                          <select
                            value={opp.type}
                            onChange={(e) => updateOpportunity(idx, "type", e.target.value)}
                            className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] focus:outline-none focus:border-[#7be0b8]"
                          >
                            <option value="Unpromoted Customer Favorite">Unpromoted Customer Favorite</option>
                            <option value="Underserved Offer">Underserved Offer</option>
                            <option value="Buried Differentiator">Buried Differentiator</option>
                            <option value="Customer Language / Messaging Upgrade">Customer Language / Messaging Upgrade</option>
                            <option value="Search / Discovery Opportunity">Search / Discovery Opportunity</option>
                            <option value="Commercial Account">Commercial Account</option>
                            <option value="Catering / Bulk Order">Catering / Bulk Order</option>
                            <option value="Local Partnership">Local Partnership</option>
                            <option value="Recurring Service Plan">Recurring Service Plan</option>
                            <option value="Supplier / Cost Saving">Supplier / Cost Saving</option>
                            <option value="Promotional Campaign">Promotional Campaign</option>
                            <option value="Lead Follow-up System">Lead Follow-up System</option>
                            <option value="General Opportunity">General Opportunity</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Description &amp; Why It Matters</label>
                        <textarea
                          rows={2}
                          value={opp.description}
                          onChange={(e) => updateOpportunity(idx, "description", e.target.value)}
                          placeholder="Why is this a viable opportunity for this business right now?"
                          className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Suggested Next Action</label>
                          <input
                            type="text"
                            value={opp.suggestedAction || ""}
                            onChange={(e) => updateOpportunity(idx, "suggestedAction", e.target.value)}
                            placeholder="e.g. Build simple 1-page commercial inquiry form"
                            className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Potential Impact</label>
                          <input
                            type="text"
                            value={opp.potentialImpact || ""}
                            onChange={(e) => updateOpportunity(idx, "potentialImpact", e.target.value)}
                            placeholder="e.g. High ($1,500/mo recurring revenue)"
                            className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                          />
                        </div>
                      </div>

                      {/* Lightweight Evidence Citation */}
                      <div className="space-y-2 pt-2 border-t border-[#2c3e33]">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={opp.evidence?.source || ""}
                            onChange={(e) => updateOpportunityEvidence(idx, "source", e.target.value)}
                            placeholder="Evidence source (e.g. Google Reviews)"
                            className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                          />
                          <input
                            type="text"
                            value={opp.evidence?.sourceUrl || ""}
                            onChange={(e) => updateOpportunityEvidence(idx, "sourceUrl", e.target.value)}
                            placeholder="Source URL (optional)"
                            className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                          />
                          <input
                            type="text"
                            value={opp.evidence?.note || ""}
                            onChange={(e) => updateOpportunityEvidence(idx, "note", e.target.value)}
                            placeholder="Evidence quote or note (optional)"
                            className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                          />
                        </div>
                        <label className="inline-flex items-center gap-2 text-[11px] text-[#bac9bf] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(opp.evidence?.clientVisible)}
                            onChange={(e) => updateOpportunityEvidence(idx, "clientVisible", e.target.checked)}
                            className="rounded border-[#36493d] text-[#7be0b8] focus:ring-[#7be0b8]/30"
                          />
                          <span>Show citation on client report (otherwise kept internal)</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Top 3 Things We Would Fix First */}
              <div className="space-y-4 pt-2 border-t border-[#2c3e33]">
                <div>
                  <label className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                    <span className="text-[#7be0b8] font-[family-name:var(--font-display)]">7.</span> Top 3 Things We Would Fix First
                  </label>
                  <p className="text-xs text-[#bac9bf]">
                    Prioritized, non-negotiable recommendations for immediate owner impact.
                  </p>
                </div>

                <div className="space-y-4">
                  {topFixes.map((fix, idx) => (
                    <div
                      key={fix.priority || idx}
                      className="p-4 bg-[#131f19] border border-[#f6b971]/30 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f6b971]/12 border border-[#f6b971]/25 text-[#f6b971] font-mono text-[10px] font-bold">
                          [BARATRUST_REVIEW] PRIORITY #{fix.priority}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Recommendation Title *</label>
                        <input
                          type="text"
                          value={fix.title}
                          onChange={(e) => updateTopFix(idx, "title", e.target.value)}
                          placeholder={`Priority ${idx + 1} recommendation title`}
                          className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Why It Matters</label>
                          <textarea
                            rows={2}
                            value={fix.whyItMatters}
                            onChange={(e) => updateTopFix(idx, "whyItMatters", e.target.value)}
                            placeholder="The specific business or revenue risk this addresses."
                            className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#bac9bf] mb-1">Suggested Action</label>
                          <textarea
                            rows={2}
                            value={fix.suggestedAction}
                            onChange={(e) => updateTopFix(idx, "suggestedAction", e.target.value)}
                            placeholder="Exact practical steps to implement the fix."
                            className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                          />
                        </div>
                      </div>

                      {/* Lightweight Evidence Citation */}
                      <div className="space-y-2 pt-2 border-t border-[#2c3e33]">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={fix.evidence?.source || ""}
                            onChange={(e) => updateTopFixEvidence(idx, "source", e.target.value)}
                            placeholder="Evidence source (e.g. Mobile Mystery Shop)"
                            className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                          />
                          <input
                            type="text"
                            value={fix.evidence?.sourceUrl || ""}
                            onChange={(e) => updateTopFixEvidence(idx, "sourceUrl", e.target.value)}
                            placeholder="Source URL (optional)"
                            className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                          />
                          <input
                            type="text"
                            value={fix.evidence?.note || ""}
                            onChange={(e) => updateTopFixEvidence(idx, "note", e.target.value)}
                            placeholder="Evidence quote or note (optional)"
                            className="px-2.5 py-1.5 bg-[#101914] border border-[#2c3e33] rounded text-[11px] text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
                          />
                        </div>
                        <label className="inline-flex items-center gap-2 text-[11px] text-[#bac9bf] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(fix.evidence?.clientVisible)}
                            onChange={(e) => updateTopFixEvidence(idx, "clientVisible", e.target.checked)}
                            className="rounded border-[#36493d] text-[#7be0b8] focus:ring-[#7be0b8]/30"
                          />
                          <span>Show citation on client report (otherwise kept internal)</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8. What We Would NOT Spend Money On */}
              <div className="space-y-2 pt-2 border-t border-[#2c3e33]">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                    <span className="text-[#f28b82] font-[family-name:var(--font-display)]">8.</span> What We Would NOT Spend Money On
                  </label>
                  <span className="text-[10px] font-mono text-[#f28b82] bg-[#E05A5A]/12 border border-[#E05A5A]/30 px-2 py-0.5 rounded-full">
                    [BARATRUST_REVIEW] CANDID ADVICE
                  </span>
                </div>
                <p className="text-xs text-[#bac9bf] leading-relaxed">
                  Dedicated section for candid advice about what NOT to waste money on right now.
                </p>
                <div className="p-4 bg-[#131f19] border border-[#E05A5A]/30 rounded-xl space-y-2">
                  <textarea
                    rows={3}
                    value={notSpendMoneyOn}
                    onChange={(e) => setNotSpendMoneyOn(e.target.value)}
                    placeholder="e.g. 'We would NOT recommend spending $3,000 on a complete website redesign right now...'"
                    className="w-full px-4 py-3 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#E05A5A] text-xs leading-relaxed"
                  />
                </div>
              </div>

              {/* 9. Final Human Notes */}
              <div className="space-y-2 pt-2 border-t border-[#2c3e33]">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-[#F0EBE0] flex items-center gap-2">
                    <span className="text-[#7be0b8] font-[family-name:var(--font-display)]">9.</span> Final Human Notes (Todd &amp; Noelah Summary)
                  </label>
                  <span className="text-[10px] font-mono text-[#f6b971] bg-[#f6b971]/12 border border-[#f6b971]/25 px-2 py-0.5 rounded-full">
                    [BARATRUST_REVIEW]
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={toddNotes}
                  onChange={(e) => setToddNotes(e.target.value)}
                  placeholder="Closing observations or follow-up notes."
                  className="w-full px-4 py-3 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8] text-xs leading-relaxed"
                />
              </div>

              {/* Next Step CTA */}
              <div className="pt-4 border-t border-[#2c3e33] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    setActiveWorkflowTab('report');
                  }}
                  className="px-5 py-2.5 bg-[#22342a] hover:bg-[#2b4135] text-[#F0EBE0] border border-[#3d5446] font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>Save Notes &amp; Proceed to Report Draft →</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: CLIENT REPORT DRAFT & SYNTHESIS */}
          {activeWorkflowTab === 'report' && (
            <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl p-6 md:p-8 space-y-8 shadow-2xl">
              <div className="border-b border-[#2c3e33] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-[#7be0b8]/12 border border-[#7be0b8]/30 text-[#7be0b8] font-mono text-[10px] font-bold rounded-full">
                      GEMINI REPORT SYNTHESIS
                    </span>
                    {reportAudit?.geminiModelUsed && (
                      reportAudit.geminiModelUsed.includes('fallback') ? (
                        <span className="px-2.5 py-0.5 bg-[#f6b971]/15 border border-[#f6b971]/35 text-[#f6b971] font-mono text-[10px] font-bold rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-[#f6b971]" />
                          Deterministic Fallback (API Offline / Key Missing)
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#bac9bf] bg-[#131f19] px-2.5 py-0.5 rounded-full border border-[#2c3e33]">
                          Model: {reportAudit.geminiModelUsed}
                        </span>
                      )
                    )}
                  </div>
                  <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] text-[#F0EBE0] mt-1.5">
                    Client Report Draft Editor
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateDraft}
                    disabled={generating}
                    className="px-3 py-1.5 bg-[#101914] hover:bg-[#1b2821] border border-[#36493d] text-[#F0EBE0] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#7be0b8]" />
                    <span>Regenerate Synthesis</span>
                  </button>
                </div>
              </div>

              {/* Prominent Fallback Notice Banner */}
              {reportAudit?.geminiModelUsed?.includes('fallback') && (
                <div className="p-3.5 bg-[#f6b971]/10 border border-[#f6b971]/30 rounded-xl text-[#f6b971] text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#f6b971] flex-shrink-0" />
                  <span>
                    <strong>Notice:</strong> This draft was assembled using BaraTrust&apos;s deterministic fallback engine because Gemini was offline, rate-limited, or unconfigured. Review and adjust all sections manually before publishing.
                  </span>
                </div>
              )}

              {!reportDraft ? (
                <div className="p-12 bg-[#131f19] border border-dashed border-[#36493d] rounded-xl text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#7be0b8]/12 border border-[#7be0b8]/30 text-[#7be0b8] flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold font-[family-name:var(--font-display)] text-[#F0EBE0]">No Report Draft Generated Yet</h3>
                    <p className="text-xs text-[#bac9bf] max-w-md mx-auto leading-relaxed">
                      Click the button below to synthesize your deterministic scan data, owner questionnaire, and human investigation notes into a plain-English draft report.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateDraft}
                    disabled={generating}
                    className="px-6 py-3 bg-[#192b22] hover:bg-[#21382c] text-[#7be0b8] border border-[#7be0b8]/35 font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-2 shadow-md"
                  >
                    <Sparkles className="w-4 h-4 text-[#7be0b8]" />
                    <span>Generate Draft Report with Gemini</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6 text-xs">

                  {/* 1. Executive Summary */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[#F0EBE0]">
                      Executive Summary (The Bottom Line)
                    </label>
                    <p className="text-xs text-[#bac9bf]">
                      Plain-English overview of business health, score context, and primary takeaway.
                    </p>
                    <textarea
                      rows={4}
                      value={reportDraft.executiveSummary}
                      onChange={(e) => updateDraftField('executiveSummary', e.target.value)}
                      className="w-full px-4 py-3 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                    />
                  </div>

                  {/* 2. What's Working */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-[#F0EBE0]">
                        What’s Working (Strengths Backed by Evidence)
                      </label>
                      <button
                        type="button"
                        onClick={() => addListItem('whatsWorking')}
                        className="text-[11px] font-semibold text-[#7be0b8] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add item
                      </button>
                    </div>
                    <div className="space-y-2">
                      {reportDraft.whatsWorking.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => updateListItem('whatsWorking', idx, e.target.value)}
                            className="flex-1 px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] text-xs focus:outline-none focus:border-[#7be0b8]"
                          />
                          <button
                            type="button"
                            onClick={() => removeListItem('whatsWorking', idx)}
                            className="text-[#8fa396] hover:text-[#f28b82] p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. What's Getting in the Way */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-[#F0EBE0]">
                        What’s Getting in the Way (Friction &amp; Leaks)
                      </label>
                      <button
                        type="button"
                        onClick={() => addListItem('whatsGettingInTheWay')}
                        className="text-[11px] font-semibold text-[#f6b971] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add item
                      </button>
                    </div>
                    <div className="space-y-2">
                      {reportDraft.whatsGettingInTheWay.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => updateListItem('whatsGettingInTheWay', idx, e.target.value)}
                            className="flex-1 px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] text-xs focus:outline-none focus:border-[#f6b971]"
                          />
                          <button
                            type="button"
                            onClick={() => removeListItem('whatsGettingInTheWay', idx)}
                            className="text-[#8fa396] hover:text-[#f28b82] p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Top Fixes Summary */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[#F0EBE0]">
                      Top 3 Fixes Summary Intro
                    </label>
                    <textarea
                      rows={2}
                      value={reportDraft.topFixesSummary}
                      onChange={(e) => updateDraftField('topFixesSummary', e.target.value)}
                      className="w-full px-4 py-3 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                    />
                  </div>

                  {/* 5. What NOT to Spend Money On */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[#f28b82]">
                      What We Would NOT Spend Money On Summary
                    </label>
                    <p className="text-xs text-[#bac9bf]">
                      Strategic candor protecting the owner&apos;s budget.
                    </p>
                    <textarea
                      rows={3}
                      value={reportDraft.notWorthSpendingOnSummary}
                      onChange={(e) => updateDraftField('notWorthSpendingOnSummary', e.target.value)}
                      className="w-full px-4 py-3 bg-[#101914] border border-[#E05A5A]/35 rounded-lg text-[#F0EBE0] text-xs leading-relaxed focus:outline-none focus:border-[#E05A5A]"
                    />
                  </div>

                  {/* 6. Human Review Synthesis Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#2c3e33]">
                    <div className="space-y-1">
                      <label className="block font-semibold text-[#F0EBE0]">Findability Summary</label>
                      <textarea
                        rows={3}
                        value={reportDraft.findabilitySummary}
                        onChange={(e) => updateDraftField('findabilitySummary', e.target.value)}
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-semibold text-[#F0EBE0]">Reputation Summary</label>
                      <textarea
                        rows={3}
                        value={reportDraft.reputationSummary}
                        onChange={(e) => updateDraftField('reputationSummary', e.target.value)}
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-semibold text-[#F0EBE0]">Social Presence Summary</label>
                      <textarea
                        rows={3}
                        value={reportDraft.socialSummary}
                        onChange={(e) => updateDraftField('socialSummary', e.target.value)}
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-semibold text-[#F0EBE0]">Competitor Comparison Summary</label>
                      <textarea
                        rows={3}
                        value={reportDraft.competitorSummary}
                        onChange={(e) => updateDraftField('competitorSummary', e.target.value)}
                        className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-[#F0EBE0]">Inquiry Friction &amp; Leakage Summary</label>
                    <textarea
                      rows={2}
                      value={reportDraft.lostOpportunitySummary}
                      onChange={(e) => updateDraftField('lostOpportunitySummary', e.target.value)}
                      className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-[#F0EBE0]">Growth Opportunities Summary</label>
                    <textarea
                      rows={2}
                      value={reportDraft.opportunitiesSummary}
                      onChange={(e) => updateDraftField('opportunitiesSummary', e.target.value)}
                      className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                    />
                  </div>

                  {/* 6B. Optional Human Intelligence Layer Synthesis Fields */}
                  <div className="pt-3 border-t border-[#2c3e33] space-y-3">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-[#7be0b8] font-bold">
                        Optional Human Intelligence Synthesis (Omitted on Report When Blank)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block font-semibold text-[#F0EBE0]">Brand Reality &amp; Customer Impression</label>
                        <textarea
                          rows={2}
                          value={reportDraft.brandRealitySummary || ""}
                          onChange={(e) => updateDraftField('brandRealitySummary', e.target.value)}
                          placeholder="Leave blank if not applicable..."
                          className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] placeholder-[#8fa396] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-semibold text-[#F0EBE0]">Customer Voice &amp; Review Intelligence</label>
                        <textarea
                          rows={2}
                          value={reportDraft.customerVoiceSummary || ""}
                          onChange={(e) => updateDraftField('customerVoiceSummary', e.target.value)}
                          placeholder="Leave blank if not applicable..."
                          className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] placeholder-[#8fa396] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-semibold text-[#F0EBE0]">Advertising Presence &amp; Funnel</label>
                        <textarea
                          rows={2}
                          value={reportDraft.advertisingFunnelSummary || ""}
                          onChange={(e) => updateDraftField('advertisingFunnelSummary', e.target.value)}
                          placeholder="Leave blank if not applicable..."
                          className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] placeholder-[#8fa396] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-semibold text-[#F0EBE0]">Legacy Digital Footprint / Cleanup</label>
                        <textarea
                          rows={2}
                          value={reportDraft.ghostFootprintSummary || ""}
                          onChange={(e) => updateDraftField('ghostFootprintSummary', e.target.value)}
                          placeholder="Leave blank if not applicable..."
                          className="w-full px-3 py-2 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] placeholder-[#8fa396] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 7. Closing Sign-off */}
                  <div className="space-y-2 pt-2 border-t border-[#2c3e33]">
                    <label className="block text-sm font-bold text-[#F0EBE0]">
                      Closing Note (Todd &amp; Noelah Sign-off)
                    </label>
                    <textarea
                      rows={2}
                      value={reportDraft.closingNote}
                      onChange={(e) => updateDraftField('closingNote', e.target.value)}
                      className="w-full px-4 py-3 bg-[#101914] border border-[#36493d] rounded-lg text-[#F0EBE0] text-xs leading-relaxed focus:outline-none focus:border-[#7be0b8]"
                    />
                  </div>

                </div>
              )}

              {/* Human Pre-Publication Quality Checklist */}
              {reportDraft && (
                <div className="bg-[#131f19] border border-[#f6b971]/30 rounded-xl p-5 space-y-4">
                  <div 
                    className="flex items-center justify-between cursor-pointer select-none"
                    onClick={() => setChecklistOpen(!checklistOpen)}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#f6b971]" />
                      <span className="text-xs font-bold font-[family-name:var(--font-display)] text-[#F0EBE0]">
                        Pre-Publication Quality Checklist (Todd &amp; Noelah Human QA)
                      </span>
                      <span className="text-[11px] font-mono text-[#f6b971] bg-[#f6b971]/12 px-2 py-0.5 rounded-full border border-[#f6b971]/25">
                        {Object.values(checkedItems).filter(Boolean).length} / 10 Reviewed
                      </span>
                    </div>
                    {checklistOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#bac9bf]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#bac9bf]" />
                    )}
                  </div>

                  <p className="text-[11px] text-[#bac9bf] leading-relaxed">
                    Verify each item before publishing. The operator remains responsible for final approval.
                  </p>

                  {checklistOpen && (
                    <div className="pt-2 space-y-2 border-t border-[#2c3e33]">
                      {[
                        "Are all factual statements supported by the evidence dossier?",
                        "Did Gemini turn any UNKNOWN into a fact?",
                        "Did Gemini invent a competitor, review, lead, metric, or dollar value?",
                        "Are the Top 3 Fixes genuinely the three highest priorities?",
                        "Does 'What We Would NOT Spend Money On' contain useful candid advice?",
                        "Are opportunities specific rather than generic?",
                        "Does the report repeat itself unnecessarily?",
                        "Does it sound like a knowledgeable person rather than AI marketing copy?",
                        "Can a small-business owner understand it without knowing SEO/technology?",
                        "Is there anything embarrassing or misleading that we would not say face-to-face?"
                      ].map((item, idx) => (
                        <label 
                          key={idx} 
                          className="flex items-start gap-2.5 p-2 rounded hover:bg-[#16231c] cursor-pointer text-xs text-[#F0EBE0]"
                        >
                          <input
                            type="checkbox"
                            checked={!!checkedItems[idx]}
                            onChange={(e) => setCheckedItems({ ...checkedItems, [idx]: e.target.checked })}
                            className="mt-0.5 rounded border-[#36493d] text-[#7be0b8] focus:ring-[#7be0b8]/30"
                          />
                          <span className={checkedItems[idx] ? "line-through text-[#8fa396]" : ""}>{item}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Save & Action Bar at Bottom of Report Tab */}
              {reportDraft && (
                <div className="pt-4 border-t border-[#2c3e33] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-[#bac9bf]">
                    {reportAudit?.lastReportEditAt ? `Report edited: ${new Date(reportAudit.lastReportEditAt).toLocaleTimeString()}` : "Remember to save your report draft."}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleSave()}
                      disabled={saving}
                      className="w-full sm:w-auto px-5 py-2.5 bg-[#22342a] hover:bg-[#2b4135] text-[#F0EBE0] border border-[#3d5446] font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5 text-[#bac9bf]" />
                      <span>Save Report Draft</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={publishing || realityCheckStatus === 'PUBLISHED'}
                      className="w-full sm:w-auto px-5 py-2.5 bg-[#7be0b8] hover:bg-[#6bd4aa] text-[#10251a] font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish &amp; Send Email</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

function FindingPill({
  checkKey,
  state,
  maxPoints,
  supportingDetail,
  observedValue,
}: {
  checkKey?: string | null;
  state: FindingState;
  maxPoints?: number | null;
  supportingDetail?: string | null;
  observedValue?: any;
}) {
  if (maxPoints === 0) {
    if (state === "FAIL") {
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#f6b971]/12 border border-[#f6b971]/30 text-[#f6b971] font-mono font-bold text-[10px]">
          ATTENTION
        </span>
      );
    }
    if (typeof checkKey === "string" && checkKey.startsWith("browser_")) {
      if (state === "UNKNOWN") {
        return (
          <span className="px-2 py-0.5 rounded-full bg-[#f6b971]/12 border border-[#f6b971]/30 text-[#f6b971] font-mono font-bold text-[10px]">
            HUMAN CHECK
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#bac9bf]/10 border border-[#bac9bf]/25 text-[#c2d1c7] font-mono font-bold text-[10px]">
          INFO · OBSERVED
        </span>
      );
    }
    const detail = (supportingDetail || "").trim();
    const isDeferredUnknown =
      state === "UNKNOWN" &&
      (observedValue?.observationState === "UNKNOWN" ||
        observedValue?.isClientRenderedSpa === true ||
        observedValue?.viewportDiscrepancy === true ||
        observedValue?.status === "SCAN_DEFERRED" ||
        /^(?:client-rendered|check deferred|could not\b)/i.test(detail) ||
        /deferred to (?:browser or )?human review/i.test(detail));
    if (isDeferredUnknown) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-[#f6b971]/12 border border-[#f6b971]/30 text-[#f6b971] font-mono font-bold text-[10px]">
          HUMAN CHECK
        </span>
      );
    }
    const isObserved = state === "PASS" && !/^no\s/i.test(detail);
    return isObserved ? (
      <span className="px-2 py-0.5 rounded-full bg-[#bac9bf]/10 border border-[#bac9bf]/25 text-[#c2d1c7] font-mono font-bold text-[10px]">
        INFO · OBSERVED
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded-full bg-[#16231c] border border-[#2c3e33] text-[#bac9bf] font-mono font-bold text-[10px]">
        INFO · NOT OBSERVED
      </span>
    );
  }
  if (state === "PASS") {
    return (
      <span className="px-2 py-0.5 rounded-full bg-[#7be0b8]/12 border border-[#7be0b8]/30 text-[#7be0b8] font-mono font-bold text-[10px] flex items-center gap-1">
        ✓ PASS
      </span>
    );
  }
  if (state === "FAIL") {
    return (
      <span className="px-2 py-0.5 rounded-full bg-[#E05A5A]/12 border border-[#E05A5A]/30 text-[#f28b82] font-mono font-bold text-[10px] flex items-center gap-1">
        ✕ FAIL
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full bg-[#16231c] border border-[#2c3e33] text-[#bac9bf] font-mono font-bold text-[10px]">
      ? UNKNOWN
    </span>
  );
}

function OwnerQABlock({ q, a }: { q: string; a?: string }) {
  return (
    <div className="p-3.5 bg-[#131f19] border border-[#2c3e33] rounded-lg space-y-1">
      <p className="font-semibold text-[#F0EBE0] text-xs">{q}</p>
      <p className="text-[#bac9bf] text-xs leading-relaxed italic">
        {a && a.trim().length > 0 ? `"${a}"` : <span className="text-[#8fa396] not-italic">No response entered</span>}
      </p>
    </div>
  );
}
