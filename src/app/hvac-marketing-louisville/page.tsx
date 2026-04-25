'use client'

import SeoTradePage from '@/components/SeoTradePage'

export default function HvacMarketingLouisville() {
  return (
    <SeoTradePage
      trade="HVAC"
      location="Louisville"
      state="KY"
      headline="HVAC marketing that"
      headlineEm="actually works."
      subtext="BaraTrust puts an AI staff in your HVAC business — capturing every lead, managing your reviews, and running your back office while you're installing units and fixing furnaces. Guaranteed results in 90 days."
      painPoints={[
        { title: "You're missing calls while on the job", text: "You're in an attic replacing a unit. Your phone rings. Nobody answers. That homeowner calls the next HVAC company on the list. Gone." },
        { title: "You paid an agency and got nothing", text: "They charged you $1,500 a month, sent confusing reports, and when you asked where the calls were — crickets. You're done trusting agencies." },
        { title: "You don't know what's working", text: "Are your Google ads working? Is your website getting traffic? Is your Google Business Profile even showing up? Nobody can tell you." },
      ]}
      features={[
        { icon: '\uD83D\uDCDE', title: 'Never Miss a Call Again', text: 'CallRail tracking on every call. Missed call text-back sends an instant response so the homeowner doesn\'t call your competitor.' },
        { icon: '\u2B50', title: 'Review Management', text: 'Rex monitors your Google reviews every 6 hours. Drafts professional responses to every review — good or bad — in your voice.' },
        { icon: '\uD83C\uDFAF', title: 'Get Found Locally', text: 'Website, Google Business Profile, Bing, Apple Maps, directories — every place a Louisville homeowner searches for HVAC, you show up.' },
        { icon: '\uD83D\uDCCA', title: 'Live Dashboard', text: 'See every call, every ad dollar, your Business Health Score — updated in real time. Check it from your phone between jobs.' },
        { icon: '\uD83E\uDD16', title: '12 AI Agents', text: 'Nova captures leads, Rex manages reviews, Iris runs follow-ups, Max handles invoices, Cole tracks costs, Brix builds bids — all working 24/7 while you\'re on the job.' },
        { icon: '\uD83D\uDCB0', title: '90-Day Guarantee', text: '10 tracked calls in 90 days or your fourth month is free. Every call is in your dashboard. Nothing to argue about.' },
      ]}
      stats={[
        { num: '90', label: 'Day Prove It Guarantee' },
        { num: '12', label: 'AI agents working for your HVAC business' },
        { num: '7', label: 'Day launch — full presence live in one week' },
        { num: '$499', label: 'Per month starting — no setup fee' },
      ]}
      closingHeadline="Ready to stop losing HVAC jobs to missed calls?"
    />
  )
}
