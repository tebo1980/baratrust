"use client";

import { motion } from "framer-motion";
import { Building2, ExternalLink, MapPin, Tag, CheckCircle2, XCircle } from "lucide-react";
import { updateNeonLeadStatus } from "../lib/actions";

// --- STRICT TYPES ---
export interface JobLead {
  id: number;
  title: string;
  pay: string;
  description: string;
  region: string;
  sourceSite: string;
  sourceUrl: string;
  status: string;
}

interface LeadCardProps {
  lead: JobLead;
  index: number;
  compact?: boolean;
}
// --------------------

export default function LeadCard({ lead, index, compact }: LeadCardProps) {
  const handleStatusUpdate = async (status: string) => {
    await updateNeonLeadStatus(lead.id, status);
  };

  if (compact) {
    return (
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="group grid grid-cols-12 gap-4 py-3 border-b border-zinc-800/50 items-center hover:bg-zinc-900 px-6 rounded-lg transition-all cursor-pointer">
        <div className="col-span-1 font-mono text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{index + 1 < 10 ? `0${index + 1}` : index + 1}</div>
        <div className="col-span-4 font-semibold text-zinc-200 truncate group-hover:text-amber-400 transition-colors">{lead.title}</div>
        <div className="col-span-2 flex items-center gap-2 text-xs text-zinc-500 font-mono">
          <Building2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{lead.sourceSite}</span>
        </div>
        <div className="col-span-2 flex items-center gap-2 text-xs text-zinc-500 font-mono uppercase">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{lead.region}</span>
        </div>
        <div className="col-span-2 font-mono font-bold text-zinc-300 text-sm text-right group-hover:text-amber-400 transition-colors truncate">{lead.pay}</div>
        <div className="col-span-1 flex items-center justify-end gap-3">
          <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 transition-colors shrink-0"><ExternalLink className="w-3.5 h-3.5" /></a>
        </div>
      </motion.div>
    );
  }

  return (
    // h-full forces all cards in the grid row to match the height of the tallest card
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 flex flex-col h-full relative hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.05)] transition-all group overflow-hidden">

      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 group-hover:from-amber-600 group-hover:via-amber-400 group-hover:to-amber-600 transition-all duration-500" />

      {/* Top Section - pr-20 creates a deadzone so titles never slide under the top-right badges */}
      <div className="flex items-start gap-4 pr-20 mb-5 shrink-0">
        <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 flex-shrink-0 group-hover:border-amber-500/30 group-hover:text-amber-400 transition-all duration-300">
          {lead.description?.toLowerCase().includes('lawn') ? <Tag className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="text-lg font-bold tracking-tight text-zinc-100 leading-tight line-clamp-2 mb-2" title={lead.title}>{lead.title}</h3>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500 flex-wrap">
            <span className="flex items-center gap-1.5 whitespace-nowrap"><MapPin className="w-3 h-3" /> {lead.region}</span>
            <span className="text-zinc-700 hidden sm:inline">|</span>
            <span className="whitespace-nowrap">{lead.sourceSite}</span>
          </div>
        </div>
      </div>

      {/* Description Box - flex-1 forces this box to stretch, pushing the footer down so all buttons align perfectly */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="text-sm text-zinc-400 leading-relaxed font-medium bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/50 h-full">
          <p className="line-clamp-4">{lead.description || "Segmented data stream indicates a manual review is required for visual confirmation."}</p>
        </div>
      </div>

      {/* Footer Section - flex-wrap prevents squishing on smaller monitors */}
      <div className="mt-5 pt-4 border-t border-zinc-800/50 flex flex-wrap items-end justify-between gap-4 shrink-0">
        <div className="min-w-0 pr-2">
          <p className="text-xl font-mono font-bold text-amber-400 leading-none mb-1.5 truncate" title={lead.pay}>{lead.pay}</p>
          <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest font-mono truncate">Target Compensation</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => handleStatusUpdate('contacted')} className="p-2 sm:p-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400 hover:border-emerald-500/50 transition-all duration-200">
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleStatusUpdate('ignored')} className="p-2 sm:p-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 hover:border-red-500/50 transition-all duration-200">
            <XCircle className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-zinc-800 mx-1 sm:mx-1.5"></div>
          <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="p-2 sm:p-2.5 rounded-lg bg-amber-500 text-zinc-950 shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:bg-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all duration-200 flex items-center justify-center">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Absolute Tags */}
      <div className="absolute top-5 right-5 flex items-center gap-2">
        {lead.status === 'new' && (
          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest font-mono shrink-0">
            New
          </span>
        )}
        <div className="font-mono text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em] shrink-0">ID:{index + 1 < 10 ? `0${index + 1}` : index + 1}</div>
      </div>
    </motion.div>
  );
}