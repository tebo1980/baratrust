import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { ensureAcquisitionSchema } from '@/lib/acquisition/schema-bootstrap';
import { AUTHORIZED_INTERNAL_TEST_RECIPIENT } from '@/lib/customer-intake/ack-mailer';
import {
  listWebsiteInquiriesForHunterSync,
  runAuthorizedInternalAckTest,
} from '@/lib/customer-intake/service';
import {
  enforcePublicRateLimit,
  getClientIpKey,
  readBoundedJsonBody,
} from '@/lib/security/public-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MIN_SYNC_SECRET_LENGTH = 32;

const InternalAckTestSchema = z.object({
  action: z.literal('send_authorized_internal_test'),
  recipientEmail: z.string().trim().min(5).max(254).email(),
  submissionKey: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]{8,120}$/)
    .optional(),
});

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

/**
 * POST /api/customer-inquiries/sync
 * Operator-authenticated, single-recipient (`tebo1980@gmail.com`) controlled acknowledgment
 * verification trigger for Step 2A while `CUSTOMER_AUTO_ACK_ENABLED=false` globally.
 * - Requires valid constant-time `HUNTER_INQUIRY_SYNC_SECRET` Bearer authentication.
 * - Rejects any recipient other than `tebo1980@gmail.com` (`403`).
 * - Enforces suppression, atomic `IN_FLIGHT` locking, 1-ack-per-inquiry, and 24h cooldown.
 */
export async function POST(req: Request) {
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
      scope: 'hunter_internal_ack_test',
      ipKey,
      maxRequests: 5,
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

    const parsedBody = await readBoundedJsonBody(req, 4_096);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: parsedBody.error },
        { status: parsedBody.status, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const validation = InternalAckTestSchema.safeParse(parsedBody.body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid operator test request payload.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    if (validation.data.recipientEmail.trim().toLowerCase() !== AUTHORIZED_INTERNAL_TEST_RECIPIENT) {
      return NextResponse.json(
        {
          error: `Authorized internal acknowledgment test is strictly allowlisted to ${AUTHORIZED_INTERNAL_TEST_RECIPIENT}.`,
        },
        { status: 403, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const result = await runAuthorizedInternalAckTest(db, {
      recipientEmail: validation.data.recipientEmail,
      submissionKey: validation.data.submissionKey,
    });

    return NextResponse.json(
      {
        ok: true,
        attempted: result.attempted,
        blockedReason: result.blockedReason,
        deduplicatedSubmission: result.deduplicatedSubmission,
        globalAutoAckEnabled: result.globalAutoAckEnabled,
        deliveryOutcome: result.deliveryOutcome,
        diagnostics: result.diagnostics,
        inquirySummary: {
          id: result.inquiry.id,
          externalSubmissionKey: result.inquiry.externalSubmissionKey,
          recipientEmail: result.inquiry.customerEmail,
          ackTemplateKey: result.inquiry.ackTemplateKey,
          ackSubject: result.inquiry.ackSubject,
          commitmentBusinessDays: result.inquiry.commitmentBusinessDays,
          ackStatus: result.inquiry.ackStatus,
          ackProvider: result.inquiry.ackProvider,
          ackMessageId: result.inquiry.ackMessageId,
          ackSentAt: result.inquiry.ackSentAt,
          ackError: result.inquiry.ackError,
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    );
  } catch (err) {
    console.error(
      '[CUSTOMER INQUIRY INTERNAL TEST ERROR]',
      err instanceof Error ? err.message : 'unknown'
    );
    return NextResponse.json(
      { error: 'Controlled internal test failed safely.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
