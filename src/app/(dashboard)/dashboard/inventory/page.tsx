"use client";

import React from 'react';
import { PackageSearch, AlertTriangle, CheckCircle2, Box, ArrowDownToLine } from 'lucide-react';

const mockInventory = [
  { sku: "CAP-45M", name: "45 mfd Dual Run Capacitor", category: "HVAC", stock: 4, threshold: 5, unitCost: "$12.50" },
  { sku: "PVC-40-2", name: "2-inch PVC Schedule 40 Pipe (10ft)", category: "Plumbing", stock: 120, threshold: 50, unitCost: "$8.45" },
  { sku: "TH-NEB-PRO", name: "Nest Pro Thermostat", category: "HVAC", stock: 2, threshold: 10, unitCost: "$195.00" },
  { id: "BRK-20A-S", name: "20 Amp Single Pole Breaker", category: "Electrical", stock: 45, threshold: 20, unitCost: "$6.25" },
  { sku: "FL-MERV11-1625", name: "16x25x1 MERV 11 Air Filter", category: "HVAC", stock: 8, threshold: 25, unitCost: "$14.00" },
  { sku: "COP-075-ELB", name: "3/4-inch Copper Elbow", category: "Plumbing", stock: 210, threshold: 100, unitCost: "$1.85" }
];

export default function WarehouseInventoryPage() {

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'HVAC': return 'text-sky-400 bg-sky-400/10 border-sky-400/30';
      case 'Plumbing': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'Electrical': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[#050810] text-slate-200 overflow-hidden font-sans">
      <main className="flex-1 flex flex-col relative w-full">

        {/* Header */}
        <header className="p-6 border-b border-[#C17B2A]/20 bg-[#1E1B16]/50 backdrop-blur-sm flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3 drop-shadow-[0_0_8px_rgba(193,123,42,0.3)]">
              <span className="w-2 h-2 rounded-full bg-[#C17B2A] animate-pulse"></span>
              Warehouse // Inventory Management
            </h2>
            <p className="text-sm text-slate-400 mt-1">Real-time stock monitoring, asset tracking, and reorder dispatch control.</p>
          </div>

          <div className="flex items-center gap-3">
             <button className="px-4 py-2 bg-[#1A1713] hover:bg-[#2A2621] border border-slate-700 text-slate-300 rounded-lg text-sm font-bold tracking-wide transition-colors flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4" />
                Export Ledger
             </button>
            <div className="flex items-center gap-2 bg-[#1E1B16] border border-[#2A2621] px-4 py-2 rounded-lg text-sm">
               <PackageSearch className="w-4 h-4 text-emerald-400" />
               <span className="text-slate-300 font-mono font-semibold tracking-wider">SYNCED</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

          {/* Live Stock Monitoring Matrix */}
          <section className="bg-[#1E1B16] border border-[#2A2621] rounded-xl shadow-lg overflow-hidden flex flex-col">
             <div className="px-6 py-4 border-b border-[#2A2621] bg-[#1A1713] flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <Box className="w-4 h-4 text-[#C17B2A]" />
                 <h3 className="text-sm font-bold tracking-widest text-[#C17B2A] uppercase">Live Stock Monitoring Matrix</h3>
               </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#151310] border-b border-[#2A2621]">
                    <tr>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Part Number SKU</th>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Part Name</th>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Category</th>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs text-right">Unit Cost</th>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs text-center">Stock / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2621]">
                    {mockInventory.map((item, i) => {
                      const isDeficit = item.stock <= item.threshold;

                      return (
                      <tr
                        key={i}
                        className={`transition-colors group ${isDeficit ? 'bg-amber-950/20 border-x-4 border-l-rose-500 border-r-rose-500 hover:bg-amber-950/30' : 'hover:bg-[#231F1A]'}`}
                      >
                        <td className="px-6 py-4 text-slate-500 font-mono font-bold tracking-wider">{item.sku || item.id}</td>
                        <td className="px-6 py-4 text-slate-200 font-medium">{item.name}</td>
                        <td className="px-6 py-4">
                           <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border ${getCategoryColor(item.category)}`}>
                             {item.category}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-[#C17B2A] font-mono font-bold text-right">{item.unitCost}</td>
                        <td className="px-6 py-4 text-center">
                          {isDeficit ? (
                            <div className="flex flex-col items-center gap-1.5 animate-pulse">
                              <span className="text-rose-500 font-mono font-bold text-lg">{item.stock}</span>
                              <span className="flex items-center gap-1 px-2 py-0.5 border border-rose-500/50 bg-rose-500/10 text-rose-400 text-[9px] font-bold uppercase tracking-widest rounded shadow-[0_0_8px_rgba(244,63,94,0.2)]">
                                <AlertTriangle className="w-3 h-3" />
                                [STOCK DEFICIT: REORDER TRIGGERED]
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-emerald-400 font-mono font-bold text-lg">{item.stock}</span>
                              <span className="flex items-center gap-1 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Optimal
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
          </section>

        </div>
      </main>
    </div>
  );
}
