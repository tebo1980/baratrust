import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db"; // Wherever your Drizzle instance lives
import { bids, wallets, projects, businesses } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export default async function DashboardMetrics() {
  // 1. The Bouncer: Grab the unique Clerk ID of the person viewing the page
  const { userId } = auth();

  // 2. The Kickout: If they aren't logged in, instantly bounce them to the login screen
  if (!userId) {
    redirect("/sign-in");
  }

  // 3. The Secure Pipeline Query
  const [pipelineData] = await db
    .select({
      pipelineValue: sql<number>`sum(${bids.laborCost} + ${bids.equipmentCost} + ${bids.materialsCost})`.mapWith(Number),
      grantMoney: sql<number>`sum(${bids.grantMoneyFound})`.mapWith(Number),
    })
    .from(bids)
    .innerJoin(projects, eq(bids.projectId, projects.id)) // Join to check ownership
    .innerJoin(businesses, eq(businesses.id, sql`${projects.businessId}::int`))
    .where(
      and(
        eq(bids.status, 'presented'),
        eq(businesses.clerkId, userId) // SECURITY: Only pull data where the project belongs to this specific Clerk user
      )
    );

  // 4. The Secure Cash Query
  const [cashData] = await db
    .select({
      cashCollected: sql<number>`sum(${wallets.amountCaptured})`.mapWith(Number),
    })
    .from(wallets)
    .innerJoin(projects, eq(wallets.projectId, projects.id))
    .innerJoin(businesses, eq(businesses.id, sql`${projects.businessId}::int`))
    .where(
      and(
        eq(wallets.status, 'captured'),
        eq(businesses.clerkId, userId) // SECURITY: Strict isolation
      )
    );

  // Format to USD
  const formatUSD = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);

  // 5. Render Antigravity's UI
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      {/* Estimated Pipeline Card */}
      <div className="bg-[#0B0F19] border border-indigo-500/30 rounded-xl p-6 hover:shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-shadow">
        <h3 className="text-cyan-400 text-sm font-medium uppercase tracking-wider mb-2">Estimated Pipeline</h3>
        <p className="text-amber-400 text-4xl font-bold">{formatUSD(pipelineData?.pipelineValue)}</p>
      </div>

      {/* Grant Money Card */}
      <div className="bg-[#0B0F19] border border-indigo-500/30 rounded-xl p-6 hover:shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-shadow">
        <h3 className="text-cyan-400 text-sm font-medium uppercase tracking-wider mb-2">Grants Discovered</h3>
        <p className="text-amber-400 text-4xl font-bold">{formatUSD(pipelineData?.grantMoney)}</p>
      </div>

      {/* Cash Collected Card */}
      <div className="bg-[#0B0F19] border border-indigo-500/30 rounded-xl p-6 hover:shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-shadow">
        <h3 className="text-cyan-400 text-sm font-medium uppercase tracking-wider mb-2">Cash Collected</h3>
        <p className="text-amber-400 text-4xl font-bold">{formatUSD(cashData?.cashCollected)}</p>
      </div>
    </div>
  );
}
