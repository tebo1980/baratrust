'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Status = 'new' | 'sent' | 'replied' | 'converted' | 'discarded'
type Band = 'hot' | 'warm' | 'cold' | 'all'

interface Prospect {
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
  status: Status
  notes: string | null
  contractor_slug: string | null
  contractor_name: string | null
  conversion_value_monthly: number | null
  found_at: string
  novaPriority?: boolean
  nova_priority?: boolean
}

interface Counts {
  total: number
  hot: number
  warm: number
  cold: number
  byStatus: Record<Status, number>
}

interface Props {
  /** When set, list is locked to this many hours (e.g. 24 for /today). */
  sinceHours?: number
  /** Optional title shown above the filters. */
  title?: string
}

function bandOf(score: number): Band {
  if (score >= 80) return 'hot'
  if (score >= 60) return 'warm'
  if (score >= 40) return 'cold'
  return 'all'
}

const BAND_COLORS: Record<Band, { bg: string; fg: string; label: string }> = {
  hot:  { bg: 'rgba(224,90,90,0.18)',   fg: '#FF7373', label: 'HOT' },
  warm: { bg: 'rgba(201,168,76,0.18)',  fg: '#E8C86A', label: 'WARM' },
  cold: { bg: 'rgba(59,127,212,0.18)',  fg: '#5B9FE4', label: 'COLD' },
  all:  { bg: 'rgba(255,255,255,0.06)', fg: '#7A7268', label: '—' },
}

