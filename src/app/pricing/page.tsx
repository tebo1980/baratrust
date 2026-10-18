'use client';

import Link from 'next/link';
import { CheckCircle2, ArrowRight, ShieldCheck, Mail, Sparkles } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 font-sans selection:bg-amber-500/30">

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#080F1A]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <span className="text-amber-400 font-bold text-lg font-serif">B</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-serif">
              Bara<span className="text-amber-400">Trust</span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-slate-400 hover:text-slate-200 transition-colors hidden sm:block">
              ← Back to Overview
            </Link>
            <Link
              href="/reality-check"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono rounded-lg transition-colors"
            >
              FREE REALITY CHECK
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 space-y-16">

        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider rounded-md">
            <ShieldCheck className="w-3.5 h-3.5" /> Honest Pricing · No Software Lock-In
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-serif">
            Free diagnosis. <span className="text-amber-400">Transparent execution.</span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg leading-relaxed">
            We start by diagnosing where your business is losing money or wasting time—completely free. Then, if you want us to do the heavy lifting, we give you a plain-English price for real execution.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

          {/* Card 1: Free Reality Check */}
          <div className="bg-[#0E1524] border-2 border-amber-500/40 rounded-2xl p-8 md:p-10 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-amber-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider rounded-bl-xl">
              START HERE
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">Step 01</span>
                <h2 className="text-2xl md:text-3xl font-bold text-white font-serif mt-1">
                  Business Reality Check
                </h2>
                <p className="text-slate-400 text-sm mt-2">
                  Our comprehensive 5-area diagnosis to uncover hidden leaks and high-impact growth opportunities.
                </p>
              </div>

              <div className="flex items-baseline gap-2 pt-2 pb-4 border-b border-slate-800">
                <span className="text-5xl font-bold text-white font-serif">$0</span>
                <span className="text-slate-400 font-mono text-sm">/ 100% Free</span>
              </div>

              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span>0 to 100 Score across Digital Presence, Customer Journey, Trust, Local Discovery, and Opportunity Capture</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span>Objective automated checks combined with human review by Todd and Noelah</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span>Clear evidence tags on every finding: [AUTO DETECTED], [BARATRUST REVIEW], [OPPORTUNITY FOUND]</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span>Delivered to your inbox within one business day</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span>100% free. No credit card required. No obligation.</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                href="/reality-check"
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-base transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                Get My Free Reality Check <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Partner Execution & Retainers */}
          <div className="bg-[#0A101D] border border-slate-800 rounded-2xl p-8 md:p-10 shadow-xl flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Step 02</span>
                <h2 className="text-2xl md:text-3xl font-bold text-white font-serif mt-1">
                  Scoped Execution & Ongoing Help
                </h2>
                <p className="text-slate-400 text-sm mt-2">
                  If you want help after the report, we scope the work clearly based on what your business actually needs — whether that&apos;s a focused fix, a build project, or ongoing help.
                </p>
              </div>

              <div className="flex items-baseline gap-2 pt-2 pb-4 border-b border-slate-800">
                <span className="text-3xl md:text-4xl font-bold text-white font-serif">Scoped to Need</span>
                <span className="text-slate-400 font-mono text-xs">/ Focused Fix, Build, or Ongoing</span>
              </div>

              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>Get More Customers:</strong> Local visibility, websites, ecommerce pages, campaigns, video, audio, and lead research</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>Lose Fewer Opportunities:</strong> Missed-call follow-up, quote follow-up, booking paths, and dormant-customer reactivation</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>Cut Unnecessary Costs:</strong> Supplier and vendor research, software cleanup, and cutting wasted spend</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>Automate the Busywork:</strong> SOPs, training materials, checklists, customer-data cleanup, and repetitive admin automation</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span>Human judgment and AI leverage — with Todd and Noelah reviewing the work.</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <a
                href="mailto:todd@baratrust.com"
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-base transition-colors flex items-center justify-center gap-2 border border-slate-700"
              >
                <Mail className="w-4 h-4 text-amber-400" /> Talk with Todd (todd@baratrust.com)
              </a>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-10 bg-[#04070D]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-mono">
          <p>© 2026 BaraTrust. Practical operations & growth partner for small businesses.</p>
          <div className="flex gap-6">
            <a href="mailto:todd@baratrust.com" className="hover:text-amber-400 transition-colors">todd@baratrust.com</a>
            <Link href="/terms" className="hover:text-slate-200 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}