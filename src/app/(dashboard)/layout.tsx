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
              BARATRUST
            </h1>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <nav className="px-4 py-6 space-y-2">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
              Dashboard
            </Link>
            <Link href="/dashboard/pipeline" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              Pipeline
            </Link>
            <Link href="/dashboard/wallets" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
              Wallets
            </Link>
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
              Settings
            </Link>
          </nav>

          {/* NEW ENGINES SECTION */}
          <div className="px-4 py-2 mb-6">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase px-3 mb-3">Engines</p>
            <div className="space-y-2">
              <Link href="/dashboard/brix" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
                <Bot className="w-4 h-4 text-indigo-400" />
                Brix AI
              </Link>
              <Link href="/pioneer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
                <Zap className="w-4 h-4 text-amber-400" />
                Regular Ass Fetch
              </Link>
              <Link href="/leads" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 border border-blue-900/30 shadow-sm transition-all">
                <Database className="w-4 h-4" />
                Lead Command Center
              </Link>
              <Link href="/internal/opportunitywatch-v2" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/20 hover:border-emerald-500/30 border border-transparent transition-all shadow-sm">
                <Send className="w-4 h-4 text-emerald-400" />
                Nova Responder
              </Link>
              <Link href="/dashboard/iris" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-cyan-400 hover:bg-cyan-900/20 hover:border-cyan-500/30 border border-transparent transition-all shadow-sm">
                <RefreshCcw className="w-4 h-4 text-cyan-400" />
                Iris Sequencer
              </Link>
              <Link href="/dashboard/rex" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-pink-400 hover:bg-pink-900/20 hover:border-pink-500/30 border border-transparent transition-all shadow-sm">
                <ShieldCheck className="w-4 h-4 text-pink-400" />
                Rex (Reviews)
              </Link>
              <Link href="/dashboard/max" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-orange-400 hover:bg-orange-900/20 hover:border-orange-500/30 border border-transparent transition-all shadow-sm">
                <Zap className="w-4 h-4 text-orange-400" />
                Max (Dispatch)
              </Link>
              <Link href="/dashboard/della" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-purple-400 hover:bg-purple-900/20 hover:border-purple-500/30 border border-transparent transition-all shadow-sm">
                <Send className="w-4 h-4 text-purple-400" />
                Della (Screener)
              </Link>
              <Link href="/dashboard/gemma" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/20 hover:border-emerald-500/30 border border-transparent transition-all shadow-sm">
                <Database className="w-4 h-4 text-emerald-400" />
                Gemma (Logistics)
              </Link>
            </div>
          </div>
        </div>

        {/* Admin Section */}
        <div className="px-4 pb-6 mt-auto">
          <div className="pt-4 border-t border-indigo-500/20">
            <Link href="/agents" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] transition-all group">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Agent Center
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold bg-red-500/20 px-2 py-0.5 rounded text-red-300">Admin</span>
            </Link>
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
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-9 h-9 border border-indigo-500/40 shadow-[0_0_10px_rgba(79,70,229,0.2)]" } }} />
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