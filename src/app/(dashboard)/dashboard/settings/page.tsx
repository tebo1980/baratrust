import React from 'react';

export default function SettingsPage() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-indigo-500/20 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-wider text-slate-200 drop-shadow-[0_0_8px_rgba(79,70,229,0.4)]">
            Global Settings
          </h1>
          <p className="text-slate-400 mt-2">Manage system configurations, API integrations, and team access.</p>
        </div>
      </div>
      
      <section className="bg-[#0B0F19] border border-indigo-500/20 rounded-xl p-8 shadow-lg">
        <h2 className="text-xl font-bold text-slate-200 mb-4">API Configuration</h2>
        <p className="text-slate-400 mb-6">Ensure your environment variables are properly configured to enable agent communication.</p>
        
        <div className="space-y-6 max-w-2xl">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-cyan-400 uppercase tracking-widest">Gemini API Key</label>
            <div className="flex items-center gap-4">
              <input 
                type="text" 
                readOnly
                defaultValue="••••••••••••••••••••••••" 
                className="bg-[#0A1019] border border-indigo-500/30 rounded-lg px-4 py-2 w-full text-slate-300"
              />
              <span className="text-xs text-rose-400 font-semibold border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 rounded-md shrink-0">
                Action Required
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Must be injected directly into `.env.local`. Required for Brix and other AI engines to function.</p>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-cyan-400 uppercase tracking-widest">Neon Database</label>
            <div className="flex items-center gap-4">
              <input 
                type="text" 
                readOnly
                defaultValue="••••••••••••••••••••••••" 
                className="bg-[#0A1019] border border-emerald-500/30 rounded-lg px-4 py-2 w-full text-slate-300"
              />
              <span className="text-xs text-emerald-400 font-semibold border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 rounded-md shrink-0">
                Connected
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-cyan-400 uppercase tracking-widest">Stripe Webhook Secret</label>
            <div className="flex items-center gap-4">
              <input 
                type="text" 
                readOnly
                defaultValue="••••••••••••••••••••••••" 
                className="bg-[#0A1019] border border-emerald-500/30 rounded-lg px-4 py-2 w-full text-slate-300"
              />
              <span className="text-xs text-emerald-400 font-semibold border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 rounded-md shrink-0">
                Connected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Required for automated payment capture logic in Max engine.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
