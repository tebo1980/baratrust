import Link from 'next/link'

const linkStyle: React.CSSProperties = {
  color: 'var(--cream-muted, #7A7268)',
  textDecoration: 'none',
  fontSize: '13px',
  fontWeight: 600,
  padding: '8px 14px',
  borderRadius: '8px',
  border: '1px solid transparent',
}

const activeLinkStyle: React.CSSProperties = {
  ...linkStyle,
  color: 'var(--cream, #F0EBE0)',
  background: 'var(--bg-card, #111D2C)',
  border: '1px solid var(--border, rgba(255,255,255,0.08))',
}

export default function Nav({ active }: { active: 'all' | 'today' | 'manual' }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--cream-muted, #7A7268)',
          marginRight: '12px',
        }}
      >
        Self-Prospecting
      </div>
      <Link href="/internal/opportunity-watch/self-prospecting" style={active === 'all' ? activeLinkStyle : linkStyle}>
        All prospects
      </Link>
      <Link href="/internal/opportunity-watch/self-prospecting/today" style={active === 'today' ? activeLinkStyle : linkStyle}>
        Today
      </Link>
      <Link href="/internal/opportunity-watch/self-prospecting/manual" style={active === 'manual' ? activeLinkStyle : linkStyle}>
        + Add prospect
      </Link>
      <Link
        href="/internal/opportunity-watch"
        style={{ ...linkStyle, marginLeft: 'auto', fontSize: '12px' }}
      >
        ← Back to OpportunityWatch
      </Link>
    </div>
  )
}
