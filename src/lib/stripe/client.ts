import Stripe from "stripe";

/**
 * Strips literal escaped trailing CR/LF characters and surrounding whitespace
 * from Stripe environment variables so newline-suffixed secrets do not fail auth.
 */
export function sanitizeStripeEnvValue(raw?: string | null): string {
  if (!raw) return "";
  return raw.replace(/(?:\\r|\\n)+$/g, "").trim();
}

/**
 * Verified live Stripe Payment Link ID for BaraTrust Business Pulse ($99/month)
 * at https://buy.stripe.com/8x2dR2dS8f01gm3akp5ZC1Q.
 * Scoping checkout events prevents unrelated products on a shared Stripe account
 * from creating Business Pulse customer records in BaraTrust.
 */
export const DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID = "plink_1UXxUZ1YKhQ5pWK6QriyeRid";

export function isBaraTrustBusinessPulseCheckout(session: Stripe.Checkout.Session): boolean {
  const expectedPaymentLinkId =
    sanitizeStripeEnvValue(process.env.STRIPE_BUSINESS_PULSE_PAYMENT_LINK_ID) ||
    DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID;

  const sessionPaymentLinkId =
    typeof session.payment_link === "string"
      ? session.payment_link
      : session.payment_link?.id || null;

  if (sessionPaymentLinkId && sessionPaymentLinkId === expectedPaymentLinkId) {
    return true;
  }

  if (session.metadata?.baratrust_product === "business_pulse") {
    return true;
  }

  return false;
}

const getStripeKey = () => {
  const realKey = sanitizeStripeEnvValue(process.env.STRIPE_SECRET_KEY);

  // 1. The Shield: If Next.js is building, previewing without Stripe, or running automated tests, feed a dummy key
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build" ||
    (process.env.VERCEL_ENV === "preview" && !realKey) ||
    ((process.env.NODE_ENV === "test" || process.env.TEST_ENV === "true") && !realKey)
  ) {
    if (process.env.NODE_ENV !== "test" && process.env.TEST_ENV !== "true") {
      console.log("Atlas: Using dummy Stripe key for Next.js build phase.");
    }
    return "sk_test_dummy_key_for_build_purposes_only";
  }

  // 2. The Real Deal: Grab the sanitized key from Vercel's environment variables
  if (!realKey) {
    throw new Error("CRITICAL: STRIPE_SECRET_KEY is missing at runtime. Atlas cannot process payments!");
  }

  return realKey;
};

// 3. Initialize the Client
export const stripe = new Stripe(getStripeKey(), {
  apiVersion: "2026-04-22.dahlia", // Stripe dashboard uses
  typescript: true,
  appInfo: {
    name: "BaraTrust",
    version: "1.0.0",
  },
});
