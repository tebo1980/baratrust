export type DeliveryStatus = 'NOT_ATTEMPTED' | 'ACCEPTED_BY_PROVIDER' | 'FAILED';

export interface DeliveryEmailOptions {
  ownerEmail: string;
  ownerName: string;
  businessName: string;
  shareToken: string;
  baseUrl?: string;
}

export interface DeliveryResult {
  status: DeliveryStatus;
  success: boolean;
  messageId?: string | null;
  deliveredAt?: string | null;
  recipient: string;
  reportUrl: string;
  error?: string | null;
}

/**
 * Builds the plain-English, low-pressure transactional notification email.
 */
export function buildDeliveryEmailContent({
  ownerName,
  businessName,
  reportUrl,
}: {
  ownerName: string;
  businessName: string;
  reportUrl: string;
}) {
  const subject = `Your BaraTrust Reality Check is ready — ${businessName}`;
  const text = `Hi ${ownerName},

We finished the human review of ${businessName}. Your Reality Check is ready at the link below:

${reportUrl}

We included what looks strong, what may be getting in the way, the three things we'd look at first, and what we would not recommend spending money on.

Take your time looking through it. If you have any questions or want to talk through the findings, just hit reply to this email.

— Todd & Noelah
BaraTrust (baratrust.com)`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; padding: 20px;">
  <p>Hi ${ownerName},</p>
  <p>We finished the human review of <strong>${businessName}</strong>. Your Reality Check is ready at the link below:</p>
  
  <p style="margin: 28px 0;">
    <a href="${reportUrl}" style="background-color: #f59e0b; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
      View Your Reality Check Report &rarr;
    </a>
  </p>

  <p>We included what looks strong, what may be getting in the way, the three things we'd look at first, and a few things we would not recommend spending money on right now.</p>
  
  <p>Take your time looking through it. If you have any questions or want to talk through the findings, just hit reply to this email.</p>
  
  <p style="margin-top: 32px; color: #475569;">
    — Todd & Noelah<br>
    <strong>BaraTrust</strong> (<a href="https://www.baratrust.com" style="color: #64748b;">baratrust.com</a>)
  </p>
</div>
`;

  return { subject, text, html };
}

/**
 * Sends the Reality Check delivery email to the business owner upon report publication.
 * 
 * Production behavior:
 * - Checks for a true transactional provider (RESEND_API_KEY or TRANSACTIONAL_EMAIL_WEBHOOK_URL).
 * - Distinguishes between NOT_ATTEMPTED, ACCEPTED_BY_PROVIDER, and FAILED.
 * - Never claims delivery succeeded when no real provider accepted the message.
 */
export async function sendRealityCheckDeliveryEmail(
  opts: DeliveryEmailOptions
): Promise<DeliveryResult> {
  const host = opts.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://www.baratrust.com';
  const cleanHost = host.replace(/\/$/, '');
  const reportUrl = `${cleanHost}/report/${opts.shareToken}`;

  const { subject, text, html } = buildDeliveryEmailContent({
    ownerName: opts.ownerName,
    businessName: opts.businessName,
    reportUrl,
  });

  const now = new Date().toISOString();

  // Test environment hooks for testing provider states
  if (process.env.NODE_ENV === 'test' || process.env.TEST_ENV === 'true') {
    if (process.env.TEST_EMAIL_MOCK_STATUS === 'FAILED') {
      return {
        status: 'FAILED',
        success: false,
        messageId: null,
        deliveredAt: null,
        recipient: opts.ownerEmail,
        reportUrl,
        error: 'Simulated transactional email provider failure in test mode',
      };
    }
    if (process.env.TEST_EMAIL_MOCK_STATUS === 'NOT_ATTEMPTED') {
      return {
        status: 'NOT_ATTEMPTED',
        success: false,
        messageId: null,
        deliveredAt: null,
        recipient: opts.ownerEmail,
        reportUrl,
        error: 'No transactional email provider configured',
      };
    }
    // Default test behavior: simulate acceptance
    return {
      status: 'ACCEPTED_BY_PROVIDER',
      success: true,
      messageId: `rc-deliv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      deliveredAt: now,
      recipient: opts.ownerEmail,
      reportUrl,
    };
  }

  // 1. Check for Resend configuration
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.TRANSACTIONAL_FROM_EMAIL || 'Todd & Noelah <todd@baratrust.com>';
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: opts.ownerEmail,
          reply_to: 'todd@baratrust.com',
          subject,
          text,
          html,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.id) {
        console.log(`[DELIVERY_EMAIL_ACCEPTED] Resend messageId: ${data.id} to ${opts.ownerEmail}`);
        return {
          status: 'ACCEPTED_BY_PROVIDER',
          success: true,
          messageId: data.id,
          deliveredAt: now,
          recipient: opts.ownerEmail,
          reportUrl,
        };
      } else {
        const errorMsg = data.message || `Resend HTTP ${resp.status}`;
        console.warn(`[DELIVERY_EMAIL_FAILED] Resend rejected message: ${errorMsg}`);
        return {
          status: 'FAILED',
          success: false,
          recipient: opts.ownerEmail,
          reportUrl,
          error: `Resend provider error: ${errorMsg}`,
        };
      }
    } catch (err: any) {
      console.warn(`[DELIVERY_EMAIL_FAILED] Network exception contacting Resend: ${err.message}`);
      return {
        status: 'FAILED',
        success: false,
        recipient: opts.ownerEmail,
        reportUrl,
        error: `Network error contacting provider: ${err.message}`,
      };
    }
  }

  // 2. Check for Transactional Webhook configuration
  const webhookUrl = process.env.TRANSACTIONAL_EMAIL_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: opts.ownerEmail,
          from: 'todd@baratrust.com',
          subject,
          text,
          html,
          reportUrl,
          businessName: opts.businessName,
        }),
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const messageId = data.id || `webhook-${Date.now()}`;
        console.log(`[DELIVERY_EMAIL_ACCEPTED] Webhook accepted for ${opts.ownerEmail}`);
        return {
          status: 'ACCEPTED_BY_PROVIDER',
          success: true,
          messageId,
          deliveredAt: now,
          recipient: opts.ownerEmail,
          reportUrl,
        };
      } else {
        return {
          status: 'FAILED',
          success: false,
          recipient: opts.ownerEmail,
          reportUrl,
          error: `Webhook returned status ${resp.status}`,
        };
      }
    } catch (err: any) {
      return {
        status: 'FAILED',
        success: false,
        recipient: opts.ownerEmail,
        reportUrl,
        error: `Webhook exception: ${err.message}`,
      };
    }
  }

  // 3. No transactional email provider is configured
  console.log(`[DELIVERY_EMAIL_NOT_ATTEMPTED] No transactional provider configured for ${opts.ownerEmail}. Link: ${reportUrl}`);
  return {
    status: 'NOT_ATTEMPTED',
    success: false,
    messageId: null,
    deliveredAt: null,
    recipient: opts.ownerEmail,
    reportUrl,
    error: 'No transactional email provider configured. Please set RESEND_API_KEY or TRANSACTIONAL_EMAIL_WEBHOOK_URL.',
  };
}
