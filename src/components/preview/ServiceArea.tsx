import type { ContractorConfig } from '@/lib/contractors'

export default function ServiceArea({ config }: { config: ContractorConfig }) {
  const { location } = config
  return (
    <section style={{ padding: 'var(--section-py) 24px', background: '#fff' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <h2
          className="preview-heading"
          style={{
            fontSize: 'clamp(26px, 3vw, 36px)',
            margin: '0 0 16px',
            color: '#1a1a1a',
            lineHeight: 1.2,
          }}
        >
          Proudly Serving {location.city} and Surrounding Areas
        </h2>
        <p style={{ color: '#5a5a5a', fontSize: '16px', margin: '0 0 32px' }}>
          We&apos;re a local business — if your home is in any of these areas, we can be there fast.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {location.serviceAreas.map((area) => (
            <span
              key={area}
              style={{
                fontSize: '14px',
                fontWeight: 600,
                padding: '10px 18px',
                background: 'rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '999px',
                color: '#2a2a2a',
              }}
            >
              {area}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
