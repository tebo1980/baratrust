import type { Metadata } from 'next'
import HealthScoreClient from './HealthScoreClient'

export const metadata: Metadata = {
  title: 'Business Health Score — BaraTrust',
}

export default function HealthScorePage() {
  return (
    <>
      <nav>
        <a href="/" className="nav-brand">
          <div className="nav-mark">&#x1F9AB;</div>
          BaraTrust
        </a>
        <a href="/" className="nav-back">&#8592; Back to BaraTrust.com</a>
      </nav>

      <div className="hs-page">
        <div className="hs-hero">
          <span className="hs-hero-tag">Free Business Diagnostic</span>
          <h1>What&apos;s your <em>Business<br />Health Score?</em></h1>
          <p>Move the sliders to rate your business across five key areas. Watch your score update in real time — and find out exactly where BaraTrust can make the biggest difference.</p>
        </div>

        <HealthScoreClient />
      </div>
    </>
  )
}
