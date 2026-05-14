import type { ContractorConfig } from '@/lib/contractors'

export default function Footer({ config }: { config: ContractorConfig }) {
  const { business, location } = config
  const year = new Date().getFullYear()
  return (
    <footer
      style={{
        background: '#0e1320',
        color: 'rgba(255,255,255,0.78)',
        padding: '48px 24px 24px',
      }}
    >
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '32px',
            marginBottom: '32px',
          }}
        >
          <div>
            <div className="preview-heading" style={{ color: '#fff', fontSize: '20px', marginBottom: '10px' }}>
              {business.name}
            </div>
            <p style={{ fontSize: '14px', lineHeight: 1.7, margin: 0 }}>{business.tagline}</p>
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                fontWeight: 700,
                marginBottom: '12px',
              }}
            >
              Contact
            </div>
            <div style={{ fontSize: '14px', lineHeight: 1.85 }}>
              <a
                href={`tel:${business.phone.replace(/[^\d+]/g, '')}`}
                style={{ color: '#fff', textDecoration: 'none', display: 'block' }}
              >
                {business.phone}
              </a>
              <a
                href={`mailto:${business.email}`}
                style={{ color: 'rgba(255,255,255,0.78)', textDecoration: 'none', display: 'block' }}
              >
                {business.email}
              </a>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                fontWeight: 700,
                marginBottom: '12px',
              }}
            >
              Service Area
            </div>
            <div style={{ fontSize: '14px', lineHeight: 1.85 }}>
              {location.serviceAreas.slice(0, 6).join(' · ')}
            </div>
          </div>
        </div>
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          <div>
            © {year} {business.name}. All rights reserved.
          </div>
          <div>Built with care by BaraTrust</div>
        </div>
      </div>
    </footer>
  )
}
