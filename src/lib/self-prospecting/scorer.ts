import {
  matchKeywords,
  PRIMARY_LOCATIONS,
  SECONDARY_LOCATIONS,
  PLATFORM_NAMES,
  TRADE_NAMES,
  DIRECT_ASK_PHRASES,
  BUDGET_PHRASES,
  type IntentTier,
} from './keywords'

export interface ProspectScore {
  intentScore: number       // 30 / 15 / 5 / 0
  intentTier: IntentTier
  matchedKeywords: string[]
  specificity: number       // 0–25
  locationMatch: number     // 0–20
  recency: number           // 0–15
  budgetSignals: number     // 0–10
  total: number             // 0–100
}

export type ProspectBand = 'discard' | 'cold' | 'warm' | 'hot'

export function scoreBand(total: number): ProspectBand {
  if (total >= 80) return 'hot'
  if (total >= 60) return 'warm'
  if (total >= 40) return 'cold'
  return 'discard'
}

export interface ScoreInput {
  text: string
  postedAt?: Date | string | null
}

export function scoreProspect({ text, postedAt }: ScoreInput): ProspectScore {
  const lower = text.toLowerCase()

  // 1. Intent
  const km = matchKeywords(text)
  const intentScore = km.tier === 'high' ? 30 : km.tier === 'medium' ? 15 : km.tier === 'low' ? 5 : 0

  // 2. Specificity (0–25)
  let specificity = 0
  // Platform names mentioned
  const platformsHit = PLATFORM_NAMES.filter((p) => lower.includes(p)).length
  specificity += Math.min(platformsHit * 3, 8)
  // Dollar amounts
  if (/\$\s?\d/.test(text)) specificity += 5
  // Trade name mentioned
  if (TRADE_NAMES.some((t) => lower.includes(t))) specificity += 5
  // Direct ask phrasing
  if (DIRECT_ASK_PHRASES.some((p) => lower.includes(p))) specificity += 4
  // Length signal — substantial post (>300 chars) suggests detail
  if (text.length > 300) specificity += 3
  specificity = Math.min(specificity, 25)

  // 3. Location match (0–20)
  let locationMatch = 0
  if (PRIMARY_LOCATIONS.some((l) => lower.includes(l))) locationMatch = 20
  else if (SECONDARY_LOCATIONS.some((l) => lower.includes(l))) locationMatch = 10

  // 4. Recency (0–15)
  let recency = 5 // default mid-low when unknown
  if (postedAt) {
    const t = typeof postedAt === 'string' ? Date.parse(postedAt) : postedAt.getTime()
    if (!Number.isNaN(t)) {
      const ageDays = (Date.now() - t) / (1000 * 60 * 60 * 24)
      if (ageDays < 1) recency = 15
      else if (ageDays < 2) recency = 10
      else if (ageDays < 3) recency = 7
      else if (ageDays < 7) recency = 4
      else if (ageDays < 30) recency = 2
      else recency = 0
    }
  }

  // 5. Budget signals (0–10)
  let budgetSignals = 0
  if (/\$\s?\d/.test(text)) budgetSignals += 4
  if (BUDGET_PHRASES.some((p) => lower.includes(p))) budgetSignals += 4
  if (/\b\d+\s?\/\s?(mo|month|year|yr)\b/i.test(text)) budgetSignals += 3
  budgetSignals = Math.min(budgetSignals, 10)

  const total = Math.min(intentScore + specificity + locationMatch + recency + budgetSignals, 100)

  return {
    intentScore,
    intentTier: km.tier,
    matchedKeywords: km.matched,
    specificity,
    locationMatch,
    recency,
    budgetSignals,
    total,
  }
}
