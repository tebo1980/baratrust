'use client'

import {
  PhoneLink,
  CONTACT_PHONE_DISPLAY,
  BookingLink,
  PulseCheckoutLink,
} from './ContactLinks'

type Feature = { icon: string; title: string; text: string }

type SeoTradePageProps = {
  trade: string
  location: string
  state: string
  headline: string
  headlineEm: string
  subtext: string
  painPoints: { title: string; text: string }[]
  features: Feature[]
  stats: { num: string; label: string }[]
  closingHeadline: string
}

export default function SeoTradePage({
  trade, location, state, headline, headlineEm, subtext,
  painPoints, features, stats, closingHeadline,
}: SeoTradePageProps) {
  return (
    <div className="seo-page">
      {/* NAV */}
      <nav>
        <a href="/" className="nav-logo">
          <div className="nav-logo-mark">{'\uD83E\uDDAB'}</div>
          BaraTrust
        </a>
        <ul className="nav-links">
          <li><a href="/#services">What We Watch</a></li>
          <li><a href="/#pulse">Business Pulse · $99/mo</a></li>
          <li><a href="/sample-pulse">Sample Pulse</a></li>
          <li><a href="/pricing">Pricing</a></li>
          <li><a href="/reality-check" className="nav-cta">Free Reality Check</a></li>
        </ul>
      </nav>

      {/* HERO */}
      <section className="seo-hero">
        <div className="container">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            {trade} Growth &amp; Business Watch — {location}, {state}
          </div>
          <h1>{headline}<br /><em>{headlineEm}</em></h1>
          <p className="hero-sub" style={{ maxWidth: '580px' }}>{subtext}</p>
          <div className="hero-buttons">
            <a href="/reality-check" className="btn-primary">Run Free Reality Check</a>
            <BookingLink surface="trade_page" className="btn-secondary">Talk With Todd</BookingLink>
          </div>
          <div className="hero-proof">
            <div className="proof-item"><span className="proof-check">{'\u2713'}</span> Protect • Improve • Grow • Save</div>
            <div className="proof-item"><span className="proof-check">{'\u2713'}</span> Free Reality Check Snapshot</div>
            <div className="proof-item"><span className="proof-check">{'\u2713'}</span> Business Pulse — $99/month</div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS / WHAT BUSY OWNERS MISS */}
      <section className="seo-section" style={{ background: 'var(--bg-mid)' }}>
        <div className="container">
          <div className="section-tag">On the Job Every Day</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px' }}>
            What gets missed when you&apos;re busy running a <span style={{ color: 'var(--blue-light)' }}>{trade.toLowerCase()} business</span>
          </h2>
          <div className="fear-cards" style={{ maxWidth: '640px' }}>
            {painPoints.map((p, i) => (
              <div key={i} className="fear-card">
                <div>
                  <div className="fear-card-title">{p.title}</div>
                  <div className="fear-card-text">{p.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="seo-section" style={{ background: 'var(--bg-deep)' }}>
        <div className="container">
          <div className="section-tag">BaraTrust watches your business so you don&apos;t have to</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px' }}>
            How BaraTrust helps <span style={{ color: 'var(--blue-light)' }}>{location} {trade.toLowerCase()} companies</span>
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--cream-dim)', lineHeight: 1.8, maxWidth: '640px', marginBottom: '32px' }}>
            You run the crews and serve your customers. BaraTrust keeps looking around the corner — watching your reputation, online visibility, local opportunities, and recurring vendor costs, then helping you act when it actually makes sense.
          </p>
          <div className="seo-features">
            {features.map((f, i) => (
              <div key={i} className="seo-feature">
                <div className="seo-feature-icon">{f.icon}</div>
                <div>
                  <div className="seo-feature-title">{f.title}</div>
                  <div className="seo-feature-text">{f.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PILLAR HIGHLIGHTS */}
      <section className="seo-section" style={{ background: 'var(--bg-mid)' }}>
        <div className="container">
          <div className="about-stats" style={{ maxWidth: '600px' }}>
            {stats.map((s, i) => (
              <div key={i} className="about-stat">
                <div className="about-stat-num">{s.num}</div>
                <div className="about-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="seo-cta">
        <div className="container">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900, lineHeight: 1.1, marginBottom: '16px' }}>{closingHeadline}</h2>
          <p style={{ fontSize: '16px', color: 'var(--cream-dim)', maxWidth: '520px', margin: '0 auto 32px', lineHeight: 1.7 }}>
            See what BaraTrust can spot right now with a Free Reality Check, or keep BaraTrust watching your business and market with Business Pulse for $99/month.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <a href="/reality-check" className="btn-primary">Run Free Reality Check</a>
            <PulseCheckoutLink surface="trade_page" className="btn-secondary">Start Business Pulse — $99/mo</PulseCheckoutLink>
            <BookingLink surface="trade_page" className="btn-secondary">Book Intro Call</BookingLink>
            <PhoneLink className="btn-secondary">Call {CONTACT_PHONE_DISPLAY}</PhoneLink>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--cream-muted)' }}>
            Serving {location} and surrounding {state === 'KY' ? 'Greater Louisville & Kentucky' : 'Southern Indiana'} communities
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">BaraTrust</div>
        <div className="footer-seal">{'\uD83E\uDDAB'}</div>
        <div className="footer-text">&copy; 2026 BaraTrust. Watches your business so you don&apos;t have to.</div>
        <div className="footer-links">
          <a href="/">Home</a>
          <a href="/#pulse">Business Pulse</a>
          <a href="/sample-pulse">Sample Pulse</a>
          <a href="/terms">Terms</a>
          <a href="/reality-check">Free Reality Check</a>
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Back to Top</a>
        </div>
      </footer>
    </div>
  )
}
