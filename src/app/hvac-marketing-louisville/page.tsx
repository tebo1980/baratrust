'use client'

import SeoTradePage from '@/components/SeoTradePage'

export default function HvacMarketingLouisville() {
  return (
    <SeoTradePage
      trade="HVAC"
      location="Louisville"
      state="KY"
      headline="HVAC growth & market watch"
      headlineEm="without agency smoke."
      subtext="You keep crews moving and customers comfortable. BaraTrust watches your HVAC business and the Louisville market across Protect, Improve, Grow, and Save — bringing you what actually deserves attention and helping execute when it makes sense."
      painPoints={[
        { title: "Seasonal calls and replacement quotes fall through the cracks", text: "When techs are in attics and crawlspaces during peak weather, missed inquiries and unfollowed replacement estimates quietly go to the next shop." },
        { title: "Agencies pitch retainers without honest restraint", text: "Most marketing vendors always prescribe a bigger ad budget, never tell you what NOT to spend money on, and leave you guessing what actually works." },
        { title: "Good maintenance, commercial, and cost opportunities go unwatched", text: "Maintenance-plan retention, commercial accounts, competitor shifts, and creeping software or supplier costs sit untouched because nobody has time to watch them." },
      ]}
      features={[
        { icon: '\uD83D\uDEE1\uFE0F', title: 'Protect Reputation & Public Info', text: 'Keep watch on Google reviews, public business listings, competitor offers, and website trust signals across the Louisville metro.' },
        { icon: '\uD83D\uDCDE', title: 'Improve Call, Quote & Tune-Up Follow-Up', text: 'Strengthen mobile contact paths, replacement-quote follow-up, seasonal tune-up reminders, and practical team SOPs.' },
        { icon: '\uD83C\uDFAF', title: 'Clear Local Visibility', text: 'Make sure homeowners and facility managers find clear service coverage, straightforward contact options, and credible proof of your work.' },
        { icon: '\uD83D\uDCC8', title: 'Grow Maintenance & Commercial Angles', text: 'Actively look outside the business for property-management partnerships, local developments, seasonal demand gaps, and worthwhile campaigns.' },
        { icon: '\uD83D\uDCB0', title: 'Save With Total-Value Discipline', text: 'Question duplicate software, vendor fees, and supplier costs while weighing reliability, contracts, and switching risk — never chasing cheap at the expense of quality.' },
        { icon: '\uD83E\uDD1D', title: 'Business Pulse ($99/mo) + Execution', text: 'See what we spot right now with a Free Reality Check, keep BaraTrust watching for $99/month, and tackle focused projects only when they earn their keep.' },
      ]}
      stats={[
        { num: '01', label: 'Protect reputation & customer trust' },
        { num: '02', label: 'Improve quote & seasonal follow-up' },
        { num: '03', label: 'Grow residential & commercial demand' },
        { num: '04', label: 'Save on software & vendor spend' },
      ]}
      closingHeadline="Want someone looking around the corner for your Louisville HVAC business?"
    />
  )
}
