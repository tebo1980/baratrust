import React from 'react';

export default function WalletsPage() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-amber-500/20 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-wider text-slate-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
            Wallets // Ledger
          </h1>
          <p className="text-slate-400 mt-2">Manage incoming payments, outstanding invoices, and project funds.</p>
        </div>
      </div>

      {/* Ledger Data Table Skeleton */}
      <div className="bg-[#0B0F19] border border-amber-500/20 rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-200">Recent Transactions</h2>
          <div className="h-8 w-32 bg-[#0A1019] border border-amber-500/30 rounded-md animate-pulse"></div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-[#0A1019] border-y border-amber-500/20 text-amber-400/80">
              <tr>
                <th className="px-4 py-3 font-semibold tracking-wider">Date</th>
                <th className="px-4 py-3 font-semibold tracking-wider">Project</th>
                <th className="px-4 py-3 font-semibold tracking-wider">Amount</th>
                <th className="px-4 py-3 font-semibold tracking-wider">Status</th>
                <th className="px-4 py-3 font-semibold tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-500/10">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="hover:bg-[#0A1019]/50 transition-colors animate-pulse">
                  <td className="px-4 py-4">
                    <div className="h-4 bg-slate-800 rounded w-24"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 bg-slate-800 rounded w-48 mb-1"></div>
                    <div className="h-3 bg-slate-800 rounded w-32 opacity-70"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 bg-slate-800 rounded w-20"></div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-6 w-20 bg-amber-500/10 rounded-full border border-amber-500/20"></div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="h-4 bg-slate-800 rounded w-8 ml-auto"></div>
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
