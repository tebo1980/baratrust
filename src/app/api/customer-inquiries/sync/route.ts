import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { ensureAcquisitionSchema } from '@/lib/acquisition/schema-bootstrap';
import { listWebsiteInquiriesForHunterSync } from '@/lib/customer-intake/service';
import { enforcePublicRateLimit, getClientIpKey } from '@/lib/security/public-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_SYNC_SECRET_LENGTH = 32;

function verifySyncBearerToken(authHeader: string | null, configuredSecret: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const provided = authHeader.slice('Bearer '.length).trim();
  if (!provided) return false;

  // Hash both sides to fixed 32-byte SHA-256 digests so timingSafeEqual never leaks secret length
  const digestA = crypto.createHash('sha256').update(provided, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(configuredSecret, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

/**
 * GET /api/customer-inquiries/sync?cursorUpdatedAt=...&cursorId=...&limit=50
 * Authenticated, read-only, pull-based synchronization endpoint for local BaraTrust Hunter.
 * Never exposes Hunter publicly and never permits unauthenticated inquiry export.
 */
export async function GET(req: Request) {
  try {
    const configuredSecret = (process.env.HUNTER_INQUIRY_SYNC_SECRET || '').trim();
    if (configuredSecret.length < MIN_SYNC_SECRET_LENGTH) {
      return NextResponse.json(
        { error: 'Inquiry synchronization endpoint is not configured.' },
        { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    await ensureAcquisitionSchema();

    const ipKey = getClientIpKey(req);
    const rate = await enforcePublicRateLimit({
      db,
      scope: 'hunter_inquiry_sync',
      ipKey,
      maxRequests: 60,
      windowMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        {
          status: rate.statusCode,
          headers: {
            'Retry-After': String(rate.retryAfterSeconds),
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      );
    }

    const authHeader = req.headers.get('authorization');
    if (!verifySyncBearerToken(authHeader, configuredSecret)) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="BaraTrustHunterSync"',
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const cursorUpdatedAt = searchParams.get('cursorUpdatedAt');
    const cursorId = searchParams.get('cursorId');
    const rawLimit = Number(searchParams.get('limit') || '50');
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 50;

    const batch = await listWebsiteInquiriesForHunterSync(db, {
      cursorUpdatedAt,
      cursorId,
      limit,
    });

    return NextResponse.json(
      {
        ok: true,
        items: batch.items,
        nextCursor: batch.nextCursor,
        hasMore: batch.hasMore,
        syncedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    );
  } catch (err) {
    console.error('[CUSTOMER INQUIRY SYNC ERROR]', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json(
      { error: 'Synchronization service temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
