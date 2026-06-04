import React from 'react';

export default function PipelinePage() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-indigo-500/20 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-wider text-slate-200 drop-shadow-[0_0_8px_rgba(79,70,229,0.4)]">
            Pipeline // Deal Flow
          </h1>
          <p className="text-slate-400 mt-2">Active opportunities, scheduled bids, and won contracts.</p>
        </div>
      </div>

      {/* Kanban Board Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {["New Leads", "Contacted", "Estimating", "Won"].map((stage, idx) => (
          <div key={idx} className="bg-[#0B0F19] border border-indigo-500/20 rounded-xl p-4 shadow-lg min-h-[500px] flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest pb-2 border-b border-indigo-500/10">{stage}</h3>

            <div className="flex-1 flex flex-col gap-3">
              {/* Skeleton Cards */}
              <div className="bg-[#0A1019] border border-indigo-500/10 p-4 rounded-lg animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-slate-800 rounded w-1/2 mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-6 w-16 bg-indigo-500/20 rounded-full"></div>
                  <div className="h-6 w-6 bg-slate-800 rounded-full"></div>
                </div>
              </div>
              <div className="bg-[#0A1019] border border-indigo-500/10 p-4 rounded-lg animate-pulse opacity-70">
                <div className="h-4 bg-slate-800 rounded w-5/6 mb-3"></div>
                <div className="h-3 bg-slate-800 rounded w-2/3 mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-6 w-16 bg-indigo-500/20 rounded-full"></div>
                  <div className="h-6 w-6 bg-slate-800 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
