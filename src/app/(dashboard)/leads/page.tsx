import { db } from "@/db";
import { leads } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export default async function LeadsDashboard() {
    // Fetch live data directly from Neon!
    const allLeads = await db.select().from(leads).orderBy(desc(leads.id));

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
            <div className="max-w-7xl mx-auto">

                <header className="mb-8 border-b border-gray-800 pb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold text-white tracking-tight">BaraTrust Operations</h1>
                        <p className="text-gray-400 mt-2">Live Neighborhood Lead Intercepts</p>
                    </div>
                    <div className="text-sm font-medium text-emerald-400 flex items-center gap-3 bg-emerald-400/10 px-4 py-2 rounded-full border border-emerald-400/20">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        Ghost Engine Active
                    </div>
                </header>

                <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-widest border-b border-gray-800">
                                    <th className="p-5 font-semibold">Source</th>
                                    <th className="p-5 font-semibold w-1/3">Original Post</th>
                                    <th className="p-5 font-semibold w-1/3">AI Drafted Reply</th>
                                    <th className="p-5 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50 text-sm">
                                {allLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-800/40 transition-colors group">
                                        <td className="p-5 align-top font-medium text-blue-400">
                                            {lead.source || 'SYSTEM'}
                                            <div className="text-xs text-gray-500 mt-1">Sector: {lead.tradeSector ?? 'Unassigned'}</div>
                                            <div className="text-xs text-gray-500">Region: {lead.geographicMetadata ?? 'Unknown'}</div>
                                        </td>
                                        <td className="p-5 align-top text-gray-300">
                                            <p className="line-clamp-4 leading-relaxed">{lead.originalText || lead.summary || 'No original text'}</p>
                                        </td>
                                        <td className="p-5 align-top">
                                            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 text-gray-400 italic">
                                                "{lead.draftReply || 'No draft generated'}"
                                            </div>
                                            <div className="text-xs text-gray-500 mt-2">Contact: {lead.prospectContact ?? 'Not provided'}</div>
                                        </td>
                                        <td className="p-5 align-top text-right">
                                            <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 active:scale-95">
                                                Send to Client
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {allLeads.length === 0 && (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                            <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p>No new leads intercepted. Waiting for transmission...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
