import crypto from 'crypto';
import tls from 'tls';

export type AckMailerOutcome =
  | {
      outcome: 'DISABLED_PENDING_APPROVAL';
      provider: null;
      messageId: null;
      error: null;
    }
  | {
      outcome: 'SENT';
      provider: 'RESEND_HTTPS' | 'CPANEL_SMTP_TLS' | 'MOCK_ADAPTER';
      messageId: string;
      error: null;
    }
  | {
      outcome: 'FAILED_RETRYABLE';
      provider: 'RESEND_HTTPS' | 'CPANEL_SMTP_TLS' | 'UNCONFIGURED' | 'MOCK_ADAPTER';
      messageId: null;
      error: string;
    }
  | {
      outcome: 'UNCERTAIN_DELIVERY_LOCKED';
      provider: 'RESEND_HTTPS' | 'CPANEL_SMTP_TLS' | 'MOCK_ADAPTER';
      messageId: null;
      error: string;
    };

export interface AckMailerInput {
  inquiryId: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
}

export type AckMailerTransportOverride = (input: AckMailerInput) => Promise<AckMailerOutcome>;

let testTransportOverride: AckMailerTransportOverride | null = null;

export function setAckMailerTestTransport(fn: AckMailerTransportOverride | null): void {
  testTransportOverride = fn;
}

export function isWebsiteAutoAckEnabled(): boolean {
  return (process.env.CUSTOMER_AUTO_ACK_ENABLED || '').trim().toLowerCase() === 'true';
}

