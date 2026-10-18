"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight, 
  ArrowLeft,
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Send, 
  RefreshCw,
  AlertCircle
} from "lucide-react";

interface BusinessData {
  businessName: string | null;
  website: string;
  cityState: string | null;
  businessType?: string | null;
  primaryHeadache?: string | null;
  status: string;
  humanReviewRequested?: boolean;
}

export default function OwnerQuestionnairePage() {
  const params = useParams();
  const shareToken = params?.shareToken as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [answers, setAnswers] = useState({
    customerAcquisition: "",
    biggestProblem: "",
    missedInquiries: "",
    followUpProcess: "",
    currentMarketingSpend: "",
    repetitiveAdminWaste: "",
    growthOpportunity: "",
    freeEmployeeRole: "",
    additionalNotes: "",
  });

  useEffect(() => {
    if (!shareToken) return;

    fetch(`/api/reality-check/questionnaire?shareToken=${encodeURIComponent(shareToken)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load Reality Check information");
        return res.json();
      })
      .then((data) => {
        if (data.business) {
          setBusiness(data.business);
          if (data.responses) {
            setAnswers({
              customerAcquisition: data.responses.customerAcquisition || "",
              biggestProblem: data.responses.biggestProblem || data.business.primaryHeadache || "",
              missedInquiries: data.responses.missedInquiries || "",
              followUpProcess: data.responses.followUpProcess || "",
              currentMarketingSpend: data.responses.currentMarketingSpend || "",
              repetitiveAdminWaste: data.responses.repetitiveAdminWaste || "",
              growthOpportunity: data.responses.growthOpportunity || "",
              freeEmployeeRole: data.responses.freeEmployeeRole || "",
              additionalNotes: data.responses.additionalNotes || "",
            });
          } else if (data.business.primaryHeadache) {
            setAnswers((prev) => ({ ...prev, biggestProblem: data.business.primaryHeadache }));
          }
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || "Failed to load reality check data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [shareToken]);

  const handleChange = (field: keyof typeof answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/reality-check/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareToken,
          ...answers,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save questionnaire responses.");
      }

      try {
        if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
          (window as any).gtag("event", "questionnaire_completed");
        }
      } catch {}

      setSubmitted(true);
      window.scrollTo({ top: 100, behavior: "smooth" });
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050810] text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-slate-400 font-mono text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
          <span>Loading Reality Check questionnaire...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 font-sans selection:bg-amber-500/30">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#080F1A]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <span className="text-amber-400 font-bold text-lg font-serif">B</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-serif">
              Bara<span className="text-amber-400">Trust</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold rounded-full">
              [OWNER PROVIDED]
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Title & Context */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <span>Optional Owner Context</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">100% Optional</span>
            {business && (
              <>
                <span>•</span>
                <span className="text-slate-300">{business.businessName || business.website}</span>
                {business.cityState && <span>({business.cityState})</span>}
              </>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white font-serif tracking-tight">
            Want Us to Make the Human Review More Useful?
          </h1>
          <p className="text-slate-300 text-base md:text-lg leading-relaxed">
            Answer a few quick questions so Todd and Noelah understand what matters most to your business.
          </p>

          <div className="p-4 bg-[#0A101D] border border-slate-800 rounded-xl flex items-start gap-3 text-xs text-slate-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Your Reality Check Request Is Already Safe &amp; Queued</p>
              <p className="text-slate-400 mt-0.5">
                Completing this questionnaire is never mandatory. If you are short on time, you can answer whatever you want, leave questions blank, or skip this page entirely. Every response is strictly private and tagged as <strong className="text-purple-300">[OWNER PROVIDED]</strong> in your review dossier.
              </p>
            </div>
          </div>
        </div>

        {business && !business.humanReviewRequested ? (
          <div className="bg-[#0E1524] border border-amber-500/40 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
            <h2 className="text-2xl font-bold text-white font-serif">
              Request Your Full Human Review First
            </h2>
            <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              Before answering the optional owner-context questions, please add your email on your scan snapshot so Todd &amp; Noelah know where to send your finished Reality Check report.
            </p>
            <div className="pt-2">
              <Link
                href={`/reality-check?scan=${encodeURIComponent(shareToken)}`}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition-colors shadow-lg"
              >
                Return to Scan Snapshot &amp; Add Email <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : submitted ? (
          /* SUCCESS CONFIRMATION */
          <div className="bg-[#0E1524] border border-emerald-500/40 rounded-2xl p-8 md:p-12 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-white font-serif">
                Context Received &amp; Added to Your Dossier
              </h2>
              <p className="text-sm md:text-base text-slate-300 max-w-xl mx-auto">
                Thank you! Todd and Noelah now have both your technical scan data and your operational context. They are personally preparing your Reality Check report.
              </p>
            </div>

            <div className="p-4 bg-[#080E1C] border border-slate-800 rounded-xl max-w-md mx-auto text-left text-xs text-slate-400 space-y-2 font-mono">
              <div className="flex justify-between">
                <span>Business:</span>
                <span className="text-white font-bold">{business?.businessName || business?.website}</span>
              </div>
              <div className="flex justify-between">
                <span>Evidence Tag:</span>
                <span className="text-purple-300 font-bold">[OWNER PROVIDED]</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-amber-400 font-bold">NEEDS_HUMAN_REVIEW</span>
              </div>
              <div className="flex justify-between">
                <span>Turnaround:</span>
                <span className="text-emerald-400 font-bold">Within 1 business day</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition-colors text-center shadow-lg"
              >
                Return to BaraTrust Homepage
              </Link>
              <a
                href="mailto:todd@baratrust.com"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#080D18] hover:bg-[#121A2B] border border-slate-700 text-slate-300 font-bold rounded-lg text-sm transition-colors text-center"
              >
                Email Todd Directly
              </a>
            </div>
          </div>
        ) : (
          /* THE 8 QUESTIONS FORM */
          <form onSubmit={handleSubmit} className="bg-[#0E1524] border border-slate-800 rounded-2xl p-6 md:p-10 shadow-2xl space-y-8">
            <div className="space-y-6">

              {/* Question 1 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  1. Where do most new customers currently come from?
                </label>
                <p className="text-xs text-slate-400">
                  e.g., Word-of-mouth, repeat clients, Google search, Facebook, passing by on the street, direct referrals...
                </p>
                <textarea
                  rows={2}
                  value={answers.customerAcquisition}
                  onChange={(e) => handleChange("customerAcquisition", e.target.value)}
                  placeholder="e.g. 70% word of mouth, some Google Maps. We don't get much from our website."
                  className="w-full px-4 py-3 bg-[#080D18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>

              {/* Question 2 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  2. What is the biggest business problem you want help with right now?
                </label>
                <p className="text-xs text-slate-400">
                  What keeps you up at night or feels like friction in your day-to-day operations?
                </p>
                <textarea
                  rows={2}
                  value={answers.biggestProblem}
                  onChange={(e) => handleChange("biggestProblem", e.target.value)}
                  placeholder="e.g. Too many price-shoppers, not enough high-ticket jobs, or quotes stalling out."
                  className="w-full px-4 py-3 bg-[#080D18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>

              {/* Question 3 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  3. Do you regularly miss calls, messages, quote requests, catering requests, or other inquiries?
                </label>
                <p className="text-xs text-slate-400">
                  Be honest — what happens when someone calls while you or your crew are busy?
                </p>
                <textarea
                  rows={2}
                  value={answers.missedInquiries}
                  onChange={(e) => handleChange("missedInquiries", e.target.value)}
                  placeholder="e.g. When we're on a job or during the lunch rush, calls go to voicemail and half don't leave a message."
                  className="w-full px-4 py-3 bg-[#080D18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>

              {/* Question 4 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  4. How do you currently follow up with people who inquire but do not buy immediately?
                </label>
                <p className="text-xs text-slate-400">
                  Do you have a regular follow-up routine, or do unclosed leads tend to disappear?
                </p>
                <textarea
                  rows={2}
                  value={answers.followUpProcess}
                  onChange={(e) => handleChange("followUpProcess", e.target.value)}
                  placeholder="e.g. I try to text them back next week, but honestly if they don't respond we usually forget about them."
                  className="w-full px-4 py-3 bg-[#080D18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>

              {/* Question 5 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  5. Are you currently paying for advertising or marketing services?
                </label>
                <p className="text-xs text-slate-400">
                  e.g., Google Ads, Yelp, an agency retainer, local mailers, software subscriptions...
                </p>
                <textarea
                  rows={2}
                  value={answers.currentMarketingSpend}
                  onChange={(e) => handleChange("currentMarketingSpend", e.target.value)}
                  placeholder="e.g. Paying an SEO agency $800/mo and $300 on Google Ads, not sure if it's working."
                  className="w-full px-4 py-3 bg-[#080D18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>

              {/* Question 6 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  6. What repetitive or administrative task wastes the most time every week?
                </label>
                <p className="text-xs text-slate-400">
                  The manual busywork you wish would just happen on its own.
                </p>
                <textarea
                  rows={2}
                  value={answers.repetitiveAdminWaste}
                  onChange={(e) => handleChange("repetitiveAdminWaste", e.target.value)}
                  placeholder="e.g. Writing out estimates by hand, chasing unpaid invoices, copying info between apps."
                  className="w-full px-4 py-3 bg-[#080D18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>

              {/* Question 7 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  7. Is there a product, service, or revenue stream you want to grow?
                </label>
                <p className="text-xs text-slate-400">
                  What part of your business has higher margins or could scale if more people knew about it?
                </p>
                <textarea
                  rows={2}
                  value={answers.growthOpportunity}
                  onChange={(e) => handleChange("growthOpportunity", e.target.value)}
                  placeholder="e.g. We want to do more commercial accounts and recurring quarterly service plans."
                  className="w-full px-4 py-3 bg-[#080D18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>

              {/* Question 8 */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white">
                  8. If you could add one extra employee for free, what would you have them handle?
                </label>
                <p className="text-xs text-slate-400">
                  This tells us what bottleneck is capping your growth the most.
                </p>
                <textarea
                  rows={2}
                  value={answers.freeEmployeeRole}
                  onChange={(e) => handleChange("freeEmployeeRole", e.target.value)}
                  placeholder="e.g. Answering every phone call instantly and scheduling appointments on our calendar."
                  className="w-full px-4 py-3 bg-[#080D18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>

              {/* Free-text field */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Anything else you want us to know? (Optional)
                </label>
                <p className="text-xs text-slate-400">
                  Specific competitors to look at, recent changes, pricing concerns, or goals.
                </p>
                <textarea
                  rows={3}
                  value={answers.additionalNotes}
                  onChange={(e) => handleChange("additionalNotes", e.target.value)}
                  placeholder="e.g. Our main rival down the road just revamped their site. Also, we are thinking about opening a second location next year."
                  className="w-full px-4 py-3 bg-[#080D18] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>

            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-base transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Saving Responses...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Context to Todd & Noelah
                  </>
                )}
              </button>

              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-4 bg-[#080D18] hover:bg-[#121A2B] border border-slate-700 text-slate-300 font-bold rounded-lg text-sm transition-colors text-center"
              >
                Skip / Return Home
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
