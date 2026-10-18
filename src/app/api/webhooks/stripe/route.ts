import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '../../../../lib/stripe/client';
import { db } from '@/db';
import { businesses } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      
      if (customerEmail) {
        try {
          // Schema-consistent update on businesses table
          const updated = await db.update(businesses)
            .set({
              tier: 'Active Member',
              isActive: true,
              stripeCustomerId: customerId || null,
              stripeSubscriptionId: subscriptionId || null,
              updatedAt: new Date(),
            })
            .where(eq(businesses.ownerEmail, customerEmail))
            .returning();

          if (updated.length > 0) {
            console.log(`BaraTrust account entitlement upgraded for: ${customerEmail}`);
          } else {
            console.warn(`Stripe payment confirmed for ${customerEmail}, but no business record matched ownerEmail yet.`);
          }
        } catch (dbError) {
          console.error('Database update failed in Stripe webhook:', dbError);
          return new NextResponse('Database Error', { status: 500 });
        }
      }
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      const subId = subscription.id;
      if (subId) {
        try {
          await db.update(businesses)
            .set({
              tier: 'Canceled',
              isActive: false,
              updatedAt: new Date(),
            })
            .where(eq(businesses.stripeSubscriptionId, subId));
          console.log(`Subscription canceled for Stripe subscription ID: ${subId}`);
        } catch (subError) {
          console.error('Database update failed on subscription cancellation:', subError);
        }
      }
      break;

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  return new NextResponse('Webhook processed successfully', { status: 200 });
}