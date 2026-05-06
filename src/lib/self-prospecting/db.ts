import { sql } from '@vercel/postgres'
import type { ProspectScore } from './scorer'

export type ProspectStatus = 'new' | 'sent' | 'replied' | 'converted' | 'discarded'

export interface ProspectRow {
  id: number
  source_url: string
  source_platform: string | null
  subreddit: string | null
  author: string | null
  post_excerpt: string | null
  post_full_text: string | null
  posted_at: string | null
  intent_score: number
  intent_tier: string | null
  specificity: number
  location_match: number
  recency: number
  budget_signals: number
  total_score: number
  matched_keywords: string[]
  drafted_message: string | null
  no_mention_mode: boolean
  subreddit_note: string | null
  status: ProspectStatus
  notes: string | null
  contractor_slug: string | null
  contractor_name: string | null
  conversion_value_monthly: number | null
  found_at: string
  sent_at: string | null
  replied_at: string | null
  converted_at: string | null
  discarded_at: string | null
}

let schemaReady = false

/**
 * Idempotent schema bootstrap. Called from API routes before any read/write.
 * Same pattern as the existing OpportunityWatch v2 route.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaReady) return
  await sql`
    CREATE TABLE IF NOT EXISTS self_prospecting_leads (
      id SERIAL PRIMARY KEY,
      source_url TEXT NOT NULL,
      source_platform TEXT,
      subreddit TEXT,
      author TEXT,
      post_excerpt TEXT,
      post_full_text TEXT,
      posted_at TIMESTAMPTZ,
      intent_score INT NOT NULL DEFAULT 0,
      intent_tier TEXT,
      specificity INT NOT NULL DEFAULT 0,
      location_match INT NOT NULL DEFAULT 0,
      recency INT NOT NULL DEFAULT 0,
      budget_signals INT NOT NULL DEFAULT 0,
      total_score INT NOT NULL DEFAULT 0,
      matched_keywords JSONB DEFAULT '[]'::jsonb,
      drafted_message TEXT,
      no_mention_mode BOOLEAN DEFAULT FALSE,
      subreddit_note TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT,
      contractor_slug TEXT,
      contractor_name TEXT,
      conversion_value_monthly INT,
      found_at TIMESTAMPTZ DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      replied_at TIMESTAMPTZ,
      converted_at TIMESTAMPTZ,
      discarded_at TIMESTAMPTZ
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_spl_status ON self_prospecting_leads(status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_spl_total_score ON self_prospecting_leads(total_score DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_spl_found_at ON self_prospecting_leads(found_at DESC)`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_spl_source_url ON self_prospecting_leads(source_url)`
  schemaReady = true
}

export interface InsertProspectInput {
  sourceUrl: string
  sourcePlatform: string | null
  subreddit: string | null
  author: string | null
  postExcerpt: string
  postFullText: string
  postedAt: string | null
  score: ProspectScore
  draftedMessage: string | null
  noMentionMode: boolean
  subredditNote: string | null
}

export async function insertProspect(input: InsertProspectInput): Promise<ProspectRow> {
  await ensureSchema()
  const matchedJson = JSON.stringify(input.score.matchedKeywords)
  const result = await sql<ProspectRow>`
    INSERT INTO self_prospecting_leads (
      source_url, source_platform, subreddit, author,
      post_excerpt, post_full_text, posted_at,
      intent_score, intent_tier,
      specificity, location_match, recency, budget_signals, total_score,
      matched_keywords, drafted_message, no_mention_mode, subreddit_note
    ) VALUES (
      ${input.sourceUrl}, ${input.sourcePlatform}, ${input.subreddit}, ${input.author},
      ${input.postExcerpt}, ${input.postFullText}, ${input.postedAt},
      ${input.score.intentScore}, ${input.score.intentTier},
      ${input.score.specificity}, ${input.score.locationMatch}, ${input.score.recency},
      ${input.score.budgetSignals}, ${input.score.total},
      ${matchedJson}::jsonb, ${input.draftedMessage}, ${input.noMentionMode}, ${input.subredditNote}
    )
    ON CONFLICT (source_url) DO UPDATE SET
      post_excerpt = EXCLUDED.post_excerpt,
      post_full_text = EXCLUDED.post_full_text,
      intent_score = EXCLUDED.intent_score,
      intent_tier = EXCLUDED.intent_tier,
      specificity = EXCLUDED.specificity,
      location_match = EXCLUDED.location_match,
      recency = EXCLUDED.recency,
      budget_signals = EXCLUDED.budget_signals,
      total_score = EXCLUDED.total_score,
      matched_keywords = EXCLUDED.matched_keywords,
      drafted_message = EXCLUDED.drafted_message,
      no_mention_mode = EXCLUDED.no_mention_mode,
      subreddit_note = EXCLUDED.subreddit_note
    RETURNING *
  `
  return result.rows[0]
}

export interface ListProspectFilter {
  status?: ProspectStatus | 'all'
  band?: 'hot' | 'warm' | 'cold' | 'all'
  sinceHours?: number
  limit?: number
}

export async function listProspects(filter: ListProspectFilter = {}): Promise<ProspectRow[]> {
  await ensureSchema()
  const { status = 'all', band = 'all', sinceHours, limit = 200 } = filter

  // We compose with sql tagged templates rather than building a string, but
  // tagged templates don't support optional WHERE clauses well. Do a few
  // explicit branches.
  if (sinceHours !== undefined) {
    const r = await sql<ProspectRow>`
      SELECT * FROM self_prospecting_leads
      WHERE found_at >= NOW() - (${sinceHours} || ' hours')::interval
        AND (${status} = 'all' OR status = ${status})
        AND (
          ${band} = 'all'
          OR (${band} = 'hot' AND total_score >= 80)
          OR (${band} = 'warm' AND total_score >= 60 AND total_score < 80)
          OR (${band} = 'cold' AND total_score >= 40 AND total_score < 60)
        )
      ORDER BY total_score DESC, found_at DESC
      LIMIT ${limit}
    `
    return r.rows
  }
  const r = await sql<ProspectRow>`
    SELECT * FROM self_prospecting_leads
    WHERE (${status} = 'all' OR status = ${status})
      AND (
        ${band} = 'all'
        OR (${band} = 'hot' AND total_score >= 80)
        OR (${band} = 'warm' AND total_score >= 60 AND total_score < 80)
        OR (${band} = 'cold' AND total_score >= 40 AND total_score < 60)
      )
    ORDER BY total_score DESC, found_at DESC
    LIMIT ${limit}
  `
  return r.rows
}

export async function getProspect(id: number): Promise<ProspectRow | null> {
  await ensureSchema()
  const r = await sql<ProspectRow>`SELECT * FROM self_prospecting_leads WHERE id = ${id}`
  return r.rows[0] ?? null
}

export interface UpdateProspectInput {
  status?: ProspectStatus
  notes?: string | null
  contractor_slug?: string | null
  contractor_name?: string | null
  conversion_value_monthly?: number | null
}

export async function updateProspect(id: number, patch: UpdateProspectInput): Promise<ProspectRow | null> {
  await ensureSchema()
  // Status transition timestamps
  const now = new Date().toISOString()
  const sentAt = patch.status === 'sent' ? now : null
  const repliedAt = patch.status === 'replied' ? now : null
  const convertedAt = patch.status === 'converted' ? now : null
  const discardedAt = patch.status === 'discarded' ? now : null

  const r = await sql<ProspectRow>`
    UPDATE self_prospecting_leads SET
      status = COALESCE(${patch.status ?? null}, status),
      notes = CASE WHEN ${patch.notes !== undefined} THEN ${patch.notes ?? null} ELSE notes END,
      contractor_slug = CASE WHEN ${patch.contractor_slug !== undefined} THEN ${patch.contractor_slug ?? null} ELSE contractor_slug END,
      contractor_name = CASE WHEN ${patch.contractor_name !== undefined} THEN ${patch.contractor_name ?? null} ELSE contractor_name END,
      conversion_value_monthly = CASE WHEN ${patch.conversion_value_monthly !== undefined} THEN ${patch.conversion_value_monthly ?? null} ELSE conversion_value_monthly END,
      sent_at = COALESCE(sent_at, ${sentAt}),
      replied_at = COALESCE(replied_at, ${repliedAt}),
      converted_at = COALESCE(converted_at, ${convertedAt}),
      discarded_at = COALESCE(discarded_at, ${discardedAt})
    WHERE id = ${id}
    RETURNING *
  `
  return r.rows[0] ?? null
}

export interface ProspectCounts {
  total: number
  hot: number
  warm: number
  cold: number
  byStatus: Record<ProspectStatus, number>
}

export async function getCounts(): Promise<ProspectCounts> {
  await ensureSchema()
  const r = await sql<{
    total: string
    hot: string
    warm: string
    cold: string
    new_: string
    sent: string
    replied: string
    converted: string
    discarded: string
  }>`
    SELECT
      COUNT(*)::text AS total,
      SUM(CASE WHEN total_score >= 80 THEN 1 ELSE 0 END)::text AS hot,
      SUM(CASE WHEN total_score >= 60 AND total_score < 80 THEN 1 ELSE 0 END)::text AS warm,
      SUM(CASE WHEN total_score >= 40 AND total_score < 60 THEN 1 ELSE 0 END)::text AS cold,
      SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END)::text AS new_,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)::text AS sent,
      SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END)::text AS replied,
      SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END)::text AS converted,
      SUM(CASE WHEN status = 'discarded' THEN 1 ELSE 0 END)::text AS discarded
    FROM self_prospecting_leads
  `
  const row = r.rows[0]
  const n = (s: string | null | undefined) => parseInt(s ?? '0', 10) || 0
  return {
    total: n(row?.total),
    hot: n(row?.hot),
    warm: n(row?.warm),
    cold: n(row?.cold),
    byStatus: {
      new: n(row?.new_),
      sent: n(row?.sent),
      replied: n(row?.replied),
      converted: n(row?.converted),
      discarded: n(row?.discarded),
    },
  }
}
