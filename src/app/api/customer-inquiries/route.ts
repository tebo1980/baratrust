import { NextResponse } from 'next/server';
import { db } from '@/db';
import { ensureAcquisitionSchema } from '@/lib/acquisition/schema-bootstrap';
import {
  SubmitWebsiteInquirySchema,
  submitWebsiteCustomerInquiry,
} from '@/lib/customer-intake/service';
import {
  enforcePublicRateLimit,
  getClientIpKey,
  isHoneypotTriggered,
  readBoundedJsonBody,
} from '@/lib/security/public-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/customer-inquiries
 * Public general customer inquiry intake endpoint for www.baratrust.com.
 * Validates input, blocks honeypot bots and rate-limit abuse, redacts unsolicited SSNs/card numbers,
 * durably records the inquiry in Neon Postgres, and prepares/dispatches preapproved acknowledgments
 * only when `CUSTOMER_AUTO_ACK_ENABLED="true"` is explicitly enabled.
 */
export async function POST(req: Request) {
  try {
    const parsedBody = await readBoundedJsonBody(req, 24_576);
    if (!parsedBody.ok) {
      return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
    }
    const body = parsedBody.body as Record<string, unknown> | null;

    // Silent honeypot trap: return benign confirmation without touching Neon or sending mail
    if (isHoneypotTriggered(body?.websiteConfirm)) {
      return NextResponse.json({
        success: true,
        ignored: true,
        referenceId: 'received',
        message: 'Thank you — we received your inquiry and will review it shortly.',
      });
    }

    const validation = SubmitWebsiteInquirySchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Please check your form details.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    await ensureAcquisitionSchema();

    const ipKey = getClientIpKey(req);
    const rate = await enforcePublicRateLimit({
      db,
      scope: 'customer_inquiry_submit',
      ipKey,
      maxRequests: 8,
      windowMs: 10 * 60 * 1000,
    });

    if (!rate.allowed) {
      const errorMsg =
        rate.statusCode === 503
          ? 'Inquiry submission is temporarily unavailable. Please try again shortly.'
          : 'Too many submissions from this connection. Please wait a few minutes and try again.';
      return NextResponse.json(
        { error: errorMsg },
        { status: rate.statusCode, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      );
    }

    const result = await submitWebsiteCustomerInquiry(db, validation.data);

    return NextResponse.json(
      {
        success: true,
        deduplicated: result.deduplicated,
        referenceId: result.inquiry.id.slice(0, 8),
        segment: result.inquiry.segment,
        commitmentBusinessDays: result.inquiry.commitmentBusinessDays,
        acknowledgmentSent: result.inquiry.ackStatus === 'SENT',
        message:
          'Thank you — your inquiry has been recorded. Todd or Noelah will personally review your message.',
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    );
  } catch (err) {
    console.error('[CUSTOMER INQUIRY POST ERROR]', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json(
      {
        error:
          'We could not save your inquiry right now. Please try again shortly or email todd@baratrust.com directly.',
      },
      { status: 503, headers: { 'Retry-After': '30' } }
    );
  }
}
