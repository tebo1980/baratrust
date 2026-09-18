import { db } from '@/db'
import { discoveredLeads } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { FlywheelTelemetryRows } from './FlywheelTelemetryRows'

export const dynamic = 'force-dynamic' // Ensure we always fetch the freshest flywheel data

export default async function OpportunityWatchLayout({ children }: { children: React.ReactNode }) {
  // Fetch the latest top 10 targets missing an online footprint
  const rawLeads = await db.select()
    .from(discoveredLeads)
    .where(eq(discoveredLeads.status, 'queued_for_outreach'))
    .orderBy(desc(discoveredLeads.createdAt))
    .limit(10)

  return (
    <div>
      {/* THE RADAR SWEEP UI HUD */}
      <div className="bg-[#1E1B16] pt-10 px-6 border-b border-white/10">
        <div className="max-w-[900px] mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-display text-2xl font-black text-white m-0">
              🛸 Flywheel Radar Sweep
            </h2>
            <span className="bg-blue-500/10 border border-blue-500/30 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-blue-400 tracking-widest uppercase">
              Active Telemetry
            </span>
          </div>
          <p className="text-[14px] text-gray-400 mb-6">
            Real-time feed of local businesses injected from the ingestion layer lacking online footprints. Staged for immediate outreach.
          </p>
          
          <FlywheelTelemetryRows leads={rawLeads} />
        </div>
      </div>

      {/* RENDER THE ORIGINAL V2 PAGE BELOW */}
      {children}
    </div>
  )
}

