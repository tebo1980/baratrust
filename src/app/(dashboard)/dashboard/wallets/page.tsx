"use client";

import React from 'react';
import { Wallet, ArrowDownToLine, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const mockTransactions = [
  { id: "TRX-8903", date: "Just now", job: "API Inference (Multi-Agent Cascade)", amount: "-$3.75", status: "Settled" },
  { id: "TRX-8902", date: "Today, 10:42 AM", job: "HVAC Replacement (1202 Main)", amount: "$4,200.00", status: "Settled" },
  { id: "TRX-8901", date: "Today, 09:15 AM", job: "Plumbing Estimate (River Rd)", amount: "$150.00", status: "Processing" },
  { id: "TRX-8899", date: "Yesterday, 04:30 PM", job: "Electrical Panel Upgrade", amount: "$1,850.00", status: "Escrowed" },
  { id: "TRX-8898", date: "Yesterday, 02:10 PM", job: "API Inference (LLM Credits)", amount: "-$12.50", status: "Settled" }
];

export default function WalletsPage() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Settled':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
          </span>
        );
      case 'Escrowed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-md">
            <AlertCircle className="w-3.5 h-3.5" /> Escrowed
          </span>
        );
      case 'Processing':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider rounded-md">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> Processing
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12 font-sans bg-[#050810] min-h-full">

      {/* 1. Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2A2621] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-8 h-8 text-[#C17B2A]" />
            <h1 className="text-3xl font-bold tracking-wider text-slate-100 drop-shadow-[0_0_8px_rgba(193,123,42,0.3)]">
              Asset & Transaction Ledger
            </h1>
          </div>
          <p className="text-slate-400">Manage operational balances, escrow holdings, and field transaction logs.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 bg-[#1E1B16] hover:bg-[#2A2621] border border-[#C17B2A]/30 text-[#C17B2A] rounded-lg text-sm font-bold tracking-wide transition-colors flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4" />
            Export Ledger (CSV)
          </button>
          <button className="px-5 py-2.5 bg-[#C17B2A] hover:bg-[#A66721] text-[#050810] rounded-lg text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(193,123,42,0.4)] flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Fund Wallet
          </button>
        </div>
      </div>

      {/* 2. Top Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-[#1E1B16] border border-[#2A2621] rounded-xl p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Total Escrow Funds</p>
          <h2 className="text-4xl font-bold text-slate-100 font-mono tracking-tight">$14,250.00</h2>
          <p className="text-sm text-emerald-400 mt-2 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Standing credit pool active
          </p>
        </div>

        <div className="bg-[#1E1B16] border border-[#2A2621] rounded-xl p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full group-hover:bg-amber-500/10 transition-colors"></div>
          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Pending Disbursements</p>
          <h2 className="text-4xl font-bold text-slate-100 font-mono tracking-tight">$3,400.00</h2>
          <p className="text-sm text-amber-400 mt-2 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Tied to uncompleted estimates
          </p>
        </div>

        <div className="bg-[#1E1B16] border border-[#2A2621] rounded-xl p-6 shadow-lg relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C17B2A]/5 blur-3xl rounded-full group-hover:bg-[#C17B2A]/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Gas / Automation Fuel</p>
              <h2 className="text-4xl font-bold text-slate-100 font-mono tracking-tight">1,240 <span className="text-xl text-slate-500">CR</span></h2>
            </div>
            {/* SVG Semi-Circular Gauge */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Track */}
                <path
                  className="text-slate-800"
                  strokeDasharray="100, 100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                />
                {/* Progress Fill (12% capacity, below threshold) */}
                <path
                  className="text-rose-500 animate-pulse"
                  strokeDasharray="12, 100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-rose-400 animate-pulse">12%</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-rose-400 mt-4 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            Low Fuel: Auto-Recharge pending
          </p>
        </div>

      </div>

      {/* 3. Transaction Ledger Table */}
      <div className="bg-[#1E1B16] border border-[#2A2621] rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2A2621] bg-[#1A1713] flex justify-between items-center">
          <h3 className="text-sm font-bold tracking-widest text-[#C17B2A] uppercase">Recent Transactions</h3>
          <span className="text-xs font-mono text-slate-500">LIVE FEED</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#151310] border-b border-[#2A2621]">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Date / Time</th>
                <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Transaction ID</th>
                <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Associated Job / Lead</th>
                <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Status</th>
                <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2621]">
              {mockTransactions.map((trx, i) => (
                <tr key={i} className="hover:bg-[#231F1A] transition-colors group">
                  <td className="px-6 py-4 text-slate-300 font-medium">{trx.date}</td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{trx.id}</td>
                  <td className="px-6 py-4 text-slate-200">{trx.job}</td>
                  <td className="px-6 py-4">
                    {getStatusBadge(trx.status)}
                  </td>
                  <td className={`px-6 py-4 font-mono font-bold text-right ${trx.amount.startsWith('-') ? 'text-slate-400' : 'text-slate-100'}`}>
                    {trx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. High-Contrast Trend Line (SVG Chart Grid) */}
      <div className="bg-[#1E1B16] border border-[#2A2621] rounded-xl shadow-xl overflow-hidden p-6">
        <h3 className="text-sm font-bold tracking-widest text-[#C17B2A] uppercase mb-6">Weekly Operational Cash Flow (7-Day Span)</h3>

        <div className="relative w-full h-64">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 300">
            {/* Dotted Background Grid Mesh */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#2A2621" strokeWidth="1" strokeDasharray="2,2"/>
              </pattern>
            </defs>
            <rect width="1000" height="300" fill="url(#grid)" />

            {/* X and Y Axis Lines */}
            <line x1="0" y1="300" x2="1000" y2="300" stroke="#333" strokeWidth="2" />
            <line x1="0" y1="0" x2="0" y2="300" stroke="#333" strokeWidth="2" />

            {/* Amber Trend Line */}
            <path
              d="M 50 250 L 200 180 L 350 210 L 500 120 L 650 150 L 800 80 L 950 40"
              fill="none"
              stroke="#C17B2A"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Data Nodes */}
            <circle cx="50" cy="250" r="6" fill="#1E1B16" stroke="#C17B2A" strokeWidth="3" />
            <circle cx="200" cy="180" r="6" fill="#1E1B16" stroke="#C17B2A" strokeWidth="3" />
            <circle cx="350" cy="210" r="6" fill="#1E1B16" stroke="#C17B2A" strokeWidth="3" />
            <circle cx="500" cy="120" r="6" fill="#1E1B16" stroke="#C17B2A" strokeWidth="3" />
            <circle cx="650" cy="150" r="6" fill="#1E1B16" stroke="#C17B2A" strokeWidth="3" />
            <circle cx="800" cy="80" r="6" fill="#1E1B16" stroke="#C17B2A" strokeWidth="3" />
            <circle cx="950" cy="40" r="6" fill="#1E1B16" stroke="#C17B2A" strokeWidth="3" />
          </svg>
        </div>
      </div>

    </div>
  );
}
