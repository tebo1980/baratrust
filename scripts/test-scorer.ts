import { scoreProspect, scoreBand } from '../src/lib/self-prospecting/scorer'
import { getSubredditRule } from '../src/lib/self-prospecting/subreddit-rules'
import { matchKeywords } from '../src/lib/self-prospecting/keywords'

const SAMPLES = [
  {
    name: 'High-intent, on-target trade, in-region, recent',
    text: `I'm a roofing contractor in Louisville KY and Angi leads suck. Phone isn't ringing. Last month I paid $2400 for leads and got 1 job. How do I get more leads without these scammy platforms? Anyone tried something different?`,
    postedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    name: 'Medium-intent, generic, no location',
    text: `Slow season for our cleaning business. Need more customers. What worked for you?`,
    postedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    name: 'Low-intent, off-topic',
    text: `Just got my license and starting an HVAC business. What should I do first?`,
    postedAt: null,
  },
  {
    name: 'No intent at all',
    text: `Best impact driver for under $200?`,
    postedAt: null,
  },
]

for (const s of SAMPLES) {
  console.log('━'.repeat(60))
  console.log(s.name)
  const km = matchKeywords(s.text)
  const score = scoreProspect({ text: s.text, postedAt: s.postedAt })
  console.log(`Tier: ${km.tier} · Matched: ${km.matched.join(', ') || 'none'}`)
  console.log(`Score: ${score.total} (${scoreBand(score.total)})`)
  console.log(`  intent ${score.intentScore} · spec ${score.specificity} · loc ${score.locationMatch} · rec ${score.recency} · budget ${score.budgetSignals}`)
}

console.log('━'.repeat(60))
console.log('Subreddit rules')
for (const sub of ['HVAC', 'smallbusiness', 'sweatystartup', 'unknown_sub_42']) {
  const r = getSubredditRule(sub)
  console.log(`r/${sub}: allowed=${r.allowed} — ${r.note}`)
}
