import type { Metadata } from 'next'
import Nav from '../../internal/opportunity-watch/self-prospecting/Nav'
import ProspectList from '../../internal/opportunity-watch/self-prospecting/ProspectList'

export const metadata: Metadata = {
  title: 'Fetch Engine — BaraTrust Dashboard',
}

export default function FetchDashboard() {
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
        <Nav active="all" />
        <ProspectList title="All Prospects" />
      </div>
    </main>
  )
}
