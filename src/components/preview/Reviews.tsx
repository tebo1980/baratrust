import type { ContractorConfig } from '@/lib/contractors'

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)))
  return (
    <span aria-label={`${full} out of 5 stars`} style={{ color: '#F5B301', letterSpacing: '2px' }}>
      {'★'.repeat(full)}
      <span style={{ color: '#d8d8d8' }}>{'★'.repeat(5 - full)}</span>
    </span>
  )
}

function formatReviewDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function Reviews({ config }: { config: ContractorConfig }) {
  if (!config.reviews.length) return null
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
          What Our Customers Say
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
          Real reviews from real {config.location.city} neighbors.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {config.reviews.map((r, i) => (
            <article
              key={i}
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 'var(--radius)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Stars rating={r.rating} />
              <p
                style={{
                  fontSize: '15px',
                  color: '#2a2a2a',
                  lineHeight: 1.7,
                  margin: '14px 0 18px',
                  flex: 1,
                }}
              >
                &ldquo;{r.text}&rdquo;
              </p>
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '14px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{r.author}</div>
                <div style={{ fontSize: '12px', color: '#7a7a7a', marginTop: '2px' }}>
                  {r.source} · {formatReviewDate(r.date)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
