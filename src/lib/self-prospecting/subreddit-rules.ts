// Manual seed list of subreddit self-promotion rules.
// Edit this file directly when you discover a new subreddit's rules.
// `allowed: false` → drafter will produce a NO-MENTION reply (helpful only)
// `allowed: 'restricted'` → drafter will be extra cautious, soft mention only
// `allowed: true` → normal in-thread reply with BaraTrust mention is fine

export type SubredditPolicy = true | false | 'restricted'

export interface SubredditRule {
  allowed: SubredditPolicy
  note: string
}

const RULES: Record<string, SubredditRule> = {
  smallbusiness: {
    allowed: 'restricted',
    note: 'Self-promo is heavily moderated. Replies that read as agency pitches get nuked. Mention BaraTrust only as a brief aside, not as the focus.',
  },
  entrepreneur: {
    allowed: 'restricted',
    note: '9:1 ratio strictly enforced — only reply if Todd has contributed elsewhere recently. Mods are aggressive about agency pitches.',
  },
  sweatystartup: {
    allowed: true,
    note: 'Generally tolerant of in-thread replies that lead with helpful context.',
  },
  hvac: {
    allowed: false,
    note: 'Bans agency self-promotion entirely. Draft a helpful-only reply with NO mention of BaraTrust. Todd may decide not to reply at all.',
  },
  hvactechschool: {
    allowed: false,
    note: 'Bans agency self-promotion. Helpful-only reply.',
  },
  roofing: {
    allowed: 'restricted',
    note: 'Mods remove sales pitches aggressively. Keep it 90% helpful, 10% mention. Lead with trade-specific insight.',
  },
  plumbing: {
    allowed: 'restricted',
    note: 'Tolerant if you sound like you are in the trade; intolerant of marketing agency pitches. Speak the trade language.',
  },
  electricians: {
    allowed: 'restricted',
    note: 'Same as plumbing — be useful first, brief about BaraTrust second.',
  },
  construction: {
    allowed: 'restricted',
    note: 'Self-promo is flagged frequently. Verify Todd has commented helpfully here in the last week before replying.',
  },
  contractor: {
    allowed: true,
    note: 'Smaller sub, looser rules. In-thread reply with mention is fine if helpful first.',
  },
  contractoruk: {
    allowed: 'restricted',
    note: 'UK-focused. BaraTrust not relevant geographically — skip unless OP is US-based.',
  },
}

/** Look up rules for a subreddit name (case-insensitive, no leading r/). */
export function getSubredditRule(subreddit: string | null | undefined): SubredditRule {
  if (!subreddit) {
    return {
      allowed: 'restricted',
      note: 'Subreddit unknown — verify rules manually before replying.',
    }
  }
  const key = subreddit.toLowerCase().replace(/^r\//, '').replace(/^\//, '')
  return (
    RULES[key] ?? {
      allowed: 'restricted',
      note: `Rules for r/${subreddit} not seeded yet — verify manually before replying. (Edit src/lib/self-prospecting/subreddit-rules.ts to add.)`,
    }
  )
}

export function listKnownSubreddits(): string[] {
  return Object.keys(RULES).sort()
}
