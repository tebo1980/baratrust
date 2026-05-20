import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe using the secret key from your .env.local vault
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: Request) {
  try {
    const { moduleName, price, clientEmail } = await req.json();

    if (!moduleName || !price) {
      return NextResponse.json({ error: "Missing module details or price" }, { status: 400 });
    }

    // Atlas Logic: Generate the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: clientEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `BaraTrust Module: ${moduleName}`,
              description: "Agentic Gateway Authorized Purchase",
            },
            // Stripe expects amounts in cents
            unit_amount: Math.round(price * 100), 
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // We will update these URLs when we build the success/cancel pages
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/cancel`,
    });

    // Return the checkout URL to the frontend so Atlas can redirect the user
    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("Atlas Gateway Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}