function stripHeaderCrlf(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function redactMailerError(rawError: unknown): string {
  const raw =
    rawError instanceof Error
      ? rawError.message
      : typeof rawError === 'string'
      ? rawError
      : 'Outbound acknowledgment transport error';

  let safe = raw;
  const sensitiveValues = [
    process.env.RESEND_API_KEY,
    process.env.CPANEL_SMTP_PASS,
    process.env.HUNTER_INQUIRY_SYNC_SECRET,
  ].filter((v): v is string => Boolean(v && v.trim().length >= 4));

  for (const secret of sensitiveValues) {
    safe = safe.split(secret).join('[REDACTED]');
    const b64 = Buffer.from(secret, 'utf8').toString('base64');
    if (b64.length >= 6) {
      safe = safe.split(b64).join('[REDACTED]');
    }
  }

  return safe.slice(0, 280);
}

/**
 * Sends a solicited, preapproved customer acknowledgment via Resend HTTPS API (`443`),
 * attaching RFC 3834 loop-suppression headers and an idempotency key.
 */
async function sendViaResendHttps(
  apiKey: string,
  input: AckMailerInput
): Promise<AckMailerOutcome> {
  const fromHeader = stripHeaderCrlf(
    process.env.TRANSACTIONAL_FROM_EMAIL || 'Todd & Noelah — BaraTrust <todd@baratrust.com>'
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `baratrust-customer-ack-${input.inquiryId}`,
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [stripHeaderCrlf(input.recipientEmail)],
        reply_to: 'todd@baratrust.com',
        subject: stripHeaderCrlf(input.subject),
        text: input.bodyText,
        headers: {
          'Auto-Submitted': 'auto-replied',
          'X-Auto-Response-Suppress': 'All',
          Precedence: 'auto_reply',
        },
      }),
      signal: controller.signal,
    });

    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      return {
        outcome: 'SENT',
        provider: 'RESEND_HTTPS',
        messageId: data.id || `resend-${input.inquiryId}`,
        error: null,
      };
    }

    // 4xx rejection means Resend definitively did not accept the message -> safe retryable failure
    if (res.status >= 400 && res.status < 500) {
      return {
        outcome: 'FAILED_RETRYABLE',
        provider: 'RESEND_HTTPS',
        messageId: null,
        error: `Resend rejected message before acceptance (HTTP ${res.status}).`,
      };
    }

    // 5xx response after POST submission means acceptance is uncertain -> lock against uncontrolled repeats
    return {
      outcome: 'UNCERTAIN_DELIVERY_LOCKED',
      provider: 'RESEND_HTTPS',
      messageId: null,
      error: `Resend returned HTTP ${res.status}; delivery state uncertain — automatic retry locked.`,
    };
  } catch (err) {
    return {
      outcome: 'UNCERTAIN_DELIVERY_LOCKED',
      provider: 'RESEND_HTTPS',
      messageId: null,
      error: `HTTPS transport interrupted (${redactMailerError(err)}); delivery state uncertain — automatic retry locked.`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Minimal, dependency-free implicit-TLS SMTP client (`server221.web-hosting.com:465`)
 * for Node.js serverless runtime when Resend is not configured.
 * Strictly separates pre-DATA errors (`FAILED_RETRYABLE`) from post-DATA ambiguity (`UNCERTAIN_DELIVERY_LOCKED`).
 */
async function sendViaCpanelImplicitTlsSmtp(
  cfg: { host: string; port: number; user: string; pass: string },
  input: AckMailerInput
): Promise<AckMailerOutcome> {
  const cleanRecipient = stripHeaderCrlf(input.recipientEmail);
  const cleanUser = stripHeaderCrlf(cfg.user);
  const cleanSubject = stripHeaderCrlf(input.subject);
  const generatedMessageId = `<ack-${input.inquiryId}-${crypto.randomBytes(6).toString('hex')}@baratrust.com>`;

  // Dot-stuff body lines per RFC 5321 Section 4.5.2
  const normalizedLines = input.bodyText.replace(/\r?\n/g, '\r\n').split('\r\n');
  const dotStuffedBody = normalizedLines
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');

  const mimeMessage = [
    `From: "Todd & Noelah - BaraTrust" <${cleanUser}>`,
    `To: <${cleanRecipient}>`,
    `Reply-To: <${cleanUser}>`,
    `Subject: ${cleanSubject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${generatedMessageId}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: 8bit`,
    `Auto-Submitted: auto-replied`,
    `X-Auto-Response-Suppress: All`,
    `Precedence: auto_reply`,
    ``,
    dotStuffedBody,
    `.`,
    ``,
  ].join('\r\n');

  let transmittedDataPayload = false;

  return new Promise<AckMailerOutcome>((resolve) => {
    let settled = false;
    let buffer = '';
    let pendingWaiter: ((code: number, text: string) => void) | null = null;

    const socket = tls.connect({
      host: cfg.host,
      port: cfg.port,
      servername: cfg.host,
      rejectUnauthorized: true,
    });

    const finish = (result: AckMailerOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(overallTimer);
      try {
        socket.destroy();
      } catch {
        // Ignore cleanup errors
      }
      resolve(result);
    };

    const overallTimer = setTimeout(() => {
      finish(
        transmittedDataPayload
          ? {
              outcome: 'UNCERTAIN_DELIVERY_LOCKED',
              provider: 'CPANEL_SMTP_TLS',
              messageId: null,
              error:
                'SMTP timeout after DATA payload transmission; delivery uncertain — automatic retry locked.',
            }
          : {
              outcome: 'FAILED_RETRYABLE',
              provider: 'CPANEL_SMTP_TLS',
              messageId: null,
              error: 'SMTP connection or handshake timed out prior to DATA transmission.',
            }
      );
    }, 12_000);

    socket.on('error', (err) => {
      const safeErr = redactMailerError(err);
      finish(
        transmittedDataPayload
          ? {
              outcome: 'UNCERTAIN_DELIVERY_LOCKED',
              provider: 'CPANEL_SMTP_TLS',
              messageId: null,
              error: `SMTP socket error after DATA transmission (${safeErr}); automatic retry locked.`,
            }
          : {
              outcome: 'FAILED_RETRYABLE',
              provider: 'CPANEL_SMTP_TLS',
              messageId: null,
              error: `SMTP connection error before DATA (${safeErr}).`,
            }
      );
    });

    socket.on('close', () => {
      if (!settled) {
        finish(
          transmittedDataPayload
            ? {
                outcome: 'UNCERTAIN_DELIVERY_LOCKED',
                provider: 'CPANEL_SMTP_TLS',
                messageId: null,
                error:
                  'SMTP connection closed unexpectedly after DATA transmission; automatic retry locked.',
              }
            : {
                outcome: 'FAILED_RETRYABLE',
                provider: 'CPANEL_SMTP_TLS',
                messageId: null,
                error: 'SMTP connection closed unexpectedly before DATA transmission.',
              }
        );
      }
    });

    socket.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r\n');
      buffer = lines.pop() ?? '';

      const collected: string[] = [];
      for (const line of lines) {
        if (!line) continue;
        collected.push(line);
        // Final line of an SMTP response has a space (not hyphen) at index 3: e.g. "250 OK"
        if (/^\d{3}(?: |$)/.test(line)) {
          const code = Number(line.slice(0, 3));
          const fullText = collected.join(' ');
          collected.length = 0;
          const waiter = pendingWaiter;
          pendingWaiter = null;
          if (waiter) waiter(code, fullText);
        }
      }
    });

    const readResponse = (): Promise<{ code: number; text: string }> =>
      new Promise((res) => {
        pendingWaiter = (code, text) => res({ code, text });
      });

    const sendCommand = (cmd: string, expectedPrefix: number): Promise<{ code: number; text: string }> =>
      new Promise((res, rej) => {
        pendingWaiter = (code, text) => {
          if (Math.floor(code / 100) === expectedPrefix || code === expectedPrefix) {
            res({ code, text });
          } else {
            rej(new Error(`SMTP unexpected status ${code}`));
          }
        };
        socket.write(`${cmd}\r\n`);
      });

    void (async () => {
      try {
        const banner = await readResponse();
        if (banner.code !== 220) {
          throw new Error(`SMTP greeting rejected (${banner.code})`);
        }
        await sendCommand('EHLO baratrust.com', 2);
        await sendCommand('AUTH LOGIN', 334);
        await sendCommand(Buffer.from(cleanUser, 'utf8').toString('base64'), 334);
        await sendCommand(Buffer.from(cfg.pass, 'utf8').toString('base64'), 235);
        await sendCommand(`MAIL FROM:<${cleanUser}>`, 2);
        await sendCommand(`RCPT TO:<${cleanRecipient}>`, 2);
        await sendCommand('DATA', 354);

        transmittedDataPayload = true;
        const accepted = await new Promise<{ code: number; text: string }>((res, rej) => {
          pendingWaiter = (code, text) => {
            if (code >= 200 && code < 300) {
              res({ code, text });
            } else {
              rej(new Error(`SMTP DATA rejected (${code})`));
            }
          };
          socket.write(mimeMessage);
        });

        // Politely send QUIT without failing if server closes immediately
        try {
          socket.write('QUIT\r\n');
        } catch {
          // Ignore
        }

        finish({
          outcome: 'SENT',
          provider: 'CPANEL_SMTP_TLS',
          messageId: accepted.text ? generatedMessageId : generatedMessageId,
          error: null,
        });
      } catch (stepErr) {
        const safeErr = redactMailerError(stepErr);
        finish(
          transmittedDataPayload
            ? {
                outcome: 'UNCERTAIN_DELIVERY_LOCKED',
                provider: 'CPANEL_SMTP_TLS',
                messageId: null,
                error: `Post-DATA SMTP error (${safeErr}); automatic retry locked.`,
              }
            : {
                outcome: 'FAILED_RETRYABLE',
                provider: 'CPANEL_SMTP_TLS',
                messageId: null,
                error: `Pre-DATA SMTP error (${safeErr}).`,
              }
        );
      }
    })();
  });
}

