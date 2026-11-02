'use client'

import SeoTradePage from '@/components/SeoTradePage'

export default function ElectricianMarketingNewAlbany() {
  return (
    <SeoTradePage
      trade="Electrician"
      location="New Albany"
      state="IN"
      headline="Electrician growth & market watch"
      headlineEm="while you run the jobs."
      subtext="You run the crews and handle the work. BaraTrust watches your electrical business and surrounding Southern Indiana market across Protect, Improve, Grow, and Save — telling you what deserves attention and helping execute when it makes sense."
      painPoints={[
        { title: "Calls and quote requests slip by on busy days", text: "When you're finishing a panel upgrade or troubleshooting on site, missed inquiries and unfollowed estimates quietly turn into jobs for the next contractor." },
        { title: "Local visibility and public info drift out of date", text: "Outdated service pages, inconsistent directory details, or unanswered reviews make it harder for New Albany homeowners and commercial accounts to choose you with confidence." },
        { title: "No time to hunt commercial opportunities or compare vendors", text: "Builders, property managers, local developments, and better supplier or software terms are out there — nobody on a busy crew has spare evenings to research them." },
      ]}
      features={[
        { icon: '\uD83D\uDEE1\uFE0F', title: 'Protect Reputation & Trust', text: 'Watch customer reviews, public listings, competitor moves, and website trust signals so small issues get caught before they cost you calls.' },
        { icon: '\uD83D\uDCDE', title: 'Improve Inquiry & Quote Follow-Up', text: 'Tighten tap-to-call paths, online estimate requests, missed-call follow-up, and simple internal checklists without complicated software.' },
        { icon: '\uD83C\uDFAF', title: 'Strengthen Local Findability', text: 'Clear service pages, Google Business visibility, and local search presence built for how New Albany and Southern Indiana customers actually hire.' },
        { icon: '\uD83D\uDCC8', title: 'Grow Commercial & Local Demand', text: 'Actively look for builder partnerships, property-management accounts, neighborhood developments, and high-intent local campaigns.' },
        { icon: '\uD83D\uDCB0', title: 'Save Without Cutting Corners', text: 'Compare software, vendors, and recurring expenses while weighing reliability, contracts, and switching risk — recommending no change when your current setup is solid.' },
        { icon: '\uD83E\uDD1D', title: 'Business Pulse ($99/mo) + Execution', text: 'See what we spot right now with a Free Reality Check, keep BaraTrust watching your business and market for $99/month, and execute projects only when action is warranted.' },
      ]}
      stats={[
        { num: '01', label: 'Protect reputation & public trust' },
        { num: '02', label: 'Improve inquiry & quote conversion' },
        { num: '03', label: 'Grow local & commercial opportunities' },
        { num: '04', label: 'Save on vendors & recurring spend' },
      ]}
      closingHeadline="Want someone credible watching the field while you run your electrical business?"
    />
  )
}
