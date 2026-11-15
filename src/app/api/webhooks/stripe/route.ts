import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { and, eq, or, sql } from 'drizzle-orm';
import {
  stripe,
  sanitizeStripeEnvValue,
  isBaraTrustBusinessPulseCheckout,
} from '@/lib/stripe/client';
import { db } from '@/db';
import {
  businesses,
  acquisitionProspects,
  acquisitionContactLogs,
} from '@/db/schema';
import { ensureAcquisitionSchema } from '@/lib/acquisition/schema-bootstrap';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const webhookSecret = sanitizeStripeEnvValue(process.env.STRIPE_WEBHOOK_SECRET);
  if (!webhookSecret) {
    console.error('[STRIPE_WEBHOOK_ERROR] STRIPE_WEBHOOK_SECRET is not configured.');
    return NextResponse.json(
      { error: 'Webhook secret not configured.' },
      { status: 500 }
    );
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header.' },
      { status: 400 }
    );
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown signature error';
    console.error(`[STRIPE_WEBHOOK_SIGNATURE_ERROR] ${message}`);
    return NextResponse.json(
      { error: 'Invalid webhook signature.' },
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!isBaraTrustBusinessPulseCheckout(session)) {
        return NextResponse.json(
          { received: true, ignored: true, reason: 'non_business_pulse_checkout' },
          { status: 200 }
        );
      }

      if (
        session.payment_status &&
        session.payment_status !== 'paid' &&
        session.payment_status !== 'no_payment_required'
      ) {
        return NextResponse.json(
          { received: true, ignored: true, reason: 'payment_not_settled' },
          { status: 200 }
        );
      }

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
          await ensureAcquisitionSchema();
          const now = new Date();

          // 1. Check if an acquisition prospect already matches this customer
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
            const [foundByEmail] = await db
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
            matchedProspect = foundByEmail;
          }

          if (!matchedProspect && customerId) {
            const customerMarker = `%[stripe_customer:${customerId}]%`;
            const [foundByCustomer] = await db
              .select({
                id: acquisitionProspects.id,
                businessName: acquisitionProspects.businessName,
                stage: acquisitionProspects.stage,
                conversationStartedAt: acquisitionProspects.conversationStartedAt,
                convertedToPulseAt: acquisitionProspects.convertedToPulseAt,
              })
              .from(acquisitionProspects)
              .where(sql`${acquisitionProspects.researchNotes} like ${customerMarker}`)
              .limit(1);
            matchedProspect = foundByCustomer;
          }

          const derivedBusinessName =
            customFieldBiz ||
            matchedProspect?.businessName ||
            (customerName !== 'Business Pulse Member'
              ? `${customerName} Business`
              : customerEmail || 'Business Pulse Member');

          // 2. Idempotently upsert active Business Pulse record in `businesses`
          const matchConditions = [];
          if (subscriptionId) {
            matchConditions.push(eq(businesses.stripeSubscriptionId, subscriptionId));
          }
          if (customerId) {
            matchConditions.push(eq(businesses.stripeCustomerId, customerId));
          }
          if (customerEmail) {
            matchConditions.push(sql`lower(${businesses.ownerEmail}) = ${customerEmail}`);
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

          // 3. Idempotent onboarding queueing in `acquisition_prospects` & `acquisition_contact_logs`
          const sessionMarker = `[session:${session.id}]`;
          const [existingSessionLog] = await db
            .select({
              id: acquisitionContactLogs.id,
              prospectId: acquisitionContactLogs.prospectId,
            })
            .from(acquisitionContactLogs)
            .where(
              and(
                eq(acquisitionContactLogs.actionType, 'STRIPE_CHECKOUT_COMPLETED'),
                sql`${acquisitionContactLogs.summary} like ${`%${sessionMarker}%`}`
              )
            )
            .limit(1);

          if (!existingSessionLog) {
            let targetProspectId: string;

            if (matchedProspect) {
              targetProspectId = matchedProspect.id;
              if (matchedProspect.stage !== 'CUSTOMER_ACQUIRED' || !matchedProspect.convertedToPulseAt) {
                await db
                  .update(acquisitionProspects)
                  .set({
                    stage: 'CUSTOMER_ACQUIRED',
                    conversationStartedAt: matchedProspect.conversationStartedAt || now,
                    convertedToPulseAt: matchedProspect.convertedToPulseAt || now,
                    updatedAt: now,
                  })
                  .where(eq(acquisitionProspects.id, matchedProspect.id));
              }
            } else {
              const city = session.customer_details?.address?.city?.trim();
              const state = session.customer_details?.address?.state?.trim();
              const derivedLocation =
                city && state
                  ? `${city}, ${state}`
                  : city || state || 'Louisville / Southern Indiana';

              const [createdProspect] = await db
                .insert(acquisitionProspects)
                .values({
                  businessName: derivedBusinessName,
                  location: derivedLocation,
                  industry: 'Business Pulse Subscriber',
                  researchNotes: `Paid Business Pulse ($99/mo) subscription via Stripe Payment Link. Ready for operator onboarding. [stripe_customer:${customerId || 'none'}] [stripe_subscription:${subscriptionId || 'none'}]`,
                  decisionMakerName:
                    customerName !== 'Business Pulse Member' ? customerName : null,
                  decisionMakerSource: 'Stripe Checkout',
                  contactMethod: customerEmail ? 'EMAIL' : 'NONE',
                  contactValue: customerEmail,
                  permissionStatus: 'INBOUND_REQUEST',
                  stage: 'CUSTOMER_ACQUIRED',
                  conversationStartedAt: now,
                  convertedToPulseAt: now,
                  createdBy: 'stripe-webhook',
                  createdAt: now,
                  updatedAt: now,
                })
                .returning({ id: acquisitionProspects.id });

              targetProspectId = createdProspect.id;
            }

            await db.insert(acquisitionContactLogs).values({
              prospectId: targetProspectId,
              actorEmail: 'stripe-webhook@baratrust.com',
              channel: 'SYSTEM',
              direction: 'INBOUND',
              actionType: 'STRIPE_CHECKOUT_COMPLETED',
              summary: `Business Pulse ($99/mo) Stripe checkout completed ${sessionMarker}${
                subscriptionId ? ` [subscription:${subscriptionId}]` : ''
              }.`,
            });
          }
        } catch (dbError) {
          console.error('Database update failed in Stripe webhook:', dbError);
          return NextResponse.json(
            { error: 'Database update failed.' },
            { status: 500 }
          );
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const subId = subscription.id;
      if (subId) {
        try {
          if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            await db
              .update(businesses)
              .set({
                tier: subscription.status === 'canceled' ? 'Canceled' : 'Past Due / Unpaid',
                isActive: false,
                updatedAt: new Date(),
              })
              .where(eq(businesses.stripeSubscriptionId, subId));
          } else if (subscription.status === 'active') {
            await db
              .update(businesses)
              .set({
                tier: 'Business Pulse',
                isActive: true,
                updatedAt: new Date(),
              })
              .where(eq(businesses.stripeSubscriptionId, subId));
          }
        } catch (subError) {
          console.error('Database update failed on subscription update:', subError);
          return NextResponse.json(
            { error: 'Database update failed.' },
            { status: 500 }
          );
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
          return NextResponse.json(
            { error: 'Database update failed.' },
            { status: 500 }
          );
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
