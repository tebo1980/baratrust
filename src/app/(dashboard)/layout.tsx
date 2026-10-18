import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ReactNode } from "react";
import { Bot, Zap, Database, RefreshCcw, Send, ShieldCheck } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-[#050810] text-slate-200 overflow-hidden font-sans">

      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-[#0B0F19] border-r border-indigo-500/20 shadow-xl z-20 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-indigo-500/20">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <span className="text-amber-500 font-bold text-lg tracking-wider">B</span>
            </div>
            <h1 className="text-xl font-bold tracking-widest text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
              BARATRUST SUITE
            </h1>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <nav className="px-4 py-6 space-y-2">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
              Partner Overview
            </Link>
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
              Account Settings
            </Link>
          </nav>

          {/* Internal Operator Section */}
          <div className="px-4 py-2 mb-6">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase px-3 mb-3">Operator Tools</p>
            <div className="space-y-1">
              <Link href="/internal/reviews" className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Review Studio
              </Link>
              <Link href="/leads" className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-slate-800/40 transition-colors">
                <Database className="w-3.5 h-3.5 text-amber-500/70" />
                Lead Radar
              </Link>
              <Link href="/dashboard/pipeline" className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-slate-800/40 transition-colors">
                <RefreshCcw className="w-3.5 h-3.5 text-amber-500/70" />
                Project Pipeline
              </Link>
              <Link href="/internal/report-generator" className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-slate-800/40 transition-colors">
                <Send className="w-3.5 h-3.5 text-amber-500/70" />
                Report Generator
              </Link>
              <Link href="/internal/opportunitywatch-v2" className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-slate-800/40 transition-colors">
                <Zap className="w-3.5 h-3.5 text-amber-500/70" />
                Opportunity Watch
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-[#0B0F19] border-b border-indigo-500/20 z-10 shadow-md">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-200 tracking-wide">Command Center</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">Active</span>
          </div>

          <div className="flex items-center gap-6">
            <button className="text-slate-400 hover:text-cyan-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            </button>
            {process.env.TEST_ENV === 'true' ? (
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/40"></div>
            ) : (
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-9 h-9 border border-indigo-500/40 shadow-[0_0_10px_rgba(79,70,229,0.2)]" } }} />
            )}
          </div>
        </header>

        {/* Canvas */}
        <main className="flex-1 overflow-y-auto p-8 relative before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjU2IDI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjAuMDIiLz48L3N2Zz4=')] before:pointer-events-none before:z-0">
          <div className="relative z-10 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}