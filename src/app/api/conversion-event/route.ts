import { NextResponse } from 'next/server';
import { db } from '@/db';
import { publicConversionEvents } from '@/db/schema';
import { PublicAnalyticsEventSchema } from '@/lib/analytics';
import { ensureAcquisitionSchema } from '@/lib/acquisition/schema-bootstrap';
import { enforcePublicRateLimit, getClientIpKey } from '@/lib/security/public-guard';

export const dynamic = 'force-dynamic';

/**
 * POST /api/conversion-event
 * Records strictly non-PII public conversion events (e.g., booking link clicks, sample pulse views).
 * Rejects any payload containing extra/PII fields via `.strict()` Zod validation.
 */
export async function POST(req: Request) {
  try {
    await ensureAcquisitionSchema();
    const ipKey = getClientIpKey(req);
    const rate = await enforcePublicRateLimit({
      db,
      scope: 'conversion_event',
      ipKey,
      maxRequests: 40,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = PublicAnalyticsEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid analytics event payload. Personal or unexpected fields are not permitted.' },
        { status: 400 }
      );
    }

    await db.insert(publicConversionEvents).values({
      eventName: parsed.data.eventName,
      surface: parsed.data.surface,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn('[CONVERSION_EVENT_WARNING]', err);
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
