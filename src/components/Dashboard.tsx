"use client";

import { useState, useEffect } from "react";
import { fetchNeonLeads } from "../lib/actions";
import LeadCard from "./LeadCard";
import { Target, Search, Settings, RefreshCcw, Layers, TrendingUp, LayoutGrid, List } from "lucide-react";
import { cn } from "../lib/utils";

interface DashboardProps {
  user: { email: string; uid?: string };
  onLogout: () => void;
}

interface DbLead {
  id: number;
  title: string;
  price: string | null;
  summary: string | null;
  city: string | null;
  status: string | null;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [isScouting, setIsScouting] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [mounted, setMounted] = useState(false);

  const loadLeads = async () => {
    const data = await fetchNeonLeads();
    setLeads(data as unknown as DbLead[]);
  };

  useEffect(() => {
    setMounted(true);
    loadLeads();
    const interval = setInterval(loadLeads, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleScout = async () => {
    setIsScouting(true);
    await loadLeads();
    setTimeout(() => setIsScouting(false), 1500);
  };

  return (
    // 'w-screen' ensures we bust out of any parent padding
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100 selection:bg-amber-500/30">

      {/* SIDEBAR */}
      <aside className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col shadow-2xl z-20 shrink-0">

        {/* STRICT 88px HEADER */}
        <div className="h-[88px] min-h-[88px] max-h-[88px] px-8 flex items-center gap-4 border-b border-zinc-800/50 shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-wider text-zinc-100 uppercase font-mono truncate">LeadPioneer</span>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          <NavItem icon={LayoutGrid} label="Active Harvest" active />
          <NavItem icon={Search} label="Lead Pool" />
          <NavItem icon={TrendingUp} label="Region Matrix" />
          <NavItem icon={Settings} label="Configurations" />
        </nav>

        <div className="p-6 shrink-0">
          <div className="bg-zinc-950 rounded-xl p-5 border border-zinc-800 shadow-inner">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3 font-mono font-bold">Agent Status</p>
            <div className="flex items-center gap-3 text-sm font-medium text-zinc-300">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className={cn("inline-flex rounded-full h-full w-full", isScouting ? "animate-ping bg-amber-400 opacity-75" : "bg-zinc-600")}></span>
                <span className={cn("absolute inline-flex rounded-full h-2.5 w-2.5", isScouting ? "bg-amber-500" : "bg-zinc-500")}></span>
              </span>
              <span className="font-mono text-xs truncate">{isScouting ? "SWEEPING NETWORKS..." : "STANDBY"}</span>
            </div>
            <p className="text-[10px] text-amber-500/70 mt-3 font-mono truncate">
              [ CONNECTED : NEON DB ]
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 space-y-4 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zinc-800 text-amber-500 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-mono font-bold border border-zinc-700">
              {user?.email?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono font-semibold truncate text-zinc-300">{user?.email || "admin@baratrust"}</p>
              <button onClick={onLogout} className="text-[10px] uppercase font-mono font-bold tracking-widest text-red-500/70 hover:text-red-400 transition-colors mt-1 truncate">
                Terminate Session
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT (min-w-0 prevents flexbox horizontal blowout) */}
      <main className="flex-1 flex flex-col relative h-full min-w-0">

        {/* STRICT 88px HEADER */}
        <header className="h-[88px] min-h-[88px] max-h-[88px] border-b border-zinc-800 flex items-center justify-between px-10 bg-zinc-950 z-10 shrink-0">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-zinc-100 uppercase tracking-wide truncate">Morning Dispatch</h2>
            <p className="text-xs text-amber-500/80 mt-1 uppercase font-mono tracking-widest flex items-center gap-2 truncate">
              <span>{mounted ? new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'SYNCING...'}</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">Payload: {leads.length} Records</span>
            </p>
          </div>

          <div className="flex items-center gap-6 shrink-0 ml-4">
            <div className="flex border border-zinc-800 rounded-lg p-1 bg-zinc-900">
              <button onClick={() => setView("list")} className={cn("p-2 rounded-md transition-all", view === "list" ? "bg-zinc-800 text-amber-500 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setView("grid")} className={cn("p-2 rounded-md transition-all", view === "grid" ? "bg-zinc-800 text-amber-500 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <button onClick={handleScout} disabled={isScouting} className={cn("group px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 rounded-lg text-sm font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50", !isScouting && "hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:from-amber-400 hover:to-amber-500")}>
              {isScouting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Ping Memory Bank
            </button>
          </div>
        </header>

        {/* Scrollable Data Area */}
        <div className="relative flex-1 overflow-hidden flex flex-col bg-zinc-950/50">
          <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none z-0" />

          <div className={cn("flex-1 overflow-y-auto p-10 z-10", view === "grid" ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min" : "flex flex-col gap-3")}>
            {leads.length === 0 ? (
              <div className="col-span-full h-full flex flex-col items-center justify-center text-zinc-600 pb-20">
                <div className="w-24 h-24 bg-zinc-900/50 border border-zinc-800 rounded-full flex items-center justify-center mb-6">
                  <Layers className="w-10 h-10 opacity-50" />
                </div>
                <p className="font-mono text-xl tracking-widest text-zinc-400">NO DATA FOUND</p>
                <p className="text-xs uppercase tracking-[0.2em] mt-3 font-bold text-zinc-600">Waiting for Fetch to drop payload...</p>
              </div>
            ) : (
              leads.map((dbLead: DbLead, i: number) => {
                const mappedLead = {
                  id: dbLead.id,
                  title: dbLead.title,
                  pay: dbLead.price || "TBD",
                  description: dbLead.summary || "",
                  region: dbLead.city || "Unknown",
                  sourceSite: "Craigslist",
                  sourceUrl: `https://${dbLead.city}.craigslist.org/search/sss?query=${encodeURIComponent(dbLead.title)}`,
                  status: dbLead.status || "new"
                };
                return <LeadCard key={`lead-${mappedLead.id}-${i}`} lead={mappedLead} index={i} compact={view === "list"} />
              })
            )}
          </div>
        </div>

        {/* STRICT 48px FOOTER */}
        <footer className="h-[48px] min-h-[48px] max-h-[48px] shrink-0 bg-zinc-950 border-t border-zinc-800 px-10 flex items-center overflow-hidden z-10">
          <span className="text-[10px] font-bold text-amber-500/50 uppercase font-mono tracking-[0.2em] mr-8 shrink-0">System Feed &gt;</span>
          <div className="flex gap-12 text-[10px] font-mono text-zinc-500 whitespace-nowrap overflow-hidden">
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]"></span> Database: Connected</div>
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span> Autopilot: Active</div>
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]"></span> Memory Bank: Synced</div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function NavItem({ icon: Icon, label, active = false }: NavItemProps) {
  return (
    <button className={cn("w-full flex items-center gap-4 px-4 py-3 text-sm transition-all rounded-lg font-mono tracking-wide truncate", active ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 border border-transparent")}>
      <Icon className={cn("w-4 h-4 shrink-0", active ? "text-amber-400" : "text-zinc-600")} />
      <span className="truncate">{label}</span>
    </button>
  );
}