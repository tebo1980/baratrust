import crypto from 'crypto';

interface RateLimitBucket {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitBucket>();

const MAX_TRACKED_KEYS = 5000;

/**
 * Extracts a normalized client IP key from standard proxy headers.
 */
export function getClientIpKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);
  return 'unknown-ip';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Sliding-window rate limiter for public endpoints.
 * In unit tests (`NODE_ENV === 'test'`), bypassed unless `TEST_ENFORCE_RATE_LIMIT === 'true'`
 * so sequential integration test cases from 'unknown-ip' do not collide accidentally.
 */
export function checkPublicRateLimit(params: {
  scope: string;
  ipKey: string;
  maxRequests: number;
  windowMs: number;
  nowMs?: number;
}): RateLimitResult {
  const isTest = process.env.NODE_ENV === 'test' || process.env.TEST_ENV === 'true';
  if (isTest && process.env.TEST_ENFORCE_RATE_LIMIT !== 'true') {
    return { allowed: true, remaining: params.maxRequests, retryAfterSeconds: 0 };
  }

  const now = params.nowMs ?? Date.now();
  const cutoff = now - params.windowMs;
  const compositeKey = `${params.scope}:${params.ipKey}`;

  if (rateLimitStore.size > MAX_TRACKED_KEYS && !rateLimitStore.has(compositeKey)) {
    // Opportunistic eviction of stale keys
    for (const [k, b] of rateLimitStore.entries()) {
      if (b.timestamps.every((t) => t <= cutoff)) {
        rateLimitStore.delete(k);
      }
      if (rateLimitStore.size <= MAX_TRACKED_KEYS / 2) break;
    }
  }

  const bucket = rateLimitStore.get(compositeKey) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= params.maxRequests) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + params.windowMs - now) / 1000));
    rateLimitStore.set(compositeKey, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  bucket.timestamps.push(now);
  rateLimitStore.set(compositeKey, bucket);

  return {
    allowed: true,
    remaining: Math.max(0, params.maxRequests - bucket.timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitStoreForTests(): void {
  rateLimitStore.clear();
}

/**
 * Checks hidden honeypot input (`websiteConfirm` / `companyFax`).
 * Legitimate users never see or populate this field.
 */
export function isHoneypotTriggered(value: unknown): boolean {
  if (typeof value === 'string' && value.trim().length > 0) {
    return true;
  }
  return false;
}

/**
 * Strips null bytes and control characters (preserving standard newlines/tabs if multiline=true).
 */
export function sanitizePlainText(
  input: string | null | undefined,
  opts: { maxLength?: number; multiline?: boolean } = {}
): string | null {
  if (input === null || input === undefined) return null;
  const pattern = opts.multiline
    ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
    : /[\u0000-\u001F\u007F]/g;
  const cleaned = input.replace(pattern, ' ').trim();
  if (!cleaned) return null;
  if (opts.maxLength && cleaned.length > opts.maxLength) {
    return cleaned.slice(0, opts.maxLength).trim();
  }
  return cleaned;
}

export const FOLLOWUP_CLAIM_COOKIE_NAME = 'bt_rc_claim';

function resolveClaimSecret(): string {
  const configured =
    process.env.FOLLOWUP_CLAIM_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_DATABASE_URL ||
    '';
  if (configured.trim().length > 0) {
    return crypto.createHash('sha256').update(`baratrust-rc-claim:${configured}`).digest('hex');
  }
  // Deterministic test/dev fallback only when no server secret exists
  return crypto
    .createHash('sha256')
    .update('baratrust-dev-test-followup-claim-key')
    .digest('hex');
}

/**
 * Creates an HMAC-signed token proving this browser session legitimately claimed
 * the Reality Check follow-up for `shareToken` with `email`.
 */
export function createFollowUpClaimToken(shareToken: string, email: string): string {
  const cleanToken = shareToken.trim();
  const cleanEmail = email.trim().toLowerCase();
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ st: cleanToken, em: cleanEmail, iat: issuedAt }),
    'utf8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', resolveClaimSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

/**
 * Verifies an HMAC-signed follow-up claim token against a specific `shareToken` and expected claimed `email`.
 */
export function verifyFollowUpClaimToken(params: {
  cookieToken?: string | null;
  shareToken: string;
  expectedEmail?: string | null;
  maxAgeSeconds?: number;
}): boolean {
  const { cookieToken, shareToken, expectedEmail, maxAgeSeconds = 60 * 60 * 24 * 30 } = params;
  if (!cookieToken || typeof cookieToken !== 'string') return false;
  const parts = cookieToken.split('.');
  if (parts.length !== 2) return false;
  const [payload, providedSig] = parts;
  if (!payload || !providedSig) return false;

  const expectedSig = crypto
    .createHmac('sha256', resolveClaimSecret())
    .update(payload)
    .digest('base64url');

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded || typeof decoded !== 'object') return false;
    if (decoded.st !== shareToken.trim()) return false;
    if (expectedEmail && decoded.em !== expectedEmail.trim().toLowerCase()) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof decoded.iat !== 'number' || nowSec - decoded.iat > maxAgeSeconds) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses a specific cookie value from a standard Cookie header string.
 */
export function readCookieFromHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    if (k === name) {
      return decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return null;
}
