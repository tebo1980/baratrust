"use client";

import React from 'react';
import { Truck, MapPin, Gauge, Clock, PenTool, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

const mockFleet = [
  { id: "V-104", label: "Truck #1 - HVAC Response", tech: "J. Peterson", odometer: "42,104 mi", status: "Dispatched" },
  { id: "V-202", label: "Van #2 - Plumbing Rapid", tech: "M. Davis", odometer: "18,442 mi", status: "Available" },
  { id: "V-305", label: "Box Truck #3 - Electrical", tech: "T. Barnes", odometer: "89,011 mi", status: "Maintenance" }
];

const mockTripLogs = [
  { id: "JOB-4492", route: "Central HQ -> New Albany Industrial Park", distance: "24.5 mi roundtrip", status: "Completed" },
  { id: "JOB-4491", route: "Central HQ -> Downtown Metro Plaza", distance: "18.2 mi roundtrip", status: "Completed" },
  { id: "JOB-4488", route: "Supplier (Ferguson) -> 1202 Main St", distance: "8.4 mi one-way", status: "Active" }
];

export default function FlynnFleetPage() {
  const getFleetBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5" /> Available
          </span>
        );
      case 'Dispatched':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-md">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> Dispatched
          </span>
        );
      case 'Maintenance':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider rounded-md">
            <AlertTriangle className="w-3.5 h-3.5" /> Maintenance
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
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3 drop-shadow-[0_0_8px_rgba(193,123,42,0.3)]">
              <span className="w-2 h-2 rounded-full bg-[#C17B2A] animate-pulse"></span>
              Flynn // Fleet & Mileage Tracker
            </h2>
            <p className="text-sm text-slate-400 mt-1">Autonomous vehicle routing, odometer logging, and maintenance tracking.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1E1B16] border border-[#2A2621] px-4 py-2 rounded-lg text-sm">
               <ShieldCheck className="w-4 h-4 text-emerald-400" />
               <span className="text-slate-300 font-mono font-semibold tracking-wider">GPS ACTIVE</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

          {/* Active Fleet Status Grid */}
          <section>
            <h3 className="text-sm font-bold tracking-widest text-[#C17B2A] uppercase mb-4 border-b border-[#2A2621] pb-2">Active Fleet Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockFleet.map((vehicle) => (
                <div key={vehicle.id} className="bg-[#1E1B16] border border-[#2A2621] rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-[#C17B2A]/30 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-mono font-bold tracking-widest mb-1">{vehicle.id}</p>
                      <h4 className="text-lg font-bold text-slate-200">{vehicle.label}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#0B0F19] border border-slate-800 flex items-center justify-center">
                       {vehicle.status === 'Maintenance' ? <PenTool className="w-5 h-5 text-rose-500" /> : <Truck className="w-5 h-5 text-[#C17B2A]" />}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-[#0B0F19] px-3 py-2 rounded border border-slate-800">
                      <span className="text-xs text-slate-400 uppercase font-semibold">Tech Assigned</span>
                      <span className="text-sm font-bold text-slate-300">{vehicle.tech}</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#0B0F19] px-3 py-2 rounded border border-slate-800">
                      <span className="text-xs text-slate-400 uppercase font-semibold flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5"/> Odometer</span>
                      <span className="text-sm font-mono font-bold text-slate-300">{vehicle.odometer}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end border-t border-[#2A2621] pt-3">
                    {getFleetBadge(vehicle.status)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Live Mileage Logs Ledger */}
          <section className="bg-[#1E1B16] border border-[#2A2621] rounded-xl shadow-lg overflow-hidden flex flex-col mt-8">
             <div className="px-6 py-4 border-b border-[#2A2621] bg-[#1A1713] flex items-center gap-2">
               <MapPin className="w-4 h-4 text-[#C17B2A]" />
               <h3 className="text-sm font-bold tracking-widest text-[#C17B2A] uppercase">Live Mileage Logs Ledger</h3>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#151310] border-b border-[#2A2621]">
                    <tr>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Job ID</th>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs">Calculated Route</th>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs text-right">AI-Estimated Distance</th>
                      <th className="px-6 py-4 font-bold text-slate-400 tracking-wider uppercase text-xs text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2621]">
                    {mockTripLogs.map((log, i) => (
                      <tr key={i} className="hover:bg-[#231F1A] transition-colors group">
                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{log.id}</td>
                        <td className="px-6 py-4 text-slate-300 font-medium">{log.route}</td>
                        <td className="px-6 py-4 font-mono font-bold text-right text-[#C17B2A]">{log.distance}</td>
                        <td className="px-6 py-4 text-center">
                           <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${log.status === 'Completed' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/30 text-amber-400 bg-amber-500/10'}`}>
                             {log.status}
                           </span>
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
