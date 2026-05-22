import React from 'react';

export default function PipelinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-[#0B0F19] text-slate-200 rounded-xl border border-indigo-500/20 shadow-lg p-8">
      <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold tracking-wider mb-2 drop-shadow-[0_0_8px_rgba(79,70,229,0.4)]">Pipeline</h1>
      <p className="text-slate-400 text-center max-w-md mt-4">
        This area is currently under construction. Check back soon for full pipeline management and tracking capabilities.
      </p>
    </div>
  );
}
