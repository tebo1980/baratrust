import { getAllContractorConfigs, isExpired, statusOrder } from '@/lib/contractors'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contractor Previews — BaraTrust Internal',
  robots: { index: false, follow: false },
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Sent:    { bg: 'rgba(59,127,212,0.18)',  fg: '#5B9FE4' },
  Replied: { bg: 'rgba(201,168,76,0.18)',  fg: '#C9A84C' },
  Warm:    { bg: 'rgba(201,168,76,0.18)',  fg: '#C9A84C' },
  Signed:  { bg: 'rgba(90,143,110,0.18)',  fg: '#7AB08E' },
  Cold:    { bg: 'rgba(255,255,255,0.06)', fg: '#7A7268' },
}

function formatDate(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysAgo(s: string): string {
  const d = new Date(s).getTime()
  if (Number.isNaN(d)) return ''
  const days = Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export default async function ContractorsIndex() {
  const configs = await getAllContractorConfigs()
  const sorted = [...configs].sort((a, b) => {
    const orderDiff = statusOrder(a.status) - statusOrder(b.status)
    if (orderDiff !== 0) return orderDiff
    return Date.parse(b.lastTouched) - Date.parse(a.lastTouched)
  })

  const counts = configs.reduce<Record<string, number>>((m, c) => {
    m[c.status] = (m[c.status] ?? 0) + 1
    return m
  }, {})

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg-deep, #0A1019)',
        color: 'var(--cream, #F0EBE0)',
        padding: '48px 24px',
        fontFamily: 'var(--font-body), system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display, var(--font-fraunces))',
              fontSize: '32px',
              margin: '0 0 8px',
              color: 'var(--cream, #F0EBE0)',
            }}
          >
            Contractor Previews
          </h1>
          <p style={{ color: 'var(--cream-muted, #7A7268)', fontSize: '14px', margin: 0 }}>
            {configs.length} preview{configs.length === 1 ? '' : 's'} ·{' '}
            {Object.entries(counts)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')}
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <a
            href="https://github.com/tebo1980/baratrust/tree/main/configs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '13px',
              color: 'var(--cream-muted, #7A7268)',
              textDecoration: 'underline',
            }}
          >
            Edit configs in GitHub →
          </a>
          <span style={{ color: 'var(--cream-muted, #7A7268)', margin: '0 12px' }}>·</span>
          <span style={{ fontSize: '13px', color: 'var(--cream-muted, #7A7268)' }}>
            Run <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>npx tsx scripts/new-contractor.ts</code> to add one.
          </span>
        </div>

        {configs.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-card, #111D2C)',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
              borderRadius: '14px',
              padding: '40px',
              textAlign: 'center',
              color: 'var(--cream-muted, #7A7268)',
            }}
          >
            No contractor previews yet. Create one with the CLI script.
          </div>
        ) : (
          <div
            style={{
              background: 'var(--bg-card, #111D2C)',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
              borderRadius: '14px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left' }}>
                  <Th>Business</Th>
                  <Th>Status</Th>
                  <Th>Last touched</Th>
                  <Th>Generated</Th>
                  <Th>Notes</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => {
                  const colors = STATUS_COLORS[c.status] ?? STATUS_COLORS.Cold
                  const expired = isExpired(c)
                  return (
                    <tr key={c.slug} style={{ borderTop: '1px solid var(--border, rgba(255,255,255,0.06))' }}>
                      <Td>
                        <div style={{ fontWeight: 700, color: 'var(--cream, #F0EBE0)' }}>{c.business.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--cream-muted, #7A7268)', marginTop: '2px' }}>
                          {c.location.city}, {c.location.state} · {c.branding.style}
                        </div>
                      </Td>
                      <Td>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '999px',
                            background: colors.bg,
                            color: colors.fg,
                            display: 'inline-block',
                          }}
                        >
                          {c.status}
                        </span>
                        {expired && (
                          <span
                            style={{
                              marginLeft: '8px',
                              fontSize: '11px',
                              color: '#E05A5A',
                              fontWeight: 600,
                            }}
                          >
                            EXPIRED
                          </span>
                        )}
                      </Td>
                      <Td>
                        <div>{formatDate(c.lastTouched)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--cream-muted, #7A7268)' }}>
                          {daysAgo(c.lastTouched)}
                        </div>
                      </Td>
                      <Td>{formatDate(c.generatedAt)}</Td>
                      <Td>
                        <div style={{ maxWidth: '220px', fontSize: '13px', color: 'var(--cream-dim, #B8B0A4)' }}>
                          {c.notes || <span style={{ color: 'var(--cream-muted, #7A7268)' }}>—</span>}
                        </div>
                      </Td>
                      <Td>
                        <a
                          href={`/preview/${c.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#5B9FE4', textDecoration: 'none', fontWeight: 600 }}
                        >
                          View →
                        </a>
                        <br />
                        <a
                          href={`https://github.com/tebo1980/baratrust/blob/main/configs/${c.slug}.json`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '12px', color: 'var(--cream-muted, #7A7268)', textDecoration: 'underline' }}
                        >
                          Edit JSON
                        </a>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: '14px 16px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--cream-muted, #7A7268)',
      }}
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>{children}</td>
}
