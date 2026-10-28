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
        <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-[#bac9bf] uppercase tracking-wider">Review Requests</span>
          <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[#F0EBE0]">{totalCount}</p>
        </div>

        <div className="bg-[#16231c] border border-[#f6b971]/30 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-[#f6b971] uppercase tracking-wider">Needs Review</span>
          <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[#f6b971]">{needsReviewCount}</p>
        </div>

        <div className="bg-[#16231c] border border-[#36493d] rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-[#c2d1c7] uppercase tracking-wider">In Review</span>
          <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[#F0EBE0]">{inReviewCount}</p>
        </div>

        <div className="bg-[#16231c] border border-[#7be0b8]/30 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-semibold text-[#7be0b8] uppercase tracking-wider">Ready / Published</span>
          <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[#7be0b8]">{publishedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#131f19] border border-[#2c3e33] p-3.5 rounded-xl">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              statusFilter === "ALL"
                ? "bg-[#7be0b8]/15 text-[#7be0b8] border border-[#7be0b8]/35"
                : "text-[#bac9bf] hover:text-[#F0EBE0] hover:bg-[#1b2821]"
            }`}
          >
            All Requested ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("NEEDS_REVIEW")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              statusFilter === "NEEDS_REVIEW"
                ? "bg-[#f6b971]/15 text-[#f6b971] border border-[#f6b971]/35"
                : "text-[#bac9bf] hover:text-[#F0EBE0] hover:bg-[#1b2821]"
            }`}
          >
            Needs Review ({needsReviewCount})
          </button>
          <button
            onClick={() => setStatusFilter("IN_REVIEW")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              statusFilter === "IN_REVIEW"
                ? "bg-[#bac9bf]/15 text-[#F0EBE0] border border-[#36493d]"
                : "text-[#bac9bf] hover:text-[#F0EBE0] hover:bg-[#1b2821]"
            }`}
          >
            In Review ({inReviewCount})
          </button>
          <button
            onClick={() => setStatusFilter("READY_TO_PUBLISH")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              statusFilter === "READY_TO_PUBLISH"
                ? "bg-[#7be0b8]/15 text-[#7be0b8] border border-[#7be0b8]/35"
                : "text-[#bac9bf] hover:text-[#F0EBE0] hover:bg-[#1b2821]"
            }`}
          >
            Ready / Published ({publishedCount})
          </button>
          <button
            onClick={() => setStatusFilter("ANONYMOUS_SCANS")}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              statusFilter === "ANONYMOUS_SCANS"
                ? "bg-[#1b2821] text-[#F0EBE0] border border-[#36493d]"
                : "text-[#8fa396] hover:text-[#bac9bf] hover:bg-[#1b2821]"
            }`}
            title="Inspect URL-only scans where the visitor has not yet submitted an email for human review"
          >
            Auto-Scans Only ({anonymousCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-[#8fa396] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search business, city, URL..."
            className="w-full pl-9 pr-4 py-1.5 bg-[#101914] border border-[#36493d] rounded-lg text-xs text-[#F0EBE0] placeholder-[#8fa396] focus:outline-none focus:border-[#7be0b8]"
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-[#16231c] border border-[#2c3e33] rounded-xl overflow-hidden shadow-xl">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#1b2821] border border-[#2c3e33] text-[#bac9bf] flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-[#F0EBE0] font-[family-name:var(--font-display)] text-lg">No Reality Checks Found</p>
            <p className="text-[#bac9bf] text-xs">
              {searchTerm ? "Try adjusting your search query." : "Incoming reality check requests will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2c3e33] bg-[#131f19] text-[11px] text-[#bac9bf] uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Business</th>
                  <th className="py-3.5 px-4 font-semibold">Location / Website</th>
                  <th className="py-3.5 px-4 font-semibold">Auto Score</th>
                  <th className="py-3.5 px-4 font-semibold">Owner Context</th>
                  <th className="py-3.5 px-4 font-semibold">Review Status</th>
                  <th className="py-3.5 px-4 font-semibold">Submitted</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2c3e33]">
                {filteredItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-[#1b2821]/70 transition-colors group"
                  >
                    {/* Business Name and Type */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        <Link 
                          href={`/internal/reviews/${item.id}`}
                          className="font-bold text-[#F0EBE0] text-sm hover:text-[#7be0b8] transition-colors block"
                        >
                          {item.businessName}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#131f19] text-[#bac9bf] border border-[#2c3e33]">
                            {item.businessType}
                          </span>
                          <span className="text-[11px] text-[#8fa396]">
                            by {item.ownerName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Location and URL */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        <p className="text-[#F0EBE0] font-medium">{item.cityState}</p>
                        <a
                          href={item.website.startsWith("http") ? item.website : `https://${item.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[#bac9bf] hover:text-[#7be0b8] transition-colors font-mono truncate max-w-[200px]"
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
                            <span className="text-base font-bold font-[family-name:var(--font-display)] text-[#7be0b8]">
                              {item.overallScore}
                            </span>
                            <span className="text-[11px] text-[#8fa396] font-mono">/ 100</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-[10px] text-[#bac9bf]">
                            <span className="px-1.5 py-0.5 rounded bg-[#bac9bf]/10 text-[#c2d1c7] border border-[#bac9bf]/25">
                              {item.scoreBreakdown?.coverage?.overall ? `${item.scoreBreakdown.coverage.overall}% cov` : 'auto'}
                            </span>
                          </div>
                        </div>
                      ) : item.scoreBreakdown?.sourceType === 'hosted_profile' ? (
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 bg-[#f6b971]/12 border border-[#f6b971]/30 text-[#f6b971] rounded font-mono text-[10px] font-semibold inline-block">
                            Score Withheld
                          </span>
                          <div className="text-[10px] text-[#bac9bf]">
                            {item.scoreBreakdown?.platformLabel || 'Hosted Profile'}
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-[#131f19] border border-[#2c3e33] text-[#bac9bf] rounded font-mono text-[11px]">
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F0EBE0]/10 border border-[#F0EBE0]/25 text-[#F0EBE0] font-mono text-[11px] font-semibold">
                          <span>[OWNER PROVIDED]</span>
                          <span className="text-[#bac9bf] font-[family-name:var(--font-body)]">({item.questionnaireCount} ans)</span>
                        </span>
                      ) : (
                        <span className="text-[#8fa396] text-[11px]">
                          Not submitted
                        </span>
                      )}
                    </td>

                    {/* Review Status Badge */}
                    <td className="py-4 px-4 align-top">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* Submitted Date */}
                    <td className="py-4 px-4 align-top text-[#bac9bf] text-[11px]">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b2821] hover:bg-[#22342a] text-[#7be0b8] border border-[#7be0b8]/30 rounded-lg text-xs font-semibold transition-colors group-hover:border-[#7be0b8]/55"
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
        <span className="px-2.5 py-1 rounded-full bg-[#7be0b8]/12 border border-[#7be0b8]/30 text-[#7be0b8] font-mono font-bold text-[10px]">
          ✓ PUBLISHED
        </span>
      );
    case "READY_TO_PUBLISH":
      return (
        <span className="px-2.5 py-1 rounded-full bg-[#7be0b8]/12 border border-[#7be0b8]/30 text-[#7be0b8] font-mono font-bold text-[10px]">
          READY TO PUBLISH
        </span>
      );
    case "IN_REVIEW":
      return (
        <span className="px-2.5 py-1 rounded-full bg-[#bac9bf]/12 border border-[#bac9bf]/30 text-[#F0EBE0] font-mono font-bold text-[10px]">
          IN REVIEW
        </span>
      );
    case "NEEDS_HUMAN_REVIEW":
      return (
        <span className="px-2.5 py-1 rounded-full bg-[#f6b971]/12 border border-[#f6b971]/30 text-[#f6b971] font-mono font-bold text-[10px]">
          NEEDS HUMAN REVIEW
        </span>
      );
    case "AUTO_SCAN_COMPLETE":
      return (
        <span className="px-2.5 py-1 rounded-full bg-[#bac9bf]/10 border border-[#bac9bf]/25 text-[#c2d1c7] font-mono font-bold text-[10px]">
          SCAN COMPLETE
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-1 rounded-full bg-[#131f19] border border-[#2c3e33] text-[#bac9bf] font-mono text-[10px]">
          {status}
        </span>
      );
  }
}
