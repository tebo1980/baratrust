'use client'

import { useState } from 'react'
import Nav from '../Nav'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-card2, #0A1019)',
  border: '1px solid var(--border, rgba(255,255,255,0.08))',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '14px',
  color: 'var(--cream, #F0EBE0)',
  fontFamily: 'inherit',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--cream-muted, #7A7268)',
  display: 'block',
  marginBottom: '6px',
}

const platforms = ['reddit', 'facebook', 'x', 'forum', 'other'] as const

interface IngestResult {
  prospect: {
    id: number
    total_score: number
    intent_tier: string | null
    drafted_message: string | null
    no_mention_mode: boolean
    subreddit_note: string | null
    matched_keywords: string[]
    subreddit: string | null
    author: string | null
    post_excerpt: string | null
  }
  band: 'hot' | 'warm' | 'cold' | 'discard'
  fetchNote: string | null
}

export default function ManualPaste() {
  const [url, setUrl] = useState('')
  const [postText, setPostText] = useState('')
  const [platform, setPlatform] = useState<typeof platforms[number] | ''>('')
  const [subreddit, setSubreddit] = useState('')
  const [author, setAuthor] = useState('')
  const [postedAt, setPostedAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<IngestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const body: Record<string, unknown> = { url: url.trim() }
      if (postText.trim()) body.postText = postText.trim()
      if (platform) body.platform = platform
      if (subreddit.trim()) body.subreddit = subreddit.trim().replace(/^r\//, '')
      if (author.trim()) body.author = author.trim().replace(/^u\//, '')
      if (postedAt) body.postedAt = new Date(postedAt).toISOString()

      const res = await fetch('/api/internal/self-prospecting/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        if (data.hint) setError((prev) => `${prev}\n\n${data.hint}`)
      } else {
        setResult(data as IngestResult)
        // If success, clear the form (but keep platform selection)
        setUrl('')
        setPostText('')
        setSubreddit('')
        setAuthor('')
        setPostedAt('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg-deep, #0A1019)',
        color: 'var(--cream, #F0EBE0)',
        padding: '40px 24px',
        fontFamily: 'var(--font-body), system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Nav active="manual" />

        <h1
          style={{
            fontFamily: 'var(--font-display, var(--font-fraunces))',
            fontSize: '28px',
            margin: '0 0 8px',
          }}
        >
          Add a prospect
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--cream-muted, #7A7268)', marginBottom: '24px', lineHeight: 1.6 }}>
          Paste a URL to a Reddit post, Facebook post, forum thread, or anything else. Reddit URLs auto-fetch; for everything else, paste the post text below.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ background: 'var(--bg-card, #111D2C)', border: '1px solid var(--border, rgba(255,255,255,0.08))', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Post URL *</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.reddit.com/r/smallbusiness/comments/..."
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Post text (required if URL fetch fails)</label>
              <textarea
                rows={8}
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Paste the post body here. Reddit URLs auto-fetch — only fill this if the auto-fetch fails or for non-Reddit URLs."
                style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Platform (optional)</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as typeof platforms[number] | '')}
                  style={inputStyle}
                >
                  <option value="">Auto-detect</option>
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Subreddit (optional)</label>
                <input
                  type="text"
                  value={subreddit}
                  onChange={(e) => setSubreddit(e.target.value)}
                  placeholder="smallbusiness"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Author (optional)</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="username"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Posted at (optional)</label>
                <input
                  type="datetime-local"
                  value={postedAt}
                  onChange={(e) => setPostedAt(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !url.trim()}
              style={{
                background: 'var(--blue, #3B7FD4)',
                color: 'var(--cream, #F0EBE0)',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
              }}
            >
              {submitting ? 'Scoring & drafting…' : 'Add & score prospect →'}
            </button>
          </div>
        </form>

        {error && (
          <div
            style={{
              background: 'rgba(224,90,90,0.1)',
              border: '1px solid rgba(224,90,90,0.25)',
              color: '#E05A5A',
              padding: '14px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '13px',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <div
            style={{
              background: 'var(--bg-card, #111D2C)',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
              borderRadius: '14px',
              padding: '20px',
            }}
          >
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '5px 12px',
                  borderRadius: '999px',
                  background: result.band === 'hot' ? 'rgba(224,90,90,0.18)' : result.band === 'warm' ? 'rgba(201,168,76,0.18)' : 'rgba(59,127,212,0.18)',
                  color: result.band === 'hot' ? '#FF7373' : result.band === 'warm' ? '#E8C86A' : '#5B9FE4',
                  letterSpacing: '0.08em',
                }}
              >
                {result.band.toUpperCase()} · {result.prospect.total_score}
              </span>
              {result.prospect.no_mention_mode && (
                <span style={{ fontSize: '12px', color: '#FF7373', fontWeight: 700 }}>
                  NO-MENTION MODE — subreddit bans agency promo
                </span>
              )}
              {result.fetchNote && (
                <span style={{ fontSize: '12px', color: 'var(--cream-muted, #7A7268)' }}>
                  Note: {result.fetchNote}
                </span>
              )}
            </div>
            {result.prospect.drafted_message && (
              <>
                <div style={{ ...labelStyle, marginBottom: '6px' }}>Drafted reply</div>
                <div
                  style={{
                    background: 'var(--bg-card2, #0A1019)',
                    border: '1px solid var(--border, rgba(255,255,255,0.08))',
                    borderRadius: '8px',
                    padding: '14px',
                    fontSize: '14px',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                    marginBottom: '14px',
                  }}
                >
                  {result.prospect.drafted_message}
                </div>
              </>
            )}
            <a
              href="/internal/opportunity-watch/self-prospecting"
              style={{ fontSize: '13px', color: '#5B9FE4', fontWeight: 600, textDecoration: 'none' }}
            >
              See it in the dashboard →
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
