"use client";

import React from 'react';
import { Calculator, AlertTriangle, CheckCircle2, DollarSign, TrendingDown } from 'lucide-react';

const mockCogsLedger = [
  {
    id: "JOB-4492",
    jobName: "Commercial HVAC Compressor Replace",
    revenue: "$8,500.00",
    materialCost: "$4,250.00",
    laborCost: "$800.00",
    margin: "40.58%",
    margin_alert: false
  },
  {
    id: "JOB-4491",
    jobName: "Emergency Pipe Burst (River Rd)",
    revenue: "$950.00",
    materialCost: "$45.00",
    laborCost: "$150.00",
    margin: "79.47%",
    margin_alert: false
  },
  {
    id: "JOB-4488",
    jobName: "Electrical Panel Upgrade",
    revenue: "$1,850.00",
    materialCost: "$1,400.00",
    laborCost: "$350.00",
    margin: "5.40%",
    margin_alert: true
  },
  {
    id: "JOB-4485",
    jobName: "Routine AC Maintenance",
    revenue: "$180.00",
    materialCost: "$15.00",
    laborCost: "$65.00",
    margin: "55.55%",
    margin_alert: false
  }
];

export default function ColeFinancialsPage() {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[#050810] text-slate-200 overflow-hidden font-sans">
      <main className="flex-1 flex flex-col relative w-full">

        {/* Header */}
        <header className="p-6 border-b border-[#C17B2A]/20 bg-[#1E1B16]/50 backdrop-blur-sm flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3 drop-shadow-[0_0_8px_rgba(193,123,42,0.3)]">
              <span className="w-2 h-2 rounded-full bg-[#C17B2A] animate-pulse"></span>
              Cole // COGS & Inventory Analyst
            </h2>
            <p className="text-sm text-slate-400 mt-1">Real-time cost of goods sold, labor tracking, and net profit margin analytics.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1E1B16] border border-[#2A2621] px-4 py-2 rounded-lg text-sm">
               <Calculator className="w-4 h-4 text-emerald-400" />
               <span className="text-slate-300 font-mono font-semibold tracking-wider">LEDGER SYNCED</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

          {/* Financial Margin Ledger Grid */}
          <section className="bg-[#1E1B16] border border-[#2A2621] rounded-xl shadow-lg overflow-hidden flex flex-col">
             <div className="px-6 py-4 border-b border-[#2A2621] bg-[#1A1713] flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <DollarSign className="w-4 h-4 text-[#C17B2A]" />
                 <h3 className="text-sm font-bold tracking-widest text-[#C17B2A] uppercase">Financial Margin Ledger</h3>
               </div>
               <span className="bg-slate-800 text-slate-400 text-xs font-bold px-3 py-1 rounded-full">
                 LIVE
               </span>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#151310] border-b border-[#2A2621]">
                    <tr>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Job ID</th>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Total Revenue</th>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Material Cost</th>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Labor Cost</th>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs text-right">Net Profit Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2621]">
                    {mockCogsLedger.map((row, i) => (
                      <tr
                        key={i}
                        className={`transition-colors group ${row.margin_alert ? 'bg-rose-950/10 hover:bg-rose-950/20' : 'hover:bg-[#231F1A]'}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-300 font-mono font-bold text-xs">{row.id}</span>
                            <span className="text-slate-500 text-[10px] uppercase tracking-wider">{row.jobName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-emerald-400 font-mono font-bold">{row.revenue}</td>
                        <td className="px-6 py-4 text-rose-400 font-mono font-medium">{row.materialCost}</td>
                        <td className="px-6 py-4 text-rose-400 font-mono font-medium">{row.laborCost}</td>
                        <td className="px-6 py-4 text-right">
                          {row.margin_alert ? (
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-rose-500 font-mono font-bold text-lg">{row.margin}</span>
                              <span className="flex items-center gap-1 px-2 py-0.5 border border-rose-500/50 bg-rose-500/10 text-rose-400 text-[9px] font-bold uppercase tracking-widest rounded shadow-[0_0_8px_rgba(244,63,94,0.2)]">
                                <AlertTriangle className="w-3 h-3" />
                                [MARGIN BREACH: INSIGHT REQUIRED]
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-emerald-400 font-mono font-bold text-lg">{row.margin}</span>
                              <span className="flex items-center gap-1 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Nominal
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </section>

        </div>
      </main>
    </div>
  );
}
