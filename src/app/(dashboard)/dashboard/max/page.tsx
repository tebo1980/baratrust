import React from 'react';
import { db } from "@/db";
import { fleetVehicles, mileageLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export default async function MaxDashboardPage() {
  let vehicles: any[] = [];
  let logs: any[] = [];
  let fetchError = false;

  try {
    vehicles = await db.select().from(fleetVehicles).orderBy(desc(fleetVehicles.createdAt));
    logs = await db.select().from(mileageLogs).orderBy(desc(mileageLogs.loggedAt)).limit(50);
  } catch (error) {
    console.error("Max Page DB Fetch Error:", error);
    fetchError = true;
  }

  return (
    <div className="flex flex-col h-full bg-[#1E1B16] text-slate-200 rounded-xl border border-[#C17B2A]/30 shadow-2xl p-6 overflow-hidden">
      <header className="mb-6 border-b border-[#C17B2A]/20 pb-4">
        <h1 className="text-3xl font-bold tracking-wider text-[#C17B2A] drop-shadow-[0_0_8px_rgba(193,123,42,0.4)]">
          Max Dispatch Engine
        </h1>
        <p className="text-amber-500/60 mt-1">Live Technician Route Pools & Active Dispatch Logs</p>
      </header>

      {fetchError && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded text-red-400">
          <h2 className="font-bold text-lg mb-1">⚠️ Connection Reset</h2>
          <p className="text-sm">Dispatch ledger temporarily degraded. Reconnecting to Neon Postgres...</p>
        </div>
      )}

      {!fetchError && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
          {/* Technician Route Pools / Vehicles */}
          <div className="bg-black/40 rounded-lg border border-gray-800/50 p-4">
            <h2 className="text-xl font-bold text-gray-300 border-b border-gray-700 pb-2 mb-4">Technician Route Pools</h2>
            {vehicles.length === 0 ? (
              <p className="text-gray-500 italic">No vehicles active in the fleet.</p>
            ) : (
              <ul className="space-y-3">
                {vehicles?.map((v) => (
                  <li key={v.id} className="p-3 bg-[#1E1B16] border border-gray-700 rounded flex justify-between items-center">
                    <div>
                      <p className="font-bold text-emerald-400">{v.truckIdentifier}</p>
                      <p className="text-xs text-gray-400">Tech: {v.assignedTechnician || 'Unassigned'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold px-2 py-1 rounded ${v.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {v.status}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">Odo: {v.currentOdometer} mi</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Active Dispatch Logs / Mileage */}
          <div className="bg-black/40 rounded-lg border border-gray-800/50 p-4">
            <h2 className="text-xl font-bold text-gray-300 border-b border-gray-700 pb-2 mb-4">Active Dispatch Logs</h2>
            {logs.length === 0 ? (
              <p className="text-gray-500 italic">No recent dispatch logs.</p>
            ) : (
              <ul className="space-y-3">
                {logs?.map((log) => (
                  <li key={log.id} className="p-3 bg-[#1E1B16] border border-gray-700 rounded">
                    <p className="font-bold text-amber-400 text-sm">Lead ID: {log.leadId}</p>
                    <p className="text-xs text-gray-300 mt-1">Route: {log.tripRoute}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Estimated: {log.estimatedMileage} mi • {new Date(log.loggedAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
