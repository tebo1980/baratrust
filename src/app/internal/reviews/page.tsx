import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { realityChecks, ownerResponses, humanReviews } from "@/db/schema";
import { getOperatorUser } from "@/lib/auth/operator";
import { sanitizeBrowserEvidenceForPublic } from "@/lib/scanner/browser-evidence";
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
      <div className="min-h-screen bg-[#0b120e] text-[#F0EBE0] flex items-center justify-center p-6 font-[family-name:var(--font-body)]">
        <div className="max-w-md w-full bg-[#16231c] border border-[#E05A5A]/30 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-[#E05A5A]/12 border border-[#E05A5A]/30 text-[#f28b82] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] text-[#F0EBE0]">Operator Access Required</h2>
            <p className="text-sm text-[#bac9bf] leading-relaxed">
              This internal workspace is reserved for BaraTrust operators (Todd &amp; Noelah). Your account ({operator?.email || "anonymous"}) is not on the review allowlist.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="w-full py-3 bg-[#22342a] hover:bg-[#2b4135] text-[#F0EBE0] border border-[#36493d] font-semibold rounded-lg text-sm transition-colors text-center"
            >
              Return to Partner Dashboard
            </Link>
            <Link
              href="/"
              className="w-full py-3 text-[#bac9bf] hover:text-[#F0EBE0] text-xs transition-colors text-center"
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
      scoreBreakdown: check.scoreBreakdown?.browserEvidence
        ? {
            ...check.scoreBreakdown,
            browserEvidence: sanitizeBrowserEvidenceForPublic(check.scoreBreakdown.browserEvidence),
          }
        : check.scoreBreakdown,
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
    <div className="min-h-screen bg-[#0b120e] text-[#F0EBE0] font-[family-name:var(--font-body)] selection:bg-[#7be0b8]/25">
      {/* Operator Studio Header */}
      <header className="border-b border-[#2c3e33] bg-[#101914]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#16231c] border border-[#36493d] flex items-center justify-center">
                <span className="text-[#7be0b8] font-bold text-base font-[family-name:var(--font-display)]">B</span>
              </div>
              <span className="text-lg font-bold text-[#F0EBE0] font-[family-name:var(--font-display)] tracking-tight">
                Bara<span className="text-[#7be0b8]">Trust</span>
              </span>
            </Link>
            <span className="text-[#8fa396] text-xs">/</span>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold tracking-wider text-[#7be0b8] uppercase bg-[#7be0b8]/12 border border-[#7be0b8]/30 px-2.5 py-0.5 rounded-full">
                Review Studio
              </span>
              <span className="text-xs text-[#bac9bf] hidden sm:inline">
                Operator Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#16231c] border border-[#2c3e33]">
              <span className="w-2 h-2 rounded-full bg-[#7be0b8] animate-pulse"></span>
              <span className="text-[#bac9bf]">Operator:</span>
              <span className="text-[#F0EBE0] font-semibold">{operator.name}</span>
              <span className="text-[#8fa396] font-mono text-[11px]">({operator.email})</span>
            </div>
            <Link
              href="/dashboard"
              className="text-[#bac9bf] hover:text-[#F0EBE0] transition-colors font-medium"
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
