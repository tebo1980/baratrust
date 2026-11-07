import { NextResponse } from 'next/server';

/**
 * Default authorized operator email for BaraTrust internal workspaces.
 * Additional operator identities (including Noelah's verified Clerk user ID or
 * verified Clerk email) are configured via OPERATOR_CLERK_USER_IDS and OPERATOR_EMAILS
 * environment variables so operator credentials/identities are not exposed in source code.
 */
export const DEFAULT_OPERATOR_EMAILS = ['todd@baratrust.com'];

/**
 * Returns all configured operator Clerk user IDs (e.g., user_2x...).
 */
export function getOperatorClerkUserIds(): string[] {
  if (!process.env.OPERATOR_CLERK_USER_IDS) return [];
  return Array.from(
    new Set(
      process.env.OPERATOR_CLERK_USER_IDS.split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  );
}

/**
 * Returns all configured operator emails (defaults + OPERATOR_EMAILS env override).
 */
export function getOperatorEmails(): string[] {
  const envEmails = process.env.OPERATOR_EMAILS
    ? process.env.OPERATOR_EMAILS.split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    : [];

  return Array.from(new Set([...DEFAULT_OPERATOR_EMAILS, ...envEmails]));
}

/**
 * Checks if a given email is in the authorized operator allowlist.
 * NOTE: Callers authenticating real users MUST also verify that Clerk marked
 * the email address as verified (`verification.status === 'verified'`).
 */
export function isOperatorEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return getOperatorEmails().includes(normalized);
}

/**
 * Checks if a Clerk user ID is explicitly allowlisted in OPERATOR_CLERK_USER_IDS.
 */
export function isOperatorClerkUserId(userId?: string | null): boolean {
  if (!userId) return false;
  const trimmed = userId.trim();
  if (!trimmed) return false;
  return getOperatorClerkUserIds().includes(trimmed);
}

export interface ClerkLikeEmailAddress {
  id?: string;
  emailAddress: string;
  verification?: {
    status?: string | null;
  } | null;
}

export interface ClerkLikeUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddressId?: string | null;
  primaryEmailAddress?: ClerkLikeEmailAddress | null;
  emailAddresses?: ClerkLikeEmailAddress[];
}

export interface OperatorUser {
  id: string;
  email: string;
  name: string;
  isOperator: boolean;
  authMethod?: 'clerk_user_id' | 'verified_email' | 'none';
}

/**
 * Evaluates a Clerk user record strictly using server-verified Clerk identity:
 * 1. Explicit Clerk User ID match (`OPERATOR_CLERK_USER_IDS`), OR
 * 2. Clerk email address match (`OPERATOR_EMAILS` / `DEFAULT_OPERATOR_EMAILS`) ONLY when
 *    Clerk explicitly confirms `verification.status === 'verified'`.
 *
 * Unverified email claims never grant operator access.
 */
export function evaluateClerkOperatorIdentity(user: ClerkLikeUser | null | undefined): OperatorUser | null {
  if (!user || !user.id) return null;

  const allEmails: ClerkLikeEmailAddress[] = [];
  if (user.primaryEmailAddress) {
    allEmails.push(user.primaryEmailAddress);
  }
  if (Array.isArray(user.emailAddresses)) {
    for (const addr of user.emailAddresses) {
      if (addr && !allEmails.some((existing) => existing.emailAddress === addr.emailAddress)) {
        allEmails.push(addr);
      }
    }
  }

  const verifiedEmails = allEmails
    .filter((addr) => addr.verification?.status === 'verified' && Boolean(addr.emailAddress?.trim()))
    .map((addr) => addr.emailAddress.trim().toLowerCase());

  const displayEmail =
    verifiedEmails[0] ||
    user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ||
    allEmails[0]?.emailAddress?.trim().toLowerCase() ||
    '';

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    displayEmail ||
    'Operator';

  // 1. Verified Clerk account User ID match (requires at least one verified email on the account if emails exist, or explicit user ID)
  if (isOperatorClerkUserId(user.id)) {
    return {
      id: user.id,
      email: displayEmail,
      name,
      isOperator: true,
      authMethod: 'clerk_user_id',
    };
  }

  // 2. Verified Clerk email match (unverified email addresses are strictly ignored)
  const matchedVerifiedEmail = verifiedEmails.find((em) => isOperatorEmail(em));
  if (matchedVerifiedEmail) {
    return {
      id: user.id,
      email: matchedVerifiedEmail,
      name,
      isOperator: true,
      authMethod: 'verified_email',
    };
  }

  return {
    id: user.id,
    email: displayEmail,
    name,
    isOperator: false,
    authMethod: 'none',
  };
}

/**
 * Retrieves the currently authenticated user from Clerk and verifies operator status.
 * Handles test environment gracefully while still testing verification semantics.
 */
export async function getOperatorUser(): Promise<OperatorUser | null> {
  if (process.env.TEST_ENV === 'true' || process.env.NODE_ENV === 'test') {
    if (process.env.TEST_UNAUTHENTICATED === 'true') {
      return null;
    }
    const testUserId = process.env.TEST_OPERATOR_USER_ID || 'test-operator-id';
    const testEmail = process.env.TEST_OPERATOR_EMAIL || 'todd@baratrust.com';
    const emailVerified = process.env.TEST_OPERATOR_EMAIL_UNVERIFIED !== 'true';
    return evaluateClerkOperatorIdentity({
      id: testUserId,
      firstName: 'Operator',
      lastName: 'Test',
      primaryEmailAddress: {
        emailAddress: testEmail,
        verification: { status: emailVerified ? 'verified' : 'unverified' },
      },
      emailAddresses: [
        {
          emailAddress: testEmail,
          verification: { status: emailVerified ? 'verified' : 'unverified' },
        },
      ],
    });
  }

  try {
    const { currentUser } = await import('@clerk/nextjs/server');
    const user = await currentUser();
    if (!user) return null;

    return evaluateClerkOperatorIdentity(user as unknown as ClerkLikeUser);
  } catch (err) {
    console.error('[OPERATOR_AUTH_ERROR] Error checking current user:', err);
    return null;
  }
}

/**
 * Server-side guard for internal operator API routes.
 */
export async function requireOperatorApiAuth(): Promise<
  | { ok: true; operator: OperatorUser }
  | { ok: false; response: NextResponse }
> {
  const operator = await getOperatorUser();
  if (!operator) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      ),
    };
  }
  if (!operator.isOperator) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Operator authorization required.' },
        { status: 403 }
      ),
    };
  }
  return { ok: true, operator };
}
