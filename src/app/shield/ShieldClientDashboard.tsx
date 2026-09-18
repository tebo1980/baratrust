'use client'

import React, { useState } from 'react';
import SiteProofModal from '@/components/SiteProofModal';
import { generateIndianaPreLienNoticeHTML, generateKentuckyNoticeOfIntentHTML, generateLienWaiverHTML, generateCertifiedMailCoverSheet } from '@/utils/documentGenerator';

export default function ShieldClientDashboard({ initialProjects }: { initialProjects: any[] }) {
  const [showModal, setShowModal] = useState(false);
  const [proofModalId, setProofModalId] = useState<number | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<number, string>>({});

  const handleCopyLink = (hash: string) => {
    const url = `${window.location.origin}/shield/verify/${hash}`;
    navigator.clipboard.writeText(url);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const exportToCSV = () => {
    const headers = [
      'Project ID', 'Client Name', 'Address', 'County', 'State', 'Role', 'Project Type', 'Contract Value',
      'First Furnished Date', 'Statutory Deadline Statute', 'Notice Type',
      'Due Date', 'Days Remaining', 'Urgent Status', 'Certified Mail Tracking',
      'Tamper Proof Hash'
    ];

    const rows: string[][] = [];

    initialProjects.forEach(project => {
      const contractValue = (project.contractAmount / 100).toFixed(2);
      const firstFurnished = project.firstFurnishedDate ? new Date(project.firstFurnishedDate).toLocaleDateString() : 'N/A';
      const tamperHash = project.tamperHash || 'N/A';

      if (project.deadlines && project.deadlines.length > 0) {
        project.deadlines.forEach((d: any) => {
          let daysRemaining = 'N/A';
          let urgentStatus = 'Normal';
          if (!d.isCompleted && d.dueDate) {
            const diff = (new Date(d.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
            daysRemaining = Math.ceil(diff).toString();
            if (diff >= 0 && diff < 7) urgentStatus = 'URGENT';
            else if (diff < 0) urgentStatus = 'EXPIRED';
          } else if (d.isCompleted) {
            urgentStatus = 'COMPLETED';
          }

          const tracking = d.trackingFlags?.uspsTracking || 'N/A';

          rows.push([
            project.id.toString(),
            project.clientDetails, // Client Name mapped from clientDetails
            '', '', '', // Empty Address, County, State since we don't have structured data
            project.contractorRole,
            project.projectType,
            `$${contractValue}`,
            firstFurnished,
            d.statuteCode,
            d.noticeType,
            new Date(d.dueDate).toLocaleDateString(),
            daysRemaining,
            urgentStatus,
            tracking,
            tamperHash
          ]);
        });
      } else {
        rows.push([
          project.id.toString(),
          project.clientDetails,
          '', '', '',
          project.contractorRole,
          project.projectType,
          `$${contractValue}`,
          firstFurnished,
          'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A',
          tamperHash
        ]);
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `shield-statutory-ledger-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printDoc = (html: string) => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>BaraTrust Statutory Document</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body onload="setTimeout(() => window.print(), 500)">
            ${html}
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  return (
    <div>
      <div className="flex justify-end gap-3 mb-6">
        <button 
          onClick={exportToCSV}
          className="bg-white/10 text-gray-200 px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg hover:bg-white/20 transition-colors border border-white/10"
        >
          📥 Export Ledger (CSV)
        </button>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#C17B2A] text-[#1E1B16] px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg hover:-translate-y-px transition-transform"
        >
          + New Intake
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {initialProjects.length === 0 ? (
          <div className="p-8 border border-white/10 rounded-xl text-center text-gray-400 text-sm">
            No active jobs in the Shield engine.
          </div>
        ) : (
          initialProjects.map(project => {
            const expiredDeadlines = project.deadlines.filter((d: any) => {
              if (d.isCompleted) return false;
              const daysDiff = (new Date(d.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
              return daysDiff < 0;
            });
            const urgentDeadlines = project.deadlines.filter((d: any) => {
              if (d.isCompleted) return false;
              const daysDiff = (new Date(d.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
              return daysDiff >= 0 && daysDiff <= 7;
            });
            const normalDeadlines = project.deadlines.filter((d: any) => {
              if (d.isCompleted) return false;
              const daysDiff = (new Date(d.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
              return daysDiff > 7;
            });

            return (
              <div key={project.id} className="bg-[#2A261F] border border-white/5 rounded-xl p-5 shadow-xl flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg text-white">{project.clientDetails}</h3>
                    {project.firstFurnishedDate && (
                      <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/30 font-bold uppercase tracking-wider">
                        ✓ Proof Logged
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 flex gap-3 mb-4">
                    <span>Role: <strong className="text-white">{project.contractorRole}</strong></span>
                    <span>Type: <strong className="text-white">{project.projectType}</strong></span>
                    <span>Contract: <strong className="text-white">${(project.contractAmount / 100).toFixed(2)}</strong></span>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mt-2 items-start">
                    {expiredDeadlines.map((d: any) => (
                      <div key={d.id} className="flex flex-col gap-1.5">
                        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 shadow-md shadow-red-900/50">
                          EXPIRED / STATUTORY DEFAULT ({new Date(d.dueDate).toLocaleDateString()})
                        </span>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={tracking[d.id] ?? (d.trackingFlags?.uspsTracking || '')}
                            onChange={(e) => setTracking({...tracking, [d.id]: e.target.value})}
                            placeholder="USPS Tracking #"
                            className="bg-black/40 text-gray-300 text-[10px] px-2 py-1.5 rounded border border-white/10 outline-none flex-1 focus:border-red-500 transition-colors"
                          />
                          <button 
                            onClick={() => printDoc(generateCertifiedMailCoverSheet('Your Company LLC', project.clientDetails, tracking[d.id] ?? (d.trackingFlags?.uspsTracking || ''), d.statuteCode))}
                            title="Print Certified Mail Cover"
                            className="bg-white/5 hover:bg-white/10 text-white px-2 rounded border border-white/10 transition-colors"
                          >
                            🖨
                          </button>
                        </div>
                      </div>
                    ))}
                    {urgentDeadlines.map((d: any) => {
                      const daysDiff = Math.ceil((new Date(d.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                      return (
                      <div key={d.id} className="flex flex-col gap-1.5">
                        <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                          ⚠ URGENT: {daysDiff} DAYS LEFT ({new Date(d.dueDate).toLocaleDateString()})
                        </span>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={tracking[d.id] ?? (d.trackingFlags?.uspsTracking || '')}
                            onChange={(e) => setTracking({...tracking, [d.id]: e.target.value})}
                            placeholder="USPS Tracking #"
                            className="bg-black/40 text-gray-300 text-[10px] px-2 py-1.5 rounded border border-white/10 outline-none flex-1 focus:border-[#C17B2A] transition-colors"
                          />
                          <button 
                            onClick={() => printDoc(generateCertifiedMailCoverSheet('Your Company LLC', project.clientDetails, tracking[d.id] ?? (d.trackingFlags?.uspsTracking || ''), d.statuteCode))}
                            title="Print Certified Mail Cover"
                            className="bg-white/5 hover:bg-white/10 text-white px-2 rounded border border-white/10 transition-colors"
                          >
                            🖨
                          </button>
                        </div>
                      </div>
                    )})}
                    {normalDeadlines.map((d: any) => (
                      <div key={d.id} className="flex flex-col gap-1.5">
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                          {d.noticeType} ({new Date(d.dueDate).toLocaleDateString()})
                        </span>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={tracking[d.id] ?? (d.trackingFlags?.uspsTracking || '')}
                            onChange={(e) => setTracking({...tracking, [d.id]: e.target.value})}
                            placeholder="USPS Tracking #"
                            className="bg-black/40 text-gray-300 text-[10px] px-2 py-1.5 rounded border border-white/10 outline-none flex-1 focus:border-[#3B7FD4] transition-colors"
                          />
                          <button 
                            onClick={() => printDoc(generateCertifiedMailCoverSheet('Your Company LLC', project.clientDetails, tracking[d.id] ?? (d.trackingFlags?.uspsTracking || ''), d.statuteCode))}
                            title="Print Certified Mail Cover"
                            className="bg-white/5 hover:bg-white/10 text-white px-2 rounded border border-white/10 transition-colors"
                          >
                            🖨
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 w-56 shrink-0">
                  {!project.firstFurnishedDate ? (
                    <button 
                      onClick={() => setProofModalId(project.id)}
                      className="bg-[#C17B2A]/10 text-[#C17B2A] hover:bg-[#C17B2A]/20 text-xs font-bold px-3 py-2 rounded-lg transition-colors border border-[#C17B2A]/30 w-full text-center shadow"
                    >
                      📍 Record First Furnishing
                    </button>
                  ) : project.tamperHash ? (
                    <button 
                      onClick={() => handleCopyLink(project.tamperHash)}
                      className="bg-green-500/10 hover:bg-green-500/20 text-xs font-bold px-3 py-2 rounded-lg transition-colors text-green-400 border border-green-500/30 w-full text-center shadow flex items-center justify-center gap-2"
                    >
                      {copiedHash === project.tamperHash ? '✓ Copied!' : '🔗 Copy Proof Link'}
                    </button>
                  ) : null}
                  <button 
                    onClick={() => printDoc(generateIndianaPreLienNoticeHTML('Your Company LLC', project.clientDetails, 'Property Address', project.clientDetails))}
                    className="bg-white/5 hover:bg-white/10 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-gray-200 border border-white/10 w-full text-left"
                  >
                    📄 Print IN Pre-Lien Notice
                  </button>
                  <button 
                    onClick={() => printDoc(generateKentuckyNoticeOfIntentHTML('Your Company LLC', project.clientDetails, project.contractAmount))}
                    className="bg-white/5 hover:bg-white/10 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-gray-200 border border-white/10 w-full text-left"
                  >
                    📄 Print KY Intent Notice
                  </button>
                  <button 
                    onClick={() => printDoc(generateLienWaiverHTML('Your Company LLC', project.clientDetails, project.contractAmount, false))}
                    className="bg-white/5 hover:bg-white/10 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-gray-200 border border-white/10 w-full text-left"
                  >
                    🖋 Print Progress Waiver
                  </button>
                  <button 
                    onClick={() => window.open(`/shield/arc/${project.id}`, '_blank')}
                    className="bg-blue-500/10 hover:bg-blue-500/20 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-blue-400 border border-blue-500/20 w-full text-left mt-2"
                  >
                    🏗 View ARC Packet
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {proofModalId && (
        <SiteProofModal 
          projectId={proofModalId} 
          onClose={() => setProofModalId(null)} 
          onSuccess={() => { setProofModalId(null); window.location.reload(); }} 
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1B16] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-white">New Job Intake</h2>
            <div className="flex flex-col gap-3">
              <input placeholder="Client / Property Details" className="bg-[#2A261F] text-white p-3 rounded-lg border border-white/10 text-sm outline-none" />
              <div className="flex gap-3">
                <select className="bg-[#2A261F] text-gray-300 p-3 rounded-lg border border-white/10 text-sm outline-none w-1/2">
                  <option>State (IN/KY)</option>
                  <option>Indiana</option>
                  <option>Kentucky</option>
                </select>
                <select className="bg-[#2A261F] text-gray-300 p-3 rounded-lg border border-white/10 text-sm outline-none w-1/2">
                  <option>Role</option>
                  <option>GC</option>
                  <option>Subcontractor</option>
                </select>
              </div>
              <select className="bg-[#2A261F] text-gray-300 p-3 rounded-lg border border-white/10 text-sm outline-none">
                <option>Project Type</option>
                <option>Residential Existing</option>
                <option>Residential New</option>
                <option>Commercial</option>
              </select>
              <input type="number" placeholder="Contract Amount ($)" className="bg-[#2A261F] text-white p-3 rounded-lg border border-white/10 text-sm outline-none" />
              <input type="date" placeholder="Start Date" className="bg-[#2A261F] text-white p-3 rounded-lg border border-white/10 text-sm outline-none" />
              
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-white/5 p-3 rounded-lg font-bold text-sm text-white hover:bg-white/10 transition-colors">Cancel</button>
                <button onClick={() => setShowModal(false)} className="flex-1 bg-[#C17B2A] text-[#1E1B16] p-3 rounded-lg font-bold text-sm shadow-lg">Lock In Job</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

