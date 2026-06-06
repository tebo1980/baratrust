import type { Metadata } from 'next'
import Nav from '../Nav'
import ProspectList from '../ProspectList'

export const metadata: Metadata = {
  title: 'Today — Self-Prospecting',
  robots: { index: false, follow: false },
}

export default function TodayPage() {
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
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <Nav active="today" />
        <ProspectList sinceHours={24} title="Today's prospects" />
      </div>
    </main>
  )
}
