import type { ContractorConfig } from '@/lib/contractors'

export default function CallToAction({ config }: { config: ContractorConfig }) {
  const { business } = config
  const tel = business.phone.replace(/[^\d+]/g, '')
  return (
    <section
      style={{
        background: 'var(--primary)',
        color: 'var(--on-primary)',
        padding: 'var(--section-py) 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <h2
          className="preview-heading"
          style={{
            fontSize: 'clamp(30px, 4vw, 44px)',
            margin: '0 0 16px',
            color: 'var(--on-primary)',
            lineHeight: 1.15,
          }}
        >
          Ready to Get Started?
        </h2>
        <p
          style={{
            fontSize: '17px',
            margin: '0 0 32px',
            opacity: 0.9,
            lineHeight: 1.6,
          }}
        >
          Free estimates. Honest pricing. No surprises. Call today and talk to {config.about.ownerName.split(' ')[0]} directly.
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
              background: 'var(--on-primary)',
              color: 'var(--primary)',
              padding: '16px 32px',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: 'clamp(18px, 2.4vw, 24px)',
              display: 'inline-block',
            }}
          >
            📞 {business.phone}
          </a>
          <a
            href={`mailto:${business.email}`}
            style={{
              background: 'transparent',
              color: 'var(--on-primary)',
              padding: '16px 32px',
              borderRadius: 'var(--radius)',
              border: '2px solid var(--on-primary)',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 'clamp(15px, 1.8vw, 17px)',
              display: 'inline-block',
            }}
          >
            ✉️ Email Us
          </a>
        </div>
      </div>
    </section>
  )
}
