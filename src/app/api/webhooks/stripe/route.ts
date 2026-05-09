import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@vercel/postgres';
import { stripe } from '../../../../lib/stripe/client';

// The webhook secret from the Stripe Dashboard / CLI
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    // This verifies the event actually came from Stripe
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the specific event types BaraTrust needs
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email;
      
      if (customerEmail) {
        try {
          // The Database Handshake: Upgrade the user via raw SQL
          await sql`
            UPDATE users 
            SET tier = 'Founding Member', is_active = true 
            WHERE email = ${customerEmail};
          `;
          console.log(`BaraTrust account upgraded for: ${customerEmail}`);
        } catch (dbError) {
          console.error('Database update failed:', dbError);
          // We return 500 so Stripe knows our DB failed and will retry the webhook later
          return new NextResponse('Database Error', { status: 500 });
        }
      }
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      // In a real scenario, you'd fetch the user by Stripe Customer ID here
      console.log(`Subscription canceled for customer: ${subscription.customer}`);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new NextResponse('Webhook processed successfully', { status: 200 });
}