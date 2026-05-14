import type { ContractorConfig } from '@/lib/contractors'

export default function Services({ config }: { config: ContractorConfig }) {
  return (
    <section style={{ padding: 'var(--section-py) 24px', background: '#fafaf7' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h2
          className="preview-heading"
          style={{
            fontSize: 'clamp(28px, 3.5vw, 40px)',
            margin: '0 0 12px',
            color: '#1a1a1a',
            textAlign: 'center',
          }}
        >
          What We Do
        </h2>
        <p
          style={{
            textAlign: 'center',
            color: '#5a5a5a',
            fontSize: '16px',
            margin: '0 auto 40px',
            maxWidth: '560px',
            lineHeight: 1.6,
          }}
        >
          Honest work, fair prices, and the kind of craftsmanship you can&apos;t fake.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
          }}
        >
          {config.services.map((s) => (
            <div
              key={s.name}
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 'var(--radius)',
                padding: '28px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '14px' }}>{s.icon}</div>
              <div
                className="preview-heading"
                style={{
                  fontSize: '20px',
                  marginBottom: '10px',
                  color: 'var(--primary)',
                }}
              >
                {s.name}
              </div>
              <p style={{ fontSize: '14px', color: '#4a4a4a', lineHeight: 1.65, margin: 0 }}>
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
