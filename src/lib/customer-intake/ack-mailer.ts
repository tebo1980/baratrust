import crypto from 'crypto';
import tls from 'tls';

export const AUTHORIZED_INTERNAL_TEST_RECIPIENT = 'tebo1980@gmail.com' as const;

export interface AckTransportDiagnostics {
  tcpConnected: boolean;
  tlsNegotiated: boolean;
  tlsProtocol: string | null;
  smtpAuthenticated: boolean;
  senderEmail: string | null;
  smtpResponse: string | null;
}

export type AckMailerOutcome =
  | {
      outcome: 'DISABLED_PENDING_APPROVAL';
      provider: null;
      messageId: null;
      error: null;
      diagnostics?: AckTransportDiagnostics;
    }
  | {
      outcome: 'SENT';
      provider: 'RESEND_HTTPS' | 'CPANEL_SMTP_TLS' | 'MOCK_ADAPTER';
      messageId: string;
      error: null;
      diagnostics?: AckTransportDiagnostics;
    }
  | {
      outcome: 'FAILED_RETRYABLE';
      provider: 'RESEND_HTTPS' | 'CPANEL_SMTP_TLS' | 'UNCONFIGURED' | 'MOCK_ADAPTER';
      messageId: null;
      error: string;
      diagnostics?: AckTransportDiagnostics;
    }
  | {
      outcome: 'UNCERTAIN_DELIVERY_LOCKED';
      provider: 'RESEND_HTTPS' | 'CPANEL_SMTP_TLS' | 'MOCK_ADAPTER';
      messageId: null;
      error: string;
      diagnostics?: AckTransportDiagnostics;
    };

export interface AckMailerInput {
  inquiryId: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
}

