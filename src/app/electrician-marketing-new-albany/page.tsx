'use client'

import SeoTradePage from '@/components/SeoTradePage'

export default function ElectricianMarketingNewAlbany() {
  return (
    <SeoTradePage
      trade="Electrician"
      location="New Albany"
      state="IN"
      headline="Electrician marketing that"
      headlineEm="brings real jobs."
      subtext="BaraTrust puts an AI staff in your electrical business — capturing every lead, managing your reviews, and running your back office while you're pulling wire and upgrading panels. Guaranteed results in 90 days."
      painPoints={[
        { title: "Emergency calls go to voicemail", text: "A homeowner's power is out at 9pm. They call you. You're finishing another job. They call the next electrician. That's a $400 job — gone." },
        { title: "Your website doesn't generate calls", text: "Someone built you a website two years ago. It looks fine. But when people in New Albany search for an electrician — you're nowhere." },
        { title: "You're invisible on Google Maps", text: "The three-pack on Google Maps is where homeowners pick their electrician. If you're not in it, you're not getting calls." },
      ]}
      features={[
        { icon: '\uD83D\uDCDE', title: 'Instant Lead Capture', text: 'Every call tracked. Every missed call gets an automatic text-back. The homeowner knows you got their message — they wait for you instead of calling someone else.' },
        { icon: '\u2B50', title: 'Reputation Builder', text: 'After every job Rex sends a review request. When reviews come in — good or bad — professional responses go out in your voice automatically.' },
        { icon: '\uD83C\uDFAF', title: 'Dominate Local Search', text: 'Website, Google Business Profile, Bing, Apple Maps, directories — every place a New Albany homeowner looks for an electrician, you\'re there.' },
        { icon: '\uD83D\uDCCA', title: 'Real-Time Dashboard', text: 'Which ads are working. Which calls converted. Your cost per lead. All visible in real time from your phone.' },
        { icon: '\uD83E\uDD16', title: '12 AI Agents', text: 'A full AI staff handling leads, reviews, follow-ups, social media, invoices, bidding, and appointments — all running while you\'re on the job site.' },
        { icon: '\uD83D\uDCB0', title: '90-Day Guarantee', text: '10 tracked calls in 90 days or your fourth month is free. Every call is tracked in your live dashboard.' },
      ]}
      stats={[
        { num: '90', label: 'Day Prove It Guarantee' },
        { num: '12', label: 'AI agents working for your electrical business' },
        { num: '7', label: 'Day launch — full presence live in one week' },
        { num: '$499', label: 'Per month starting — no setup fee' },
      ]}
      closingHeadline="Ready to be the electrician New Albany calls first?"
    />
  )
}
