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
            Automated scan for free. <span className="text-amber-400">Human-researched Business Pulse for $99/month.</span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg leading-relaxed">
            We keep the difference plain and upfront: the Free Reality Check is an instant automated scan of one public link, while Business Pulse ($99/month) delivers a personalized, human-researched monthly report plus timely heads-ups — with any hands-on implementation quoted separately upfront before work begins.
          </p>
        </div>

        {/* Primary Product Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

          {/* Card 1: Free Reality Check */}
          <div className="bg-[#0A101D] border border-slate-800 rounded-2xl p-8 md:p-10 shadow-xl flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Instant Software Check · Self-Serve Online
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-white font-serif mt-1">
                  Free Automated Reality Check
                </h2>
                <p className="text-slate-400 text-sm mt-2">
                  An instant automated scan of a single public website or social business page — built to show surface technical and contact signals in seconds, not to replace human research.
                </p>
              </div>

              <div className="flex items-baseline gap-2 pt-2 pb-4 border-b border-slate-800">
                <span className="text-5xl font-bold text-white font-serif">$0</span>
                <span className="text-slate-400 font-mono text-sm">/ Instant Automated Scan</span>
              </div>

              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span><strong>Automated single-link check:</strong> Scans public HTTPS security, mobile viewport setup, search title &amp; metadata, tap-to-call links, visible contact paths, and schema</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span><strong>Honest boundaries:</strong> Marks anything automation cannot verify as UNKNOWN instead of inventing fake score penalties</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span><strong>Not a custom human report:</strong> Does not manually cross-check third-party menus, delivery apps, local competitors, event calendars, or supplier pricing</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                  <span><strong>Optional human conversation:</strong> No email required to view your scan; request “Discuss My Results” if you want to talk with Todd &amp; Noelah (complimentary personalized sample editions are prepared selectively by invitation only)</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                href="/reality-check"
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-base transition-colors flex items-center justify-center gap-2 border border-slate-700"
              >
                Run Free Automated Scan <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Business Pulse — $99/month */}
          <div className="bg-[#0E1524] border-2 border-amber-500/40 rounded-2xl p-8 md:p-10 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-amber-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider rounded-bl-xl">
              HUMAN-RESEARCHED
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  Personalized Monthly Report + Timely Heads-Ups
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-white font-serif mt-1">
                  Business Pulse
                </h2>
                <p className="text-slate-400 text-sm mt-2">
                  Real human research and verification by Todd and Noelah across your business and surrounding local market — organized around Protect, Improve, Grow, and Save.
                </p>
              </div>

              <div className="flex items-baseline gap-2 pt-2 pb-4 border-b border-slate-800">
                <span className="text-5xl font-bold text-white font-serif">$99</span>
                <span className="text-slate-400 font-mono text-sm">/ month · Cancel anytime</span>
              </div>

              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>1 written Monthly Business Pulse report:</strong> Delivered as a clean, readable PDF / brief with clickable source links, focused Decision Cards, and clear notes on what only you can verify internally — no dashboard to learn</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>How often you hear from us:</strong> Once a month for your full written report, plus a quick personal heads-up in between <em>only</em> if something time-sensitive comes up (like an event booth deadline or broken public hours) — never filler spam</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>Real outside-in &amp; market research:</strong> Cross-platform hours, menus, and listings; local competitors; regional events &amp; partnerships; and supplier/vendor comparisons</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>Included in $99/mo ($0 extra to act in-house):</strong> Covers ongoing watch, research, verification, and plain-English recommendations (including “No action recommended” when leaving things alone is smarter)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                  <span><strong>Hands-on implementation costs extra:</strong> Websites, listing/menu fixes, video/ads, booth applications, supplier legwork, SOPs, and workflows are optional and quoted upfront as a flat, pre-approved project fee</span>
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
                Book a Free 15-Minute Conversation
              </BookingLink>
            </div>
          </div>

        </div>

        {/* Concrete 3-Column Expectation Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0A101D] border border-slate-800 rounded-2xl p-6 space-y-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              1. What Lands in Your Inbox
            </span>
            <h3 className="text-lg font-bold text-white font-serif">
              A written monthly brief with Decision Cards
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Each month you get a clean, owner-ready Business Pulse PDF / brief showing exact public sources checked, prioritized Decision Cards across Protect, Improve, Grow, and Save, what requires your internal confirmation, and where no change is warranted.
            </p>
          </div>

          <div className="bg-[#0A101D] border border-slate-800 rounded-2xl p-6 space-y-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              2. How Often We Reach Out
            </span>
            <h3 className="text-lg font-bold text-white font-serif">
              Monthly cadence + urgent heads-ups only
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Expect your scheduled Business Pulse once per month. In between, we only message you if we spot something time-sensitive that shouldn&apos;t wait 30 days (like a vendor booth deadline or broken hours) — plus direct replies anytime you have a question.
            </p>
          </div>

          <div className="bg-[#0A101D] border border-slate-800 rounded-2xl p-6 space-y-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              3. Included vs. Extra Cost
            </span>
            <h3 className="text-lg font-bold text-white font-serif">
              $99/mo for intelligence · Flat quotes for execution
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              $99/month covers all ongoing monitoring, human research, and recommendations — implement any of them yourself for $0 extra. Hands-on execution is never bundled silently or billed hourly by surprise; we quote a flat project fee upfront for your sign-off first.
            </p>
          </div>
        </div>

        {/* Illustrative Sample Business Pulse */}
        <SampleBusinessPulsePreview theme="dark" />

        {/* Optional Execution & Broader Support Note */}
        <div className="bg-[#0A101D] border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              What Implementation Services Cost Extra (Optional &amp; Pre-Approved)
            </span>
            <h3 className="text-xl font-bold text-white font-serif">
              Act in-house for $0 extra — or get an upfront flat quote before we build anything.
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your $99/month Business Pulse never locks you into project fees. Whenever a report surfaces something worth acting on, you can run with it yourself for $0 extra, or ask BaraTrust for a separate, flat-fee project quote (websites, online stores, listing/menu cleanups, short-form video &amp; campaigns, event/booth applications, supplier quote legwork, SOPs, or workflow setup) — or specialist coordination — approved in writing before any work begins.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <BookingLink
              surface="pricing_page"
              className="px-5 py-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold rounded-lg text-sm transition-colors border border-amber-500/30 whitespace-nowrap text-center"
            >
              Book a Free 15-Minute Conversation
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
