const EASTERN_TZ = 'America/New_York';

/**
 * Formats an ISO string or Date into a deterministic Eastern Time date string (e.g. "Nov 3, 2026")
 * so Next.js SSR (running in UTC on Vercel) and client hydration produce identical text.
 */
export function formatEasternDate(value?: Date | string | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats an ISO string or Date into a deterministic Eastern Time clock string (e.g. "10:35:46 PM ET")
 * safe for SSR + client hydration.
 */
export function formatEasternTime(value?: Date | string | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d)} ET`;
}

/**
 * Formats an ISO string or Date into a deterministic Eastern Time date + time string
 * safe for SSR + client hydration.
 */
export function formatEasternDateTime(value?: Date | string | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)} ET`;
}
