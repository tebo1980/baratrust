"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  FileText, 
  RefreshCw,
  TrendingUp,
  PhoneCall,
  DollarSign,
  Sliders,
  Check
} from "lucide-react";

interface ScanSummary {
  realityCheckId: string;
  shareToken: string;
  scanStatus: 'completed' | 'failed' | 'blocked' | 'timeout';
  overallScore: number | null;
  overallCoverage?: number;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  scoreBreakdown: {
    digitalPresence: number | null;
    customerJourney: number | null;
    trustReputation: number | null;
    localDiscovery: number | null;
    opportunityCapture: number | null;
    coverage?: {
      overall: number;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
      digitalPresence: number;
      customerJourney: number;
      trustReputation: number;
      localDiscovery: number;
      opportunityCapture: number;
    };
  } | null;
  findingsCount: number;
}

export default function RealityCheckPage() {
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = e.target as HTMLFormElement;
    if (!form.reportValidity()) return;
    
    setPending(true);
    setErrorMsg("");

    const formData = new FormData(form);
    const payload = {
      businessName: formData.get("business")?.toString().trim() || "",
      website: formData.get("website")?.toString().trim() || "",
      cityState: formData.get("city")?.toString().trim() || "",
      ownerName: formData.get("name")?.toString().trim() || "",
      email: formData.get("email")?.toString().trim() || "",
      phone: formData.get("phone")?.toString().trim() || null,
      businessType: formData.get("business_type")?.toString().trim() || null,
      primaryHeadache: formData.get("problem")?.toString().trim() || null,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 28000);

    try {
      const response = await fetch("/api/reality-check", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Submission could not be completed.");
      }

      setScanSummary({
        realityCheckId: result.realityCheckId,
        shareToken: result.shareToken,
        scanStatus: result.scanStatus,
        overallScore: result.overallScore,
        scoreBreakdown: result.scoreBreakdown,
        findingsCount: result.findingsCount || 0,
      });

      // Scroll smoothly to top of results
      window.scrollTo({ top: 120, behavior: 'smooth' });

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setErrorMsg("The scan took longer than expected. Your submission has been received and queued for manual human review.");
      } else {
        setErrorMsg(err.message || "We couldn't confirm your request. Please try again or email todd@baratrust.com directly.");
      }
    } finally {
      clearTimeout(timeout);
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 font-sans selection:bg-amber-500/30">

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#080F1A]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <span className="text-amber-400 font-bold text-lg font-serif">B</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-serif">
              Bara<span className="text-amber-400">Trust</span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-slate-400 hover:text-slate-200 transition-colors hidden sm:block">
              ← Back to Overview
            </Link>
            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-mono text-amber-400 font-bold">
              100% FREE DIAGNOSTIC
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-16 space-y-16">

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Objective Diagnostic + Human Review
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white font-serif leading-tight">
            The BaraTrust <br className="hidden sm:block" />
            <span className="text-amber-400">Business Reality Check</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-normal">
            Give us your business and website. We&apos;ll show you what&apos;s working, what&apos;s getting in the way, and where we&apos;d look first.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Free — Zero Cost
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" /> Human review within one business day
            </span>
          </div>
        </div>

        {/* Two Column Grid: Form OR Scan Results & Explanations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* Left Column (7 cols): Either the Form or the Live Diagnostic Summary */}
          <div className="lg:col-span-7 bg-[#0E1524] border border-slate-800 rounded-2xl p-8 md:p-10 shadow-2xl space-y-6">

            {scanSummary ? (
              /* POST-SCAN SUMMARY CARD */
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-5">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full font-mono text-xs font-bold uppercase">
                      ✓ Request Confirmed & Queued
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ID: {scanSummary.shareToken.substring(0, 8)}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white font-serif mt-3">
                    Your Reality Check is underway.
                  </h2>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    We&apos;ve completed the automated technical scan and logged your business in our system. Todd and Noelah will personally review your local findability, reputation, and competitors next.
                  </p>
                </div>

                {/* Score or Queued Notice */}
                {scanSummary.overallScore !== null ? (
                  <div className="bg-[#080E1C] border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block">Initial Automated Score</span>
                        <span className="text-4xl md:text-5xl font-bold text-amber-400 font-serif">
                          {scanSummary.overallScore} <span className="text-lg text-slate-500 font-mono font-normal">/ 100</span>
                        </span>
                      </div>
                      <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-mono rounded">
                        {scanSummary.confidence === 'HIGH' ? '[VERIFIED COVERAGE]' : `[${scanSummary.confidence || 'PROVISIONAL'} - ${scanSummary.overallCoverage ?? 0}% COVERAGE]`}
                      </span>
                    </div>

                    {scanSummary.scoreBreakdown && (
                      <div className="space-y-3 pt-4 border-t border-slate-800/80">
                        <CategoryProgress 
                          label="Digital Presence (20%)" 
                          score={scanSummary.scoreBreakdown.digitalPresence} 
                          coverage={scanSummary.scoreBreakdown.coverage?.digitalPresence}
                        />
                        <CategoryProgress 
                          label="Customer Journey (25%)" 
                          score={scanSummary.scoreBreakdown.customerJourney} 
                          coverage={scanSummary.scoreBreakdown.coverage?.customerJourney}
                        />
                        <CategoryProgress 
                          label="Trust & Reputation (20%)" 
                          score={scanSummary.scoreBreakdown.trustReputation} 
                          coverage={scanSummary.scoreBreakdown.coverage?.trustReputation}
                        />
                        <CategoryProgress 
                          label="Local Discovery (20%)" 
                          score={scanSummary.scoreBreakdown.localDiscovery} 
                          coverage={scanSummary.scoreBreakdown.coverage?.localDiscovery}
                        />
                        <CategoryProgress 
                          label="Opportunity Capture (15%)" 
                          score={scanSummary.scoreBreakdown.opportunityCapture} 
                          coverage={scanSummary.scoreBreakdown.coverage?.opportunityCapture}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#080E1C] border border-amber-500/30 rounded-xl p-6 space-y-2">
                    <h3 className="font-bold text-amber-400 text-base">Human Review Queued</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Your website has bot/firewall protections active, so our automated probe gracefully deferred testing. Todd and Noelah will run your diagnostic directly by hand so no finding is missed.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-[#0A101D] border border-slate-800 rounded-xl space-y-3 text-xs text-slate-400">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" /> What happens next?
                  </h4>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>Todd and Noelah conduct the manual findability test and competitor comparison.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>We prepare your <strong>Top 3 Things to Fix</strong> and <strong>What NOT to Spend Money On</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>Your full human-reviewed report will arrive in your email within <strong>one business day</strong>.</span>
                    </li>
                  </ul>
                </div>

                {/* Step 2 Questionnaire Invitation */}
                <div className="p-5 bg-gradient-to-r from-purple-950/30 to-[#0A101D] border border-purple-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold rounded">
                      [OWNER PROVIDED] • OPTIONAL STEP 2
                    </span>
                    <span className="text-xs text-slate-400 font-mono">~2 minutes</span>
                  </div>
                  <h4 className="font-bold text-white text-base font-serif">
                    Tell Todd & Noelah what the website can&apos;t see
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Our scanner checked your code and speed. Answering 8 quick operational questions helps Todd and Noelah find missed calls, lost quotes, and hidden revenue leaks in your review.
                  </p>
                  <Link
                    href={`/reality-check/${scanSummary.shareToken}/questionnaire`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition-colors shadow-md"
                  >
                    Open 2-Minute Owner Questionnaire <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/"
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition-colors text-center shadow-lg"
                  >
                    Return to Homepage
                  </Link>
                  <a
                    href="mailto:todd@baratrust.com"
                    className="w-full py-3.5 bg-[#080D18] hover:bg-[#121A2B] border border-slate-700 text-slate-300 font-bold rounded-lg text-sm transition-colors text-center"
                  >
                    Have Questions? Email Todd
                  </a>
                </div>
              </div>
            ) : (
              /* INTAKE FORM */
              <>
                <div className="border-b border-slate-800 pb-5">
                  <h2 className="text-2xl font-bold text-white font-serif">Tell us about your business.</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Start with the basics. We&apos;ll save your submission first, run the automated checks, and then give you the option to answer a few extra questions so Todd and Noelah have more context.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">
                      Business Name <span className="text-amber-400">*</span>
                    </label>
                    <input
                      name="business"
                      type="text"
                      required
                      placeholder="e.g., Henderson Heating & Air, Main Street Bistro"
                      className="w-full px-4 py-3 bg-[#080d18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">
                        Website or Social URL <span className="text-amber-400">*</span>
                      </label>
                      <input
                        name="website"
                        type="text"
                        required
                        placeholder="e.g., yourbusiness.com"
                        className="w-full px-4 py-3 bg-[#080d18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">
                        City & State <span className="text-amber-400">*</span>
                      </label>
                      <input
                        name="city"
                        type="text"
                        required
                        placeholder="e.g., New Albany, IN or Louisville, KY"
                        className="w-full px-4 py-3 bg-[#080d18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">
                        Owner / Contact Name <span className="text-amber-400">*</span>
                      </label>
                      <input
                        name="name"
                        type="text"
                        required
                        placeholder="Your name"
                        className="w-full px-4 py-3 bg-[#080d18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">
                        Email Address <span className="text-amber-400">*</span>
                      </label>
                      <input
                        name="email"
                        type="email"
                        required
                        placeholder="Where to send your report"
                        className="w-full px-4 py-3 bg-[#080d18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">
                        Phone (Optional)
                      </label>
                      <input
                        name="phone"
                        type="tel"
                        placeholder="For SMS report notification"
                        className="w-full px-4 py-3 bg-[#080d18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">
                        Industry / Business Type
                      </label>
                      <input
                        name="business_type"
                        type="text"
                        placeholder="e.g. Contractor, Retailer, Restaurant"
                        className="w-full px-4 py-3 bg-[#080d18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">
                      What is your biggest operational headache right now? (Optional)
                    </label>
                    <textarea
                      name="problem"
                      rows={3}
                      placeholder="e.g., Missed calls when we're on the job, stale quotes nobody followed up on, creeping software costs, messy customer lists..."
                      className="w-full px-4 py-3 bg-[#080d18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-base transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {pending ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Scanning Your Business (5-10 sec)...
                      </>
                    ) : (
                      <>
                        Start My Free Reality Check <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  {errorMsg && (
                    <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <p className="text-[12px] text-slate-400 font-mono text-center leading-relaxed">
                    No payment. No obligation. Your human-reviewed report is delivered directly from Todd and Noelah within one business day.
                  </p>
                </form>
              </>
            )}

          </div>

          {/* Right Column: Explaining the 5 Categories & Evidence Tags (5 cols) */}
          <div className="lg:col-span-5 space-y-6">

            <div className="bg-[#0A101D] border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                The 5 Areas We Grade (0 to 100)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                We measure observable, real-world factors. No made-up buzzwords or invented internal metrics.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3 bg-[#0e1628] border border-slate-800/80 rounded-lg flex items-start gap-3">
                  <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                    20%
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Digital Presence</h4>
                    <p className="text-xs text-slate-400">Mobile responsiveness, load speed, security, and baseline health.</p>
                  </div>
                </div>

                <div className="p-3 bg-[#0e1628] border border-slate-800/80 rounded-lg flex items-start gap-3">
                  <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                    25%
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Customer Journey</h4>
                    <p className="text-xs text-slate-400">Tap-to-call links, easy quote forms, visible hours, and contact friction.</p>
                  </div>
                </div>

                <div className="p-3 bg-[#0e1628] border border-slate-800/80 rounded-lg flex items-start gap-3">
                  <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                    20%
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Trust & Reputation</h4>
                    <p className="text-xs text-slate-400">Google reviews, customer testimonials, team visibility, and address clarity.</p>
                  </div>
                </div>

                <div className="p-3 bg-[#0e1628] border border-slate-800/80 rounded-lg flex items-start gap-3">
                  <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                    20%
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Local Discovery</h4>
                    <p className="text-xs text-slate-400">Google Business Profile, local schema markup, and AI search findability.</p>
                  </div>
                </div>

                <div className="p-3 bg-[#0e1628] border border-slate-800/80 rounded-lg flex items-start gap-3">
                  <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                    15%
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Opportunity Capture</h4>
                    <p className="text-xs text-slate-400">After-hours lead safeguards, follow-up readiness, and lost revenue traps.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence Tagging Principle */}
            <div className="bg-[#0A101D] border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Evidence-Based Reporting
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every observation in your report is tagged with its source so you know exactly where it comes from:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded">
                  [AUTO DETECTED]
                </span>
                <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded">
                  [OWNER PROVIDED]
                </span>
                <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded">
                  [BARATRUST REVIEW]
                </span>
                <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded">
                  [OPPORTUNITY FOUND]
                </span>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-10 bg-[#04070D]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-mono">
          <p>© 2026 BaraTrust. Practical operations & growth partner for small businesses.</p>
          <div className="flex gap-6">
            <a href="mailto:todd@baratrust.com" className="hover:text-amber-400 transition-colors">todd@baratrust.com</a>
            <Link href="/terms" className="hover:text-slate-200 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

function CategoryProgress({ label, score, coverage }: { label: string; score: number | null; coverage?: number }) {
  const isEvaluable = score !== null;
  return (
    <div>
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="font-bold text-amber-400">
          {isEvaluable ? `${score}%` : 'Pending Review'}
          {coverage !== undefined && (
            <span className="text-slate-500 font-normal ml-2">({coverage}% coverage)</span>
          )}
        </span>
      </div>
      <div className="w-full h-2 bg-[#050810] border border-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${isEvaluable ? 'bg-amber-500' : 'bg-slate-700'}`} 
          style={{ width: `${isEvaluable ? Math.min(100, Math.max(0, score)) : 0}%` }}
        />
      </div>
    </div>
  );
}