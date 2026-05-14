'use client'

import { useState } from 'react'

const tradeOptions = [
  'HVAC', 'Electrical', 'Plumbing', 'Roofing', 'Landscaping',
  'Cleaning', 'General Contractor', 'Painting', 'Concrete',
  'Gutters', 'Pest Control', 'Handyman',
]

const DECISION_COLORS = {
  ACT_NOW: { badge: '#C9A84C', border: 'rgba(201,168,76,0.3)', bg: 'rgba(201,168,76,0.06)' },
  WATCH: { badge: '#3B7FD4', border: 'rgba(59,127,212,0.3)', bg: 'rgba(59,127,212,0.06)' },
  IGNORE: { badge: '#7A7268', border: 'rgba(122,114,104,0.3)', bg: 'rgba(122,114,104,0.04)' },
}

interface Lead {
  platform: string
  summary: string
  decision: 'ACT_NOW' | 'WATCH' | 'IGNORE'
  decision_reasoning: string
  urgency_score: number
  location: string
  outreach_message: string
  source_url: string | null
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '20px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-card2)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '14px',
  color: 'var(--cream)',
  fontFamily: 'var(--font-body)',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237A7268' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--cream-muted)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '6px',
}

export default function OpportunityWatchV2() {
  const [trade, setTrade] = useState('')
  const [location, setLocation] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trade || !location) return

    setLoading(true)
    setError('')
    setLeads([])
    setSearched(false)

    try {
      const res = await fetch('/api/internal/opportunitywatch-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade, location, context }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
      } else {
        setLeads(data.leads || [])
        setSearched(true)
      }
    } catch {
      setError('Network error — check your connection and try again')
    } finally {
      setLoading(false)
    }
  }

  function copyOutreach(msg: string, idx: number) {
    navigator.clipboard.writeText(msg)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const actCount = leads.filter(l => l.decision === 'ACT_NOW').length
  const watchCount = leads.filter(l => l.decision === 'WATCH').length

  return (
    <>
      <nav>
        <a href="/" className="nav-brand">
          <div className="nav-logo-mark">🦡</div>
          BaraTrust
        </a>
        <a href="/internal/opportunity-watch" className="nav-back">← V1 Manual Logger</a>
      </nav>

      <main style={{ background: 'var(--bg-deep)', minHeight: '100vh', padding: '100px 0 60px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>

          {/* HEADER */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 900, color: 'var(--cream)' }}>
                OpportunityWatch
              </div>
              <span style={{
                background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: '100px', padding: '3px 10px', fontSize: '10px', fontWeight: 600,
                color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                V2 · AI-Powered
              </span>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--cream-dim)' }}>
              AI searches Reddit, Craigslist, and social platforms in real time to surface contractor leads.
            </p>
          </div>

          {/* SEARCH FORM */}
          <div style={{ ...cardStyle, borderRadius: '20px', padding: '28px', marginBottom: '32px' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Trade</label>
                  <select
                    style={selectStyle}
                    value={trade}
                    onChange={e => setTrade(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select trade</option>
                    {tradeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Target Location</label>
                  <input
                    style={inputStyle}
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Louisville, KY"
                    required
                  />
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <label style={labelStyle}>Additional Context (optional)</label>
                <input
                  style={inputStyle}
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="e.g. focus on emergency calls, last 48 hours only..."
                />
              </div>
              <button
                type="submit"
                disabled={loading || !trade || !location}
                className="btn-primary"
                style={{ width: '100%', marginTop: '20px', padding: '14px', fontSize: '14px', display: 'block', textAlign: 'center', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Searching the web for real leads…' : 'Find Leads →'}
              </button>
            </form>
          </div>

          {/* LOADING */}
          {loading && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px', marginBottom: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--cream)', marginBottom: '8px' }}>
                Scanning Reddit, Craigslist &amp; more
              </div>
              <p style={{ fontSize: '13px', color: 'var(--cream-muted)' }}>
                Running real web searches for {trade} leads in {location}. This takes 20–40 seconds.
              </p>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div style={{ background: 'rgba(224,90,90,0.08)', border: '1px solid rgba(224,90,90,0.25)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', color: '#E05A5A', margin: 0 }}>⚠ {error}</p>
            </div>
          )}

          {/* RESULTS SUMMARY */}
          {searched && leads.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--cream-muted)' }}>
                {leads.length} leads found for <strong style={{ color: 'var(--cream)' }}>{trade}</strong> in <strong style={{ color: 'var(--cream)' }}>{location}</strong>
              </span>
              {actCount > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', background: 'rgba(201,168,76,0.1)', padding: '3px 10px', borderRadius: '100px' }}>
                  ⚡ {actCount} Act Now
                </span>
              )}
              {watchCount > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#3B7FD4', background: 'rgba(59,127,212,0.1)', padding: '3px 10px', borderRadius: '100px' }}>
                  👁 {watchCount} Watch
                </span>
              )}
            </div>
          )}

          {/* LEAD CARDS */}
          {leads.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {leads.map((lead, idx) => {
                const colors = DECISION_COLORS[lead.decision] ?? DECISION_COLORS.IGNORE
                return (
                  <div key={idx} style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '16px',
                    padding: '24px',
                  }}>
                    {/* Badge + score */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{
                        background: colors.badge, color: '#0A0A0F', fontSize: '10px', fontWeight: 700,
                        padding: '4px 10px', borderRadius: '100px', letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>
                        {lead.decision === 'ACT_NOW' ? '⚡ Act Now' : lead.decision === 'WATCH' ? '👁 Watch' : 'Ignore'}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--cream-muted)' }}>
                        Urgency: <strong style={{ color: colors.badge }}>{lead.urgency_score}/100</strong>
                      </span>
                    </div>

                    {/* Platform + location */}
                    <div style={{ fontSize: '11px', color: 'var(--cream-muted)', marginBottom: '6px' }}>
                      {lead.platform}{lead.location ? ` · ${lead.location}` : ''}
                    </div>

                    {/* Summary */}
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cream)', marginBottom: '10px', lineHeight: 1.5 }}>
                      {lead.summary}
                    </div>

                    {/* Reasoning */}
                    <p style={{ fontSize: '12px', color: 'var(--cream-dim)', lineHeight: 1.6, marginBottom: '8px' }}>
                      <strong style={{ color: 'var(--cream-muted)' }}>Why: </strong>
                      {lead.decision_reasoning}
                    </p>

                    {/* Source URL */}
                    {lead.source_url && (
                      <a
                        href={lead.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '11px', color: '#3B7FD4', textDecoration: 'underline', display: 'block', marginBottom: '12px', wordBreak: 'break-all' }}
                      >
                        View original post →
                      </a>
                    )}

                    {/* Outreach message */}
                    {lead.outreach_message && (
                      <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--cream-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Outreach Message
                          </span>
                          <button
                            onClick={() => copyOutreach(lead.outreach_message, idx)}
                            style={{
                              background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px',
                              padding: '3px 10px', fontSize: '11px', color: 'var(--blue-light)', cursor: 'pointer',
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            {copiedIndex === idx ? 'Copied ✓' : 'Copy'}
                          </button>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--cream)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                          {lead.outreach_message}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* EMPTY STATE */}
          {searched && leads.length === 0 && !loading && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ fontSize: '14px', color: 'var(--cream-muted)' }}>
                No leads found for this search. Try broadening the location or a different trade.
              </p>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
