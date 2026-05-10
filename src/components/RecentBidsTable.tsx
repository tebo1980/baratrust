import { db } from "@/db";
import { bids } from "@/db/schema";
import { desc } from "drizzle-orm";

const formatUSD = (cents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

export default async function RecentBidsTable() {
  const recentBids = await db
    .select({
      id: bids.id,
      projectId: bids.projectId,
      status: bids.status,
      laborCost: bids.laborCost,
      equipmentCost: bids.equipmentCost,
      materialsCost: bids.materialsCost,
      createdAt: bids.createdAt,
    })
    .from(bids)
    .orderBy(desc(bids.createdAt))
    .limit(5);

  return (
    <div className="w-full bg-[#0B0F19] border border-indigo-500/20 rounded-xl shadow-lg overflow-hidden mt-8">
      <div className="px-6 py-5 border-b border-indigo-500/20 bg-[#050810]/50">
        <h2 className="text-lg font-bold text-slate-200 tracking-wide">Recent Pipeline Activity</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#050810]/80 border-b border-indigo-500/20 text-xs tracking-wider uppercase text-cyan-400">
              <th className="px-6 py-4 font-semibold">Bid ID</th>
              <th className="px-6 py-4 font-semibold">Project Ref</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-500/10">
            {recentBids.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                  No recent bids found.
                </td>
              </tr>
            ) : (
              recentBids.map((bid) => {
                const totalValueCents = (bid.laborCost || 0) + (bid.equipmentCost || 0) + (bid.materialsCost || 0);
                const dateString = new Date(bid.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                });

                return (
                  <tr key={bid.id} className="hover:bg-indigo-500/5 transition-colors group">
                    <td className="px-6 py-4 text-sm text-slate-300 font-medium">
                      {bid.id.split('-')[0]}...
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {bid.projectId ? bid.projectId.split('-')[0] + '...' : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {dateString}
                    </td>
                    <td className="px-6 py-4">
                      {bid.status.toLowerCase() === 'presented' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.15)] group-hover:shadow-[0_0_12px_rgba(251,191,36,0.3)] transition-all">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse"></span>
                          Presented
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          {bid.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-200 text-right group-hover:text-amber-400 transition-colors">
                      {formatUSD(totalValueCents)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
