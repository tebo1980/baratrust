import { db } from '@/db';
import { shieldProjects, shieldStatutoryDeadlines, shieldSiteTelemetryProofs } from '@/db/schema/shield';
import { desc } from 'drizzle-orm';
import ShieldClientDashboard from './ShieldClientDashboard';

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BaraTrust Shield | Statutory Notice & Lien Compliance Engine',
  description: 'Statutory lien deadline engine, HOA ARC packet builder, and verified on-site proof-of-commencement for residential trade contractors.'
};

export const dynamic = 'force-dynamic';

export default async function ShieldCommandCenter() {
  console.log('SHIELD PAGE ACCESSED');
  const projects = await db.select().from(shieldProjects).orderBy(desc(shieldProjects.createdAt));
  const deadlines = await db.select().from(shieldStatutoryDeadlines);
  const proofs = await db.select().from(shieldSiteTelemetryProofs);

  const mappedProjects = projects.map(p => {
    const proof = proofs.find(pr => pr.projectId === p.id);
    return {
      ...p,
      tamperHash: proof ? proof.cryptographicTamperHash : null,
      firstFurnishedDate: p.firstFurnishedDate ? new Date(p.firstFurnishedDate).toISOString() : null,
      lastFurnishedDate: p.lastFurnishedDate ? new Date(p.lastFurnishedDate).toISOString() : null,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      deadlines: deadlines.filter(d => d.projectId === p.id).map(d => ({
        ...d,
        dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
      }))
    }
  });

  return (
    <div className="min-h-screen bg-[#1E1B16] text-white">
      <div className="pt-10 px-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-display text-3xl font-black text-white m-0 tracking-tight">
            🛡 BaraTrust Shield
          </h1>
          <span className="bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1 text-[10px] font-bold text-red-400 tracking-widest uppercase">
            Statutory Command Center
          </span>
        </div>
        <p className="text-sm text-gray-400 mb-8 max-w-2xl">
          Active operational legal buffer and approval speed engine. Monitoring bi-state lien notice clocks and ARC packet telemetry.
        </p>

        <ShieldClientDashboard initialProjects={mappedProjects} />
      </div>
    </div>
  );
}
