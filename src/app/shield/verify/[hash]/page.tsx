import React from 'react';
import { db } from '@/db';
import { shieldSiteTelemetryProofs, shieldProjects } from '@/db/schema/shield';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function PublicProofVerification({ params }: { params: { hash: string } }) {
  const result = await db
    .select({
      proof: shieldSiteTelemetryProofs,
      project: shieldProjects,
    })
    .from(shieldSiteTelemetryProofs)
    .innerJoin(shieldProjects, eq(shieldSiteTelemetryProofs.projectId, shieldProjects.id))
    .where(eq(shieldSiteTelemetryProofs.cryptographicTamperHash, params.hash))
    .limit(1);

  const record = result[0];

  if (!record) {
    return (
      <div className="min-h-screen bg-[#1E1B16] flex items-center justify-center p-6 font-sans">
        <div className="bg-[#2A261F] border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-red-400 text-5xl mb-4">⚠</div>
          <h2 className="text-xl font-bold text-white mb-2">Invalid or Unverified Hash</h2>
          <p className="text-gray-400 text-sm">
            The provided compliance hash could not be located in the cryptographic ledger. The proof may have been tampered with or does not exist.
          </p>
        </div>
      </div>
    );
  }

  const { proof, project } = record;
  const mapsUrl = `https://www.google.com/maps?q=${proof.gpsLat},${proof.gpsLng}`;

  return (
    <div className="min-h-screen bg-[#1E1B16] text-white py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-black text-white m-0 tracking-tight">
            🛡 BaraTrust Shield
          </h1>
          <p className="text-gray-400 text-sm mt-2">Public Proof-of-Presence & Compliance Audit Sheet</p>
        </div>

        <div className="bg-[#2A261F] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-green-500/10 border-b border-green-500/20 px-6 py-4 flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-400 font-bold uppercase tracking-wider text-xs">
              Cryptographically Verified (SHA-256)
            </span>
          </div>
          
          <div className="p-6 sm:p-8 flex flex-col gap-8">
            {/* Timestamp */}
            <div>
              <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Commencement Timestamp</h3>
              <div className="text-xl font-semibold text-white">
                {project.firstFurnishedDate ? new Date(project.firstFurnishedDate).toLocaleString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short'
                }) : 'N/A'}
              </div>
            </div>

            {/* Parcel Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Property Parcel</h3>
                <div className="text-gray-300 font-medium leading-relaxed">
                  {project.clientDetails}
                </div>
              </div>
              <div>
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Contractor Role</h3>
                <div className="text-[#C17B2A] font-bold">
                  {project.contractorRole} - {project.projectType}
                </div>
              </div>
            </div>

            {/* GPS Telemetry */}
            <div className="bg-black/30 rounded-xl p-5 border border-white/5">
              <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">GPS Telemetry</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-[10px] text-gray-500 mb-1 uppercase">Latitude</div>
                  <div className="text-sm font-mono text-gray-300">{proof.gpsLat}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-1 uppercase">Longitude</div>
                  <div className="text-sm font-mono text-gray-300">{proof.gpsLng}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 mb-1 uppercase">Accuracy Radius</div>
                  <div className="text-sm font-mono text-gray-300">± {proof.accuracyMeters} meters</div>
                </div>
              </div>
              <a 
                href={mapsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-[#3B7FD4]/10 hover:bg-[#3B7FD4]/20 text-[#3B7FD4] text-xs font-bold px-4 py-2 rounded-lg transition-colors border border-[#3B7FD4]/20"
              >
                🌍 View on Google Maps
              </a>
            </div>

            {/* Hash Fingerprint */}
            <div>
              <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Cryptographic Tamper Hash (SHA-256)</h3>
              <div className="bg-black/50 p-4 rounded-lg border border-white/5 overflow-x-auto">
                <code className="text-xs text-[#C17B2A] font-mono whitespace-nowrap">
                  {proof.cryptographicTamperHash}
                </code>
              </div>
            </div>

            {/* Photo Proof */}
            {proof.photoVaultLink && (
              <div>
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">On-Site Photo Proof</h3>
                <div className="rounded-xl overflow-hidden border border-white/10 relative h-64 bg-black/50 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={proof.photoVaultLink} 
                    alt="Job Site Proof" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-600 text-sm font-medium -z-10">
                    Photo unavailable or restricted
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
