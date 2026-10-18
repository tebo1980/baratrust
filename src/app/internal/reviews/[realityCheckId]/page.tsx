import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { 
  realityChecks, 
  scanFindings, 
  ownerResponses, 
  humanReviews 
} from "@/db/schema";
import { getOperatorUser } from "@/lib/auth/operator";
import { 
  ShieldAlert, 
  ArrowLeft, 
  ExternalLink, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe
} from "lucide-react";
import ReviewStudioEditor from "./ReviewStudioEditor";

export const dynamic = "force-dynamic";

export default async function IndividualReviewWorkspacePage({
  params,
}: {
  params: { realityCheckId: string };
}) {
  const operator = await getOperatorUser();

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
              This review workspace is restricted to authorized BaraTrust operators.
            </p>
          </div>
          <Link
            href="/internal/reviews"
            className="inline-block px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold"
          >
            Back to Queue
          </Link>
        </div>
      </div>
    );
  }

  const { realityCheckId } = params;

  // 1. Fetch Reality Check record
  const [check] = await db
    .select()
    .from(realityChecks)
    .where(eq(realityChecks.id, realityCheckId))
    .limit(1);

  if (!check) {
    notFound();
  }

  // 2. Fetch all scan findings
  const findings = await db
    .select()
    .from(scanFindings)
    .where(eq(scanFindings.realityCheckId, realityCheckId));

  // 3. Fetch owner questionnaire responses
  const [ownerResp] = await db
    .select()
    .from(ownerResponses)
    .where(eq(ownerResponses.realityCheckId, realityCheckId))
    .limit(1);

  // 4. Fetch existing human review draft if present
  const [existingReview] = await db
    .select()
    .from(humanReviews)
    .where(eq(humanReviews.realityCheckId, realityCheckId))
    .limit(1);

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 font-sans selection:bg-amber-500/30">
      {/* Top Navigation & Dossier Bar */}
      <header className="border-b border-slate-800/80 bg-[#080F1A]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 h-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/internal/reviews"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Review Queue</span>
            </Link>
            <span className="text-slate-600 font-mono text-xs">/</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-serif text-white">
                {check.businessName || check.website}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({check.cityState || 'Location not specified'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-[#0E1524] border border-slate-800 text-slate-300">
              Operator: <strong className="text-amber-400">{operator.name}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Main Review Studio Interface */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <ReviewStudioEditor
          check={check}
          findings={findings}
          ownerResponse={ownerResp?.responses || null}
          existingReview={existingReview || null}
          operatorEmail={operator.email}
          operatorName={operator.name}
        />
      </main>
    </div>
  );
}