/**
 * Dispatches a solicited, preapproved customer acknowledgment ONLY when
 * `CUSTOMER_AUTO_ACK_ENABLED="true"` is explicitly set.
 * Never sends prospect outreach, never generates AI copy, and never throws uncaught errors.
 */
export async function dispatchWebsiteCustomerAck(
  input: AckMailerInput
): Promise<AckMailerOutcome> {
  if (!isWebsiteAutoAckEnabled()) {
    return {
      outcome: 'DISABLED_PENDING_APPROVAL',
      provider: null,
      messageId: null,
      error: null,
    };
  }

  if (testTransportOverride) {
    try {
      return await testTransportOverride(input);
    } catch (err) {
      return {
        outcome: 'FAILED_RETRYABLE',
        provider: 'MOCK_ADAPTER',
        messageId: null,
        error: redactMailerError(err),
      };
    }
  }

  // Never perform live external email network calls during automated test runs
  if (process.env.NODE_ENV === 'test' || process.env.TEST_ENV === 'true') {
    return {
      outcome: 'FAILED_RETRYABLE',
      provider: 'UNCONFIGURED',
      messageId: null,
      error: 'Live email transport blocked in test environment without explicit mock adapter.',
    };
  }

  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendApiKey) {
    return sendViaResendHttps(resendApiKey, input);
  }

  const smtpHost = (process.env.CPANEL_SMTP_HOST || '').trim();
  const smtpPort = Number(process.env.CPANEL_SMTP_PORT || '465');
  const smtpUser = (process.env.CPANEL_SMTP_USER || '').trim();
  const smtpPass = process.env.CPANEL_SMTP_PASS || '';

  if (smtpHost && smtpUser && smtpPass && Number.isFinite(smtpPort)) {
    return sendViaCpanelImplicitTlsSmtp(
      {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        pass: smtpPass,
      },
      input
    );
  }

  return {
    outcome: 'FAILED_RETRYABLE',
    provider: 'UNCONFIGURED',
    messageId: null,
    error:
      'CUSTOMER_AUTO_ACK_ENABLED is true, but neither RESEND_API_KEY nor CPANEL_SMTP_* credentials are configured.',
  };
}
