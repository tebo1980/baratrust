import type { ContractorConfig } from '@/lib/contractors'

export default function Header({ config }: { config: ContractorConfig }) {
  const { business } = config
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px',
        gap: '16px',
        flexWrap: 'wrap',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: '#fff',
      }}
    >
      <div>
        <div
          className="preview-heading"
          style={{ fontSize: '24px', lineHeight: 1.1, color: 'var(--primary)' }}
        >
          {business.name}
        </div>
        <div style={{ fontSize: '13px', color: '#5b5b5b', marginTop: '4px' }}>{business.tagline}</div>
      </div>
      <a
        href={`tel:${business.phone.replace(/[^\d+]/g, '')}`}
        style={{
          textDecoration: 'none',
          color: 'var(--primary)',
          fontWeight: 700,
          fontSize: '18px',
          padding: '10px 18px',
          border: '2px solid var(--primary)',
          borderRadius: 'var(--radius)',
        }}
      >
        {business.phone}
      </a>
    </header>
  )
}
