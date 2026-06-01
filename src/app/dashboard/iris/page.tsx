"use client";
import React, { useState } from 'react';

export default function IrisDashboard() {
  const [isPaused, setIsPaused] = useState(false);
  const [queue, setQueue] = useState([
    { id: 1, name: "Apex Plumbing & Rooter", trade: "Plumbing", state: "Waiting for Day 1", nextTouch: "2 hours", status: "queued" },
    { id: 2, name: "Titanium Electric", trade: "Electrical", state: "Waiting for Day 3", nextTouch: "Tomorrow", status: "queued" },
    { id: 3, name: "River City HVAC", trade: "HVAC", state: "Day 7 Sent", nextTouch: "Completed", status: "completed" },
  ]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-12">
      {/* 1. Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-indigo-500/20 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-wider text-slate-200 drop-shadow-[0_0_8px_rgba(79,70,229,0.4)]">
              Iris // Follow-Up Sequencer
            </h1>
            <span className={`px-3 py-1 ${isPaused ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'} border rounded-full text-xs font-bold tracking-widest uppercase flex items-center gap-2`}>
              <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}></span>
              {isPaused ? 'PAUSED' : 'Active'}
            </span>
          </div>
          <p className="text-slate-400">Autonomous outbound follow-up tracking and multi-touch cadence.</p>
        </div>

        {/* 4. Quick Actions Panel */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-4 py-2 bg-[#0A1019] border border-amber-500/30 text-amber-400 rounded-lg text-sm font-semibold hover:bg-amber-500/10 transition-colors shadow-lg flex items-center gap-2"
          >
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
             {isPaused ? 'Resume Sequencer' : 'Pause Sequencer'}
          </button>
          <button
            onClick={() => setQueue(prev => [...prev, { id: Date.now(), name: "Mock Lead LLC", trade: "Demo", state: "Day 1 Sent", nextTouch: "3 days", status: "queued" }])}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(79,70,229,0.4)] flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            Test Mock Touch
          </button>
        </div>
      </div>

      {/* 2. 3-Step Touch Timeline */}
      <section className="bg-[#0B0F19] border border-indigo-500/20 rounded-xl p-6 shadow-lg">
        <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-6">Cadence Strategy</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connecting Line (Desktop Only) */}
          <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-indigo-500/20 z-0"></div>

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#0A1019] border-2 border-indigo-500 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
              <span className="text-xl font-bold text-indigo-400">D1</span>
            </div>
            <h3 className="font-bold text-slate-200 mb-1">Friendly Check-In</h3>
            <p className="text-sm text-slate-400">Casual bump 24 hours after initial outreach to ensure delivery.</p>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#0A1019] border-2 border-cyan-500 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <span className="text-xl font-bold text-cyan-400">D3</span>
            </div>
            <h3 className="font-bold text-slate-200 mb-1">Value Add Resource</h3>
            <p className="text-sm text-slate-400">Sharing a relevant case study or free audit tool.</p>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#0A1019] border-2 border-rose-500 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              <span className="text-xl font-bold text-rose-400">D7</span>
            </div>
            <h3 className="font-bold text-slate-200 mb-1">Break-up Message</h3>
            <p className="text-sm text-slate-400">Final touch to close the loop and invoke FOMO.</p>
          </div>
        </div>
      </section>

      {/* 3. Outbound Queue Table */}
      <section className="bg-[#0B0F19] border border-indigo-500/20 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-indigo-500/20 flex items-center justify-between">
           <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Outbound Queue</h2>
           <span className="text-xs text-slate-400 font-medium bg-[#0A1019] px-3 py-1 rounded-full border border-slate-800">{queue.length} Prospects Scheduled</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#0A1019] text-xs uppercase text-slate-500 border-b border-indigo-500/10">
              <tr>
                <th className="px-6 py-4 font-semibold">Business Name</th>
                <th className="px-6 py-4 font-semibold">Core Trade</th>
                <th className="px-6 py-4 font-semibold">Current State</th>
                <th className="px-6 py-4 font-semibold">Next Touch</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/10">
              {queue.map((row) => (
                <tr key={row.id} className="hover:bg-indigo-500/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-200">{row.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-[#0A1019] border border-slate-700 rounded text-xs text-slate-300">
                      {row.trade}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-2 ${row.status === 'completed' ? 'text-slate-500' : 'text-amber-400'}`}>
                      {row.status === 'queued' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                      {row.state}
                    </span>
                  </td>
                  <td className="px-6 py-4">{row.nextTouch}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-400 hover:text-indigo-300 font-medium text-xs uppercase tracking-wider transition-colors">
                      {row.status === 'completed' ? 'View Log' : 'Skip Step'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
