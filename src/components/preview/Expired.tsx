export default function Expired() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0e1320',
        color: '#fff',
        padding: '32px',
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: '520px', textAlign: 'center' }}>
        <div
          style={{
            fontSize: '12px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
            marginBottom: '14px',
          }}
        >
          Preview Expired
        </div>
        <h1 style={{ fontSize: '32px', lineHeight: 1.2, margin: '0 0 16px' }}>
          This preview is no longer available.
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', marginBottom: '28px' }}>
          BaraTrust contractor previews are time-limited. If you&apos;d like to talk about getting one built for your business, reach out and we&apos;ll put a fresh one together for you.
        </p>
        <a
          href="https://baratrust.com"
          style={{
            display: 'inline-block',
            background: '#fff',
            color: '#0e1320',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Visit BaraTrust →
        </a>
      </div>
    </main>
  )
}
