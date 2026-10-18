/**
 * Default authorized operator email for BaraTrust review studio.
 */
export const DEFAULT_OPERATOR_EMAILS = [
  'todd@baratrust.com',
];

/**
 * Returns all configured operator emails (defaults + env override).
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
 */
export function isOperatorEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return getOperatorEmails().includes(normalized);
}

export interface OperatorUser {
  id: string;
  email: string;
  name: string;
  isOperator: boolean;
}

/**
 * Retrieves the currently authenticated user from Clerk and verifies operator status.
 * Handles test environment gracefully.
 */
export async function getOperatorUser(): Promise<OperatorUser | null> {
  // Support unit test or mock environment
  if (process.env.TEST_ENV === 'true' || process.env.NODE_ENV === 'test') {
    const testEmail = process.env.TEST_OPERATOR_EMAIL || 'todd@baratrust.com';
    return {
      id: 'test-operator-id',
      email: testEmail,
      name: 'Todd Tebo (Operator Test)',
      isOperator: isOperatorEmail(testEmail),
    };
  }

  try {
    const { currentUser } = await import('@clerk/nextjs/server');
    const user = await currentUser();
    if (!user) return null;

    const email =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      '';

    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || email || 'Operator';
    const operatorAuthorized = isOperatorEmail(email);

    return {
      id: user.id,
      email,
      name,
      isOperator: operatorAuthorized,
    };
  } catch (err) {
    console.error('[OPERATOR_AUTH_ERROR] Error checking current user:', err);
    return null;
  }
}
