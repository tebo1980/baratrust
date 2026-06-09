"use client";

import React from 'react';
import { Package, Truck, Search, CheckCircle2, Clock, MapPin, Database } from 'lucide-react';

const sourcingQueue = [
  { id: "ORD-9902", supplyHouse: "Kentuckiana Parts Distributors", materials: "Commercial AC Compressor (5 Ton) + Refrigerant R-410A", requestedAt: "Just now", status: "Price Locked" },
  { id: "ORD-9901", supplyHouse: "Ohio Valley Supply House", materials: "3/4-inch Copper Elbows (x50)", requestedAt: "10:15 AM", status: "Price Locked" },
  { id: "ORD-9899", supplyHouse: "Ferguson Plumbing Supply", materials: "PVC Schedule 40 Pipe (100ft)", requestedAt: "Yesterday", status: "Dispatched to Site" }
];

export default function GemmaAgentPage() {

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Price Locked':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5" /> Price Locked
          </span>
        );
      case 'Dispatched to Site':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-md">
            <Truck className="w-3.5 h-3.5" /> Dispatched
          </span>
        );
      case 'Sourcing':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider rounded-md">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> Sourcing
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[#050810] text-slate-200 overflow-hidden font-sans">
      <main className="flex-1 flex flex-col relative w-full">

        {/* Header */}
        <header className="p-6 border-b border-[#C17B2A]/20 bg-[#1E1B16]/50 backdrop-blur-sm flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-wider text-slate-100 drop-shadow-[0_0_8px_rgba(193,123,42,0.3)] flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Gemma // Logistics & Procurement
            </h2>
            <p className="text-sm text-slate-400 mt-1">Autonomous parts sourcing, pricing matrices, and inventory control.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1E1B16] border border-[#2A2621] px-4 py-2 rounded-lg text-sm">
               <Database className="w-4 h-4 text-[#C17B2A]" />
               <span className="text-slate-300 font-mono font-semibold tracking-wider">DB: CONNECTED</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

          {/* Top Panel: Sourcing Queue & Price Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Active Sourcing Queue */}
            <section className="bg-[#1E1B16] border border-[#2A2621] rounded-xl shadow-lg overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-[#2A2621] bg-[#1A1713] flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <Search className="w-4 h-4 text-[#C17B2A]" />
                   <h3 className="text-sm font-bold tracking-widest text-[#C17B2A] uppercase">Active Sourcing Queue</h3>
                </div>
                <span className="bg-slate-800 text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {sourcingQueue.length} Active
                </span>
              </div>

              <div className="p-2 flex-1 flex flex-col gap-2">
                {sourcingQueue.map((order) => (
                  <div key={order.id} className="p-4 rounded-lg bg-[#0B0F19] border border-slate-800 hover:border-[#C17B2A]/30 transition-colors flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{order.supplyHouse}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{order.id}</span>
                    </div>
                    <p className="text-sm text-slate-200 font-medium">"{order.materials}"</p>
                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-800/50">
                      <span className="text-[10px] text-slate-500 font-medium">Requested: {order.requestedAt}</span>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Materials Breakout & Price Lock Ledger */}
            <section className="bg-[#1E1B16] border border-[#2A2621] rounded-xl shadow-lg overflow-hidden flex flex-col">
               <div className="px-6 py-4 border-b border-[#2A2621] bg-[#1A1713] flex items-center gap-2">
                 <Package className="w-4 h-4 text-[#C17B2A]" />
                 <h3 className="text-sm font-bold tracking-widest text-[#C17B2A] uppercase">Price-Lock Status Ledger</h3>
               </div>

               <div className="p-6 flex-1 flex flex-col gap-4">
                  <p className="text-sm text-slate-400 mb-2">Gemma is currently parsing quotes for ongoing field operations.</p>

                  {/* Ledger Item 1 */}
                  <div className="flex items-center justify-between p-4 bg-[#0B0F19] border border-[#C17B2A]/20 shadow-[0_0_10px_rgba(193,123,42,0.05)] rounded-lg">
                    <div>
                      <p className="text-sm font-bold text-slate-200">Commercial AC Compressor (5 Ton) + R-410A</p>
                      <p className="text-xs text-slate-500 mt-1">Vendor: Kentuckiana Parts Distributors</p>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-mono font-bold text-[#C17B2A]">$4,250.00</p>
                       <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1">Price Locked</p>
                    </div>
                  </div>

                  {/* Ledger Item 2 */}
                  <div className="flex items-center justify-between p-4 bg-[#0B0F19] border border-[#C17B2A]/20 shadow-[0_0_10px_rgba(193,123,42,0.05)] rounded-lg">
                    <div>
                      <p className="text-sm font-bold text-slate-200">3/4-inch Copper Elbows (x50)</p>
                      <p className="text-xs text-slate-500 mt-1">Vendor: Kentuckiana Parts</p>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-mono font-bold text-[#C17B2A]">$142.50</p>
                       <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1">Quoted Price</p>
                    </div>
                  </div>

                  {/* Ledger Item 3 */}
                  <div className="flex items-center justify-between p-4 bg-[#0B0F19] border border-slate-800 rounded-lg opacity-60">
                    <div>
                      <p className="text-sm font-bold text-slate-200">PVC Schedule 40 Pipe (100ft)</p>
                      <p className="text-xs text-slate-500 mt-1">Vendor: Ferguson Plumbing</p>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-mono font-bold text-slate-400">$68.00</p>
                       <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">Settled & Locked</p>
                    </div>
                  </div>
               </div>
            </section>

          </div>
        </div>

      </main>
    </div>
  );
}
