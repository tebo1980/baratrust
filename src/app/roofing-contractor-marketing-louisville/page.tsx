'use client'

import SeoTradePage from '@/components/SeoTradePage'

export default function RoofingContractorMarketingLouisville() {
  return (
    <SeoTradePage
      trade="Roofing"
      location="Louisville"
      state="KY"
      headline="Roofing contractor marketing"
      headlineEm="that fills your schedule."
      subtext="BaraTrust puts an AI staff in your roofing business — capturing every lead, managing your reviews, and running your back office while you're on the roof. Guaranteed results in 90 days."
      painPoints={[
        { title: "Storm season comes and you can't answer every call", text: "After a big storm your phone blows up. You're on a roof doing inspections. Half those calls go to voicemail — and those homeowners call the next roofer." },
        { title: "You've got 4-star reviews and your competitor has 200", text: "Quality of work doesn't matter if nobody can find you. The roofer with 200 Google reviews gets the call even if his work is worse than yours." },
        { title: "Marketing companies promise leads but deliver clicks", text: "They show you impressions and click-through rates. You ask how many actual phone calls. Silence." },
      ]}
      features={[
        { icon: '\uD83D\uDCDE', title: 'Capture Every Storm Call', text: 'Missed call text-back ensures every homeowner gets an instant response. CallRail tracks every single call so you know exactly where leads come from.' },
        { icon: '\u2B50', title: 'Build a 5-Star Reputation', text: 'Rex sends review requests after every completed job. Responds to every review professionally. Your Google profile becomes your best salesperson.' },
        { icon: '\uD83C\uDFAF', title: 'Own Local Search', text: 'When Louisville homeowners search "roof repair near me" or "storm damage roofer" — you show up. Website, Google Maps, directories, everywhere.' },
        { icon: '\uD83D\uDCCA', title: 'Know Your Numbers', text: 'Cost per lead, which ads convert, which neighborhoods produce the best jobs. Real data, not vanity metrics.' },
        { icon: '\uD83E\uDD16', title: '12 AI Agents', text: 'Lead capture, review management, follow-up sequences, social posts from completed jobs, appointment reminders, bidding, cost intelligence — all automated.' },
        { icon: '\uD83D\uDCB0', title: '90-Day Guarantee', text: '10 tracked calls in 90 days or your fourth month is free. Storm season or slow season — we stand behind it.' },
      ]}
      stats={[
        { num: '90', label: 'Day Prove It Guarantee' },
        { num: '12', label: 'AI agents working for your roofing business' },
        { num: '7', label: 'Day launch — full presence live in one week' },
        { num: '$499', label: 'Per month starting — no setup fee' },
      ]}
      closingHeadline="Ready to be the roofer Louisville trusts?"
    />
  )
}
