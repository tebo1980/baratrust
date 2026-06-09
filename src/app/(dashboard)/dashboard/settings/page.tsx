"use client";

import React, { useState, Suspense } from 'react';
import { Save, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';

function SettingsContent() {
  // Field States
  const [geminiKey, setGeminiKey] = useState("••••••••••••••••••••••••");
  const [neonDb, setNeonDb] = useState("••••••••••••••••••••••••");
  const [stripeWebhook, setStripeWebhook] = useState("••••••••••••••••••••••••");
  const [accessLevel, setAccessLevel] = useState("Administrator");

  // UI States
  const [showGemini, setShowGemini] = useState(false);
  const [showNeon, setShowNeon] = useState(false);
  const [showStripe, setShowStripe] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Simulate network delay
    setTimeout(() => {
      setIsSaving(false);
      setToastMessage("System configurations successfully locked onto the network.");

      // Clear toast after 4s
      setTimeout(() => setToastMessage(""), 4000);
    }, 1500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-12 font-sans text-slate-200">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold text-sm tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#C17B2A]/20 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-wider text-slate-100 drop-shadow-[0_0_8px_rgba(193,123,42,0.3)]">
            Global Settings
          </h1>
          <p className="text-slate-400 mt-2">Manage system configurations, API integrations, and team access.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">

        {/* SECTION 1: API Integrations Key-Store */}
        <section className="bg-[#1E1B16] border border-[#2A2621] rounded-xl p-8 shadow-lg">
          <h2 className="text-xl font-bold text-[#C17B2A] mb-4 border-b border-[#2A2621] pb-2">API Integrations Key-Store</h2>

          <div className="space-y-6 max-w-2xl mt-6">
            {/* Gemini Key */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Gemini API Key</label>
              <div className="flex items-center gap-4 relative">
                <input
                  type={showGemini ? "text" : "password"}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="bg-[#0B0F19] border border-slate-800 focus:border-[#C17B2A]/50 rounded-lg pl-4 pr-12 py-2 w-full text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#C17B2A]/50 transition-colors"
                />
                <button type="button" onClick={() => setShowGemini(!showGemini)} className="absolute right-4 text-slate-500 hover:text-slate-300">
                  {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Neon DB */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Neon Database Connection String</label>
              <div className="flex items-center gap-4 relative">
                <input
                  type={showNeon ? "text" : "password"}
                  value={neonDb}
                  onChange={(e) => setNeonDb(e.target.value)}
                  className="bg-[#0B0F19] border border-slate-800 focus:border-[#C17B2A]/50 rounded-lg pl-4 pr-12 py-2 w-full text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#C17B2A]/50 transition-colors"
                />
                <button type="button" onClick={() => setShowNeon(!showNeon)} className="absolute right-4 text-slate-500 hover:text-slate-300">
                  {showNeon ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: System Webhook Listeners */}
        <section className="bg-[#1E1B16] border border-[#2A2621] rounded-xl p-8 shadow-lg">
          <h2 className="text-xl font-bold text-[#C17B2A] mb-4 border-b border-[#2A2621] pb-2">System Webhook Listeners</h2>

          <div className="space-y-6 max-w-2xl mt-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Stripe Webhook Endpoint Secret</label>
              <div className="flex items-center gap-4 relative">
                <input
                  type={showStripe ? "text" : "password"}
                  value={stripeWebhook}
                  onChange={(e) => setStripeWebhook(e.target.value)}
                  className="bg-[#0B0F19] border border-slate-800 focus:border-[#C17B2A]/50 rounded-lg pl-4 pr-12 py-2 w-full text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#C17B2A]/50 transition-colors"
                />
                <button type="button" onClick={() => setShowStripe(!showStripe)} className="absolute right-4 text-slate-500 hover:text-slate-300">
                  {showStripe ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Used to verify and route incoming transaction payloads to the Max dispatch engine.</p>
            </div>
          </div>
        </section>

        {/* SECTION 3: Team Access & Permissions */}
        <section className="bg-[#1E1B16] border border-[#2A2621] rounded-xl p-8 shadow-lg">
          <h2 className="text-xl font-bold text-[#C17B2A] mb-4 border-b border-[#2A2621] pb-2">Team Access & Permissions</h2>

          <div className="space-y-6 max-w-2xl mt-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Global Account Role</label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                className="bg-[#0B0F19] border border-slate-800 focus:border-[#C17B2A]/50 rounded-lg px-4 py-3 w-full text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#C17B2A]/50 transition-colors appearance-none"
              >
                <option value="Administrator">Administrator (Full Access)</option>
                <option value="Dispatcher">Dispatcher (Pipeline & Max Only)</option>
                <option value="Field Tech">Field Tech (Read-Only Work Orders)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Footer Actions */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-[#C17B2A] hover:bg-[#A66721] disabled:opacity-70 disabled:hover:bg-[#C17B2A] text-[#050810] rounded-lg text-sm font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(193,123,42,0.4)] flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Securing Uplink...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Configurations
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="w-full h-full bg-[#050810] min-h-screen text-slate-400 flex items-center justify-center">Loading Settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
