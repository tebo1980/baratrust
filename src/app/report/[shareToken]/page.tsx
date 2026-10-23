import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { 
  realityChecks, 
  scanFindings, 
  ownerResponses, 
  humanReviews,
  HumanReviewTopFix,
  HumanReviewOpportunity,
  HumanIntelligenceLayer,
  HumanEvidenceCitation
} from "@/db/schema";
import { getOperatorUser } from "@/lib/auth/operator";
import { decodeHtmlEntities, classifyProfileSummaryText } from "@/lib/scanner/parser";
import { normalizeAdPresenceState } from "@/lib/gemini/synthesizer";
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Check, 
  X, 
  HelpCircle,
  ExternalLink,
  Mail,
  Printer,
  Compass,
  DollarSign,
  Building2,
  TrendingUp,
  MapPin,
  ChevronDown
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BaraTrust Reality Check Report",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function PublishedRealityCheckReportPage({
  params,
  searchParams,
}: {
  params: { shareToken: string };
  searchParams?: { preview?: string };
}) {
  const { shareToken } = params;
  const isPreview = searchParams?.preview === "true";

  if (!shareToken || shareToken.length < 8) {
    notFound();
  }

  // 1. Fetch reality check by unguessable share token
  const [check] = await db
    .select()
    .from(realityChecks)
    .where(eq(realityChecks.shareToken, shareToken))
    .limit(1);

  if (!check) {
    notFound();
  }

  // 2. Fetch human review
  const [review] = await db
    .select()
    .from(humanReviews)
    .where(eq(humanReviews.realityCheckId, check.id))
    .limit(1);

  // 3. Check published state vs preview mode
  const isPublished = check.status === "PUBLISHED" || review?.status === "published";

  if (!isPublished && !isPreview) {
    return (
      <div className="min-h-screen bg-[#050810] text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#0E1524] border border-amber-500/30 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider font-bold">
              Review In Progress
            </span>
            <h2 className="text-2xl font-bold font-serif text-white">
              {check.businessName || check.website}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Todd and Noelah are currently completing the hands-on human review for this business. You will receive an email as soon as your Reality Check report is ready.
            </p>
          </div>
          <div className="pt-2 text-xs font-mono text-slate-500">
            Estimated turnaround: within 1 business day
          </div>
        </div>
      </div>
    );
  }

  // If in preview mode, verify operator privileges
  if (isPreview && !isPublished) {
    const operator = await getOperatorUser();
    if (!operator || !operator.isOperator) {
      return (
        <div className="min-h-screen bg-[#050810] text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#0E1524] border border-red-500/30 rounded-2xl p-8 text-center space-y-4">
            <h2 className="text-xl font-bold text-white">Preview Access Restricted</h2>
            <p className="text-sm text-slate-400">
              Only authorized operators can preview an unpublished report.
            </p>
          </div>
        </div>
      );
    }
  }

  // 4. Fetch scan findings and owner responses
  const findings = await db
    .select()
    .from(scanFindings)
    .where(eq(scanFindings.realityCheckId, check.id));

  const [ownerResp] = await db
    .select()
    .from(ownerResponses)
    .where(eq(ownerResponses.realityCheckId, check.id))
    .limit(1);

  // Content source: use frozen published_report if available, otherwise report_draft
  const reportContent = review?.publishedReport || review?.reportDraft;
  const topFixes: HumanReviewTopFix[] = (review?.publishedReport as any)?.frozenTopFixes || review?.topFixes || [];
  const opportunities: HumanReviewOpportunity[] = (review?.publishedReport as any)?.frozenOpportunities || review?.opportunitiesFound || [];
  // Explicit null is a frozen absence; only older snapshots without this field may fall back.
  const humanIntelligence: HumanIntelligenceLayer | null =
    review?.publishedReport?.frozenHumanIntelligence !== undefined
      ? review.publishedReport.frozenHumanIntelligence
      : review?.humanIntelligence ?? null;
  const publishedDate = review?.publishedAt ? new Date(review.publishedAt) : new Date();

  const brandReality = humanIntelligence?.brandReality;
  const hasBrandReality = Boolean(
    (reportContent?.brandRealitySummary && reportContent.brandRealitySummary.trim()) ||
      (brandReality &&
        ((brandReality.apparentBrandMessage && brandReality.apparentBrandMessage.trim()) ||
          (brandReality.consistencyNotes && brandReality.consistencyNotes.trim()) ||
          (brandReality.brandCustomerMismatch && brandReality.brandCustomerMismatch.trim()) ||
          (brandReality.strongestBrandOpportunity && brandReality.strongestBrandOpportunity.trim()) ||
          (brandReality.mysteryShopImpression && brandReality.mysteryShopImpression.trim())))
  );

  const customerVoice = humanIntelligence?.customerVoice;
  const activeLoves = (customerVoice?.topLoves || []).filter((s) => s && s.trim().length > 0);
  const activeComplaints = (customerVoice?.topComplaints || []).filter((s) => s && s.trim().length > 0);
  const hasCustomerVoice = Boolean(
    (reportContent?.customerVoiceSummary && reportContent.customerVoiceSummary.trim()) ||
      activeLoves.length > 0 ||
      activeComplaints.length > 0 ||
      (customerVoice?.recurringThemes && customerVoice.recurringThemes.trim()) ||
      (customerVoice?.unmarketedStrengths && customerVoice.unmarketedStrengths.trim())
  );

  const advertisingFunnel = humanIntelligence?.advertisingFunnel;
  const normalizedAdPresence = normalizeAdPresenceState(advertisingFunnel?.adPresence);
  const hasAdvertisingFunnel = Boolean(
    (reportContent?.advertisingFunnelSummary && reportContent.advertisingFunnelSummary.trim()) ||
      (advertisingFunnel &&
        (normalizedAdPresence !== "UNKNOWN" ||
          (advertisingFunnel.platformsObserved && advertisingFunnel.platformsObserved.trim()) ||
          (advertisingFunnel.offerSummary && advertisingFunnel.offerSummary.trim()) ||
          (advertisingFunnel.landingPageQuality && advertisingFunnel.landingPageQuality.trim()) ||
          (advertisingFunnel.adToFunnelMismatch && advertisingFunnel.adToFunnelMismatch.trim()) ||
          (advertisingFunnel.recommendationNote && advertisingFunnel.recommendationNote.trim())))
  );

  const ghostFootprint = (humanIntelligence?.ghostFootprint || []).filter(
    (g) => g && g.summary && g.summary.trim().length > 0
  );
  const hasGhostFootprint = Boolean(
    (reportContent?.ghostFootprintSummary && reportContent.ghostFootprintSummary.trim()) ||
      ghostFootprint.length > 0
  );

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 font-sans selection:bg-amber-500/30 print:bg-white print:text-black">

      {/* Operator Preview Banner if viewing unpublished report */}
      {isPreview && !isPublished && (
        <div className="bg-amber-500 text-slate-950 px-6 py-2 text-center text-xs font-mono font-bold uppercase tracking-wider sticky top-0 z-50 shadow-md print:hidden">
          Operator Preview Mode — This report is not yet published to the client.
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#080F1A]/95 backdrop-blur-md sticky top-0 z-30 print:static print:bg-white print:border-b-2 print:border-black">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center print:border-black">
              <span className="text-amber-400 font-bold text-lg font-serif print:text-black">B</span>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white font-serif print:text-black">
                Bara<span className="text-amber-400 print:text-black">Trust</span>
              </span>
              <span className="text-xs text-slate-400 font-mono ml-2 hidden sm:inline print:inline">
                Reality Check
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-400 hidden sm:inline print:inline">
              {publishedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full font-bold print:border-black print:text-black">
              ✓ VERIFIED REPORT
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12 print:py-4">

        {/* Title Header */}
        <div className="space-y-4 border-b border-slate-800 pb-8 print:border-b-2 print:border-black">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-400 print:text-slate-700">
            <span>BaraTrust Business Reality Check</span>
            {check.cityState && (
              <>
                <span>•</span>
                <span className="text-white font-semibold print:text-black">{check.cityState}</span>
              </>
            )}
            <span>•</span>
            <span className="text-amber-400 font-semibold print:text-black">{check.businessType || "Small Business"}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-serif tracking-tight break-words print:text-black">
            {check.businessName
              ? decodeHtmlEntities(check.businessName)
              : check.website.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1 print:text-slate-700">
            <span className="break-all">Website: <strong className="text-slate-200 print:text-black">{check.website}</strong></span>
            <span>•</span>
            <span>Conducted by: <strong className="text-amber-400 print:text-black">Todd & Noelah</strong></span>
          </div>

          {/* Evidence Labels Guide */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 print:border-slate-400 print:text-black">
              [AUTO_DETECTED] Factual Scan
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 print:border-slate-400 print:text-black">
              [OWNER_PROVIDED] Context
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 print:border-slate-400 print:text-black">
              [BARATRUST_REVIEW] Human Judgment
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 print:border-slate-400 print:text-black">
              [OPPORTUNITY_FOUND] Growth Potential
            </span>
          </div>
        </div>

        {/* 1. Overall Snapshot Card */}
        <section className="bg-[#0E1524] border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl print:bg-white print:border-2 print:border-black">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800 print:border-black">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                Overall Diagnostic Snapshot
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                {check.overallScore !== null ? (
                  <>
                    <span className="text-4xl md:text-5xl font-bold font-serif text-amber-400 print:text-black">
                      {check.overallScore}
                    </span>
                    <span className="text-base text-slate-500 font-mono font-normal">/ 100</span>
                    <span className="text-xs text-slate-400 font-mono ml-1 print:text-black">
                      on evaluated signals
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-amber-400 font-serif print:text-black">
                    Manual Review
                  </span>
                )}
              </div>
              {check.overallScore !== null && (check.scoreBreakdown?.coverage?.overall ?? 100) < 100 && (
                <p className="text-xs text-slate-400 mt-1.5 print:text-black">
                  Calculated on the {check.scoreBreakdown?.coverage?.overall}% of scored checks observable via static scan; remaining checks were evaluated in our human review.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 font-mono text-xs">
              <span className="px-3 py-1 rounded bg-[#080D18] border border-slate-700 text-slate-300 print:border-slate-400 print:text-black">
                {check.scoreBreakdown?.coverage?.confidence || 'HIGH'} CONFIDENCE
              </span>
              <span className="px-3 py-1 rounded bg-[#080D18] border border-slate-700 text-slate-300 print:border-slate-400 print:text-black">
                {check.scoreBreakdown?.coverage?.overall ?? 0}% OBSERVABLE COVERAGE
              </span>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white font-serif print:text-black">The Bottom Line</h2>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed font-normal print:text-black">
              {reportContent?.executiveSummary || "We completed our hands-on review of your business presence, customer contact paths, and local competition. Below are our objective findings, the top three things we'd fix first, and what not to waste money on."}
            </p>
          </div>
        </section>

        {/* 2. What's Working & What's Getting in the Way (Side by Side) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* What's Working */}
          <section className="bg-[#0A101D] border border-emerald-500/30 rounded-2xl p-6 space-y-4 print:bg-white print:border print:border-black">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                ✓
              </div>
              <h3 className="text-lg font-bold text-white font-serif print:text-black">
                What’s Working
              </h3>
            </div>
            <p className="text-xs text-slate-400 print:text-slate-600">
              Real-world strengths backed by evidence that you should keep doing.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-200 pt-2 print:text-black">
              {reportContent?.whatsWorking && reportContent.whatsWorking.length > 0 ? (
                reportContent.whatsWorking.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-400 italic">Established operating track record and active customer base.</li>
              )}
            </ul>
          </section>

          {/* What's Getting in the Way */}
          <section className="bg-[#0A101D] border border-amber-500/30 rounded-2xl p-6 space-y-4 print:bg-white print:border print:border-black">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                !
              </div>
              <h3 className="text-lg font-bold text-white font-serif print:text-black">
                What’s Getting in the Way
              </h3>
            </div>
            <p className="text-xs text-slate-400 print:text-slate-600">
              Operational leaks or friction where inquiries and momentum drop off.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-200 pt-2 print:text-black">
              {reportContent?.whatsGettingInTheWay && reportContent.whatsGettingInTheWay.length > 0 ? (
                reportContent.whatsGettingInTheWay.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-400 italic">Missed inquiry opportunities and lack of systematic follow-up.</li>
              )}
            </ul>
          </section>

        </div>

        {/* 3. Top 3 Things We Would Fix First (Prominent!) */}
        <section className="bg-[#0E1524] border-2 border-amber-500/40 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl print:bg-white print:border-2 print:border-black">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 print:border-black">
            <div>
              <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold rounded">
                [BARATRUST_REVIEW] PRIORITY RECOMMENDATIONS
              </span>
              <h2 className="text-2xl md:text-3xl font-bold font-serif text-white mt-1 print:text-black">
                Top 3 Things We Would Fix First
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Immediate 30-Day Focus</span>
          </div>

          {reportContent?.topFixesSummary && (
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal print:text-black">
              {reportContent.topFixesSummary}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {topFixes.map((fix) => (
              <div 
                key={fix.priority}
                className="bg-[#080D18] border border-amber-500/30 rounded-xl p-5 space-y-3 flex flex-col justify-between print:bg-white print:border print:border-black"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center">
                      {fix.priority}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-semibold">Priority #{fix.priority}</span>
                  </div>
                  <h4 className="font-bold text-white text-sm font-serif leading-snug print:text-black">
                    {fix.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">
                    <strong className="text-slate-300 print:text-black">Why it matters:</strong> {fix.whyItMatters}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-amber-300 print:text-black print:border-slate-300">
                  <div>
                    <strong className="block text-[10px] uppercase tracking-wider font-mono text-slate-500 print:text-slate-700 mb-1">
                      Recommended Action:
                    </strong>
                    <span>{fix.suggestedAction}</span>
                  </div>
                  <EvidenceCitationRow evidence={fix.evidence} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. What We Would NOT Spend Money On (Prominent Candid Trust Card) */}
        <section className="bg-gradient-to-r from-rose-950/20 via-[#0E1524] to-[#0A101D] border-2 border-rose-500/40 rounded-2xl p-6 md:p-8 space-y-4 shadow-xl print:bg-white print:border-2 print:border-black">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-[10px] font-bold rounded">
              [BARATRUST_REVIEW] CANDID STRATEGIC ADVICE
            </span>
            <span className="text-xs font-mono text-slate-400">Budget Protection</span>
          </div>

          <h3 className="text-xl md:text-2xl font-bold font-serif text-white print:text-black">
            What We Would NOT Spend Money On
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed print:text-slate-600">
            One of the easiest ways for small businesses to lose money is spending budget on the wrong things in the wrong order. Here is our honest advice about what to hold off on right now:
          </p>

          <div className="p-5 bg-[#080D18] border border-rose-500/30 rounded-xl space-y-2 print:bg-white print:border print:border-black">
            <p className="text-sm md:text-base text-slate-200 font-normal leading-relaxed print:text-black">
              {reportContent?.notWorthSpendingOnSummary || review?.notSpendMoneyOn || "We would not recommend spending money on a full website redesign or high-cost ad campaigns until your baseline customer response and local listings are dialed in."}
            </p>
          </div>
        </section>

        {/* 5. BaraTrust Human Review (Core & Human Intelligence Observations) */}
        <section className="bg-[#0E1524] border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl print:bg-white print:border print:border-black">
          <div className="border-b border-slate-800 pb-4 print:border-black">
            <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold rounded">
              [BARATRUST_REVIEW] HUMAN INVESTIGATION
            </span>
            <h3 className="text-2xl font-bold font-serif text-white mt-1 print:text-black">
              Todd & Noelah’s Field Observations
            </h3>
            <p className="text-xs text-slate-400 mt-1 print:text-slate-600">
              What we observed by searching, reviewing public records, and evaluating competitors the way a real customer would.
            </p>
          </div>

          <div className="space-y-6 text-xs divide-y divide-slate-800/80 print:divide-black">
            {/* Findability */}
            <div className="pt-4 first:pt-0 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 print:text-black">
                <Compass className="w-4 h-4 text-amber-400" />
                Findability & Local Search Presence
              </h4>
              <p className="text-slate-300 leading-relaxed font-normal print:text-black">
                {reportContent?.findabilitySummary || review?.findabilityTest || "No findability notes recorded."}
              </p>
            </div>

            {/* Reputation */}
            <div className="pt-4 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 print:text-black">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Reputation & Review Trust
              </h4>
              <p className="text-slate-300 leading-relaxed font-normal print:text-black">
                {reportContent?.reputationSummary || review?.reputationSummary || "No reputation notes recorded."}
              </p>
            </div>

            {/* Social Presence */}
            <div className="pt-4 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 print:text-black">
                <Building2 className="w-4 h-4 text-blue-400" />
                Social Channels & Community Engagement
              </h4>
              <p className="text-slate-300 leading-relaxed font-normal print:text-black">
                {reportContent?.socialSummary || review?.socialPresenceReview || "No social notes recorded."}
              </p>
            </div>

            {/* Competitor Comparison */}
            <div className="pt-4 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 print:text-black">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Competitor Comparison & Your Natural Edge
              </h4>
              <p className="text-slate-300 leading-relaxed font-normal print:text-black">
                {reportContent?.competitorSummary || review?.competitorComparison || "No competitor notes recorded."}
              </p>
            </div>

            {/* Lost Opportunity Hunt */}
            <div className="pt-4 space-y-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 print:text-black">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Inquiry Friction & Opportunity Leakage
              </h4>
              <p className="text-slate-300 leading-relaxed font-normal print:text-black">
                {reportContent?.lostOpportunitySummary || review?.lostOpportunityHunt || "No inquiry friction notes recorded."}
              </p>
            </div>

            {/* CONDITIONAL: Brand Reality & Customer Impression */}
            {hasBrandReality && (
              <div className="pt-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2 print:text-black">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Brand Reality & First-Impression Alignment
                  </h4>
                  {brandReality?.messageClarity && brandReality.messageClarity !== "UNKNOWN" && (
                    <span className="px-2 py-0.5 rounded bg-[#080D18] border border-slate-700 font-mono text-[10px] text-amber-300 print:border-slate-400 print:text-black">
                      Message Clarity: {brandReality.messageClarity}
                    </span>
                  )}
                </div>
                {reportContent?.brandRealitySummary && (
                  <p className="text-slate-300 leading-relaxed font-normal print:text-black">
                    {reportContent.brandRealitySummary}
                  </p>
                )}
                {!reportContent?.brandRealitySummary && brandReality && (
                  <div className="space-y-1.5 text-slate-300 leading-relaxed print:text-black">
                    {brandReality.apparentBrandMessage && (
                      <p><strong>Apparent Message:</strong> {brandReality.apparentBrandMessage}</p>
                    )}
                    {brandReality.mysteryShopImpression && (
                      <p><strong>Customer Experience & Flow:</strong> {brandReality.mysteryShopImpression}</p>
                    )}
                    {brandReality.brandCustomerMismatch && (
                      <p><strong>Brand vs. Customer Reality:</strong> {brandReality.brandCustomerMismatch}</p>
                    )}
                    {brandReality.consistencyNotes && (
                      <p><strong>Cross-Channel Consistency:</strong> {brandReality.consistencyNotes}</p>
                    )}
                    {brandReality.strongestBrandOpportunity && (
                      <p><strong>Strongest Brand Opportunity:</strong> {brandReality.strongestBrandOpportunity}</p>
                    )}
                  </div>
                )}
                <EvidenceCitationRow evidence={brandReality?.evidence} />
              </div>
            )}

            {/* CONDITIONAL: Customer Voice & Review Intelligence */}
            {hasCustomerVoice && (
              <div className="pt-4 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2 print:text-black">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Customer Voice & Review Intelligence
                </h4>
                {reportContent?.customerVoiceSummary && (
                  <p className="text-slate-300 leading-relaxed font-normal print:text-black">
                    {reportContent.customerVoiceSummary}
                  </p>
                )}
                {(activeLoves.length > 0 || activeComplaints.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {activeLoves.length > 0 && (
                      <div className="p-3.5 bg-[#080D18] border border-emerald-500/20 rounded-xl space-y-1.5 print:bg-white print:border print:border-black">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block print:text-black">
                          What Customers Repeatedly Love
                        </span>
                        <ul className="space-y-1 text-slate-200 print:text-black">
                          {activeLoves.map((love, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-400 font-bold">✓</span>
                              <span>{love}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeComplaints.length > 0 && (
                      <div className="p-3.5 bg-[#080D18] border border-amber-500/20 rounded-xl space-y-1.5 print:bg-white print:border print:border-black">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block print:text-black">
                          Recurring Customer Friction Points
                        </span>
                        <ul className="space-y-1 text-slate-200 print:text-black">
                          {activeComplaints.map((comp, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-amber-400 font-bold">!</span>
                              <span>{comp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {customerVoice?.unmarketedStrengths && (
                  <p className="text-slate-300 leading-relaxed print:text-black">
                    <strong className="text-emerald-400 print:text-black">Hidden Strength to Highlight:</strong>{" "}
                    {customerVoice.unmarketedStrengths}
                  </p>
                )}
                <EvidenceCitationRow evidence={customerVoice?.evidence} />
              </div>
            )}

            {/* CONDITIONAL: Advertising Presence & Funnel */}
            {hasAdvertisingFunnel && (
              <div className="pt-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2 print:text-black">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    Advertising Presence & Funnel Assessment
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {normalizedAdPresence !== "UNKNOWN" && (
                      <span className="px-2 py-0.5 rounded bg-[#080D18] border border-slate-700 font-mono text-[10px] text-slate-300 print:border-slate-400 print:text-black">
                        {normalizedAdPresence === "OBSERVED"
                          ? "Public Ads: Observed"
                          : "Public Ads: None Observed in Checked Channels"}
                      </span>
                    )}
                    {advertisingFunnel?.recommendation && advertisingFunnel.recommendation !== "UNKNOWN" && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 font-mono text-[10px] text-amber-300 print:border-slate-400 print:text-black">
                        {advertisingFunnel.recommendation.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>
                {reportContent?.advertisingFunnelSummary ? (
                  <p className="text-slate-300 leading-relaxed font-normal print:text-black">
                    {reportContent.advertisingFunnelSummary}
                  </p>
                ) : (
                  <div className="space-y-1 text-slate-300 leading-relaxed print:text-black">
                    {normalizedAdPresence === "NOT_OBSERVED" && (
                      <p>
                        <strong>Public Ad Check:</strong> We did not observe active paid ads in the public channels checked during our review.
                      </p>
                    )}
                    {advertisingFunnel?.platformsObserved && (
                      <p><strong>Channels Checked / Observed:</strong> {advertisingFunnel.platformsObserved}</p>
                    )}
                    {advertisingFunnel?.offerSummary && (
                      <p><strong>Promoted Offer:</strong> {advertisingFunnel.offerSummary}</p>
                    )}
                    {advertisingFunnel?.landingPageQuality && (
                      <p><strong>Landing Page Quality:</strong> {advertisingFunnel.landingPageQuality}</p>
                    )}
                    {advertisingFunnel?.adToFunnelMismatch && (
                      <p><strong>Funnel Friction:</strong> {advertisingFunnel.adToFunnelMismatch}</p>
                    )}
                    {advertisingFunnel?.recommendationNote && (
                      <p><strong>Our Guidance:</strong> {advertisingFunnel.recommendationNote}</p>
                    )}
                  </div>
                )}
                <EvidenceCitationRow evidence={advertisingFunnel?.evidence} />
              </div>
            )}

            {/* CONDITIONAL: Ghost Footprint / Legacy Assets */}
            {hasGhostFootprint && (
              <div className="pt-4 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2 print:text-black">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Legacy Digital Footprint & Cleanup Items
                </h4>
                {reportContent?.ghostFootprintSummary && (
                  <p className="text-slate-300 leading-relaxed font-normal print:text-black">
                    {reportContent.ghostFootprintSummary}
                  </p>
                )}
                {ghostFootprint.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {ghostFootprint.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-4 bg-[#080D18] border border-amber-500/25 rounded-xl space-y-2 print:bg-white print:border print:border-black"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[10px] font-bold">
                            {item.assetType}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            [BARATRUST_REVIEW]
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white print:text-black">
                          {item.summary}
                        </p>
                        {item.customerImpact && (
                          <p className="text-[11px] text-slate-400 print:text-slate-700">
                            <strong className="text-slate-300 print:text-black">Impact:</strong> {item.customerImpact}
                          </p>
                        )}
                        {item.recommendedFix && (
                          <p className="text-[11px] text-amber-300 font-mono print:text-black">
                            <strong>Cleanup action:</strong> {item.recommendedFix}
                          </p>
                        )}
                        <EvidenceCitationRow
                          evidence={{
                            source: item.source,
                            sourceUrl: item.sourceUrl,
                            note: item.evidenceNote,
                            observedAt: item.observedAt,
                            clientVisible: item.clientVisible,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 6. Opportunities We Found (Dynamic Opportunities) */}
        {opportunities.length > 0 && (
          <section className="bg-[#0E1524] border border-emerald-500/30 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl print:bg-white print:border print:border-black">
            <div className="border-b border-slate-800 pb-4 print:border-black">
              <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold rounded">
                [OPPORTUNITY_FOUND] CONCRETE GROWTH LEVERS
              </span>
              <h3 className="text-2xl font-bold font-serif text-white mt-1 print:text-black">
                Growth Levers We Identified
              </h3>
              <p className="text-xs text-slate-400 mt-1 print:text-slate-600">
                Specific opportunities Todd & Noelah discovered that could add revenue or reduce waste.
              </p>
            </div>

            {reportContent?.opportunitiesSummary && (
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal print:text-black">
                {reportContent.opportunitiesSummary}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunities.map((opp, idx) => (
                <div
                  key={opp.id || idx}
                  className="p-5 bg-[#080D18] border border-emerald-500/20 rounded-xl space-y-3 print:bg-white print:border print:border-black"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                      {opp.type}
                    </span>
                    {opp.potentialImpact && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Impact: <strong className="text-white print:text-black">{opp.potentialImpact}</strong>
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-white text-base font-serif print:text-black">
                    {opp.title}
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed font-normal print:text-black">
                    {opp.description}
                  </p>

                  {opp.suggestedAction && (
                    <div className="pt-2 text-xs font-mono text-emerald-400 border-t border-slate-800/80 print:text-black print:border-slate-300">
                      <strong>Next step:</strong> {opp.suggestedAction}
                    </div>
                  )}

                  <EvidenceCitationRow evidence={opp.evidence} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7. Supporting Technical Scanner Diagnostics (Collapsible / Secondary) */}
        <section className="bg-[#0A101D] border border-slate-800 rounded-2xl p-6 space-y-4 print:hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                [AUTO_DETECTED] SUPPORTING EVIDENCE
              </span>
              <h4 className="text-lg font-bold text-white font-serif">
                {check.scoreBreakdown?.sourceType === "hosted_profile"
                  ? `Automated Public Profile Audit (${findings.length} Checks)`
                  : `Automated Technical Audit (${findings.length} Checks)`}
              </h4>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {findings.length} Checks Run
            </span>
          </div>
          <p className="text-xs text-slate-400">
            These automated code, speed, and findability probes provide baseline technical facts for our review.
          </p>

          <div className="space-y-2 pt-2 max-h-[400px] overflow-y-auto pr-1 text-xs">
            {findings.map((rawFinding) => {
              let resolvedTitle = decodeHtmlEntities(rawFinding.title);
              let resolvedDetail = decodeHtmlEntities(rawFinding.supportingDetail || "");
              const platformLabel =
                check.scoreBreakdown?.platformLabel || "hosted business profile";

              if (rawFinding.checkKey === "profile_category_or_services") {
                const quotedMatch = resolvedDetail.match(/:\s*"([\s\S]+)"\.?$/);
                if (rawFinding.state === "PASS" && quotedMatch?.[1]) {
                  const classified = classifyProfileSummaryText(quotedMatch[1]);
                  if (classified?.kind === "category") {
                    resolvedTitle = "Business Category";
                    resolvedDetail = `Business category detected on ${platformLabel}: "${classified.text}".`;
                  } else if (classified?.kind === "description") {
                    resolvedTitle = "Business Description / Offerings Signal";
                    resolvedDetail = `Public description or offerings signal detected on ${platformLabel}: "${classified.text}"${
                      classified.text.endsWith("…") ? "" : "."
                    }`;
                  }
                } else if (resolvedTitle === "Business Category & Offerings Summary") {
                  resolvedTitle =
                    rawFinding.state === "PASS"
                      ? "Business Description / Offerings Signal"
                      : "Business Category / Offerings Signal";
                }
              }

              const isInformationalFinding = check.scoreBreakdown?.sourceType !== "hosted_profile" && (rawFinding.maxPoints ?? 1) === 0;
              const isInfoObserved =
                isInformationalFinding &&
                rawFinding.state === "PASS" &&
                !/^no\s/i.test(resolvedDetail.trim());
              const findingBadgeLabel = isInformationalFinding
                ? isInfoObserved
                  ? "INFO · OBSERVED"
                  : "INFO · NOT OBSERVED"
                : rawFinding.state;
              const findingBadgeClass = isInformationalFinding
                ? isInfoObserved
                  ? "bg-blue-500/10 text-blue-300 border border-blue-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
                : rawFinding.state === "PASS"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : rawFinding.state === "FAIL"
                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700";

              return (
              <div
                key={rawFinding.id || rawFinding.checkKey}
                className="p-3 bg-[#080D18] border border-slate-800/80 rounded-lg flex items-start justify-between gap-4"
              >
                <div>
                  <span className="font-semibold text-slate-200">{resolvedTitle}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{resolvedDetail}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold flex-shrink-0 ${findingBadgeClass}`}
                >
                  {findingBadgeLabel}
                </span>
              </div>
              );
            })}
          </div>
        </section>

        {/* 8. Final Note & Low-Pressure Call to Action */}
        <section className="bg-[#0E1524] border border-slate-800 rounded-2xl p-8 md:p-10 space-y-6 text-center shadow-xl print:bg-white print:border print:border-black">
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl font-bold font-serif text-white print:text-black">
              Want Help Fixing Any of This?
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed font-normal print:text-black">
              {reportContent?.closingNote || "We hope this Reality Check gives you a clear, objective look at your business from the outside in. If you want a hand knocking any of these items out, let us know. If you prefer to handle them yourself, the plan is entirely yours."}
            </p>

            <div className="p-4 bg-[#080D18] border border-slate-800 rounded-xl text-xs text-slate-400 leading-relaxed max-w-lg mx-auto print:hidden">
              🔒 <strong>Low-pressure guarantee:</strong> BaraTrust is a small business growth partner, not an aggressive sales agency. No spam, no high-pressure pitch decks.
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 print:hidden">
              <a
                href={`mailto:todd@baratrust.com?subject=${encodeURIComponent(
                  `Reality Check Follow-up for ${check.businessName || check.website || "My Business"}`
                )}`}
                className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span>Talk with Todd Directly</span>
              </a>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3.5 bg-[#080D18] hover:bg-[#121A2B] border border-slate-700 text-slate-300 font-bold rounded-lg text-sm transition-colors text-center"
              >
                Back to BaraTrust Home
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 bg-[#04070D] print:hidden">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <p>© 2026 BaraTrust. Practical operations & growth partner for small businesses.</p>
          <div className="flex gap-4">
            <span>todd@baratrust.com</span>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-300">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

function toSafeExternalHref(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function EvidenceCitationRow({ evidence }: { evidence?: HumanEvidenceCitation | null }) {
  if (!evidence || evidence.clientVisible !== true) return null;
  const source = evidence.source?.trim() || "";
  const safeHref = toSafeExternalHref(evidence.sourceUrl);
  const note = evidence.note?.trim() || "";
  const observedAt = evidence.observedAt?.trim() || "";
  if (!source && !safeHref && !note) return null;

  return (
    <div className="pt-1.5 text-[11px] font-mono text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 print:text-slate-700">
      <span className="text-slate-500 print:text-black">Evidence:</span>
      {source && (
        safeHref ? (
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline inline-flex items-center gap-1 print:text-black"
          >
            <span>{source}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        ) : (
          <span className="text-slate-300 print:text-black">{source}</span>
        )
      )}
      {!source && safeHref && (
        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 hover:underline inline-flex items-center gap-1 print:text-black"
        >
          <span>Source Link</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
      {note && <span className="text-slate-300 italic print:text-black">— &quot;{note}&quot;</span>}
      {observedAt && <span className="text-slate-500 text-[10px]">({observedAt})</span>}
    </div>
  );
}
