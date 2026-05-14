'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { EmailLink, SmsLink, CONTACT_PHONE_DISPLAY } from '@/components/ContactLinks'

export default function HealthScoreClient() {
  const initialized = useRef(false)

  const update = useCallback(() => {
    const cats = [
      { id: 's-vis', val: 'v-val', fill: 'fill-vis', name: 'Visibility' },
      { id: 's-lead', val: 'l-val', fill: 'fill-lead', name: 'Lead Capture' },
      { id: 's-prof', val: 'p-val', fill: 'fill-prof', name: 'Profitability' },
      { id: 's-cust', val: 'c-val', fill: 'fill-cust', name: 'Customer Quality' },
      { id: 's-rep', val: 'r-val', fill: 'fill-rep', name: 'Reputation' },
    ]

    function getColor(v: number) {
      if (v >= 75) return '#5A8F6E'
      if (v >= 50) return '#3B7FD4'
      if (v >= 25) return '#C9A84C'
      return '#E05A5A'
    }

    function getTag(s: number) {
      if (s >= 80) return { text: '\u2713 Firing on All Cylinders', bg: 'rgba(90,143,110,0.15)', color: '#7AB08E' }
      if (s >= 60) return { text: '\u2191 Good Foundation', bg: 'rgba(59,127,212,0.15)', color: '#5B9FE4' }
      if (s >= 40) return { text: '\u2192 Getting Started', bg: 'rgba(201,168,76,0.15)', color: '#C9A84C' }
      return { text: '! Needs Attention', bg: 'rgba(224,90,90,0.15)', color: '#E05A5A' }
    }

    const insights: Record<string, string> = {
      'Visibility': 'Customers who need what you offer are searching right now — and finding your competitors instead. BaraTrust builds your complete local presence so you show up everywhere they look.',
      'Lead Capture': "Every missed call is a job that went to someone else. BaraTrust tracks every inquiry and sends an instant text-back when you miss a call so no lead slips through while you're on a job.",
      'Profitability': "You may be generating calls and jobs but not knowing which ones actually make money. BaraTrust's Money Map shows you exactly which customers and job types are worth your time.",
      'Customer Quality': "Not all customers are created equal. BaraTrust's Customer Intelligence CRM tags your Gold customers, your Blacklist, and everyone in between — so you know who to chase and who to avoid.",
      'Reputation': 'Your online reputation is either your best salesperson or your biggest liability. BaraTrust monitors your reviews, helps you respond, and builds a steady flow of new positive ratings.',
    }

    const vals = cats.map(c => {
      const slider = document.getElementById(c.id) as HTMLInputElement
      if (!slider) return { name: c.name, val: 50 }
      const v = parseInt(slider.value)
      const valEl = document.getElementById(c.val)
      const fillEl = document.getElementById(c.fill)
      if (valEl) { valEl.textContent = String(v); valEl.style.color = getColor(v) }
      if (fillEl) fillEl.style.width = v + '%'
      return { name: c.name, val: v }
    })

    const score = Math.round(vals.reduce((s, v) => s + v.val, 0) / 5)

    const numEl = document.getElementById('score-num')
    if (numEl) { numEl.textContent = String(score); numEl.style.color = getColor(score) }

    const circumference = 283
    const offset = circumference - (score / 100) * circumference
    const circleEl = document.getElementById('circle-fill') as SVGCircleElement | null
    if (circleEl) { circleEl.style.strokeDashoffset = String(offset); circleEl.style.stroke = getColor(score) }

    const tag = getTag(score)
    const tagEl = document.getElementById('score-tag')
    if (tagEl) {
      tagEl.textContent = tag.text
      tagEl.style.background = tag.bg
      tagEl.style.color = tag.color
      tagEl.style.border = '1px solid ' + tag.color.replace(')', ', 0.3)').replace('rgb', 'rgba')
    }

    const descEl = document.getElementById('score-desc')
    if (descEl) {
      if (score >= 80) descEl.textContent = 'Your business is performing well across all five areas. BaraTrust keeps the machine running and identifies the remaining gaps.'
      else if (score >= 60) descEl.textContent = 'You have a solid foundation. With focused attention on your weakest areas, you could be firing on all cylinders within 90 days.'
      else if (score >= 40) descEl.textContent = "Most businesses start here — not because they're failing, but because nobody has ever measured all five areas together."
      else descEl.textContent = "There's significant room to grow. Businesses that start low see the fastest, most dramatic results."
    }

    const barsEl = document.getElementById('bars-row')
    if (barsEl) {
      barsEl.innerHTML = vals.map(v =>
        `<div class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="height:${v.val}%;background:${getColor(v.val)}"></div></div><div class="bar-name">${v.name.split(' ')[0]}</div></div>`
      ).join('')
    }

    const insightEl = document.getElementById('insight-box')
    if (insightEl) {
      insightEl.style.borderLeftColor = getColor(score)
      if (score >= 80) insightEl.innerHTML = "Your business is scoring strong across all five categories. BaraTrust clients at 80+ see the biggest wins from predictive intelligence."
      else insightEl.innerHTML = `Your overall score is <strong>${score} out of 100.</strong> Most contractors score between 30 and 50 when they start — not because they're failing, but because nobody has ever put all five pieces together.`
    }

    const focusEl = document.getElementById('focus-box')
    if (focusEl) {
      if (score < 80) {
        const weak = vals.reduce((a, b) => a.val < b.val ? a : b)
        focusEl.style.display = 'block'
        focusEl.style.borderLeftColor = getColor(weak.val)
        focusEl.innerHTML = `<strong>Your Focus Area: ${weak.name} — ${weak.val}/100</strong>${insights[weak.name] || ''}`
      } else {
        focusEl.style.display = 'none'
      }
    }
  }, [])

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      update()
    }
  }, [update])

  return (
    <>
      {/* SCORE DISPLAY */}
      <div className="score-display">
        <div className="score-circle">
          <svg viewBox="0 0 100 100">
            <circle className="score-circle-bg" cx="50" cy="50" r="45" />
            <circle className="score-circle-fill" id="circle-fill" cx="50" cy="50" r="45" />
          </svg>
          <div className="score-center">
            <div className="score-num" id="score-num">50</div>
            <div className="score-of">out of 100</div>
          </div>
        </div>
        <div className="score-meta">
          <div className="score-tag" id="score-tag">Getting Started</div>
          <div className="score-desc" id="score-desc">Most businesses score between 30 and 50 when they start.</div>
          <div className="bars-row" id="bars-row"></div>
        </div>
      </div>

      {/* SLIDERS */}
      <div className="sliders-card">
        <div className="sliders-label">Rate Your Business — 0 to 100</div>

        <SliderRow id="s-vis" valId="v-val" fillId="fill-vis" name="Visibility" hint="Can customers find you on Google, Maps, and directories?" onInput={update} />
        <SliderRow id="s-lead" valId="l-val" fillId="fill-lead" name="Lead Capture" hint="Do you track every call, form, and missed inquiry?" onInput={update} />
        <SliderRow id="s-prof" valId="p-val" fillId="fill-prof" name="Profitability" hint="Do you know which jobs and customers actually make you money?" onInput={update} />
        <SliderRow id="s-cust" valId="c-val" fillId="fill-cust" name="Customer Quality" hint="Do you know who your best customers are and how to get more of them?" onInput={update} />
        <SliderRow id="s-rep" valId="r-val" fillId="fill-rep" name="Reputation" hint="Are your reviews strong and working hard to bring in new business?" onInput={update} />
      </div>

      <div className="insight-box" id="insight-box"></div>
      <div className="focus-box" id="focus-box"></div>

      <div className="divider"></div>

      <ScoreLeadCapture />

      <div className="cta-section">
        <a href="https://calendly.com/tebo1980/baratrust-consultation" target="_blank" rel="noopener noreferrer" className="cta-btn">Get a Free BaraTrust Consultation</a>
        <div className="cta-sub">
          No pitch. No pressure. Just an honest look at what your business needs.<br />
          Or text us at <SmsLink>{CONTACT_PHONE_DISPLAY}</SmsLink> &nbsp;·&nbsp; <EmailLink />
        </div>
      </div>
    </>
  )
}