const STATUS_COLORS: Record<Status, { bg: string; fg: string }> = {
  new:       { bg: 'rgba(255,255,255,0.06)', fg: '#B8B0A4' },
  sent:      { bg: 'rgba(59,127,212,0.18)',  fg: '#5B9FE4' },
  replied:   { bg: 'rgba(201,168,76,0.18)',  fg: '#E8C86A' },
  converted: { bg: 'rgba(90,143,110,0.18)',  fg: '#7AB08E' },
  discarded: { bg: 'rgba(122,114,104,0.10)', fg: '#7A7268' },
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const mins = Math.floor((Date.now() - t) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card, #111D2C)',
  border: '1px solid var(--border, rgba(255,255,255,0.08))',
  borderRadius: '14px',
  padding: '20px',
  marginBottom: '16px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--cream-muted, #7A7268)',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-card2, #0A1019)',
  border: '1px solid var(--border, rgba(255,255,255,0.08))',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '13px',
  color: 'var(--cream, #F0EBE0)',
  fontFamily: 'inherit',
  outline: 'none',
}

const btnStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

export default function ProspectList({ sinceHours, title }: Props) {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [bandFilter, setBandFilter] = useState<Band>('all')
  const [copied, setCopied] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (bandFilter !== 'all') params.set('band', bandFilter)
    if (sinceHours) params.set('sinceHours', String(sinceHours))
    try {
      const res = await fetch(`/api/internal/self-prospecting/prospects?${params}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProspects(data.prospects ?? [])
      setCounts(data.counts ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, bandFilter, sinceHours])

  useEffect(() => {
    refresh()
  }, [refresh])

  const updateStatus = useCallback(
    async (id: number, patch: Partial<Prospect>) => {
      try {
        const res = await fetch(`/api/internal/self-prospecting/prospects/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `HTTP ${res.status}`)
        }
        const data = await res.json()
        setProspects((prev) => prev.map((p) => (p.id === id ? (data.prospect as Prospect) : p)))
      } catch (err) {
        alert(`Update failed: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    },
    [],
  )

  const copyDraft = useCallback(async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      alert('Copy failed — select and copy manually.')
    }
  }, [])

  const dispatchNovaResponse = useCallback(async (id: number) => {
    try {
      const res = await fetch('/api/internal/nova-responder/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId: id }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      alert('✅ ' + (data.message || 'Nova payload dispatched successfully!'))
      refresh()
    } catch (err) {
      alert(`Dispatch failed: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }, [refresh])

  const headerStats = useMemo(() => {
    if (!counts) return null
    return (
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--cream-muted, #7A7268)' }}>
        <span><strong style={{ color: 'var(--cream, #F0EBE0)' }}>{counts.total}</strong> total</span>
        <span style={{ color: '#FF7373' }}>● {counts.hot} hot</span>
        <span style={{ color: '#E8C86A' }}>● {counts.warm} warm</span>
        <span style={{ color: '#5B9FE4' }}>● {counts.cold} cold</span>
        <span>{counts.byStatus.replied} replied · {counts.byStatus.converted} converted</span>
      </div>
    )
  }, [counts])

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        {title && (
          <h1
            style={{
              fontFamily: 'var(--font-display, var(--font-fraunces))',
              fontSize: '28px',
              margin: '0 0 6px',
              color: 'var(--cream, #F0EBE0)',
            }}
          >
            {title}
          </h1>
        )}
        {headerStats}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          alignItems: 'center',
        }}
      >
        <span style={labelStyle}>Status</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | 'all')}
          style={inputStyle}
        >
          <option value="all">All</option>
          <option value="new">New</option>
          <option value="sent">Sent</option>
          <option value="replied">Replied</option>
          <option value="converted">Converted</option>
          <option value="discarded">Discarded</option>
        </select>
        <span style={{ ...labelStyle, marginLeft: '10px' }}>Band</span>
        <select
          value={bandFilter}
          onChange={(e) => setBandFilter(e.target.value as Band)}
          style={inputStyle}
        >
          <option value="all">All</option>
          <option value="hot">Hot (80+)</option>
          <option value="warm">Warm (60–79)</option>
          <option value="cold">Cold (40–59)</option>
        </select>
        <button onClick={refresh} style={btnStyle}>↻ Refresh</button>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(224,90,90,0.1)',
            border: '1px solid rgba(224,90,90,0.25)',
            color: '#E05A5A',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {loading && prospects.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--cream-muted, #7A7268)' }}>
          Loading…
        </div>
      )}

      {!loading && prospects.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--cream-muted, #7A7268)' }}>
          No prospects match this filter. Try a different filter, or add one via{' '}
          <a href="/internal/opportunity-watch/self-prospecting/manual" style={{ color: '#5B9FE4' }}>
            manual paste
          </a>.
        </div>
      )}

      {prospects.map((p) => {
        const band = bandOf(p.total_score)
        const bColor = BAND_COLORS[band]
        const sColor = STATUS_COLORS[p.status]
        return (
          <div key={p.id} style={cardStyle}>
            {/* Top row: score band, status, timestamps, link */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: bColor.bg,
                  color: bColor.fg,
                  letterSpacing: '0.08em',
                }}
              >
                {bColor.label} · {p.total_score}
              </span>
              {(p.novaPriority || p.nova_priority) && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: 'rgba(224,90,90,0.25)',
                    color: '#FF7373',
                    letterSpacing: '0.08em',
                    boxShadow: '0 0 10px rgba(224,90,90,0.6)'
                  }}
                >
                  🚨 Nova Priority Intake
                </span>
              )}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: sColor.bg,
                  color: sColor.fg,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {p.status}
              </span>
              {p.no_mention_mode && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: 'rgba(224,90,90,0.18)',
                    color: '#FF7373',
                    letterSpacing: '0.08em',
                  }}
                  title="Subreddit bans agency self-promo. Draft contains NO mention of BaraTrust."
                >
                  NO-MENTION
                </span>
              )}
              <span style={{ fontSize: '12px', color: 'var(--cream-muted, #7A7268)' }}>
                Found {timeAgo(p.found_at)}
                {p.subreddit && ` · r/${p.subreddit}`}
                {p.author && ` · u/${p.author}`}
                {p.posted_at && ` · posted ${timeAgo(p.posted_at)}`}
              </span>
              <a
                href={p.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: 'auto', fontSize: '13px', color: '#5B9FE4' }}
              >
                Open post →
              </a>
            </div>

            {/* Score breakdown */}
            <div
              style={{
                display: 'flex',
                gap: '14px',
                fontSize: '11px',
                color: 'var(--cream-muted, #7A7268)',
                flexWrap: 'wrap',
                marginBottom: '14px',
              }}
            >
              <span>Intent <strong style={{ color: 'var(--cream, #F0EBE0)' }}>{p.intent_score}</strong> ({p.intent_tier})</span>
              <span>Specificity <strong style={{ color: 'var(--cream, #F0EBE0)' }}>{p.specificity}</strong>/25</span>
              <span>Location <strong style={{ color: 'var(--cream, #F0EBE0)' }}>{p.location_match}</strong>/20</span>
              <span>Recency <strong style={{ color: 'var(--cream, #F0EBE0)' }}>{p.recency}</strong>/15</span>
              <span>Budget <strong style={{ color: 'var(--cream, #F0EBE0)' }}>{p.budget_signals}</strong>/10</span>
            </div>

            {/* Subreddit rule note */}
            {p.subreddit_note && (
              <div
                style={{
                  fontSize: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'var(--cream-dim, #B8B0A4)',
                  marginBottom: '14px',
                }}
              >
                <strong style={{ color: 'var(--cream-muted, #7A7268)', fontSize: '11px', letterSpacing: '0.08em' }}>
                  SUBREDDIT RULES:
                </strong>{' '}
                {p.subreddit_note}
              </div>
            )}

            {/* Post excerpt */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ ...labelStyle, marginBottom: '6px' }}>Original post</div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderLeft: '3px solid rgba(255,255,255,0.15)',
                  padding: '10px 14px',
                  fontSize: '14px',
                  color: 'var(--cream-dim, #B8B0A4)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  fontStyle: 'italic',
                }}
              >
                {p.post_excerpt}
              </div>
              {p.matched_keywords.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--cream-muted, #7A7268)' }}>
                  Matched: {p.matched_keywords.map((k) => `"${k}"`).join(', ')}
                </div>
              )}
            </div>

            {/* Drafted reply */}
            {p.drafted_message ? (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ ...labelStyle, marginBottom: '6px' }}>Drafted reply (review before sending)</div>
                <div
                  style={{
                    background: 'var(--bg-card2, #0A1019)',
                    border: '1px solid var(--border, rgba(255,255,255,0.08))',
                    borderRadius: '8px',
                    padding: '14px',
                    fontSize: '14px',
                    color: 'var(--cream, #F0EBE0)',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {p.drafted_message}
                </div>
                <button
                  onClick={() => copyDraft(p.id, p.drafted_message ?? '')}
                  style={{ ...btnStyle, marginTop: '8px', fontSize: '12px' }}
                >
                  {copied === p.id ? '✓ Copied' : 'Copy reply'}
                </button>
              </div>
            ) : (
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--cream-muted, #7A7268)',
                  fontStyle: 'italic',
                  marginBottom: '14px',
                }}
              >
                No draft generated (score below threshold or drafter failed).
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(p.novaPriority || p.nova_priority) && (
                <button
                  onClick={() => dispatchNovaResponse(p.id)}
                  style={{
                    ...btnStyle,
                    background: 'rgba(224,90,90,0.15)',
                    color: '#FF7373',
                    borderColor: 'rgba(224,90,90,0.4)',
                    boxShadow: '0 0 8px rgba(224,90,90,0.4)'
                  }}
                >
                  ⚡ Trigger Nova Response
                </button>
              )}
              {p.status !== 'sent' && (
                <button onClick={() => updateStatus(p.id, { status: 'sent' })} style={btnStyle}>
                  Mark sent
                </button>
              )}
              {p.status !== 'replied' && (
                <button onClick={() => updateStatus(p.id, { status: 'replied' })} style={btnStyle}>
                  Mark replied
                </button>
              )}
              {p.status !== 'converted' && (
                <button
                  onClick={() => {
                    const name = prompt('Contractor / business name?')
                    if (name === null) return
                    const slug = prompt('Contractor preview slug (optional)') ?? null
                    const valStr = prompt('Monthly value in USD (e.g. 499)')
                    const val = valStr ? parseInt(valStr, 10) : null
                    updateStatus(p.id, {
                      status: 'converted',
                      contractor_name: name || null,
                      contractor_slug: slug || null,
                      conversion_value_monthly: Number.isFinite(val ?? NaN) ? val : null,
                    })
                  }}
                  style={btnStyle}
                >
                  Mark converted
                </button>
              )}
              {p.status !== 'discarded' && (
                <button
                  onClick={() => updateStatus(p.id, { status: 'discarded' })}
                  style={{ ...btnStyle, color: '#E05A5A' }}
                >
                  Discard
                </button>
              )}
              <button
                onClick={() => {
                  const note = prompt('Notes (free text):', p.notes ?? '')
                  if (note !== null) updateStatus(p.id, { notes: note })
                }}
                style={btnStyle}
              >
                Edit notes
              </button>
            </div>

            {(p.notes || p.contractor_name || p.conversion_value_monthly) && (
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border, rgba(255,255,255,0.06))',
                  fontSize: '12px',
                  color: 'var(--cream-dim, #B8B0A4)',
                  lineHeight: 1.6,
                }}
              >
                {p.contractor_name && <div><strong>Converted →</strong> {p.contractor_name}{p.conversion_value_monthly ? ` · $${p.conversion_value_monthly}/mo` : ''}{p.contractor_slug ? ` · /preview/${p.contractor_slug}` : ''}</div>}
                {p.notes && <div style={{ marginTop: '4px' }}><strong>Notes:</strong> {p.notes}</div>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
