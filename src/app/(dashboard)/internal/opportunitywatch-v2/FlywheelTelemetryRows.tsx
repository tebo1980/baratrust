'use client'

import React, { useState } from 'react'

function FlywheelRow({ lead }: { lead: any }) {
  const [status, setStatus] = useState<'idle' | 'firing' | 'dropped'>(lead.status === 'rvm_dropped' ? 'dropped' : 'idle');

  async function handleFirePitch() {
    if (status !== 'idle') return;
    setStatus('firing');

    try {
      const res = await fetch('/api/outreach/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          businessName: lead.businessName,
          phoneNumber: lead.phoneNumber
        })
      });

      if (res.ok) {
        setStatus('dropped');
      } else {
        setStatus('idle');
        console.error('[FLYWHEEL] Failed to ignite outreach payload.');
      }
    } catch (error) {
      console.error('[FLYWHEEL] Network error during ignition:', error);
      setStatus('idle');
    }
  }

  return (
    <div className={`flex items-center justify-between py-4 px-5 bg-[#1E1B16] border border-[#C17B2A]/20 rounded-xl shadow-lg transition-all duration-300 ${status === 'dropped' ? 'opacity-60' : 'opacity-100 hover:border-[#C17B2A]/50'}`}>
      <div>
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-[15px] font-semibold text-white tracking-wide">
            {lead.businessName}
          </span>
          <span className="bg-[#C17B2A]/10 border border-[#C17B2A]/30 text-[#C17B2A] text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-widest">
            ⚠ NO WEBSITE DETECTED
          </span>
          {status === 'dropped' && (
            <span className="text-[10px] font-bold text-green-400 tracking-widest ml-1">
              ✓ RVM DROPPED
            </span>
          )}
        </div>
        <div className="text-[13px] text-gray-400">
          {lead.formattedAddress || 'Location Unknown'} <span className="opacity-50 mx-1">|</span> {lead.phoneNumber || 'No Phone Number'}
        </div>
      </div>
      <button 
        onClick={handleFirePitch}
        disabled={status !== 'idle'}
        className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-md ${
          status === 'dropped' 
            ? 'bg-green-500/10 text-green-400 border border-green-500/30 cursor-default shadow-none' 
            : 'bg-[#C17B2A] text-[#1E1B16] border border-transparent hover:-translate-y-[1px] hover:shadow-[#C17B2A]/20 cursor-pointer'
        }`}
      >
        {status === 'idle' && 'Fire Automated Pitch 🚀'}
        {status === 'firing' && 'Sending Payload... ⏳'}
        {status === 'dropped' && 'Sequence Engaged'}
      </button>
    </div>
  )
}

export function FlywheelTelemetryRows({ leads }: { leads: any[] }) {
  return (
    <div className="flex flex-col gap-3 mb-10">
      {leads.length === 0 ? (
        <div className="p-5 bg-[#1E1B16] border border-dashed border-gray-700 rounded-xl text-gray-500 text-[13px] text-center">
          No new high-value targets currently staged in the flywheel.
        </div>
      ) : leads.map(lead => (
        <FlywheelRow key={lead.id} lead={lead} />
      ))}
    </div>
  )
}

