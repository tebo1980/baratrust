import type { ContractorConfig } from '@/lib/contractors'

export default function Hero({ config }: { config: ContractorConfig }) {
  const { business, location, services, callToAction } = config
  const primaryService = services[0]?.name ?? 'Service'
  const tel = business.phone.replace(/[^\d+]/g, '')

  return (
    <section
      style={{
        background: '#0e1320',
        color: '#fff',
        padding: 'var(--section-py) 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        <div
          style={{
            fontSize: '12px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: '20px',
            fontWeight: 600,
          }}
        >
          {location.city}, {location.state}
        </div>
        <h1
          className="preview-heading"
          style={{
            fontSize: 'clamp(34px, 5vw, 56px)',
            lineHeight: 1.05,
            margin: '0 0 18px',
            color: '#fff',
          }}
        >
          {location.city}&apos;s Trusted{' '}
          <span style={{ color: 'var(--accent)' }}>{primaryService}</span> Experts
        </h1>
        <p
          style={{
            fontSize: 'clamp(15px, 1.6vw, 18px)',
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.78)',
            maxWidth: '620px',
            margin: '0 auto 32px',
          }}
        >
          {business.tagline}. Serving {location.city} and surrounding areas since {business.yearEstablished}.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <a
            href={`tel:${tel}`}
            style={{
              background: 'var(--primary)',
              color: 'var(--on-primary)',
              padding: '14px 26px',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '16px',
              display: 'inline-block',
            }}
          >
            {callToAction.primaryButtonText} {business.phone}
          </a>
          <a
            href={`mailto:${business.email}`}
            style={{
              background: 'transparent',
              color: '#fff',
              padding: '14px 26px',
              borderRadius: 'var(--radius)',
              border: '2px solid rgba(255,255,255,0.3)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '16px',
              display: 'inline-block',
            }}
          >
            {callToAction.secondaryButtonText}
          </a>
        </div>
      </div>
    </section>
  )
}
