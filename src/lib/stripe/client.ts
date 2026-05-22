import Stripe from "stripe";

const getStripeKey = () => {
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build" ||
    process.env.VERCEL_ENV === "preview" && !process.env.STRIPE_SECRET_KEY
  ) {
    console.log("Atlas: Using dummy Stripe key for Next.js build phase.");
    return "sk_test_dummy_key_for_build_purposes_only";
  }

  const realKey = process.env.STRIPE_SECRET_KEY;
  if (!realKey) {
    throw new Error("CRITICAL: STRIPE_SECRET_KEY is missing at runtime. Atlas cannot process payments!");
  }
  return realKey;
};

export const stripe = new Stripe(getStripeKey(), {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
  appInfo: {
    name: "BaraTrust",
    version: "1.0.0",
  },
});
