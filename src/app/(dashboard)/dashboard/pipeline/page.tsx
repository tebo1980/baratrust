import React from 'react';

export default function PipelinePage() {
  const columns = [
    { title: "Inbound Intercepts", color: "border-indigo-500/30 text-indigo-400" },
    { title: "Triage & Estimate", color: "border-amber-500/30 text-amber-400" },
    { title: "Ready to Dispatch", color: "border-emerald-500/30 text-emerald-400" },
    { title: "Scheduled Work", color: "border-blue-500/30 text-blue-400" },
    { title: "Invoiced / Complete", color: "border-purple-500/30 text-purple-400" }
  ];

  const mockCards = [
    { id: 1, col: 0, trade: "HVAC", desc: "A/C blowing warm air", contact: "John D.", loc: "Louisville, KY" },
    { id: 2, col: 0, trade: "Plumbing", desc: "Leaking water heater", contact: "Sarah M.", loc: "New Albany, IN" },
    { id: 3, col: 1, trade: "Electrical", desc: "Panel upgrade quote", contact: "Mike T.", loc: "Jeffersonville, IN" },
    { id: 4, col: 2, trade: "HVAC", desc: "Full system replacement", contact: "Emily R.", loc: "Louisville, KY" }
  ];

  return (
    <div className="flex flex-col h-full bg-[#1E1B16] text-slate-200 rounded-xl border border-[#C17B2A]/30 shadow-2xl p-6 overflow-hidden">
      <header className="mb-6 border-b border-[#C17B2A]/20 pb-4">
        <h1 className="text-3xl font-bold tracking-wider text-[#C17B2A] drop-shadow-[0_0_8px_rgba(193,123,42,0.4)]">
          Live Project Pipeline
        </h1>
        <p className="text-amber-500/60 mt-1">Real-time trade Kanban board</p>
      </header>

      <div className="flex gap-6 overflow-x-auto h-full pb-4">
        {columns.map((col, index) => (
          <div key={index} className="flex-1 min-w-[280px] bg-black/40 rounded-lg border border-gray-800/50 flex flex-col">
            <div className={`p-4 border-b bg-gray-900/50 ${col.color}`}>
              <h2 className="text-sm font-bold uppercase tracking-wider">{col.title}</h2>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {mockCards.filter(card => card.col === index).map(card => (
                <div key={card.id} className="bg-[#1E1B16] border border-[#C17B2A]/20 p-4 rounded shadow-md hover:border-[#C17B2A]/60 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold px-2 py-1 bg-amber-500/10 text-[#C17B2A] rounded">
                      {card.trade}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">{card.loc}</span>
                  </div>
                  <p className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">{card.desc}</p>
                  <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {card.contact}
                  </div>
                </div>
              ))}

              {mockCards.filter(card => card.col === index).length === 0 && (
                <div className="h-24 flex items-center justify-center text-gray-600 text-xs italic border border-dashed border-gray-700/50 rounded">
                  No active intercepts
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
