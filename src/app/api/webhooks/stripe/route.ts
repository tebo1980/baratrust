import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { eq, or, sql } from 'drizzle-orm';
import { stripe } from '../../../../lib/stripe/client';
import { db } from '@/db';
import {
  businesses,
  acquisitionProspects,
  acquisitionContactLogs,
} from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!webhookSecret) {
    console.error('[STRIPE_WEBHOOK_ERROR] STRIPE_WEBHOOK_SECRET is not configured.');
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new NextResponse('Webhook Error: Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const rawEmail = session.customer_details?.email || session.customer_email || null;
      const customerEmail = rawEmail ? rawEmail.trim().toLowerCase() : null;
      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id || null;
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id || null;
      const customerName =
        session.customer_details?.name?.trim() || 'Business Pulse Member';
      const customFieldBiz = session.custom_fields
        ?.map((f) => f.text?.value?.trim())
        .find((val) => Boolean(val));

      if (customerEmail || customerId) {
        try {
          const now = new Date();

          // Check if an acquisition prospect matches so we can reuse its businessName if needed
          let matchedProspect:
            | {
                id: string;
                businessName: string;
                stage: string;
                conversationStartedAt: Date | null;
                convertedToPulseAt: Date | null;
              }
            | undefined;

          if (customerEmail) {
            try {
              const [foundProspect] = await db
                .select({
                  id: acquisitionProspects.id,
                  businessName: acquisitionProspects.businessName,
                  stage: acquisitionProspects.stage,
                  conversationStartedAt: acquisitionProspects.conversationStartedAt,
                  convertedToPulseAt: acquisitionProspects.convertedToPulseAt,
                })
                .from(acquisitionProspects)
                .where(sql`lower(${acquisitionProspects.contactValue}) = ${customerEmail}`)
                .limit(1);
              matchedProspect = foundProspect;
            } catch {
              // Non-blocking if prospect lookup fails
            }
          }

          const matchConditions = [];
          if (customerEmail) {
            matchConditions.push(sql`lower(${businesses.ownerEmail}) = ${customerEmail}`);
          }
          if (customerId) {
            matchConditions.push(eq(businesses.stripeCustomerId, customerId));
          }

          const [existingBiz] =
            matchConditions.length > 0
              ? await db
                  .select()
                  .from(businesses)
                  .where(
                    matchConditions.length === 1
                      ? matchConditions[0]
                      : or(...matchConditions)
                  )
                  .limit(1)
              : [];

          if (existingBiz) {
            await db
              .update(businesses)
              .set({
                tier: 'Business Pulse',
                isActive: true,
                ownerEmail: customerEmail || existingBiz.ownerEmail,
                stripeCustomerId: customerId || existingBiz.stripeCustomerId,
                stripeSubscriptionId: subscriptionId || existingBiz.stripeSubscriptionId,
                updatedAt: now,
              })
              .where(eq(businesses.id, existingBiz.id));
          } else {
            const syntheticClerkId = `stripe_${customerId || session.id}`;
            const derivedBusinessName =
              customFieldBiz ||
              matchedProspect?.businessName ||
              (customerName !== 'Business Pulse Member'
                ? `${customerName} Business`
                : customerEmail || 'Business Pulse Member');

            await db
              .insert(businesses)
              .values({
                clerkId: syntheticClerkId,
                ownerName: customerName,
                ownerEmail: customerEmail,
                businessName: derivedBusinessName,
                region: 'Louisville/New Albany',
                tier: 'Business Pulse',
                isActive: true,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                createdAt: now,
                updatedAt: now,
              })
              .onConflictDoUpdate({
                target: businesses.clerkId,
                set: {
                  tier: 'Business Pulse',
                  isActive: true,
                  ownerEmail: customerEmail,
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: subscriptionId,
                  updatedAt: now,
                },
              });
          }

          // Synchronize matching Acquisition Engine prospect milestone if present
          if (matchedProspect && matchedProspect.stage !== 'CUSTOMER_ACQUIRED') {
            try {
              await db
                .update(acquisitionProspects)
                .set({
                  stage: 'CUSTOMER_ACQUIRED',
                  conversationStartedAt: matchedProspect.conversationStartedAt || now,
                  convertedToPulseAt: matchedProspect.convertedToPulseAt || now,
                  updatedAt: now,
                })
                .where(eq(acquisitionProspects.id, matchedProspect.id));

              await db.insert(acquisitionContactLogs).values({
                prospectId: matchedProspect.id,
                actorEmail: 'stripe-webhook@baratrust.com',
                channel: 'SYSTEM',
                direction: 'INBOUND',
                actionType: 'STRIPE_CHECKOUT_COMPLETED',
                summary: 'Business Pulse ($99/mo) Stripe checkout completed.',
              });
            } catch (syncErr) {
              console.warn('[STRIPE_WEBHOOK_PROSPECT_SYNC_WARNING]', syncErr);
            }
          }
        } catch (dbError) {
          console.error('Database update failed in Stripe webhook:', dbError);
          return new NextResponse('Database Error', { status: 500 });
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const subId = subscription.id;
      if (subId) {
        try {
          await db
            .update(businesses)
            .set({
              tier: 'Canceled',
              isActive: false,
              updatedAt: new Date(),
            })
            .where(eq(businesses.stripeSubscriptionId, subId));
        } catch (subError) {
          console.error('Database update failed on subscription cancellation:', subError);
          return new NextResponse('Database Error', { status: 500 });
        }
      }
      break;
    }

    default:
      break;
  }

  return new NextResponse('Webhook processed successfully', { status: 200 });
}
