import { JobLead } from "../types";
import { motion } from "motion/react";
import {
  Building2,
  DollarSign,
  ExternalLink,
  MapPin,
  Clock,
  Tag,
  CheckCircle2,
  XCircle,
  Archive,
  Bot // <-- Added Bot icon for Brix
} from "lucide-react";
import { formatDate, cn } from "../lib/utils";
import { firebaseService } from "../lib/firebase/service";

interface LeadCardProps {
  key?: string | number;
  lead: JobLead & { id: string };
  index: number;
  compact?: boolean;
}

export default function LeadCard({ lead, index, compact }: LeadCardProps) {
  const handleStatusUpdate = async (status: JobLead["status"]) => {
    await firebaseService.updateLeadStatus(lead.id, status);
  };

  const handleEngageBrix = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`[BRIX DISPATCH] Transmitting lead ${lead.id} to agent network...`);

    try {
      // Change button state to loading (optional UI polish for later)
      const response = await fetch("/api/agents/engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          title: lead.title,
          description: lead.description,
          category: lead.category,
          region: lead.region
        })
      });

      if (!response.ok) throw new Error("Brix deployment failed");

      const result = await response.json();
      console.log("[BRIX SUCCESS] Quote generated and saved to pipeline:", result);

      // Update the lead status in Firebase so it visually changes on your dashboard
      await handleStatusUpdate('contacted');

    } catch (error) {
      console.error("[BRIX ERROR] Agent failed to process lead:", error);
    }
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group grid grid-cols-12 gap-4 py-4 border-b border-natural-border items-center hover:bg-white hover:shadow-sm px-6 rounded-2xl transition-all cursor-pointer"
      >
        <div className="col-span-1 font-mono text-[10px] text-natural-text/40 font-bold uppercase tracking-widest">
          {index + 1 < 10 ? `0${index + 1}` : index + 1}
        </div>
        <div className="col-span-4 font-semibold text-natural-heading truncate">
          {lead.title}
        </div>
        <div className="col-span-2 flex items-center gap-2 text-xs text-natural-text/60">
          <Building2 className="w-3 h-3 shrink-0 opacity-50" />
          <span className="truncate">{lead.sourceSite}</span>
        </div>
        <div className="col-span-2 flex items-center gap-2 text-xs text-natural-text/60">
          <MapPin className="w-3 h-3 shrink-0 opacity-50" />
          <span className="truncate font-medium">{lead.region}</span>
        </div>
        <div className="col-span-2 font-serif font-bold text-natural-heading text-sm text-right">
          {lead.pay}
        </div>
        <div className="col-span-1 flex items-center justify-end gap-2">
          {/* BRIX COMPACT BUTTON */}
          <button
            onClick={handleEngageBrix}
            className="p-1.5 rounded-full text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Engage Brix"
          >
            <Bot className="w-4 h-4" />
          </button>
          <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-natural-bg text-natural-accent transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-[2rem] p-8 border border-natural-border flex flex-col gap-6 relative shadow-[0_4px_20px_rgba(125,132,113,0.05)] hover:shadow-[0_8px_30px_rgba(125,132,113,0.1)] transition-all group"
    >
      {/* Icon & Title */}
      <div className="flex items-start gap-5">
        <div className="w-14 h-14 bg-natural-sidebar rounded-2xl flex items-center justify-center text-natural-accent flex-shrink-0 group-hover:bg-natural-accent group-hover:text-white transition-colors duration-500">
          {lead.category.toLowerCase().includes('lawn') ? <Tag className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xl font-bold tracking-tight text-natural-heading leading-tight truncate">
              {lead.title}
            </h3>
            {lead.status === 'new' && (
              <span className="bg-natural-accent/10 border border-natural-accent/20 text-natural-accent px-2 py-0.5 rounded-full font-mono text-[8px] font-bold uppercase tracking-widest whitespace-nowrap">
                New Dispatch
              </span>
            )}
          </div>
          <p className="text-sm text-natural-text/60 line-clamp-2 leading-relaxed">
            Sourced via {lead.sourceSite} &bull; {lead.region}
          </p>
        </div>
      </div>

      <div className="h-px bg-natural-border/50" />

      {/* Description Content */}
      <div className="text-sm text-natural-text/80 leading-relaxed font-medium italic opacity-80 line-clamp-3">
        {lead.description || "Segmented data stream indicates a manual review is required for visual confirmation of job parameters."}
      </div>

      {/* Meta Footer */}
      <div className="mt-auto pt-6 border-t border-natural-border flex items-center justify-between">
        <div>
          <p className="text-2xl font-serif font-bold text-natural-heading leading-none mb-1">
            {lead.pay}
          </p>
          <p className="text-[10px] text-natural-text/40 uppercase font-bold tracking-widest">Target Compensation</p>
        </div>

        <div className="flex items-center gap-2">
          {/* THE NEW BRIX DEPLOYMENT TRIGGER */}
          <button
            onClick={handleEngageBrix}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-900/10 text-indigo-700 hover:bg-indigo-900 hover:text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300"
          >
            <Bot className="w-4 h-4" />
            Engage Brix
          </button>

          <button
            onClick={() => handleStatusUpdate('contacted')}
            className="p-3 rounded-full border border-natural-border hover:bg-natural-accent hover:text-white hover:border-natural-accent transition-all duration-300 group/btn"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStatusUpdate('ignored')}
            className="p-3 rounded-full border border-natural-border hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition-all duration-300"
          >
            <XCircle className="w-4 h-4" />
          </button>
          <a
            href={lead.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-full bg-natural-accent text-white shadow-md shadow-natural-accent/20 hover:scale-105 active:scale-95 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Decorative Index */}
      <div className="absolute top-4 right-8 font-mono text-[10px] text-natural-text/20 font-bold uppercase tracking-[0.3em]">
        Signal x0{index + 1}
      </div>
    </motion.div>
  );
}