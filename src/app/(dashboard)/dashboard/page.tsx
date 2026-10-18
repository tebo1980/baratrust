"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight, ShieldCheck, TrendingUp, PhoneCall, DollarSign, Sliders, Mail, Database, RefreshCcw, Send, Zap } from "lucide-react";

const CapybaraLogo = () => (
  <svg className="w-10 h-10 hover:scale-105 transition-transform" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 40 Q25 20 50 20 Q80 20 85 45 Q90 60 85 75 Q80 90 60 90 L30 90 Q15 90 15 75 L15 55 Q15 40 25 40 Z" fill="#D97706" />
    <path d="M85 45 Q95 45 95 60 Q95 70 85 75 Z" fill="#B45309" />
    <rect x="10" y="38" width="85" height="14" rx="2" fill="#09090B" />
    <path d="M20 52 L40 52 L35 65 L25 65 Z" fill="#09090B" />
    <path d="M55 52 L75 52 L70 65 L60 65 Z" fill="#09090B" />
    <line x1="22" y1="42" x2="38" y2="42" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
    <line x1="57" y1="42" x2="73" y2="42" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
    <circle cx="90" cy="55" r="2.5" fill="#451A03" />
  </svg>
);

export default function MasterDashboard() {
  return (
    <div className="min-h-screen bg-[#050810] font-sans text-slate-100 selection:bg-amber-500/30">

      {/* Top Header */}
      <header className="h-[88px] border-b border-zinc-800/60 flex items-center justify-between px-6 md:px-10 bg-[#0B0F19]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-4 group">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 blur-lg rounded-full group-hover:bg-amber-500/40 transition-colors" />
              <CapybaraLogo />
            </div>
            <div>
              <span className="text-xl font-bold tracking-wider text-slate-100 uppercase font-mono hidden sm:block">
                Bara<span className="text-amber-500">Trust</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase block -mt-1">
                Partner Portal
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-emerald-400">PARTNER STATUS: ACTIVE</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-10">

        {/* Hero Welcome Banner */}
        <div className="bg-gradient-to-br from-[#1E1B16] to-[#0E131F] border border-amber-500/20 rounded-2xl p-8 md:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 blur-3xl rounded-full pointer-events-none"></div>

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider rounded-md">
              <ShieldCheck className="w-3.5 h-3.5" /> Human Judgment · AI Leverage · Real Execution
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-serif">
              Run your business.<br className="hidden md:block" />
              <span className="text-amber-400">We&apos;ll help with the rest.</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed">
              Welcome to your BaraTrust Partner Portal. We don&apos;t hand you complicated software or give you AI homework. Todd and Noelah handle the research, customer acquisition, cost reviews, and workflow automation behind the scenes.
            </p>
          </div>
        </div>

        {/* The 4 Operational Outcomes Grid */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">What We Help You Deliver</h2>
            <p className="text-sm text-slate-400">Four practical outcomes built around your business—not rigid software packages.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Pillar 1 */}
            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-6 space-y-3 hover:border-amber-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">01. Get More Customers</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Local discovery, high-converting web presence, targeted local campaigns, and clean Google Business visibility so customers find you first.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-6 space-y-3 hover:border-amber-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">02. Lose Fewer Opportunities</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Missed-call follow-ups, friction-free booking links, click-to-call mobile buttons, and automated stale estimate follow-ups that turn lost leads into booked jobs.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-6 space-y-3 hover:border-amber-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">03. Cut Unnecessary Costs</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Vendor and supplier price research, software tool consolidation, and cutting quiet monthly fees that drain operational profit.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="bg-[#0e1422] border border-slate-800 rounded-xl p-6 space-y-3 hover:border-amber-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">04. Automate the Busywork</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Turning day-to-day video and workflows into step-by-step Standard Operating Procedures (SOPs), employee training, and automated invoice reminders.
              </p>
            </div>

          </div>
        </div>

        {/* Direct Concierge Contact Card */}
        <div className="bg-[#121929] border border-slate-800 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-lg">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-400" /> Need Help or Have a New Project?
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              No ticket queues or robot chatbots. You have direct access to Todd and Noelah. Drop us an email anytime and we&apos;ll get right on it.
            </p>
          </div>
          <a
            href="mailto:todd@baratrust.com"
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-md"
          >
            Email Todd (todd@baratrust.com) <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Operator Tools / Staff Access (Discrete section at bottom) */}
        <div className="pt-8 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">
              Internal Operator Tools
            </p>
            <span className="text-[11px] font-mono text-slate-600">BaraTrust Staff Only</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              href="/leads"
              className="p-4 bg-[#0a0f1d] hover:bg-[#11192e] border border-slate-800/80 rounded-lg text-left transition-colors group"
            >
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <Database className="w-4 h-4" />
                <span className="text-xs font-bold font-mono">Lead Radar</span>
              </div>
              <p className="text-[11px] text-slate-400">Discover local opportunities</p>
            </Link>

            <Link
              href="/dashboard/pipeline"
              className="p-4 bg-[#0a0f1d] hover:bg-[#11192e] border border-slate-800/80 rounded-lg text-left transition-colors group"
            >
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <RefreshCcw className="w-4 h-4" />
                <span className="text-xs font-bold font-mono">Project Pipeline</span>
              </div>
              <p className="text-[11px] text-slate-400">Active project boards</p>
            </Link>

            <Link
              href="/internal/report-generator"
              className="p-4 bg-[#0a0f1d] hover:bg-[#11192e] border border-slate-800/80 rounded-lg text-left transition-colors group"
            >
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <Send className="w-4 h-4" />
                <span className="text-xs font-bold font-mono">Report Generator</span>
              </div>
              <p className="text-[11px] text-slate-400">Todd&apos;s monthly reviews</p>
            </Link>

            <Link
              href="/internal/opportunitywatch-v2"
              className="p-4 bg-[#0a0f1d] hover:bg-[#11192e] border border-slate-800/80 rounded-lg text-left transition-colors group"
            >
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-bold font-mono">Opportunity Watch</span>
              </div>
              <p className="text-[11px] text-slate-400">Regional intelligence feed</p>
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}