import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Capital Intelligence — BaraTrust',
  robots: 'noindex, nofollow',
}

export default function CapitalIntelligencePage() {
  return (
    <>
      <nav>
        <a href="/" className="nav-brand">
          <div className="nav-logo-mark">&#x1F9AB;</div>
          BaraTrust
        </a>
        <a href="/" className="nav-back">&#8592; Back to BaraTrust.com</a>
      </nav>
      <div className="internal-page">
        <div className="internal-badge">Internal Tool</div>
        <h1>Capital<br /><em>Intelligence</em></h1>
        <p style={{ color: 'var(--cream-muted)', fontSize: '16px', maxWidth: '480px', lineHeight: 1.7 }}>
          Coming Soon. This tool will provide real-time financial intelligence for BaraTrust clients.
        </p>
      </div>
    </>
  )
}
