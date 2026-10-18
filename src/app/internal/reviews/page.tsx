import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { realityChecks, ownerResponses, humanReviews } from "@/db/schema";
import { getOperatorUser } from "@/lib/auth/operator";
import { 
  ShieldAlert, 
  ExternalLink, 
  Search, 
  ArrowRight, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  SlidersHorizontal,
  Compass
} from "lucide-react";
import ClientReviewQueue from "./ClientReviewQueue";

export const dynamic = "force-dynamic";

export default async function OperatorReviewQueuePage() {
  const operator = await getOperatorUser();

  // If not an authorized operator, show clear access denied screen
  if (!operator || !operator.isOperator) {
    return (
      <div className="min-h-screen bg-[#050810] text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#0E1524] border border-red-500/30 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-serif text-white">Operator Access Required</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              This internal workspace is reserved for BaraTrust operators (Todd & Noelah). Your account ({operator?.email || "anonymous"}) is not on the review allowlist.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-sm transition-colors text-center"
            >
              Return to Partner Dashboard
            </Link>
            <Link
              href="/"
              className="w-full py-3 text-slate-400 hover:text-slate-200 text-xs transition-colors text-center"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch all reality checks ordered by submission date (newest first)
  const allChecks = await db
    .select()
    .from(realityChecks)
    .orderBy(desc(realityChecks.createdAt));

  // Fetch all questionnaire responses to map completion status
  const allResponses = await db.select().from(ownerResponses);
  const responseMap = new Map<string, any>();
  for (const resp of allResponses) {
    responseMap.set(resp.realityCheckId, resp.responses);
  }

  // Fetch all human reviews to map reviewer and draft status
  const allReviews = await db.select().from(humanReviews);
  const reviewMap = new Map<string, any>();
  for (const hr of allReviews) {
    reviewMap.set(hr.realityCheckId, hr);
  }

  // Combine into unified table data
  const queueItems = allChecks.map((check) => {
    const ownerResp = responseMap.get(check.id);
    let questionnaireAnswerCount = 0;
    if (ownerResp) {
      const keys = [
        'customerAcquisition',
        'biggestProblem',
        'missedInquiries',
        'followUpProcess',
        'currentMarketingSpend',
        'repetitiveAdminWaste',
        'growthOpportunity',
        'freeEmployeeRole',
        'additionalNotes'
      ];
      questionnaireAnswerCount = keys.filter(k => !!ownerResp[k]).length;
    }

    const review = reviewMap.get(check.id);
    const cleanDomain = check.website.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0] || check.website;
    const humanReviewRequested =
      Boolean(check.email) ||
      check.status === 'NEEDS_HUMAN_REVIEW' ||
      check.status === 'IN_REVIEW' ||
      check.status === 'READY_TO_PUBLISH' ||
      check.status === 'PUBLISHED' ||
      check.status === 'completed';

    return {
      id: check.id,
      businessName: check.businessName || cleanDomain,
      website: check.website,
      cityState: check.cityState || 'Location not specified',
      businessType: check.businessType || 'Small Business',
      ownerName: check.ownerName || 'Owner not specified',
      email: check.email || '',
      humanReviewRequested,
      overallScore: check.overallScore,
      scoreBreakdown: check.scoreBreakdown,
      scanStatus: check.scanStatus,
      status: check.status,
      shareToken: check.shareToken,
      hasQuestionnaire: questionnaireAnswerCount > 0,
      questionnaireCount: questionnaireAnswerCount,
      reviewerName: review?.reviewerName || null,
      reviewDraftStatus: review?.status || null,
      createdAt: check.createdAt ? check.createdAt.toISOString() : new Date().toISOString(),
    };
  });

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 font-sans selection:bg-amber-500/30">
      {/* Operator Studio Header */}
      <header className="border-b border-slate-800/80 bg-[#080F1A]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <span className="text-amber-400 font-bold text-base font-serif">B</span>
              </div>
              <span className="text-lg font-bold text-white font-serif tracking-tight">
                Bara<span className="text-amber-400">Trust</span>
              </span>
            </Link>
            <span className="text-slate-600 font-mono text-xs">/</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded">
                Review Studio
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline font-mono">
                Operator Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1524] border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400">Operator:</span>
              <span className="text-white font-bold">{operator.name}</span>
              <span className="text-slate-500">({operator.email})</span>
            </div>
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Review Queue */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <ClientReviewQueue items={queueItems} />
      </main>
    </div>
  );
}
