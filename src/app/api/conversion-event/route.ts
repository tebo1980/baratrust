import { NextResponse } from 'next/server';
import { db } from '@/db';
import { publicConversionEvents } from '@/db/schema';
import { PublicAnalyticsEventSchema } from '@/lib/analytics';
import {
  enforcePublicRateLimit,
  getClientIpKey,
  readBoundedJsonBody,
} from '@/lib/security/public-guard';

export const dynamic = 'force-dynamic';

/**
 * POST /api/conversion-event
 * Records strictly non-PII public conversion events (e.g., booking link clicks, sample pulse views).
 * Enforces bounded body size and `.strict()` Zod validation BEFORE touching the database,
 * and fails closed (`429` / `503`) if rate limiting or the database is unavailable.
 */
export async function POST(req: Request) {
  try {
    const parsedBody = await readBoundedJsonBody(req, 4096);
    if (!parsedBody.ok) {
      return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
    }

    const parsed = PublicAnalyticsEventSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid analytics event payload. Personal or unexpected fields are not permitted.' },
        { status: 400 }
      );
    }

    const ipKey = getClientIpKey(req);
    const rate = await enforcePublicRateLimit({
      db,
      scope: 'conversion_event',
      ipKey,
      maxRequests: 40,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      const errorMsg =
        rate.statusCode === 503
          ? 'Service temporarily unavailable.'
          : 'Too many requests.';
      return NextResponse.json(
        { error: errorMsg },
        { status: rate.statusCode, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    await db.insert(publicConversionEvents).values({
      eventName: parsed.data.eventName,
      surface: parsed.data.surface,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[CONVERSION_EVENT_ERROR]', err);
    return NextResponse.json(
      { ok: false, error: 'Service temporarily unavailable.' },
      { status: 503, headers: { 'Retry-After': '30' } }
    );
  }
}
