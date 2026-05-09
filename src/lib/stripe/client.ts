import Stripe from "stripe";

const getStripeKey = () => {
  // 1. The Shield: If Vercel is currently building the app, feed it the dummy key
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build" ||
    process.env.VERCEL_ENV === "preview" && !process.env.STRIPE_SECRET_KEY
  ) {
    console.log("Atlas: Using dummy Stripe key for Next.js build phase.");
    return "sk_test_dummy_key_for_build_purposes_only";
  }

  // 2. The Real Deal: Grab the actual key from Vercel's environment variables
  const realKey = process.env.STRIPE_SECRET_KEY;

  if (!realKey) {
    throw new Error("CRITICAL: STRIPE_SECRET_KEY is missing at runtime. Atlas cannot process payments!");
  }

  return realKey;
};

// 3. Initialize the Client
export const stripe = new Stripe(getStripeKey(), {
  apiVersion: "2026-04-22.dahlia", // Change this to whatever version your Stripe dashboard uses
  typescript: true,
  appInfo: {
    name: "BaraTrust",
    version: "1.0.0",
  },
});
