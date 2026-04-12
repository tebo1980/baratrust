import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OpportunityWatch — BaraTrust',
  robots: 'noindex, nofollow',
}

export default function OpportunityWatchPage() {
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
        <h1>Opportunity<br /><em>Watch</em></h1>
        <p style={{ color: 'var(--cream-muted)', fontSize: '16px', maxWidth: '480px', lineHeight: 1.7 }}>
          Coming Soon. This tool will surface new business opportunities and market intelligence for BaraTrust clients.
        </p>
      </div>
    </>
  )
}
