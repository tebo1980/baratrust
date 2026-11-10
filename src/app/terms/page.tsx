import type { Metadata } from 'next'
import Link from 'next/link'
import { EmailLink, PhoneLink, SmsLink } from '@/components/ContactLinks'

export const metadata: Metadata = {
  title: 'Terms of Service — BaraTrust',
  robots: 'noindex, nofollow',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-slate-200 font-sans selection:bg-amber-500/30">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#080F1A]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <span className="text-amber-400 font-bold text-lg font-serif">B</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-serif">
              Bara<span className="text-amber-400">Trust</span>
            </span>
          </Link>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
            &#8592; Back to BaraTrust.com
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16 space-y-12">
        <div className="space-y-4 border-b border-slate-800 pb-8">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            Legal · Client Service Terms
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white font-serif">
            BaraTrust Terms of Service
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            We believe in plain English, no surprises, and no fine print designed to confuse you. These terms govern the free automated BaraTrust Business Reality Check and any Business Pulse recurring intelligence, scoped project, or ongoing support work you choose to do with us.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs font-mono text-slate-400">
            <div>
              <strong className="block text-slate-200">Effective Date</strong>
              January 1, 2026
            </div>
            <div>
              <strong className="block text-slate-200">Governing Law</strong>
              State of Indiana
            </div>
            <div>
              <strong className="block text-slate-200">Contact</strong>
              <EmailLink />
            </div>
            <div>
              <strong className="block text-slate-200">Phone</strong>
              <PhoneLink />
            </div>
          </div>
        </div>

        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="bg-[#0A101E] border border-slate-800 rounded-2xl p-6 md:p-8 space-y-3">
            <span className="text-xs font-mono text-amber-400 font-bold">01</span>
            <h2 className="text-xl font-bold text-white font-serif">The Free Automated Reality Check vs. Selective Sample Reports</h2>
            <p>
              The self-serve BaraTrust Reality Check on our website is an automated software scan of a single public business link, provided free of charge with no credit card required and no obligation. It checks surface technical and contact signals and is distinct from a custom human-researched report.
            </p>
            <p>
              Automated snapshots can be accessed via a private, unguessable share link. Separately, BaraTrust may occasionally prepare a complimentary one-time personalized sample report selectively by invitation when reviewing a business; selective sample invitations are discretionary and carry no purchase obligation.
            </p>
          </section>

          <section className="bg-[#0A101E] border border-slate-800 rounded-2xl p-6 md:p-8 space-y-3">
            <span className="text-xs font-mono text-amber-400 font-bold">02</span>
            <h2 className="text-xl font-bold text-white font-serif">Business Pulse ($99/Month) &amp; Optional Flat-Fee Implementation</h2>
            <p>
              Business Pulse ($99/month) includes one written human-researched Monthly Business Pulse report each month across Protect, Improve, Grow, and Save, plus brief personal heads-ups in between if we spot something time-sensitive. Members may implement any recommendation in-house at no extra cost, and may cancel anytime prior to the next monthly billing cycle.
            </p>
            <p>
              Hands-on implementation services (such as websites, online stores, multi-platform menu or listing updates, video or ad production, event/booth applications, supplier quote outreach, SOPs, workflows, or broader managed support) are not included in the $99/month subscription and are always quoted upfront as a separate flat-fee scope approved in writing before work begins. Referral or partner compensation never drives our recommendations and is disclosed when relevant.
            </p>
          </section>

          <section className="bg-[#0A101E] border border-slate-800 rounded-2xl p-6 md:p-8 space-y-3">
            <span className="text-xs font-mono text-amber-400 font-bold">03</span>
            <h2 className="text-xl font-bold text-white font-serif">What You Own</h2>
            <p>
              BaraTrust will never hold your website, your Google Business Profile, your domain name, or your customer data hostage. You retain full ownership of:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
              <li>Your domain name and all domain registrations</li>
              <li>All website content, photos, logos, SOPs, and brand assets created or provided for your business upon payment of any agreed project balance</li>
              <li>Your Google Business Profile, social accounts, and customer reviews</li>
              <li>Your customer lists, contact data, and business records</li>
            </ul>
          </section>

          <section className="bg-[#0A101E] border border-slate-800 rounded-2xl p-6 md:p-8 space-y-3">
            <span className="text-xs font-mono text-amber-400 font-bold">04</span>
            <h2 className="text-xl font-bold text-white font-serif">Privacy &amp; Respect for Your Information</h2>
            <p>
              Information you submit through the Reality Check intake form or optional owner questionnaire is used solely to review your business context and communicate with you about your business. We do not sell, rent, or trade your contact details or operational notes to third parties.
            </p>
          </section>

          <section className="bg-[#0A101E] border border-slate-800 rounded-2xl p-6 md:p-8 space-y-3">
            <span className="text-xs font-mono text-amber-400 font-bold">05</span>
            <h2 className="text-xl font-bold text-white font-serif">Governing Law &amp; Direct Resolution</h2>
            <p>
              We believe any questions or disagreements should be resolved through an honest, direct conversation. You can reach Todd and Noelah directly at <PhoneLink />, <SmsLink />, or <EmailLink />. These terms are governed by the laws of the State of Indiana.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-10 bg-[#04070D]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-mono">
          <p>© 2026 BaraTrust · New Albany, Indiana · BaraTrust watches your business so you don&apos;t have to.</p>
          <Link href="/" className="hover:text-amber-400 transition-colors">&#8592; Back to BaraTrust.com</Link>
        </div>
      </footer>
    </div>
  )
}
