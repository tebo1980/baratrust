"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Search, 
  ExternalLink, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  FileText,
  SlidersHorizontal,
  Sparkles,
  Inbox
} from "lucide-react";

export interface QueueItem {
  id: string;
  businessName: string;
  website: string;
  cityState: string;
  businessType: string;
  ownerName: string;
  email: string;
  humanReviewRequested: boolean;
  overallScore: number | null;
  scoreBreakdown: any;
  scanStatus: string;
  status: string;
  shareToken: string;
  hasQuestionnaire: boolean;
  questionnaireCount: number;
  reviewerName: string | null;
  reviewDraftStatus: string | null;
  createdAt: string;
}

export default function ClientReviewQueue({ items }: { items: QueueItem[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Active human-review leads vs anonymous URL-only auto-scans
  const activeReviewItems = useMemo(
    () => items.filter((item) => item.humanReviewRequested),
    [items]
  );
  const anonymousScanItems = useMemo(
    () => items.filter((item) => !item.humanReviewRequested),
    [items]
  );

  // Filtered queue items
  const filteredItems = useMemo(() => {
    const sourcePool = statusFilter === "ANONYMOUS_SCANS" ? anonymousScanItems : activeReviewItems;
    return sourcePool.filter((item) => {
      // Search filter
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.businessName.toLowerCase().includes(q) ||
        item.cityState.toLowerCase().includes(q) ||
        item.website.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.businessType.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Status tab filter
      if (statusFilter === "ALL" || statusFilter === "ANONYMOUS_SCANS") return true;
      if (statusFilter === "NEEDS_REVIEW") {
        return (
          item.status === "NEEDS_HUMAN_REVIEW" ||
          item.status === "AUTO_SCAN_COMPLETE" ||
          item.status === "NEW" ||
          item.status === "pending_review"
        );
      }
      if (statusFilter === "IN_REVIEW") {
        return item.status === "IN_REVIEW";
      }
      if (statusFilter === "READY_TO_PUBLISH") {
        return item.status === "READY_TO_PUBLISH";
      }
      if (statusFilter === "PUBLISHED") {
        return item.status === "PUBLISHED" || item.status === "completed";
      }

      return true;
    });
  }, [activeReviewItems, anonymousScanItems, searchTerm, statusFilter]);

  // Aggregate stats (for active human-review leads so anonymous scans never inflate operator workload)
  const totalCount = activeReviewItems.length;
  const needsReviewCount = activeReviewItems.filter(
    (i) =>
      i.status === "NEEDS_HUMAN_REVIEW" ||
      i.status === "AUTO_SCAN_COMPLETE" ||
      i.status === "NEW" ||
      i.status === "pending_review"
  ).length;
  const inReviewCount = activeReviewItems.filter((i) => i.status === "IN_REVIEW").length;
  const publishedCount = activeReviewItems.filter(
    (i) => i.status === "READY_TO_PUBLISH" || i.status === "PUBLISHED" || i.status === "completed"
  ).length;
  const anonymousCount = anonymousScanItems.length;

  return (
    <div className="space-y-6">

      {/* KPI Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0E1524] border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Review Requests</span>
          <p className="text-2xl font-bold font-serif text-white">{totalCount}</p>
        </div>

        <div className="bg-[#0E1524] border border-amber-500/30 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Needs Review</span>
          <p className="text-2xl font-bold font-serif text-amber-400">{needsReviewCount}</p>
        </div>

        <div className="bg-[#0E1524] border border-blue-500/30 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-blue-400 uppercase tracking-wider">In Review</span>
          <p className="text-2xl font-bold font-serif text-blue-400">{inReviewCount}</p>
        </div>

        <div className="bg-[#0E1524] border border-emerald-500/30 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Ready / Published</span>
          <p className="text-2xl font-bold font-serif text-emerald-400">{publishedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#0A101D] border border-slate-800 p-3.5 rounded-xl">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              statusFilter === "ALL"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            All Requested ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("NEEDS_REVIEW")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              statusFilter === "NEEDS_REVIEW"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            Needs Review ({needsReviewCount})
          </button>
          <button
            onClick={() => setStatusFilter("IN_REVIEW")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              statusFilter === "IN_REVIEW"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            In Review ({inReviewCount})
          </button>
          <button
            onClick={() => setStatusFilter("READY_TO_PUBLISH")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              statusFilter === "READY_TO_PUBLISH"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            Ready / Published ({publishedCount})
          </button>
          <button
            onClick={() => setStatusFilter("ANONYMOUS_SCANS")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              statusFilter === "ANONYMOUS_SCANS"
                ? "bg-slate-700/60 text-slate-200 border border-slate-600"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"
            }`}
            title="Inspect URL-only scans where the visitor has not yet submitted an email for human review"
          >
            Auto-Scans Only ({anonymousCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search business, city, URL..."
            className="w-full pl-9 pr-4 py-1.5 bg-[#080D18] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-[#0E1524] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/60 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-slate-300 font-serif text-lg">No Reality Checks Found</p>
            <p className="text-slate-500 text-xs">
              {searchTerm ? "Try adjusting your search query." : "Incoming reality check requests will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0A101D] font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Business</th>
                  <th className="py-3.5 px-4 font-semibold">Location / Website</th>
                  <th className="py-3.5 px-4 font-semibold">Auto Score</th>
                  <th className="py-3.5 px-4 font-semibold">Owner Context</th>
                  <th className="py-3.5 px-4 font-semibold">Review Status</th>
                  <th className="py-3.5 px-4 font-semibold">Submitted</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-800/20 transition-colors group"
                  >
                    {/* Business Name and Type */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        <Link 
                          href={`/internal/reviews/${item.id}`}
                          className="font-bold text-white text-sm hover:text-amber-400 transition-colors block"
                        >
                          {item.businessName}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {item.businessType}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            by {item.ownerName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Location and URL */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        <p className="text-slate-200 font-medium">{item.cityState}</p>
                        <a
                          href={item.website.startsWith("http") ? item.website : `https://${item.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition-colors font-mono truncate max-w-[200px]"
                        >
                          <span>{item.website.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                    </td>

                    {/* Auto Score & Confidence */}
                    <td className="py-4 px-4 align-top">
                      {item.overallScore !== null ? (
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-bold font-serif text-amber-400">
                              {item.overallScore}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">/ 100</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              {item.scoreBreakdown?.coverage?.overall ? `${item.scoreBreakdown.coverage.overall}% cov` : 'auto'}
                            </span>
                          </div>
                        </div>
                      ) : item.scoreBreakdown?.sourceType === 'hosted_profile' ? (
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded font-mono text-[10px] font-semibold inline-block">
                            Score Withheld
                          </span>
                          <div className="font-mono text-[10px] text-slate-400">
                            {item.scoreBreakdown?.platformLabel || 'Hosted Profile'}
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded font-mono text-[11px]">
                          {item.scanStatus === 'failed' || item.scanStatus === 'blocked' || item.scanStatus === 'timeout'
                            ? 'Scan Deferred'
                            : item.scanStatus === 'completed'
                            ? 'Score Withheld'
                            : 'Pending'}
                        </span>
                      )}
                    </td>

                    {/* Owner Provided Questionnaire Status */}
                    <td className="py-4 px-4 align-top">
                      {item.hasQuestionnaire ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-[11px] font-semibold">
                          <span>[OWNER PROVIDED]</span>
                          <span className="text-purple-400">({item.questionnaireCount} ans)</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">
                          Not submitted
                        </span>
                      )}
                    </td>

                    {/* Review Status Badge */}
                    <td className="py-4 px-4 align-top">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* Submitted Date */}
                    <td className="py-4 px-4 align-top text-slate-400 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Open Studio Action */}
                    <td className="py-4 px-4 align-top text-right">
                      <Link
                        href={`/internal/reviews/${item.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors group-hover:border-amber-400/50"
                      >
                        <span>Open Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PUBLISHED":
      return (
        <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-[10px]">
          ✓ PUBLISHED
        </span>
      );
    case "READY_TO_PUBLISH":
      return (
        <span className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-[10px]">
          READY TO PUBLISH
        </span>
      );
    case "IN_REVIEW":
      return (
        <span className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 font-mono font-bold text-[10px]">
          IN REVIEW
        </span>
      );
    case "NEEDS_HUMAN_REVIEW":
      return (
        <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-[10px]">
          NEEDS HUMAN REVIEW
        </span>
      );
    case "AUTO_SCAN_COMPLETE":
      return (
        <span className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-[10px]">
          SCAN COMPLETE
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">
          {status}
        </span>
      );
  }
}
