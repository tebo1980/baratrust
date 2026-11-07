'use client';

import Link from 'next/link';
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { BookingLink, PulseCheckoutLink } from '@/components/ContactLinks';
import { SampleBusinessPulsePreview } from '@/components/SampleBusinessPulse';

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
          <div className="flex items-center gap-5">
            <Link href="/sample-pulse" className="text-sm text-slate-300 hover:text-amber-300 transition-colors hidden md:block">
              Sample Pulse
            </Link>
            <Link href="/" className="text-sm text-slate-400 hover:text-slate-200 transition-colors hidden sm:block">
              ← Back to Homepage
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

      <main className="max-w-6xl mx-auto px-6 py-16 space-y-14">

        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider rounded-md">
            <ShieldCheck className="w-3.5 h-3.5" /> Protect • Improve • Grow • Save
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-serif">
            See what we spot for free. <span className="text-amber-400">Keep us watching for $99/month.</span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg leading-relaxed">
            No “book a meeting just to hear the price.” Start with a Free Reality Check to see what BaraTrust can spot from public signals right now — or start Business Pulse for $99/month so BaraTrust keeps watching your business and surrounding market across Southern Indiana, Greater Louisville, and beyond.
          </p>
        </div>

        {/* Primary Product Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

          {/* Card 1: Free Reality Check */}
          <div className="bg-[#0A101D] border border-slate-800 rounded-2xl p-8 md:p-10 shadow-xl flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  See What BaraTrust Can Spot Right Now
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-white font-serif mt-1">
                  Free Reality Check
                </h2>
                <p className="text-slate-400 text-sm mt-2">
                  An instant automated outside-looking-in snapshot of your public digital presence — with clear transparency on what automation can and cannot see.
                </p>
              </div>

              <div className="flex items-baseline gap-2 pt-2 pb-4 border-b border-slate-800">
                <span className="text-5xl font-bold text-white font-serif">$0</span>
                <span className="text-slate-400 font-mono text-sm">/ Free Automated Snapshot</span>
              </div>

              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span>Checks publicly visible signals across Digital Presence, Customer Journey, Trust &amp; Reputation, Local Discovery, and Opportunity Capture</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span>Highlights potential concerns, visible strengths, and areas worth deeper human verification</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span>Never invents fake penalties when public or browser evidence is incomplete</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span>No email or credit card required to see your initial snapshot, with optional “Discuss My Results” follow-up afterward</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                href="/reality-check"
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-base transition-colors flex items-center justify-center gap-2 border border-slate-700"
              >
                Run Free Reality Check <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Business Pulse — $99/month */}
          <div className="bg-[#0E1524] border-2 border-amber-500/40 rounded-2xl p-8 md:p-10 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-amber-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider rounded-bl-xl">
              PRIMARY SERVICE
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  Keep BaraTrust Watching
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-white font-serif mt-1">
                  Business Pulse
                </h2>
                <p className="text-slate-400 text-sm mt-2">
                  BaraTrust keeps watching your business and surrounding market for ways to Protect, Improve, Grow, and Save — and tells you what actually deserves attention.
                </p>
              </div>

              <div className="flex items-baseline gap-2 pt-2 pb-4 border-b border-slate-800">
                <span className="text-5xl font-bold text-white font-serif">$99</span>
                <span className="text-slate-400 font-mono text-sm">/ month</span>
              </div>

              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>Protect &amp; Improve:</strong> Ongoing watch for reputation shifts, public-info issues, competitor threats, customer-experience friction, and practical performance gains</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>Grow:</strong> Active search outside and inside your business for events, booths, partnerships, corporate/B2B angles, competitor gaps, local developments, and emerging demand</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>Save:</strong> Supplier alternatives, vendor comparisons, software overlap, and expense checks weighed against quality, reliability, contracts, and switching risk</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>Built for healthy businesses too:</strong> You don&apos;t need something broken to benefit — and “No action recommended” is always a legitimate finding</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>Human judgment, not another dashboard:</strong> Todd and Noelah review what matters so you don&apos;t get stuck learning software</span>
                </li>
              </ul>
            </div>

            <div className="pt-8 space-y-3">
              <PulseCheckoutLink
                surface="pricing_page"
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-base transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                Start Business Pulse — $99/month <ArrowRight className="w-5 h-5" />
              </PulseCheckoutLink>
              <BookingLink
                surface="pricing_page"
                className="w-full py-3 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center border border-slate-700"
              >
                Want to talk first? Book a 15-Minute Intro Call
              </BookingLink>
            </div>
          </div>

        </div>

        {/* Illustrative Sample Business Pulse */}
        <SampleBusinessPulsePreview theme="dark" />

        {/* Optional Execution & Broader Support Note */}
        <div className="bg-[#0A101D] border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Optional Execution &amp; Broader Managed Support
            </span>
            <h3 className="text-xl font-bold text-white font-serif">
              Act only when something is worth doing.
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              When Business Pulse identifies an opportunity or fix worth acting on, you can handle it in-house, ask BaraTrust to scope and execute it directly (websites, online stores, video, campaigns, booth prep, supplier quotes, SOPs, workflows), have us coordinate a qualified specialist, or explore broader managed support when appropriate — always with clear scope approved before any project work begins.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <BookingLink
              surface="pricing_page"
              className="px-5 py-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold rounded-lg text-sm transition-colors border border-amber-500/30 whitespace-nowrap text-center"
            >
              Book Intro Conversation
            </BookingLink>
            <a
              href="mailto:todd@baratrust.com"
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-sm transition-colors border border-slate-700 whitespace-nowrap text-center"
            >
              Email Todd
            </a>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-10 bg-[#04070D]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-mono">
          <p>© 2026 BaraTrust · Serving Southern Indiana &amp; Greater Louisville. Watches your business so you don&apos;t have to.</p>
          <div className="flex flex-wrap gap-6">
            <Link href="/sample-pulse" className="hover:text-amber-400 transition-colors">Sample Pulse</Link>
            <a href="mailto:todd@baratrust.com" className="hover:text-amber-400 transition-colors">todd@baratrust.com</a>
            <Link href="/terms" className="hover:text-slate-200 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
