import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { firebaseService } from "../lib/firebase/service";
import { geminiService } from "../services/geminiService";
import { JobLead, Contractor } from "../types";
import LeadCard from "./LeadCard";
import {
  Target,
  Search,
  Settings,
  RefreshCcw,
  Layers,
  TrendingUp,
  LayoutGrid,
  List
} from "lucide-react";
import { cn } from "../lib/utils";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [leads, setLeads] = useState<(JobLead & { id: string })[]>([]);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [isScouting, setIsScouting] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const unsub = firebaseService.subscribeToLeads(user.uid, setLeads);
    loadContractor();
    return unsub;
  }, [user.uid]);

  const loadContractor = async () => {
    let c = await firebaseService.getContractor(user.uid);
    if (!c) {
      c = {
        uid: user.uid,
        email: user.email || "",
        regions: ["Phoenix, AZ"],
        categories: ["Lawn Care", "Handyman"],
      };
      await firebaseService.saveContractor(c);
    }
    setContractor(c);
  };

  const handleScout = async () => {
    if (!contractor) return;
    setIsScouting(true);

    // In a real app, we'd loop through categories and regions
    // For this demo, we'll scout the first one of each
    const foundLeads = await geminiService.searchLeads(
      contractor.regions[0],
      contractor.categories[0]
    );

    for (const lead of foundLeads) {
      // 1. Keep original code: Save to Firebase for the LeadScout UI
      await firebaseService.addLead({
        ...lead,
        contractorId: user.uid,
      });

      // 2. The Bridge: Forward a translated copy to BaraTrustAds / BaraTrust Backend
      try {
        // Safely parse the pay just in case it's missing or a pure number
        const rawPay = String(lead.pay || "");
        const parsedPay = parseInt(rawPay.replace(/[^0-9]/g, ''));
        const safeEstimatedPay = isNaN(parsedPay) ? null : parsedPay * 100;

        // Translate LeadScout's schema into the main database schema
        const payload = {
          source: lead.sourceSite || (lead as any).source || "Unknown",
          jobScope: `${lead.title || "Unknown Job"} - ${lead.description || ""}`,
          estimatedPay: safeEstimatedPay,
          region: lead.region || "Unknown",
          sourceUrl: lead.sourceUrl || ""
        };

        await fetch("http://localhost:3000/api/webhooks/lead-pioneer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${(import.meta as any).env.VITE_LEAD_PIONEER_SECRET}`
          },
          body: JSON.stringify(payload)
        });
        console.log("Successfully forwarded lead payload!");
      } catch (err) {
        console.error("Failed to forward lead payload:", err);
      }
    }

    setIsScouting(false);
  };

  return (
    <div className="flex bg-natural-bg min-h-screen font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-natural-sidebar border-r border-natural-border flex flex-col pt-10">
        <div className="px-8 mb-12 flex items-center gap-3">
          <div className="w-10 h-10 bg-natural-accent rounded-xl flex items-center justify-center text-white">
            <Target className="w-6 h-6" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-natural-heading">LeadPioneer</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem icon={LayoutGrid} label="Active Harvest" active />
          <NavItem icon={Search} label="Lead Pool" />
          <NavItem icon={TrendingUp} label="Region Matrix" />
          <NavItem icon={Settings} label="Configurations" />
        </nav>

        <div className="p-6">
          <div className="bg-[#EAE6DB] rounded-2xl p-5 border border-natural-border shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-natural-text/60 mb-3 font-bold">Agent Status</p>
            <div className="flex items-center gap-2 text-sm font-medium text-natural-text">
              <span className="relative flex h-2 w-2">
                <span className={cn("inline-flex rounded-full h-2 w-2", isScouting ? "animate-ping-slow bg-natural-accent-light" : "bg-zinc-400")}></span>
                <span className={cn("absolute inline-flex rounded-full h-2 w-2", isScouting ? "bg-natural-accent" : "bg-zinc-500")}></span>
              </span>
              {isScouting ? "Scouting Networks..." : "Standby"}
            </div>
            <p className="text-[11px] text-natural-text/70 mt-2 leading-relaxed italic">
              {isScouting ? "Mapping job sectors and bypassing cache layers." : "Ready for next sequence."}
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-natural-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-natural-accent/10 text-natural-accent rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold border border-natural-accent/20">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-natural-heading">{user.email?.split('@')[0]}</p>
              <button onClick={onLogout} className="text-[10px] uppercase font-bold tracking-widest text-red-700/60 hover:text-red-700 transition-colors">
                Terminate Session
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-24 border-b border-natural-border flex items-center justify-between px-10 bg-white/40 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-3xl font-serif italic text-natural-heading leading-tight">Morning Dispatch</h2>
            <p className="text-xs text-natural-text/60 mt-1 uppercase tracking-wider font-medium">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} &bull; {leads.length} leads harvested
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex border border-natural-border rounded-full p-1 bg-natural-sidebar">
              <button
                onClick={() => setView("list")}
                className={cn("p-2 rounded-full transition-all", view === "list" ? "bg-white text-natural-heading shadow-sm" : "text-natural-text/50 hover:text-natural-text")}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={cn("p-2 rounded-full transition-all", view === "grid" ? "bg-white text-natural-heading shadow-sm" : "text-natural-text/50 hover:text-natural-text")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleScout}
              disabled={isScouting}
              className={cn(
                "group px-6 py-3 bg-natural-accent text-white rounded-full text-sm font-semibold shadow-md shadow-natural-accent/10 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50",
                !isScouting && "hover:bg-natural-accent/90"
              )}
            >
              {isScouting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isScouting ? "Harvesting..." : "Scout Sector"}
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className={cn(
          "flex-1 overflow-y-auto p-10 transition-all duration-500",
          view === "grid" ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 auto-rows-min" : "flex flex-col gap-3"
        )}>
          {leads.length === 0 ? (
            <div className="col-span-full h-[60vh] flex flex-col items-center justify-center text-natural-text/30">
              <div className="w-24 h-24 bg-natural-sidebar rounded-full flex items-center justify-center mb-6">
                <Layers className="w-10 h-10 opacity-20" />
              </div>
              <p className="font-serif italic text-2xl">Fields are currently dormant.</p>
              <p className="text-xs uppercase tracking-[0.2em] mt-3 font-bold">Initialize a scout to begin the harvest.</p>
            </div>
          ) : (
            leads.map((lead: any, i) => (
              // @ts-ignore
              <LeadCard
                key={lead.id || `lead-${i}`}
                lead={lead}
                index={i}
                compact={view === "list"}
              />
            ))
          )}
        </div>

        {/* Footer Activity Feed */}
        <footer className="h-16 bg-natural-sidebar border-t border-natural-border px-10 flex items-center overflow-hidden">
          <span className="text-[10px] font-bold text-natural-text/50 uppercase tracking-[0.2em] mr-8">Live Feed:</span>
          <div className="flex gap-12 text-[11px] text-natural-text/70 whitespace-nowrap overflow-hidden">
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-natural-accent"></span> Craigslist sequence verified</div>
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-natural-accent/40"></span> Human-analogue protocol engaged</div>
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-natural-accent"></span> Payload identified in South Austin</div>
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-natural-accent/40"></span> Filtering redundant signals</div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function NavItem({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-xl",
        active ? "bg-[#E5E1D5] text-natural-heading shadow-sm" : "hover:bg-natural-text/5 text-natural-text/60 hover:text-natural-heading"
      )}
    >
      <div className={cn("w-2 h-2 rounded-full", active ? "bg-natural-accent-light" : "bg-transparent border border-natural-border")}></div>
      {label}
    </button>
  );
}