"use client";

import React, { useState } from 'react';
import { Wallet, ArrowDownToLine, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';



export default function WalletsPage() {
  const [balance, setBalance] = useState<number>(14250.00);
  const [isRefueling, setIsRefueling] = useState(false);
  const [transactions, setTransactions] = useState([
    { id: "TRX-8902", date: "Today, 10:42 AM", job: "HVAC Replacement (1202 Main)", amount: "$4,200.00", status: "Settled" },
    { id: "TRX-8901", date: "Today, 09:15 AM", job: "Plumbing Estimate (River Rd)", amount: "$150.00", status: "Processing" },
    { id: "TRX-8899", date: "Yesterday, 04:30 PM", job: "Electrical Panel Upgrade", amount: "$1,850.00", status: "Escrowed" },
    { id: "TRX-8898", date: "Yesterday, 02:10 PM", job: "API Inference (LLM Credits)", amount: "-$12.50", status: "Settled" },
    { id: "TRX-8895", date: "Oct 24, 11:00 AM", job: "Emergency Drain Repair", amount: "$450.00", status: "Settled" }
  ]);

  const handleRefuel = async () => {
    setIsRefueling(true);
    try {
      const res = await fetch('/api/wallets/refuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: 5000 }) // Injects a $50 fuel block
      });
      const data = await res.json();
      if (data.success) {
        // MUTATE LOCAL COMPONENT STATE
        setBalance(prev => prev + 50.00);

        const newTx = {
          id: data.transaction?.id ? `TRX-${data.transaction.id.substring(0, 4).toUpperCase()}` : `TRX-${Math.floor(Math.random() * 10000)}`,
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          job: "Manual Refuel Injection",
          amount: "$50.00",
          status: "Escrowed"
        };

        setTransactions(prev => [newTx, ...prev]);
      }
    } catch (err) {
      console.error("Financial injection mismatch:", err);
    } finally {
      setIsRefueling(false);
    }
  };

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
          <button
            onClick={handleRefuel}
            disabled={isRefueling}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all flex items-center gap-2 ${
              isRefueling
                ? 'bg-[#C17B2A]/50 text-slate-800 cursor-not-allowed'
                : 'bg-[#C17B2A] hover:bg-[#A66721] text-[#050810] shadow-[0_0_15px_rgba(193,123,42,0.4)]'
            }`}
          >
            {isRefueling ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                [⏳ REFUELING...]
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                [⚡ FUND WALLET / REFUEL]
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Top Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-[#1E1B16] border border-[#2A2621] rounded-xl p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Total Escrow Funds</p>
          <h2 className="text-4xl font-bold text-slate-100 font-mono tracking-tight">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
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

        <div className="bg-[#1E1B16] border border-[#2A2621] rounded-xl p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full group-hover:bg-blue-500/10 transition-colors"></div>
          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Gas / Automation Fuel</p>
          <h2 className="text-4xl font-bold text-slate-100 font-mono tracking-tight">8,450 <span className="text-xl text-slate-500">CR</span></h2>
          <p className="text-sm text-blue-400 mt-2 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            LLM API & proxy network active
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
              {transactions.map((trx, i) => (
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

    </div>
  );
}
