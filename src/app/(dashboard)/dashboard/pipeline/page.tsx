"use client";

import React, { useState } from 'react';

type TradeType = 'HVAC' | 'Plumbing' | 'Electrical';

interface Lead {
  id: string;
  trade: TradeType;
  description: string;
  confidence: number;
  timestamp: string;
}

interface Column {
  id: string;
  title: string;
  leads: Lead[];
}

const initialData: Column[] = [
  {
    id: "col-1",
    title: "Inbound Intercepts",
    leads: [
      { id: "lead-1", trade: "HVAC", description: "AC blowing hot air, weird noise.", confidence: 92, timestamp: "10m ago" },
      { id: "lead-2", trade: "Plumbing", description: "Leaky main valve in basement.", confidence: 85, timestamp: "30m ago" }
    ]
  },
  {
    id: "col-2",
    title: "Triage & Estimate",
    leads: [
      { id: "lead-3", trade: "Electrical", description: "Breaker panel sparking.", confidence: 98, timestamp: "1h ago" }
    ]
  },
  {
    id: "col-3",
    title: "Ready to Dispatch",
    leads: []
  },
  {
    id: "col-4",
    title: "Scheduled Work",
    leads: [
      { id: "lead-4", trade: "HVAC", description: "Full system replacement (1202 Main).", confidence: 100, timestamp: "2h ago" }
    ]
  },
  {
    id: "col-5",
    title: "Invoiced / Complete",
    leads: []
  }
];

export default function PipelinePage() {
  const [columns, setColumns] = useState<Column[]>(initialData);

  const handleAddMockLead = () => {
    const trades: TradeType[] = ['HVAC', 'Plumbing', 'Electrical'];
    const randomTrade = trades[Math.floor(Math.random() * trades.length)];

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      trade: randomTrade,
      description: "Auto-generated mock inquiry detected via Della.",
      confidence: Math.floor(Math.random() * (99 - 70 + 1)) + 70, // 70 to 99
      timestamp: "Just now"
    };

    setColumns(prev => {
      const newCols = [...prev];
      newCols[0].leads = [newLead, ...newCols[0].leads];
      return newCols;
    });
  };

  const getTradeColor = (trade: TradeType) => {
    switch (trade) {
      case 'HVAC': return 'text-sky-400 bg-sky-400/10 border-sky-400/30';
      case 'Plumbing': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'Electrical': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  return (
    <div className="w-full h-[calc(100vh-100px)] flex flex-col">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-wider text-slate-200 drop-shadow-[0_0_8px_rgba(79,70,229,0.4)]">
            Active Pipeline
          </h1>
          <p className="text-slate-400 mt-1">Live dispatch routing and Kanban lead management.</p>
        </div>
        <button
          onClick={handleAddMockLead}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Mock Lead
        </button>
      </div>

      {/* Kanban Board Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4">
        <div className="flex gap-6 h-full min-w-max">
          {columns.map((col) => (
            <div key={col.id} className="w-80 flex flex-col bg-[#080b14] border border-slate-800 rounded-xl overflow-hidden shadow-xl">

              {/* Column Header */}
              <div className="px-4 py-3 bg-[#0B0F19] border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-sm font-bold tracking-widest uppercase text-slate-300">{col.title}</h3>
                <span className="bg-slate-800 text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {col.leads.length}
                </span>
              </div>

              {/* Column Body / Cards */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                {col.leads.map((lead) => (
                  <div key={lead.id} className="bg-[#0b1329] border border-indigo-900/40 rounded-lg p-4 cursor-grab hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(79,70,229,0.15)] transition-all flex flex-col gap-3">

                    {/* Top Row: Trade Badge & Score */}
                    <div className="flex justify-between items-start">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${getTradeColor(lead.trade)}`}>
                        {lead.trade}
                      </span>

                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2 py-1 rounded-md shadow-inner">
                        <div className={`w-1.5 h-1.5 rounded-full ${lead.confidence > 90 ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                        <span className="text-[10px] font-mono font-bold text-slate-300">
                          {lead.confidence}%
                        </span>
                      </div>
                    </div>

                    {/* Middle: Description */}
                    <p className="text-sm text-slate-200 font-medium leading-relaxed">
                      "{lead.description}"
                    </p>

                    {/* Bottom: Timestamp & ID */}
                    <div className="flex justify-between items-center border-t border-slate-800 pt-2 mt-1">
                      <span className="text-[10px] text-slate-500 font-mono">ID: {lead.id.split('-')[1].slice(-4)}</span>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        {lead.timestamp}
                      </span>
                    </div>

                  </div>
                ))}

                {col.leads.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-800 rounded-lg opacity-50">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Drop Zone</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