function ScoreLeadCapture() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [business, setBusiness] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const score = document.getElementById('score-num')?.textContent || ''
    const cats = ['s-vis', 's-lead', 's-prof', 's-cust', 's-rep']
      .map((id) => {
        const el = document.getElementById(id) as HTMLInputElement | null
        return el?.value ?? ''
      })
      .join(' / ')

    try {
      const res = await fetch('https://formspree.io/f/xzdkqaap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name,
          email,
          business,
          _subject: `Health Score lead — ${name} — overall ${score}`,
          message: `Health Score: ${score}\nVis/Lead/Prof/Cust/Rep: ${cats}`,
        }),
      })
      if (res.ok) {
        setStatus('sent')
        setName('')
        setEmail('')
        setBusiness('')
      } else {
        const data = await res.json().catch(() => ({}))
        setStatus('error')
        setErrorMsg(data.errors?.map((err: { message: string }) => err.message).join(', ') || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Unable to send. Please try again or call 502-418-2431.')
    }
  }

  if (status === 'sent') {
    return (
      <div
        style={{
          background: 'rgba(90,143,110,0.12)',
          border: '1px solid rgba(90,143,110,0.25)',
          borderRadius: '14px',
          padding: '24px',
          textAlign: 'center',
          color: '#7AB08E',
          fontSize: '15px',
          margin: '32px 0',
        }}
      >
        ✓ Thanks — Todd will email a personalized review of your score within 24 hours.
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '28px',
        margin: '32px 0',
      }}
    >
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--cream)', marginBottom: '8px' }}>
        Want a personalized walkthrough of your score?
      </div>
      <p style={{ fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.6, marginBottom: '18px' }}>
        Share your contact info and Todd will email a one-page write-up of your weakest areas and what to do about them. No pitch, no spam.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
        <input
          type="text"
          required
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '8px',
            padding: '10px 14px', fontSize: '14px', color: 'var(--cream)', fontFamily: 'var(--font-body)', outline: 'none',
          }}
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '8px',
            padding: '10px 14px', fontSize: '14px', color: 'var(--cream)', fontFamily: 'var(--font-body)', outline: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Business name (optional)"
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
          style={{
            background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '8px',
            padding: '10px 14px', fontSize: '14px', color: 'var(--cream)', fontFamily: 'var(--font-body)', outline: 'none',
          }}
        />
      </div>
      {status === 'error' && (
        <div style={{ fontSize: '13px', color: '#E05A5A', marginBottom: '10px' }}>{errorMsg}</div>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        style={{
          background: 'var(--blue)', color: 'var(--cream)', padding: '12px 22px', borderRadius: '10px',
          fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, border: 'none',
          cursor: status === 'sending' ? 'not-allowed' : 'pointer',
          letterSpacing: '0.02em', opacity: status === 'sending' ? 0.6 : 1,
        }}
      >
        {status === 'sending' ? 'Sending…' : 'Email me my breakdown →'}
      </button>
    </form>
  )
}

function SliderRow({ id, valId, fillId, name, hint, onInput }: {
  id: string; valId: string; fillId: string; name: string; hint: string; onInput: () => void
}) {
  return (
    <div className="slider-row" style={{ marginTop: id === 's-vis' ? 0 : '20px' }}>
      <div className="slider-header">
        <span className="slider-name">{name}</span>
        <span className="slider-val" id={valId}>50</span>
      </div>
      <div className="slider-hint">{hint}</div>
      <div className="slider-track">
        <div className="slider-fill-track" id={fillId} style={{ width: '50%' }}></div>
        <input type="range" min={0} max={100} defaultValue={50} id={id} onInput={onInput} />
      </div>
    </div>
  )
}
