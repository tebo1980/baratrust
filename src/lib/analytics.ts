import { z } from 'zod';

export const ALLOWED_PUBLIC_ANALYTICS_EVENTS = [
  'reality_check_started',
  'reality_check_completed',
  'discuss_results_submitted',
  'booking_link_clicked',
  'sample_pulse_viewed',
  'pulse_checkout_clicked',
] as const;

export type PublicAnalyticsEventName = (typeof ALLOWED_PUBLIC_ANALYTICS_EVENTS)[number];

export const ALLOWED_PUBLIC_ANALYTICS_SURFACES = [
  'hero',
  'nav',
  'pulse_section',
  'intake_section',
  'post_scan',
  'pricing_page',
  'reality_check_page',
  'sample_pulse_page',
  'thank_you_page',
  'questionnaire_page',
  'trade_page',
  'contact_page',
  'footer',
] as const;

export type PublicAnalyticsSurface = (typeof ALLOWED_PUBLIC_ANALYTICS_SURFACES)[number];

/**
 * Strict `.strict()` schema rejects any unexpected keys (such as email, phone, name, url, notes)
 * so personal contact information can never enter public analytics payloads.
 */
export const PublicAnalyticsEventSchema = z
  .object({
    eventName: z.enum(ALLOWED_PUBLIC_ANALYTICS_EVENTS),
    surface: z.enum(ALLOWED_PUBLIC_ANALYTICS_SURFACES),
  })
  .strict();

export interface SafeAnalyticsPayload {
  eventName: PublicAnalyticsEventName;
  surface: PublicAnalyticsSurface;
}

/**
 * Validates and returns a strictly non-PII analytics payload, or null if invalid.
 */
export function buildSafeAnalyticsPayload(input: unknown): SafeAnalyticsPayload | null {
  const parsed = PublicAnalyticsEventSchema.safeParse(input);
  if (!parsed.success) return null;
  return parsed.data;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Tracks a public conversion action via GA4 (if loaded) and BaraTrust's non-PII
 * first-party conversion counter. Never transmits email, name, phone, or business URLs.
 */
export function trackPublicConversionEvent(
  eventName: PublicAnalyticsEventName,
  surface: PublicAnalyticsSurface
): void {
  const safe = buildSafeAnalyticsPayload({ eventName, surface });
  if (!safe || typeof window === 'undefined') return;

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', safe.eventName, {
        event_category: 'baratrust_acquisition_v1',
        surface: safe.surface,
      });
    }
  } catch {
    // Non-blocking
  }

  try {
    void fetch('/api/conversion-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safe),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Non-blocking
  }
}
