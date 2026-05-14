import type { ContractorConfig } from '@/lib/contractors'

function Initials({ name }: { name: string }) {
  const parts = name.split(/\s+/).filter(Boolean)
  const initials = (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '4 / 5',
        borderRadius: 'var(--radius)',
        background:
          'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, #000) 100%)',
        color: 'var(--on-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'clamp(64px, 10vw, 128px)',
        fontWeight: 800,
        letterSpacing: '0.05em',
      }}
      aria-label={`Photo placeholder for ${name}`}
    >
      {initials.toUpperCase() || '—'}
    </div>
  )
}

export default function About({ config }: { config: ContractorConfig }) {
  const { about, business, location } = config
  return (
    <section style={{ padding: 'var(--section-py) 24px', background: '#fff' }}>
      <div
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 320px) 1fr',
          gap: '48px',
          alignItems: 'center',
        }}
        className="about-grid"
      >
        <Initials name={about.ownerName} />
        <div>
          <div
            style={{
              fontSize: '12px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--primary)',
              marginBottom: '10px',
              fontWeight: 700,
            }}
          >
            Meet the Owner
          </div>
          <h2
            className="preview-heading"
            style={{
              fontSize: 'clamp(28px, 3.5vw, 40px)',
              margin: '0 0 12px',
              color: '#1a1a1a',
              lineHeight: 1.15,
            }}
          >
            {about.ownerName}
          </h2>
          <p style={{ fontSize: '15px', color: '#5a5a5a', margin: '0 0 18px' }}>
            {about.yearsExperience}+ years serving {location.city} and surrounding areas
          </p>
          <p style={{ fontSize: '16px', color: '#2a2a2a', lineHeight: 1.75, margin: '0 0 22px' }}>
            {about.story}
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {business.licenseNumber && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  background: 'rgba(0,0,0,0.04)',
                  borderRadius: 'var(--radius)',
                  color: '#2a2a2a',
                }}
              >
                ✓ Licensed · {business.licenseNumber}
              </span>
            )}
            {business.insured && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  background: 'rgba(0,0,0,0.04)',
                  borderRadius: 'var(--radius)',
                  color: '#2a2a2a',
                }}
              >
                ✓ Fully Insured
              </span>
            )}
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '6px 12px',
                background: 'rgba(0,0,0,0.04)',
                borderRadius: 'var(--radius)',
                color: '#2a2a2a',
              }}
            >
              ✓ Serving {location.city} since {business.yearEstablished}
            </span>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .about-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
