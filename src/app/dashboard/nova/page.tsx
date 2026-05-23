import React from 'react';
export default function NovaDashboard() {
  const activityLog = [
    { id: 1, time: "10:42 AM", action: "INITIAL INTAKE", target: "Apex Plumbing & Rooter", status: "Processed" },
    { id: 2, time: "10:45 AM", action: "PRIORITY ALERT", target: "Titanium Electric (Score: 92)", status: "Dispatched" },
    { id: 3, time: "11:15 AM", action: "AUTO-REPLY", target: "River City HVAC", status: "Confirmed" },
    { id: 4, time: "11:30 AM", action: "INTAKE QUEUE", target: "Searching local Reddit threads...", status: "Active" },
  ];
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-12">
      {/* 1. Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-amber-500/20 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-wider text-slate-200 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
              Nova // Real-Time Responder
            </h1>
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(245,158,11,0.15)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Live
            </span>
          </div>
          <p className="text-slate-400">High-priority lead intake, automated evaluation, and immediate dispatch protocols.</p>
        </div>

        {/* Quick Actions Panel */}
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-[#0A1019] border border-rose-500/30 text-rose-400 rounded-lg text-sm font-semibold hover:bg-rose-500/10 transition-colors shadow-lg flex items-center gap-2">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
             Halt Intake
          </button>
          <button className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-900 border border-amber-500 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            Trigger Manual Dispatch
          </button>
        </div>
      </div>
      {/* 2. System Status Overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0B0F19] border border-amber-500/20 rounded-xl p-6 shadow-lg">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Leads Processed Today</div>
          <div className="text-3xl font-bold text-amber-400">142</div>
        </div>
        <div className="bg-[#0B0F19] border border-amber-500/20 rounded-xl p-6 shadow-lg">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Priority Dispatches</div>
          <div className="text-3xl font-bold text-rose-400">18</div>
        </div>
        <div className="bg-[#0B0F19] border border-amber-500/20 rounded-xl p-6 shadow-lg">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Average Response Time</div>
          <div className="text-3xl font-bold text-emerald-400">~1.2s</div>
        </div>
      </section>
      {/* 3. Live Terminal / Activity Feed */}
      <section className="bg-[#0B0F19] border border-amber-500/20 rounded-xl shadow-lg overflow-hidden flex flex-col h-[400px]">
        <div className="p-4 border-b border-amber-500/20 flex items-center justify-between bg-[#0A1019]">
           <div className="flex items-center gap-2">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
             <h2 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Nova Terminal</h2>
           </div>
           <span className="text-xs text-slate-400 font-medium bg-[#0B0F19] px-3 py-1 rounded-full border border-slate-800">Connection: SECURE</span>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#050810] font-mono text-sm space-y-4">
          <div className="text-slate-500">Initializing Nova Responder Protocols...</div>
          <div className="text-emerald-500">✓ System ready. Awaiting intake events.</div>
          <div className="text-slate-500 border-b border-slate-800/50 pb-2">----------------------------------------------------</div>

          {activityLog.map((log) => (
            <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-slate-900/50 p-2 rounded transition-colors">
              <span className="text-slate-500 w-20 shrink-0">[{log.time}]</span>
              <span className={`w-32 shrink-0 font-semibold ${log.action.includes('PRIORITY') ? 'text-rose-400' : 'text-amber-400'}`}>
                {log.action}
              </span>
              <span className="text-slate-300 flex-1 truncate">{log.target}</span>
              <span className="text-slate-400 text-xs px-2 py-1 bg-slate-900 border border-slate-800 rounded hidden sm:block">
                {log.status}
              </span>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-4">
            <span className="text-amber-500 animate-pulse">_</span>
            <span className="text-slate-600">listening on channel /api/internal/nova-responder/dispatch...</span>
          </div>
        </div>
      </section>
    </div>
  );
}
