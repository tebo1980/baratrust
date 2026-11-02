'use client'

import SeoTradePage from '@/components/SeoTradePage'

export default function RoofingContractorMarketingLouisville() {
  return (
    <SeoTradePage
      trade="Roofing"
      location="Louisville"
      state="KY"
      headline="Roofing growth & market watch"
      headlineEm="built on real trust."
      subtext="You inspect roofs, run crews, and take care of homeowners. BaraTrust watches your roofing business and the Louisville market across Protect, Improve, Grow, and Save — telling you what deserves attention and helping you act when it makes sense."
      painPoints={[
        { title: "Storm surges overwhelm phones and inspection follow-up", text: "When hail or wind hits and you're on roofs all day, missed calls and stalled inspection quotes quickly turn into jobs for whoever answers next." },
        { title: "Homeowners compare trust before they ever call", text: "Out-of-date websites, thin local proof, or unanswered reviews make even top-quality roofers look indistinguishable from storm chasers." },
        { title: "Nobody has time to watch local opportunities and vendor creep", text: "HOA relationships, commercial properties, neighborhood demand, and rising material or software costs go unexamined while you're running production." },
      ]}
      features={[
        { icon: '\uD83D\uDEE1\uFE0F', title: 'Protect Local Credibility', text: 'Monitor reviews, public business accuracy, competitor activity, and website trust signals so homeowners see a legitimate local company.' },
        { icon: '\uD83D\uDCDE', title: 'Improve Storm & Estimate Follow-Up', text: 'Tighten mobile inquiry paths, inspection scheduling, quote follow-up, and crew/admin checklists without forcing you into bloated software.' },
        { icon: '\uD83C\uDFAF', title: 'Stand Out in Local Search', text: 'Clear service-area visibility, stronger project presentation, and straightforward contact paths across Louisville and surrounding counties.' },
        { icon: '\uD83D\uDCC8', title: 'Grow Beyond Paid Lead Lists', text: 'Actively search for HOA, property-manager, real-estate, insurance-adjacent, and commercial opportunities plus worthwhile local campaigns.' },
        { icon: '\uD83D\uDCB0', title: 'Save With Smart Vendor Comparisons', text: 'Review recurring software, marketing spend, and supplier options while weighing delivery reliability, contracts, and switching costs.' },
        { icon: '\uD83E\uDD1D', title: 'Business Pulse ($99/mo) + Execution', text: 'See what we spot right now with a Free Reality Check, keep BaraTrust watching your market for $99/month, and execute projects only when warranted.' },
      ]}
      stats={[
        { num: '01', label: 'Protect local trust & reputation' },
        { num: '02', label: 'Improve inspection & quote follow-up' },
        { num: '03', label: 'Grow residential & commercial channels' },
        { num: '04', label: 'Save on software, ads & vendor spend' },
      ]}
      closingHeadline="Want someone credible watching your market while you run your roofing crews?"
    />
  )
}
