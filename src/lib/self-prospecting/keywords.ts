// Keyword bank for self-prospecting signal detection.
// Phrases are matched case-insensitively against post text. Keep them as the
// raw phrasing real people use — not marketing language.

export const HIGH_INTENT_KEYWORDS = [
  'looking for marketing help',
  'need a website',
  "phone isn't ringing",
  'phone is not ringing',
  'angi is a scam',
  'angi leads suck',
  'angi sucks',
  'thumbtack waste',
  'thumbtack sucks',
  'how do i get more leads',
  'how do i get leads',
  'recommend a marketing person',
  'small business marketing help',
  'how do contractors get clients',
  'website builder recommendation',
  'google ads not working',
  'no calls from my website',
  'tried an agency and got burned',
  'got burned by an agency',
  'marketing agency ripped me off',
] as const

export const MEDIUM_INTENT_KEYWORDS = [
  'slow season',
  'need more customers',
  'feast or famine',
  'pipeline is dry',
  'business is slow',
  'how do you market',
  'best way to advertise',
  'should i hire someone',
  'frustrated with marketing',
  'where do you find customers',
  'where do leads come from',
] as const

export const LOW_INTENT_KEYWORDS = [
  'starting a business',
  'just got my license',
  'first year contractor',
  'thinking about quitting my job',
  'side hustle to full time',
  'going out on my own',
] as const

export type IntentTier = 'high' | 'medium' | 'low' | 'none'

export interface KeywordMatch {
  tier: IntentTier
  matched: string[]
}

/** Return the highest matching intent tier and which phrases matched. */
export function matchKeywords(text: string): KeywordMatch {
  const lower = text.toLowerCase()
  const high = HIGH_INTENT_KEYWORDS.filter((k) => lower.includes(k))
  if (high.length) return { tier: 'high', matched: [...high] }
  const med = MEDIUM_INTENT_KEYWORDS.filter((k) => lower.includes(k))
  if (med.length) return { tier: 'medium', matched: [...med] }
  const low = LOW_INTENT_KEYWORDS.filter((k) => lower.includes(k))
  if (low.length) return { tier: 'low', matched: [...low] }
  return { tier: 'none', matched: [] }
}

// Target geographic markets for BaraTrust. Strict matches score higher than
// loose state-level matches. Order matters — list cities first.
export const PRIMARY_LOCATIONS = [
  'louisville', 'new albany', 'jeffersonville', 'clarksville', 'lexington',
  'indianapolis', 'evansville', 'cincinnati', 'nashville', 'bowling green',
  'st. matthews', 'jeffersontown', 'fort wayne', 'south bend',
] as const

export const SECONDARY_LOCATIONS = [
  'kentucky', 'indiana', 'ohio', 'tennessee', ' ky ', ' in ', ' oh ', ' tn ',
] as const

// Specific platforms that, when named, indicate the poster is dissatisfied
// with a known marketing channel. Used by the specificity scorer.
export const PLATFORM_NAMES = [
  'angi', 'thumbtack', 'homeadvisor', 'porch', 'yelp', 'nextdoor',
  'google ads', 'google business', 'facebook ads', 'fb ads', 'instagram',
] as const

export const TRADE_NAMES = [
  'roofing', 'roofer', 'hvac', 'plumber', 'plumbing', 'electrician', 'electrical',
  'landscaper', 'landscaping', 'painter', 'painting', 'contractor', 'concrete',
  'flooring', 'remodel', 'cleaner', 'cleaning service', 'pest control',
  'handyman', 'fence', 'deck builder',
] as const

export const DIRECT_ASK_PHRASES = [
  'can someone', 'anyone have', 'looking for advice', 'looking for recommendations',
  'how do you', 'how do i', 'any tips', 'any advice', 'help me figure',
  'thoughts on', 'recommend', 'has anyone tried',
] as const

export const BUDGET_PHRASES = [
  'willing to pay', 'budget', 'afford', 'monthly spend', 'how much should',
  'how much to spend', 'paying for', 'i pay', 'spending on',
] as const
