import { PhoneLink, CONTACT_PHONE_DISPLAY } from './ContactLinks'

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
          <li><a href="/#agents">AI Staff</a></li>
          <li><a href="/#pricing">Pricing</a></li>
          <li><a href="/#guarantee">Guarantee</a></li>
          <li><a href="/#about">About</a></li>
          <li><a href="https://calendly.com/tebo1980/baratrust-consultation" target="_blank" rel="noopener noreferrer" className="nav-cta">Free Consultation</a></li>
        </ul>
      </nav>

      {/* HERO */}
      <section className="seo-hero">
        <div className="container">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            {trade} Marketing — {location}, {state}
          </div>
          <h1>{headline}<br /><em>{headlineEm}</em></h1>
          <p className="hero-sub" style={{ maxWidth: '580px' }}>{subtext}</p>
          <div className="hero-buttons">
            <a href="https://calendly.com/tebo1980/baratrust-consultation" target="_blank" rel="noopener noreferrer" className="btn-primary">Get Free Consultation</a>
            <a href="/#pricing" className="btn-secondary">See Pricing</a>
          </div>
          <div className="hero-proof">
            <div className="proof-item"><span className="proof-check">{'\u2713'}</span> 90-Day Prove It Guarantee</div>
            <div className="proof-item"><span className="proof-check">{'\u2713'}</span> 10 AI Agents Working 24/7</div>
            <div className="proof-item"><span className="proof-check">{'\u2713'}</span> No Setup Fee</div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="seo-section" style={{ background: 'var(--bg-mid)' }}>
        <div className="container">
          <div className="section-tag">The Problem</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px' }}>
            Why most {trade.toLowerCase()} marketing <span style={{ color: 'var(--blue-light)' }}>doesn&apos;t work</span>
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
          <div className="section-tag">The BaraTrust Difference</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 900, lineHeight: 1.15, marginBottom: '20px' }}>
            What BaraTrust does for <span style={{ color: 'var(--blue-light)' }}>{location} {trade.toLowerCase()} companies</span>
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--cream-dim)', lineHeight: 1.8, maxWidth: '640px', marginBottom: '32px' }}>
            We don&apos;t just run ads and disappear. BaraTrust puts a full AI staff into your {trade.toLowerCase()} business — handling leads, reviews, follow-ups, and back office work while you&apos;re on the job.
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

      {/* STATS */}
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
            Free 20-minute consultation. No pitch. No pressure. Just an honest look at what your {trade.toLowerCase()} business needs.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <a href="https://calendly.com/tebo1980/baratrust-consultation" target="_blank" rel="noopener noreferrer" className="btn-primary">Book Free Consultation</a>
            <PhoneLink className="btn-secondary">Call {CONTACT_PHONE_DISPLAY}</PhoneLink>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--cream-muted)' }}>
            Serving {location} and surrounding {state === 'KY' ? 'Kentucky' : 'Indiana'} communities
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">BaraTrust</div>
        <div className="footer-seal">{'\uD83E\uDDAB'}</div>
        <div className="footer-text">&copy; 2026 BaraTrust. New Albany, Indiana.</div>
        <div className="footer-links">
          <a href="/">Home</a>
          <a href="/#about">Our Story</a>
          <a href="/terms">Terms</a>
          <a href="/health-score">Health Score</a>
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Back to Top</a>
        </div>
      </footer>
    </div>
  )
}
