import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim(), {
  apiVersion: '2026-04-22.dahlia',
});

export async function POST(req: Request) {
  try {
    // We create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription', // Change to 'payment' if it is a one-time fee
      line_items: [
        {
          // TODO: Replace this with your actual Price ID from the Stripe Dashboard
          price: 'price_1TTZGT1YKhQ5pWK6SaZzOu4d', 
          quantity: 1,
        },
      ],
      // Where Stripe sends them after the payment succeeds or fails
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}