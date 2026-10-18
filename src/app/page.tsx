"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  PhoneCall, 
  DollarSign, 
  Sliders, 
  Sparkles, 
  Clock, 
  FileText, 
  Camera, 
  Video, 
  Search, 
  BookOpen, 
  Laptop, 
  Check,
  AlertCircle,
  RefreshCw,
  Users,
  Wrench,
  Music,
  LayoutGrid
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

const CapybaraLogo = () => (
  <svg className="w-8 h-8 hover:scale-105 transition-transform" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 40 Q25 20 50 20 Q80 20 85 45 Q90 60 85 75 Q80 90 60 90 L30 90 Q15 90 15 75 L15 55 Q15 40 25 40 Z" fill="#D97706" />
    <path d="M85 45 Q95 45 95 60 Q95 70 85 75 Z" fill="#B45309" />
    <rect x="10" y="38" width="85" height="14" rx="2" fill="#09090B" />
    <path d="M20 52 L40 52 L35 65 L25 65 Z" fill="#09090B" />
    <path d="M55 52 L75 52 L70 65 L60 65 Z" fill="#09090B" />
    <line x1="22" y1="42" x2="38" y2="42" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
    <line x1="57" y1="42" x2="73" y2="42" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
    <circle cx="90" cy="55" r="2.5" fill="#451A03" />
  </svg>
);

