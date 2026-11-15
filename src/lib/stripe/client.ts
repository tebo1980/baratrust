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
 * Verified live Stripe identifiers for BaraTrust Business Pulse ($99/month)
 * at https://buy.stripe.com/8x2dR2dS8f01gm3akp5ZC1Q.
 * Strict server-side identifier matching isolates BaraTrust from other businesses
 * sharing the same Stripe account. Customer/session metadata is never trusted.
 */
export const DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID = "plink_1UXxUZ1YKhQ5pWK6QriyeRid";
export const DEFAULT_BUSINESS_PULSE_PRODUCT_ID = "prod_VZ5ffZDSRVlySp";
export const DEFAULT_BUSINESS_PULSE_PRICE_ID = "price_1UXxU91YKhQ5pWK6SgP6Occ8";

export function getApprovedBusinessPulseIds() {
  return {
    paymentLinkId:
      sanitizeStripeEnvValue(process.env.STRIPE_BUSINESS_PULSE_PAYMENT_LINK_ID) ||
      DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
    productId:
      sanitizeStripeEnvValue(process.env.STRIPE_BUSINESS_PULSE_PRODUCT_ID) ||
      DEFAULT_BUSINESS_PULSE_PRODUCT_ID,
    priceId:
      sanitizeStripeEnvValue(process.env.STRIPE_BUSINESS_PULSE_PRICE_ID) ||
      DEFAULT_BUSINESS_PULSE_PRICE_ID,
  };
}

/**
 * Accepts a Checkout Session ONLY when its verified Stripe Payment Link ID
 * (or server-populated line_items price/product IDs when no conflicting Payment Link is set)
 * matches the approved BaraTrust Business Pulse $99/month subscription.
 * Arbitrary metadata is never trusted as proof of product ownership.
 */
export function isBaraTrustBusinessPulseCheckout(session: Stripe.Checkout.Session): boolean {
  if (session.mode && session.mode !== "subscription") {
    return false;
  }

  const { paymentLinkId, productId, priceId } = getApprovedBusinessPulseIds();

  const sessionPaymentLinkId =
    typeof session.payment_link === "string"
      ? session.payment_link
      : session.payment_link?.id || null;

  if (sessionPaymentLinkId) {
    return sessionPaymentLinkId === paymentLinkId;
  }

  const lineItems = session.line_items?.data;
  if (Array.isArray(lineItems) && lineItems.length > 0) {
    return lineItems.every((item) => {
      const itemPriceId = item.price?.id || null;
      const rawProduct = item.price?.product;
      const itemProductId =
        typeof rawProduct === "string" ? rawProduct : rawProduct?.id || null;
      if (itemPriceId !== priceId) return false;
      if (itemProductId && itemProductId !== productId) return false;
      return true;
    });
  }

  return false;
}

/**
 * Inspects server-side subscription items on a Stripe Subscription payload:
 * - 'verified_match': items explicitly match BaraTrust Business Pulse price/product
 * - 'foreign_mismatch': items belong to a different product/price on the shared Stripe account
 * - 'unknown_no_items': payload omitted items.data
 */
export function inspectBusinessPulseSubscriptionItems(
  subscription: Stripe.Subscription
): "verified_match" | "foreign_mismatch" | "unknown_no_items" {
  const items = subscription.items?.data;
  if (!Array.isArray(items) || items.length === 0) {
    return "unknown_no_items";
  }

  const { productId, priceId } = getApprovedBusinessPulseIds();
  let matchedPulseItem = false;

  for (const item of items) {
    const itemPriceId = item.price?.id || null;
    const rawProduct = item.price?.product;
    const itemProductId =
      typeof rawProduct === "string" ? rawProduct : rawProduct?.id || null;

    const priceMatches = itemPriceId === priceId;
    const productMatches = !itemProductId || itemProductId === productId;

    if (priceMatches && productMatches) {
      matchedPulseItem = true;
    } else {
      return "foreign_mismatch";
    }
  }

  return matchedPulseItem ? "verified_match" : "foreign_mismatch";
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