export interface DispatchWebsiteAckOptions {
  authorizedInternalTest?: boolean;
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

function encodeMimeHeaderIfNonAscii(value: string): string {
  const clean = stripHeaderCrlf(value);
  if (/^[\x20-\x7E]*$/.test(clean)) {
    return clean;
  }
  return `=?UTF-8?B?${Buffer.from(clean, 'utf8').toString('base64')}?=`;
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
        diagnostics: {
          tcpConnected: true,
          tlsNegotiated: true,
          tlsProtocol: 'HTTPS',
          smtpAuthenticated: true,
          senderEmail: 'todd@baratrust.com',
          smtpResponse: `HTTP ${res.status}`,
        },
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
  const cleanSender = stripHeaderCrlf(process.env.CUSTOMER_ACK_FROM_EMAIL || cleanUser);
  const encodedSubject = encodeMimeHeaderIfNonAscii(input.subject);
  const generatedMessageId = `<ack-${input.inquiryId}-${crypto.randomBytes(6).toString('hex')}@baratrust.com>`;

  // Dot-stuff body lines per RFC 5321 Section 4.5.2
  const normalizedLines = input.bodyText.replace(/\r?\n/g, '\r\n').split('\r\n');
  const dotStuffedBody = normalizedLines
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');

  const mimeMessage = [
    `From: "Todd & Noelah - BaraTrust" <${cleanSender}>`,
    `To: <${cleanRecipient}>`,
    `Reply-To: <${cleanSender}>`,
    `Subject: ${encodedSubject}`,
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
  let tcpConnected = false;
  let tlsNegotiated = false;
  let tlsProtocol: string | null = null;
  let smtpAuthenticated = false;
  let lastSmtpResponse: string | null = null;

  const snapshotDiagnostics = (): AckTransportDiagnostics => ({
    tcpConnected,
    tlsNegotiated,
    tlsProtocol,
    smtpAuthenticated,
    senderEmail: cleanSender,
    smtpResponse: lastSmtpResponse,
  });

  return new Promise<AckMailerOutcome>((resolve) => {
    let settled = false;
    let buffer = '';
    const collectedLines: string[] = [];
    const responseQueue: Array<{ code: number; text: string }> = [];
    let pendingWaiter: ((code: number, text: string) => void) | null = null;

    const socket = tls.connect({
      host: cfg.host,
      port: cfg.port,
      servername: cfg.host,
      minVersion: 'TLSv1.2',
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
              diagnostics: snapshotDiagnostics(),
            }
          : {
              outcome: 'FAILED_RETRYABLE',
              provider: 'CPANEL_SMTP_TLS',
              messageId: null,
              error: 'SMTP connection or handshake timed out prior to DATA transmission.',
              diagnostics: snapshotDiagnostics(),
            }
      );
    }, 9_000);

    socket.on('connect', () => {
      tcpConnected = true;
    });

    socket.on('secureConnect', () => {
      tcpConnected = true;
      tlsNegotiated = Boolean(socket.authorized);
      tlsProtocol = socket.getProtocol() || null;
    });

    socket.on('error', (err) => {
      const safeErr = redactMailerError(err);
      finish(
        transmittedDataPayload
          ? {
              outcome: 'UNCERTAIN_DELIVERY_LOCKED',
              provider: 'CPANEL_SMTP_TLS',
              messageId: null,
              error: `SMTP socket error after DATA transmission (${safeErr}); automatic retry locked.`,
              diagnostics: snapshotDiagnostics(),
            }
          : {
              outcome: 'FAILED_RETRYABLE',
              provider: 'CPANEL_SMTP_TLS',
              messageId: null,
              error: `SMTP connection error before DATA (${safeErr}).`,
              diagnostics: snapshotDiagnostics(),
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
                diagnostics: snapshotDiagnostics(),
              }
            : {
                outcome: 'FAILED_RETRYABLE',
                provider: 'CPANEL_SMTP_TLS',
                messageId: null,
                error: 'SMTP connection closed unexpectedly before DATA transmission.',
                diagnostics: snapshotDiagnostics(),
              }
        );
      }
    });

    const deliverResponse = (code: number, text: string) => {
      if (pendingWaiter) {
        const waiter = pendingWaiter;
        pendingWaiter = null;
        waiter(code, text);
      } else {
        responseQueue.push({ code, text });
      }
    };

    socket.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line) continue;
        collectedLines.push(line);
        // Final line of an SMTP response has a space (not hyphen) at index 3: e.g. "250 OK"
        if (/^\d{3}(?: |$)/.test(line)) {
          const code = Number(line.slice(0, 3));
          const fullText = collectedLines.join(' ');
          collectedLines.length = 0;
          deliverResponse(code, fullText);
        }
      }
    });

    const readResponse = (): Promise<{ code: number; text: string }> => {
      const queued = responseQueue.shift();
      if (queued) {
        return Promise.resolve(queued);
      }
      return new Promise((res) => {
        pendingWaiter = (code, text) => res({ code, text });
      });
    };

    const sendCommand = (
      cmd: string,
      expectedPrefix: number
    ): Promise<{ code: number; text: string }> =>
      new Promise((res, rej) => {
        pendingWaiter = (code, text) => {
          if (Math.floor(code / 100) === expectedPrefix || code === expectedPrefix) {
            res({ code, text });
          } else {
            lastSmtpResponse = redactMailerError(text);
            rej(new Error(`SMTP unexpected status ${code}`));
          }
        };
        socket.write(`${cmd}\r\n`);
      });

    void (async () => {
      try {
        const banner = await readResponse();
        if (banner.code !== 220) {
          lastSmtpResponse = redactMailerError(banner.text);
          throw new Error(`SMTP greeting rejected (${banner.code})`);
        }
        await sendCommand('EHLO baratrust.com', 2);
        await sendCommand('AUTH LOGIN', 334);
        await sendCommand(Buffer.from(cleanUser, 'utf8').toString('base64'), 334);
        await sendCommand(Buffer.from(cfg.pass, 'utf8').toString('base64'), 235);
        smtpAuthenticated = true;

        await sendCommand(`MAIL FROM:<${cleanSender}>`, 2);
        await sendCommand(`RCPT TO:<${cleanRecipient}>`, 2);
        await sendCommand('DATA', 354);

        transmittedDataPayload = true;
        const accepted = await new Promise<{ code: number; text: string }>((res, rej) => {
          pendingWaiter = (code, text) => {
            lastSmtpResponse = redactMailerError(text);
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
          diagnostics: snapshotDiagnostics(),
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
                diagnostics: snapshotDiagnostics(),
              }
            : {
                outcome: 'FAILED_RETRYABLE',
                provider: 'CPANEL_SMTP_TLS',
                messageId: null,
                error: `Pre-DATA SMTP error (${safeErr}).`,
                diagnostics: snapshotDiagnostics(),
              }
        );
      }
    })();
  });
}

/**
 * Dispatches a solicited, preapproved customer acknowledgment ONLY when
 * `CUSTOMER_AUTO_ACK_ENABLED="true"` is explicitly set, OR when an operator-authenticated
 * controlled test explicitly passes `authorizedInternalTest: true` for the single
 * hardcoded allowlisted address (`tebo1980@gmail.com`).
 * Never sends prospect outreach, never generates AI copy, and never throws uncaught errors.
 */
export async function dispatchWebsiteCustomerAck(
  input: AckMailerInput,
  options?: DispatchWebsiteAckOptions
): Promise<AckMailerOutcome> {
  const isAuthorizedTest = options?.authorizedInternalTest === true;

  if (isAuthorizedTest) {
    const normalizedTarget = stripHeaderCrlf(input.recipientEmail).toLowerCase();
    if (normalizedTarget !== AUTHORIZED_INTERNAL_TEST_RECIPIENT) {
      return {
        outcome: 'FAILED_RETRYABLE',
        provider: 'UNCONFIGURED',
        messageId: null,
        error: `Authorized internal acknowledgment test is strictly allowlisted to ${AUTHORIZED_INTERNAL_TEST_RECIPIENT}.`,
      };
    }
  } else if (!isWebsiteAutoAckEnabled()) {
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
      'Neither RESEND_API_KEY nor CPANEL_SMTP_* credentials are configured for customer acknowledgments.',
  };
}
