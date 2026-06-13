import React from 'react';

export default function WalletsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-[#0B0F19] text-slate-200 rounded-xl border border-indigo-500/20 shadow-lg p-8">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold tracking-wider mb-2 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">Wallets</h1>
      <p className="text-slate-400 text-center max-w-md mt-4">
        This area is currently under construction. Check back soon for integrated wallet management and transaction processing.
      </p>
    </div>
  );
}