export default function LandingPage() {
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
          "Accept": "application/json",
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
        overallCoverage: result.overallCoverage,
        confidence: result.confidence,
        scoreBreakdown: result.scoreBreakdown,
        findingsCount: result.findingsCount || 0,
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        setErrorMsg("The scan took longer than expected. Your submission has been received and queued for human review by Todd and Noelah.");
      } else {
        setErrorMsg(err.message || "We couldn't confirm your request. Please try again or email todd@baratrust.com directly.");
      }
    } finally {
      clearTimeout(timeout);
      setPending(false);
    }
  };

  return (
    <div id="top" className="min-h-screen bg-[#050810] text-slate-100 font-sans selection:bg-amber-500/30">

      {/* Header & Navigation */}
      <header className="border-b border-slate-800/80 bg-[#080F1A]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <CapybaraLogo />
            <span className="text-xl font-bold tracking-tight text-white font-serif">
              Bara<span className="text-amber-400">Trust</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#pillars" className="hover:text-amber-400 transition-colors">
              What We Help With
            </a>
            <a href="#how-it-works" className="hover:text-amber-400 transition-colors">
              How It Works
            </a>
            <a href="#who" className="hover:text-amber-400 transition-colors">
              Who It&apos;s For
            </a>
            <a href="#reality-check" className="hover:text-amber-400 transition-colors">
              Free Reality Check
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <a
              href="#start"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 shadow-md"
            >
              Get Your Free Reality Check <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="space-y-24 md:space-y-32">

        {/* 1. HERO */}
        <section className="pt-16 md:pt-24 px-6">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Human Judgment. AI Leverage. Real Execution.
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white font-serif leading-[1.08]">
              Run your business.<br />
              <span className="text-amber-400">We&apos;ll help with the rest.</span>
            </h1>

            <p className="text-xl md:text-2xl text-white font-medium max-w-3xl mx-auto leading-relaxed">
              Get more customers. Lose fewer opportunities. Cut unnecessary costs. Automate the busywork.
            </p>

            <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
              BaraTrust helps small businesses find what&apos;s leaking time, money, or customers — and fix the problems that actually matter, with Todd and Noelah reviewing the work.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#start"
                className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base rounded-xl transition-all shadow-xl hover:shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                Get Your Free Reality Check <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#pillars"
                className="w-full sm:w-auto px-8 py-4 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2"
              >
                See What We Can Help With
              </a>
            </div>

            <p className="text-xs text-slate-400 font-mono pt-2">
              Free. No credit card. No giant sales pitch.
            </p>
          </div>
        </section>

        {/* 2. PROBLEM SECTION */}
        <section className="px-6">
          <div className="max-w-6xl mx-auto bg-[#0A101E] border border-slate-800 rounded-3xl p-8 md:p-14 shadow-2xl relative overflow-hidden space-y-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 blur-3xl rounded-full pointer-events-none"></div>

            <div className="max-w-3xl space-y-3">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                The Real Bottleneck
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white font-serif leading-tight">
                Small businesses usually don&apos;t have one big problem.
              </h2>
              <p className="text-slate-300 text-lg md:text-xl leading-relaxed">
                They have ten little ones quietly costing time and money.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Customers can’t easily find or trust you online",
                "Calls, messages, or quote requests fall through the cracks",
                "Past leads and old quotes never get followed up",
                "Websites or social pages look outdated or unclear",
                "Repeat work gets done the hard way every week",
                "Suppliers, tools, or monthly services cost more than they should",
                "Good growth opportunities sit untouched because nobody has time",
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-[#0e1628] border border-slate-800/80 rounded-xl flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">{item}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-lg md:text-xl font-serif font-bold text-amber-400">
                We start with the leaks that matter most.
              </p>
            </div>
          </div>
        </section>

        {/* 3. WHY BARATRUST */}
        <section className="px-6">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="max-w-3xl space-y-3">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                Why BaraTrust
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white font-serif">
                A practical partner for the work you don&apos;t have time for.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-7 bg-[#0B1220] border border-slate-800 rounded-2xl space-y-3">
                <h3 className="text-xl font-bold text-white font-serif">Built for small businesses</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  No enterprise jargon. No agency smoke. No software you have to learn on nights and weekends.
                </p>
              </div>

              <div className="p-7 bg-[#0B1220] border border-slate-800 rounded-2xl space-y-3">
                <h3 className="text-xl font-bold text-white font-serif">Keep what already works</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  If something is already working, we don&apos;t tear it up just to sell you a new package.
                </p>
              </div>

              <div className="p-7 bg-[#0B1220] border border-slate-800 rounded-2xl space-y-3">
                <h3 className="text-xl font-bold text-white font-serif">Human judgment. AI leverage.</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  We use modern tools to research, create, organize, and automate faster — with Todd and Noelah reviewing what goes out.
                </p>
              </div>

              <div className="p-7 bg-[#0B1220] border border-amber-500/30 rounded-2xl space-y-3">
                <h3 className="text-xl font-bold text-amber-400 font-serif">Practical help</h3>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  If it doesn&apos;t help make money, save money, save time, or make the business easier to run, it probably isn&apos;t the priority.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. FOUR CORE OUTCOME AREAS */}
        <section id="pillars" className="px-6 scroll-mt-24">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                What We Can Help With
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white font-serif">
                Four core outcome areas.
              </h2>
              <p className="text-slate-300 text-base md:text-lg">
                We organize our work around real business outcomes — not rigid packages or bloated retainers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Outcome 1 */}
              <div className="bg-[#0D1424] border border-slate-800 rounded-2xl p-8 space-y-5 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-widest">01</span>
                </div>
                <h3 className="text-2xl font-bold text-white font-serif">
                  Get More Customers
                </h3>
                <ul className="space-y-2.5 text-sm text-slate-300 pt-2 border-t border-slate-800/80">
                  {[
                    "Local visibility and search presence",
                    "Cleaner websites, landing pages, or online stores",
                    "Better offers and promotional campaigns",
                    "Social content that looks alive and credible",
                    "Short-form video, commercials, graphics, and product visuals",
                    "Local lead or account research",
                    "Catering, wholesale, B2B, or neighborhood opportunities",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Outcome 2 */}
              <div className="bg-[#0D1424] border border-slate-800 rounded-2xl p-8 space-y-5 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <PhoneCall className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-400 uppercase tracking-widest">02</span>
                </div>
                <h3 className="text-2xl font-bold text-white font-serif">
                  Lose Fewer Opportunities
                </h3>
                <ul className="space-y-2.5 text-sm text-slate-300 pt-2 border-t border-slate-800/80">
                  {[
                    "Missed-call and inquiry follow-up",
                    "Quote and estimate follow-up",
                    "Simpler contact and lead-capture paths",
                    "Online ordering or booking improvements",
                    "Catering, special-order, and large-job inquiry capture",
                    "Dormant-customer reactivation",
                    "Customer journey improvements",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Outcome 3 */}
              <div className="bg-[#0D1424] border border-slate-800 rounded-2xl p-8 space-y-5 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-widest">03</span>
                </div>
                <h3 className="text-2xl font-bold text-white font-serif">
                  Cut Unnecessary Costs
                </h3>
                <ul className="space-y-2.5 text-sm text-slate-300 pt-2 border-t border-slate-800/80">
                  {[
                    "Supplier and vendor research",
                    "Software and subscription cleanup",
                    "Fee and service comparisons",
                    "Process waste",
                    "Unnecessary marketing spend",
                    "Tools you pay for but barely use",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Outcome 4 */}
              <div className="bg-[#0D1424] border border-slate-800 rounded-2xl p-8 space-y-5 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-xs font-bold text-purple-400 uppercase tracking-widest">04</span>
                </div>
                <h3 className="text-2xl font-bold text-white font-serif">
                  Automate the Busywork
                </h3>
                <ul className="space-y-2.5 text-sm text-slate-300 pt-2 border-t border-slate-800/80">
                  {[
                    "SOPs from videos, photos, or rough notes",
                    "Onboarding and training materials",
                    "Checklists and repeatable internal processes",
                    "Follow-up workflows",
                    "Recurring reporting and reminders",
                    "Customer-data and spreadsheet cleanup",
                    "Repetitive admin task automation",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* 5. CAPABILITIES SECTION */}
        <section className="px-6">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="max-w-3xl space-y-3">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                Real Execution
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white font-serif leading-tight">
                We find the problem first. Then we decide whether anything actually needs to be built.
              </h2>
              <p className="text-slate-300 text-base md:text-lg leading-relaxed">
                When your business does need something built, fixed, or produced, we handle the execution directly:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Laptop, title: "Websites and ecommerce pages", desc: "Clean, fast pages built around customer action and easy contact." },
                { icon: Video, title: "Commercials and promotional videos", desc: "Clear local spots and brand videos ready for web and social." },
                { icon: Sparkles, title: "Short-form social video", desc: "Practical reels and clips that show your real work and stay credible." },
                { icon: LayoutGrid, title: "Social media graphics and campaigns", desc: "Cohesive visuals, offers, and local promotions." },
                { icon: Camera, title: "Virtual product photography", desc: "Turning everyday phone photos into clean product or job visuals." },
                { icon: Music, title: "Audio ads and jingles", desc: "Memorable local audio spots and custom brand jingles." },
                { icon: BookOpen, title: "SOPs and training materials", desc: "Step-by-step guides created from walkthrough videos or rough notes." },
                { icon: Search, title: "Lead research and outreach lists", desc: "Targeted research for commercial accounts, catering, or B2B partnerships." },
                { icon: Wrench, title: "Workflow automation", desc: "Connecting forms, follow-ups, spreadsheets, and reminders so less slips through." },
              ].map((cap, idx) => {
                const Icon = cap.icon;
                return (
                  <div key={idx} className="p-5 bg-[#0A101E] border border-slate-800 rounded-xl space-y-2">
                    <Icon className="w-5 h-5 text-amber-400" />
                    <h4 className="font-bold text-sm text-white">{cap.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{cap.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 6. HOW IT WORKS (4-STEP FLOW) */}
        <section id="how-it-works" className="px-6 scroll-mt-24">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                How It Works
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white font-serif">
                Start with clarity. Decide what happens next.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-[#0B1220] border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-mono font-bold text-sm">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-white font-serif">1. Free Reality Check</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tell us who you are, share your website, and answer a few optional questions. Our system checks your public web presence first, then Todd and Noelah review the business like a real customer and operator would.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-[#0B1220] border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-mono font-bold text-sm">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-white font-serif">2. We Look Deeper</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    We check findability, customer experience, missed opportunities, competitors, reputation patterns, social presence, and practical growth opportunities.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-[#0B1220] border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-mono font-bold text-sm">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-white font-serif">3. You Get the Priorities</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    You receive a clear BaraTrust Reality Check showing:
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-200 font-medium pt-1">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> What&apos;s working</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> What&apos;s getting in the way</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400" /> Top 3 things we&apos;d fix first</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Opportunities we found</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-rose-400" /> What we would NOT spend money on</li>
                  </ul>
                </div>
              </div>

              <div className="p-6 bg-[#0B1220] border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-mono font-bold text-sm">
                    4
                  </div>
                  <h3 className="text-xl font-bold text-white font-serif">4. You Decide What Happens Next</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Take the report and fix things yourself. Hire somebody else. Or ask BaraTrust to help. No obligation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. WHO IT'S FOR */}
        <section id="who" className="px-6 scroll-mt-24">
          <div className="max-w-5xl mx-auto bg-[#0A101E] border border-slate-800 rounded-3xl p-8 md:p-14 space-y-8 shadow-2xl">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                Who It&apos;s For
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white font-serif">
                Small businesses that are too busy to become tech companies.
              </h2>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {[
                "Contractors",
                "Restaurants",
                "Retailers",
                "Local service businesses",
                "Makers",
                "Trades",
                "Independent operators",
                "Small teams wearing ten hats",
              ].map((group, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 bg-[#0E1628] border border-slate-700/80 rounded-full text-xs md:text-sm font-medium text-slate-200"
                >
                  {group}
                </span>
              ))}
            </div>

            <div className="p-6 md:p-8 bg-[#070D18] border-l-4 border-amber-400 rounded-r-2xl space-y-3">
              <p className="text-lg md:text-2xl font-serif italic text-white leading-relaxed">
                &ldquo;I know some of this probably needs fixed. I just don&apos;t have time to figure out what matters.&rdquo;
              </p>
              <p className="text-sm md:text-base font-bold text-amber-400">
                That&apos;s exactly who BaraTrust is built for.
              </p>
            </div>
          </div>
        </section>

        {/* 8. NO AI HOMEWORK */}
        <section className="px-6">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#0B1220] to-[#070D18] border border-slate-800 rounded-3xl p-8 md:p-14 space-y-6 shadow-2xl">
            <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
              No AI Homework
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white font-serif">
              We use modern tools. You don&apos;t have to.
            </h2>
            <div className="space-y-4 text-slate-300 text-base md:text-lg leading-relaxed max-w-3xl">
              <p>
                AI helps BaraTrust research faster, organize information, create content, analyze patterns, and automate repetitive work.
              </p>
              <p>
                But BaraTrust is human-led. Todd and Noelah review the work, make the judgment calls, and stay accountable for what is recommended.
              </p>
            </div>
            <p className="text-xl md:text-2xl font-serif font-bold text-amber-400 pt-2">
              You run the business. We use the tools.
            </p>
          </div>
        </section>

        {/* 9. FREE REALITY CHECK SECTION */}
        <section id="reality-check" className="px-6 scroll-mt-24">
          <div className="max-w-6xl mx-auto bg-gradient-to-br from-[#0F1728] to-[#0A101D] border-2 border-amber-500/30 rounded-3xl p-8 md:p-14 shadow-2xl space-y-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider rounded-md">
                  100% Free. No Credit Card Required.
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white font-serif">
                  Start With the Free Business Reality Check
                </h2>
                <p className="text-slate-200 text-lg md:text-xl font-medium leading-relaxed">
                  Not sure what your business actually needs? That&apos;s the point. Start with the Reality Check.
                </p>
              </div>

              <div className="flex-shrink-0">
                <a
                  href="#start"
                  className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-base rounded-xl transition-all shadow-xl flex items-center gap-2"
                >
                  Get My Free Reality Check <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-800">
              <div className="p-6 bg-[#080E1C] border border-slate-800 rounded-2xl space-y-3">
                <h3 className="text-lg font-bold text-white font-serif">What the Reality Check includes</h3>
                <ul className="space-y-2.5 text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                    <span>Automated website and digital-presence checks</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                    <span>Optional owner context questionnaire</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                    <span>Human review by Todd and Noelah</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                    <span>Competitor and findability look</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-[#080E1C] border border-slate-800 rounded-2xl space-y-3">
                <h3 className="text-lg font-bold text-white font-serif">Clear priorities in plain English</h3>
                <ul className="space-y-2.5 text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                    <span><strong>What&apos;s working</strong> — keep what already serves you well</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                    <span><strong>What&apos;s getting in the way</strong> — where customers or time leak out</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                    <span><strong>Top 3 things we&apos;d fix first</strong> — highest-impact next steps</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-rose-400 mt-1 flex-shrink-0" />
                    <span><strong>What we would NOT spend money on</strong> — candid advice to protect your budget</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-5 bg-[#070D18] border border-slate-800 rounded-xl text-sm text-slate-300 leading-relaxed">
              If you want help after the report, we scope the work clearly based on what your business actually needs — whether that&apos;s a focused fix, a build project, or ongoing help.
            </div>
          </div>
        </section>

        {/* 10. INTAKE SECTION */}
        <section id="start" className="px-6 pb-20 scroll-mt-24">
          <div className="max-w-4xl mx-auto bg-[#0E1524] border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl space-y-8">
            {scanSummary ? (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-5">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full font-mono text-xs font-bold uppercase">
                      ✓ Submission Saved & Scan Complete
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ID: {scanSummary.shareToken.substring(0, 8)}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white font-serif mt-3">
                    Your Reality Check is underway.
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                    We&apos;ve saved your submission and completed the initial automated checks. Todd and Noelah will personally review your local findability, reputation, and competitors next.
                  </p>
                </div>

                {scanSummary.overallScore !== null ? (
                  <div className="bg-[#080E1C] border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block">Initial Automated Score</span>
                      <span className="text-4xl font-bold text-amber-400 font-serif">
                        {scanSummary.overallScore} <span className="text-lg text-slate-500 font-mono font-normal">/ 100</span>
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-mono rounded self-start sm:self-center">
                      {scanSummary.confidence === "HIGH"
                        ? "[VERIFIED COVERAGE]"
                        : `[${scanSummary.confidence || "PROVISIONAL"} - ${scanSummary.overallCoverage ?? 0}% COVERAGE]`}
                    </span>
                  </div>
                ) : (
                  <div className="bg-[#080E1C] border border-amber-500/30 rounded-xl p-6 space-y-2">
                    <h3 className="font-bold text-amber-400 text-base">Queued for Human Review</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Your website had bot/firewall restrictions during the automated probe, so Todd and Noelah will inspect it directly by hand.
                    </p>
                  </div>
                )}

                <div className="p-6 bg-gradient-to-r from-purple-950/30 to-[#0A101D] border border-purple-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold rounded">
                      OPTIONAL STEP 2 • OWNER CONTEXT
                    </span>
                    <span className="text-xs text-slate-400 font-mono">~2 minutes</span>
                  </div>
                  <h3 className="font-bold text-white text-lg font-serif">
                    Give Todd and Noelah a little more context
                  </h3>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                    Want to share where your customers come from, whether calls or quotes get missed, or what busywork wastes your time? Answer a few optional questions so Todd and Noelah can tailor your review.
                  </p>
                  <div className="pt-1">
                    <Link
                      href={`/reality-check/${scanSummary.shareToken}/questionnaire`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition-colors shadow-md"
                    >
                      Answer Optional Context Questions <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 border-b border-slate-800 pb-6">
                  <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                    Free Business Reality Check
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold text-white font-serif">
                    Tell us about your business.
                  </h2>
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed">
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
                        Website or Primary Page URL <span className="text-amber-400">*</span>
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
                        Your Name <span className="text-amber-400">*</span>
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
                        placeholder="Where we should send your Reality Check"
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
                        placeholder="Optional phone number"
                        className="w-full px-4 py-3 bg-[#080d18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">
                        Business Type (Optional)
                      </label>
                      <input
                        name="business_type"
                        type="text"
                        placeholder="e.g., Contractor, Restaurant, Retailer"
                        className="w-full px-4 py-3 bg-[#080d18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider font-bold text-slate-300 mb-2">
                      What feels like the biggest bottleneck right now? (Optional)
                    </label>
                    <textarea
                      name="problem"
                      rows={3}
                      placeholder="e.g., Missed calls while on the job, quotes that never get followed up, outdated website, repetitive admin work..."
                      className="w-full px-4 py-3 bg-[#080d18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-sm"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {pending ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Saving & Running Initial Checks...
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

                  <p className="text-xs font-mono text-slate-400 text-center pt-1">
                    No payment. No obligation.
                  </p>
                </form>
              </>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-12 bg-[#04070D]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <CapybaraLogo />
            <span>© 2026 BaraTrust. Practical small-business growth and operations partner.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/reality-check" className="hover:text-amber-400 transition-colors">Reality Check</Link>
            <Link href="/pricing" className="hover:text-amber-400 transition-colors">How We Scope Work</Link>
            <Link href="/terms" className="hover:text-slate-200 transition-colors">Terms of Service</Link>
            <a href="mailto:todd@baratrust.com" className="hover:text-amber-400 transition-colors">todd@baratrust.com</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
