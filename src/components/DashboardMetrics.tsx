import { db } from "@/db";
import { bids, wallets } from "@/db/schema";
import { eq, sum } from "drizzle-orm";

const formatUSD = (cents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

export default async function DashboardMetrics() {
  // Query 1: Bids table for pipeline and grants
  const bidsResult = await db
    .select({
      totalLabor: sum(bids.laborCost),
      totalEquipment: sum(bids.equipmentCost),
      totalMaterials: sum(bids.materialsCost),
      totalGrant: sum(bids.grantMoneyFound),
    })
    .from(bids)
    .where(eq(bids.status, "presented"));

  const bidData = bidsResult[0] || { totalLabor: 0, totalEquipment: 0, totalMaterials: 0, totalGrant: 0 };

  const estimatedPipelineCents =
    Number(bidData.totalLabor || 0) +
    Number(bidData.totalEquipment || 0) +
    Number(bidData.totalMaterials || 0);

  const totalGrantCents = Number(bidData.totalGrant || 0);

  // Query 2: Wallets table for captured cash
  const walletsResult = await db
    .select({
      totalCash: sum(wallets.amountCaptured),
    })
    .from(wallets)
    .where(eq(wallets.status, "captured"));

  const totalCashCents = Number(walletsResult[0]?.totalCash || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">

      {/* Metric 1: Estimated Pipeline */}
      <div className="bg-[#0B0F19] border border-indigo-500/30 rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:border-indigo-500/60 flex flex-col justify-center">
        <h3 className="text-sm font-semibold tracking-wider uppercase text-cyan-400 mb-2">
          Estimated Pipeline
        </h3>
        <p className="text-4xl font-bold tracking-tight text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
          {formatUSD(estimatedPipelineCents)}
        </p>
      </div>

      {/* Metric 2: Grant Money Discovered */}
      <div className="bg-[#0B0F19] border border-indigo-500/30 rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:border-indigo-500/60 flex flex-col justify-center">
        <h3 className="text-sm font-semibold tracking-wider uppercase text-cyan-400 mb-2">
          Grant Money Discovered
        </h3>
        <p className="text-4xl font-bold tracking-tight text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
          {formatUSD(totalGrantCents)}
        </p>
      </div>

      {/* Metric 3: Total Cash Collected */}
      <div className="bg-[#0B0F19] border border-indigo-500/30 rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:border-indigo-500/60 flex flex-col justify-center">
        <h3 className="text-sm font-semibold tracking-wider uppercase text-cyan-400 mb-2">
          Total Cash Collected
        </h3>
        <p className="text-4xl font-bold tracking-tight text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
          {formatUSD(totalCashCents)}
        </p>
      </div>

    </div>
  );
}
