import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { and, eq, or, sql } from 'drizzle-orm';
import {
  stripe,
  sanitizeStripeEnvValue,
  isBaraTrustBusinessPulseCheckout,
  inspectBusinessPulseSubscriptionItems,
} from '@/lib/stripe/client';
import { db } from '@/db';
import {
  businesses,
  acquisitionProspects,
  acquisitionContactLogs,
} from '@/db/schema';
import { ensureAcquisitionSchema } from '@/lib/acquisition/schema-bootstrap';
import { redactSensitiveMailError } from '@/lib/customer-intake/ack-mailer';
import type { DurableOperatorAlertStatus } from '@/lib/customer-intake/service';
import {
  applyStripeAlertStatusMarker,
  claimStripeOperatorAlertForRecovery,
  extractStripeAlertStatusFromSummary,
  getOperatorAlertLedgerEntry,
  notifyOperatorsOfBusinessPulsePurchase,
} from '@/lib/notifications/operator-alerts';

export const dynamic = 'force-dynamic';

const STRIPE_WEBHOOK_ACTOR = 'stripe-webhook@baratrust.com';

interface SubscriptionLogState {
  alreadyProcessedEvent: boolean;
  alreadyProcessedSession: boolean;
  latestSubscriptionEventTs: number | null;
  canceledAtLatestTs: boolean;
  checkoutLogRowId: string | null;
  checkoutLogSummary: string | null;
  checkoutAlertStatus: DurableOperatorAlertStatus | null;
}

async function getSubscriptionLogState(params: {
  eventId?: string | null;
  subscriptionId?: string | null;
  sessionId?: string | null;
}): Promise<SubscriptionLogState> {
  const cleanEventId =
    typeof params.eventId === 'string' && params.eventId.trim()
      ? params.eventId.trim()
      : null;
  const subscriptionId = params.subscriptionId || null;
  const sessionId = params.sessionId || null;

  const predicates = [];
  if (cleanEventId) {
    predicates.push(sql`${acquisitionContactLogs.summary} like ${`%[event:${cleanEventId}]%`}`);
  }
  if (sessionId) {
    predicates.push(sql`${acquisitionContactLogs.summary} like ${`%[session:${sessionId}]%`}`);
  }
  if (subscriptionId) {
    predicates.push(
      sql`${acquisitionContactLogs.summary} like ${`%[subscription:${subscriptionId}]%`}`
    );
  }

  if (predicates.length === 0) {
    return {
      alreadyProcessedEvent: false,
      alreadyProcessedSession: false,
      latestSubscriptionEventTs: null,
      canceledAtLatestTs: false,
      checkoutLogRowId: null,
      checkoutLogSummary: null,
      checkoutAlertStatus: null,
    };
  }

  const rows = await db
    .select({
      id: acquisitionContactLogs.id,
      actionType: acquisitionContactLogs.actionType,
      summary: acquisitionContactLogs.summary,
    })
    .from(acquisitionContactLogs)
    .where(
      and(
        eq(acquisitionContactLogs.actorEmail, STRIPE_WEBHOOK_ACTOR),
        predicates.length === 1 ? predicates[0] : or(...predicates)
      )
    );

  let alreadyProcessedEvent = false;
  let alreadyProcessedSession = false;
  let latestSubscriptionEventTs: number | null = null;
  let canceledAtLatestTs = false;
  let checkoutLogRowId: string | null = null;
  let checkoutLogSummary: string | null = null;
  let checkoutAlertStatus: DurableOperatorAlertStatus | null = null;

  const eventToken = cleanEventId ? `[event:${cleanEventId}]` : null;
  const sessionToken = sessionId ? `[session:${sessionId}]` : null;
  const subToken = subscriptionId ? `[subscription:${subscriptionId}]` : null;

  for (const row of rows) {
    const summary = row.summary || '';
    if (eventToken && summary.includes(eventToken)) {
      alreadyProcessedEvent = true;
    }
    if (sessionToken && summary.includes(sessionToken)) {
      alreadyProcessedSession = true;
    }
    if (
      row.actionType === 'STRIPE_CHECKOUT_COMPLETED' &&
      ((sessionToken && summary.includes(sessionToken)) ||
        (eventToken && summary.includes(eventToken)))
    ) {
      checkoutLogRowId = row.id;
      checkoutLogSummary = summary;
      checkoutAlertStatus = extractStripeAlertStatusFromSummary(summary);
    }
    if (subToken && summary.includes(subToken)) {
      const tsMatch = /\[event_ts:(\d+)\]/.exec(summary);
      if (tsMatch) {
        const parsedTs = Number.parseInt(tsMatch[1], 10);
        if (Number.isFinite(parsedTs)) {
          if (latestSubscriptionEventTs === null || parsedTs > latestSubscriptionEventTs) {
            latestSubscriptionEventTs = parsedTs;
            canceledAtLatestTs = row.actionType === 'STRIPE_SUBSCRIPTION_CANCELED';
          } else if (
            parsedTs === latestSubscriptionEventTs &&
            row.actionType === 'STRIPE_SUBSCRIPTION_CANCELED'
          ) {
            canceledAtLatestTs = true;
          }
        }
      }
    }
  }

  return {
    alreadyProcessedEvent,
    alreadyProcessedSession,
    latestSubscriptionEventTs,
    canceledAtLatestTs,
    checkoutLogRowId,
    checkoutLogSummary,
    checkoutAlertStatus,
  };
}

function appendStripeMarkersToNotes(
  existingNotes: string | null | undefined,
  customerId: string | null,
  subscriptionId: string | null
): string {
  const base =
    existingNotes && existingNotes.trim()
      ? existingNotes.trim()
      : 'Paid Business Pulse ($99/mo) subscription via Stripe Payment Link. Human onboarding follow-up required.';

  const parts = [base];
  if (customerId && !base.includes(`[stripe_customer:${customerId}]`)) {
    parts.push(`[stripe_customer:${customerId}]`);
  }
  if (subscriptionId && !base.includes(`[stripe_subscription:${subscriptionId}]`)) {
    parts.push(`[stripe_subscription:${subscriptionId}]`);
  }
  return parts.join(' ');
}

async function findMatchingProspect(params: {
  subscriptionId?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
}) {
  const { subscriptionId, customerId, customerEmail } = params;

  if (subscriptionId) {
    const subMarker = `%[stripe_subscription:${subscriptionId}]%`;
    const [foundBySub] = await db
      .select({
        id: acquisitionProspects.id,
        businessName: acquisitionProspects.businessName,
        stage: acquisitionProspects.stage,
        researchNotes: acquisitionProspects.researchNotes,
        nextFollowUpAt: acquisitionProspects.nextFollowUpAt,
        conversationStartedAt: acquisitionProspects.conversationStartedAt,
        convertedToPulseAt: acquisitionProspects.convertedToPulseAt,
      })
      .from(acquisitionProspects)
      .where(sql`${acquisitionProspects.researchNotes} like ${subMarker}`)
      .limit(1);
    if (foundBySub) return foundBySub;
  }

  if (customerId) {
    const customerMarker = `%[stripe_customer:${customerId}]%`;
    const [foundByCustomer] = await db
      .select({
        id: acquisitionProspects.id,
        businessName: acquisitionProspects.businessName,
        stage: acquisitionProspects.stage,
        researchNotes: acquisitionProspects.researchNotes,
        nextFollowUpAt: acquisitionProspects.nextFollowUpAt,
        conversationStartedAt: acquisitionProspects.conversationStartedAt,
        convertedToPulseAt: acquisitionProspects.convertedToPulseAt,
      })
      .from(acquisitionProspects)
      .where(sql`${acquisitionProspects.researchNotes} like ${customerMarker}`)
      .limit(1);
    if (foundByCustomer) return foundByCustomer;
  }

  if (customerEmail) {
    const normalizedEmail = customerEmail.trim().toLowerCase();
    const [foundByEmail] = await db
      .select({
        id: acquisitionProspects.id,
        businessName: acquisitionProspects.businessName,
        stage: acquisitionProspects.stage,
        researchNotes: acquisitionProspects.researchNotes,
        nextFollowUpAt: acquisitionProspects.nextFollowUpAt,
        conversationStartedAt: acquisitionProspects.conversationStartedAt,
        convertedToPulseAt: acquisitionProspects.convertedToPulseAt,
      })
      .from(acquisitionProspects)
      .where(sql`lower(${acquisitionProspects.contactValue}) = ${normalizedEmail}`)
      .limit(1);
    if (foundByEmail) return foundByEmail;
  }

  return undefined;
}

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

  const eventCreatedSec =
    typeof event.created === 'number' && Number.isFinite(event.created)
      ? Math.floor(event.created)
      : null;

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

      if (customerEmail || customerId || subscriptionId) {
        try {
          await ensureAcquisitionSchema();

          const logState = await getSubscriptionLogState({
            eventId: event.id,
            subscriptionId,
            sessionId: session.id,
          });

          if (logState.alreadyProcessedEvent || logState.alreadyProcessedSession) {
            const warmAlert = session.id
              ? getOperatorAlertLedgerEntry(`stripe_pulse_checkout:${session.id}`)
              : undefined;
            const effectiveAlertStatus =
              logState.checkoutAlertStatus ?? warmAlert?.status ?? null;

            if (session.id && effectiveAlertStatus === 'FAILED_RETRYABLE') {
              try {
                let mayDispatch = true;
                if (logState.checkoutLogRowId && logState.checkoutAlertStatus === 'FAILED_RETRYABLE') {
                  const claim = await claimStripeOperatorAlertForRecovery(
                    db,
                    logState.checkoutLogRowId
                  );
                  mayDispatch = claim === 'CLAIMED';
                }

                if (mayDispatch) {
                  const recoveredProspect = await findMatchingProspect({
                    subscriptionId,
                    customerId,
                    customerEmail,
                  });
                  if (recoveredProspect) {
                    const alertRes = await notifyOperatorsOfBusinessPulsePurchase(
                      {
                        sessionId: session.id,
                        prospectId: recoveredProspect.id,
                        businessName: recoveredProspect.businessName || customerName,
                        customerName,
                        customerEmail,
                        location: null,
                        subscriptionId,
                        recordedAtIso: new Date().toISOString(),
                      },
                      { isRetrySubmission: true, persistedStatus: 'FAILED_RETRYABLE' }
                    );
                    if (
                      logState.checkoutLogRowId &&
                      logState.checkoutLogSummary &&
                      (alertRes.status === 'SENT' ||
                        alertRes.status === 'FAILED_RETRYABLE' ||
                        alertRes.status === 'UNCERTAIN_DELIVERY_LOCKED')
                    ) {
                      await db
                        .update(acquisitionContactLogs)
                        .set({
                          summary: applyStripeAlertStatusMarker(
                            logState.checkoutLogSummary,
                            alertRes.status
                          ),
                        })
                        .where(eq(acquisitionContactLogs.id, logState.checkoutLogRowId));
                    }
                  }
                }
              } catch {
                // Non-blocking on duplicate webhook retry
              }
            }
            return NextResponse.json(
              { received: true, duplicate: true },
              { status: 200 }
            );
          }

          const isStaleForSubscription =
            eventCreatedSec !== null &&
            logState.latestSubscriptionEventTs !== null &&
            eventCreatedSec < logState.latestSubscriptionEventTs;

          const now = new Date();
          const matchedProspect = await findMatchingProspect({
            subscriptionId,
            customerId,
            customerEmail,
          });

          const derivedBusinessName =
            customFieldBiz ||
            matchedProspect?.businessName ||
            (customerName !== 'Business Pulse Member'
              ? `${customerName} Business`
              : customerEmail || 'Business Pulse Member');

          // 1. Idempotently upsert confirmed BaraTrust Business Pulse record in `businesses`
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
                tier: isStaleForSubscription
                  ? existingBiz.tier || 'Business Pulse'
                  : 'Business Pulse',
                isActive: isStaleForSubscription
                  ? Boolean(existingBiz.isActive)
                  : true,
                ownerEmail: customerEmail || existingBiz.ownerEmail,
                stripeCustomerId: customerId || existingBiz.stripeCustomerId,
                stripeSubscriptionId: subscriptionId || existingBiz.stripeSubscriptionId,
                updatedAt: now,
              })
              .where(eq(businesses.id, existingBiz.id));
          } else {
            const syntheticClerkId = `stripe_${customerId || subscriptionId || session.id}`;

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

          // 2. Create or promote onboarding record in `acquisition_prospects` (human follow-up preserved, zero outbound marketing)
          let targetProspectId: string;
          const updatedNotes = appendStripeMarkersToNotes(
            matchedProspect?.researchNotes,
            customerId,
            subscriptionId
          );

          if (matchedProspect) {
            targetProspectId = matchedProspect.id;
            await db
              .update(acquisitionProspects)
              .set({
                stage: 'CUSTOMER_ACQUIRED',
                researchNotes: updatedNotes,
                nextFollowUpAt: matchedProspect.nextFollowUpAt || now,
                conversationStartedAt: matchedProspect.conversationStartedAt || now,
                convertedToPulseAt: matchedProspect.convertedToPulseAt || now,
                updatedAt: now,
              })
              .where(eq(acquisitionProspects.id, matchedProspect.id));
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
                researchNotes: updatedNotes,
                decisionMakerName:
                  customerName !== 'Business Pulse Member' ? customerName : null,
                decisionMakerSource: 'Stripe Checkout',
                contactMethod: customerEmail ? 'EMAIL' : 'NONE',
                contactValue: customerEmail,
                permissionStatus: 'INBOUND_REQUEST',
                draftStatus: 'NONE',
                assessmentStatus: 'NONE',
                nextFollowUpAt: now,
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

          // 3. Record idempotent audit log entry
          const markers = [
            event.id ? `[event:${event.id}]` : null,
            session.id ? `[session:${session.id}]` : null,
            subscriptionId ? `[subscription:${subscriptionId}]` : null,
            eventCreatedSec !== null ? `[event_ts:${eventCreatedSec}]` : null,
          ]
            .filter(Boolean)
            .join(' ');

          const baseSummary = `Business Pulse ($99/mo) Stripe checkout completed — queued for human onboarding ${markers}.`;
          const [insertedLog] = await db
            .insert(acquisitionContactLogs)
            .values({
              prospectId: targetProspectId,
              actorEmail: STRIPE_WEBHOOK_ACTOR,
              channel: 'SYSTEM',
              direction: 'INBOUND',
              actionType: 'STRIPE_CHECKOUT_COMPLETED',
              summary: baseSummary,
            })
            .returning({ id: acquisitionContactLogs.id });

          // 4. Non-blocking internal operator onboarding alert (durably persisted across cold starts; never invalidates recorded Stripe payment)
          if (session.id) {
            try {
              const city = session.customer_details?.address?.city?.trim();
              const state = session.customer_details?.address?.state?.trim();
              const alertLocation =
                city && state ? `${city}, ${state}` : city || state || null;

              const alertRes = await notifyOperatorsOfBusinessPulsePurchase(
                {
                  sessionId: session.id,
                  prospectId: targetProspectId,
                  businessName: derivedBusinessName,
                  customerName,
                  customerEmail,
                  location: alertLocation,
                  subscriptionId,
                  recordedAtIso: now.toISOString(),
                },
                { isRetrySubmission: false, persistedStatus: null }
              );

              if (
                insertedLog?.id &&
                (alertRes.status === 'SENT' ||
                  alertRes.status === 'FAILED_RETRYABLE' ||
                  alertRes.status === 'UNCERTAIN_DELIVERY_LOCKED')
              ) {
                await db
                  .update(acquisitionContactLogs)
                  .set({
                    summary: applyStripeAlertStatusMarker(baseSummary, alertRes.status),
                  })
                  .where(eq(acquisitionContactLogs.id, insertedLog.id));
              }
            } catch {
              // Never fail recorded Stripe payment if alert tracking throws
            }
          }
        } catch (dbError) {
          console.error(
            'Database update failed in Stripe checkout webhook:',
            redactSensitiveMailError(dbError)
          );
          return NextResponse.json(
            { error: 'Database update failed.' },
            { status: 500 }
          );
        }
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const subId = subscription.id;
      if (!subId) {
        return NextResponse.json(
          { received: true, ignored: true, reason: 'missing_subscription_id' },
          { status: 200 }
        );
      }

      // Reject immediately if server-side subscription line items belong to a foreign Stripe product/price
      const itemOwnership = inspectBusinessPulseSubscriptionItems(subscription);
      if (itemOwnership === 'foreign_mismatch') {
        return NextResponse.json(
          { received: true, ignored: true, reason: 'foreign_subscription' },
          { status: 200 }
        );
      }

      try {
        await ensureAcquisitionSchema();

        // Require a previously confirmed BaraTrust Business Pulse record matching this exact subscription ID
        const [existingBiz] = await db
          .select()
          .from(businesses)
          .where(eq(businesses.stripeSubscriptionId, subId))
          .limit(1);

        if (!existingBiz) {
          if (
            subscription.status === 'incomplete' ||
            subscription.status === 'incomplete_expired'
          ) {
            return NextResponse.json(
              { received: true, ignored: true, reason: 'incomplete_unconfirmed_subscription' },
              { status: 200 }
            );
          }

          if (itemOwnership === 'verified_match') {
            // Out-of-order Business Pulse subscription event arrived before checkout.session.completed committed
            return NextResponse.json(
              {
                error: 'Business Pulse checkout confirmation pending; retry later.',
                retryable: true,
              },
              { status: 409 }
            );
          }

          return NextResponse.json(
            { received: true, ignored: true, reason: 'unconfirmed_or_foreign_subscription' },
            { status: 200 }
          );
        }

        const logState = await getSubscriptionLogState({
          eventId: event.id,
          subscriptionId: subId,
        });

        if (logState.alreadyProcessedEvent) {
          return NextResponse.json(
            { received: true, duplicate: true },
            { status: 200 }
          );
        }

        const isDeletedEvent = event.type === 'customer.subscription.deleted';
        const isIncomingCancel = isDeletedEvent || subscription.status === 'canceled';

        if (
          eventCreatedSec !== null &&
          logState.latestSubscriptionEventTs !== null &&
          (eventCreatedSec < logState.latestSubscriptionEventTs ||
            (eventCreatedSec === logState.latestSubscriptionEventTs &&
              logState.canceledAtLatestTs &&
              !isIncomingCancel))
        ) {
          return NextResponse.json(
            { received: true, ignored: true, reason: 'stale_out_of_order_event' },
            { status: 200 }
          );
        }
        let nextTier = existingBiz.tier || 'Business Pulse';
        let nextIsActive = Boolean(existingBiz.isActive);
        let actionType = 'STRIPE_SUBSCRIPTION_UPDATED';
        let statusDescription = `Business Pulse subscription status noted (${subscription.status})`;

        if (isDeletedEvent || subscription.status === 'canceled') {
          nextTier = 'Canceled';
          nextIsActive = false;
          actionType = 'STRIPE_SUBSCRIPTION_CANCELED';
          statusDescription = 'Business Pulse subscription canceled';
        } else if (
          subscription.status === 'unpaid' ||
          subscription.status === 'incomplete_expired'
        ) {
          nextTier = 'Past Due / Unpaid';
          nextIsActive = false;
          actionType = 'STRIPE_SUBSCRIPTION_UNPAID';
          statusDescription = 'Business Pulse subscription marked unpaid';
        } else if (
          subscription.status === 'active' ||
          subscription.status === 'trialing'
        ) {
          const wasInactive =
            existingBiz.isActive === false || existingBiz.tier !== 'Business Pulse';
          nextTier = 'Business Pulse';
          nextIsActive = true;
          actionType = wasInactive
            ? 'STRIPE_SUBSCRIPTION_REACTIVATED'
            : 'STRIPE_SUBSCRIPTION_RENEWED';
          statusDescription = wasInactive
            ? 'Business Pulse subscription reactivated'
            : 'Business Pulse subscription active / renewed';
        }

        const now = new Date();
        await db
          .update(businesses)
          .set({
            tier: nextTier,
            isActive: nextIsActive,
            updatedAt: now,
          })
          .where(eq(businesses.id, existingBiz.id));

        const subCustomerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id || existingBiz.stripeCustomerId || null;

        const matchedProspect = await findMatchingProspect({
          subscriptionId: subId,
          customerId: subCustomerId,
          customerEmail: existingBiz.ownerEmail,
        });

        if (matchedProspect) {
          const markers = [
            event.id ? `[event:${event.id}]` : null,
            `[subscription:${subId}]`,
            eventCreatedSec !== null ? `[event_ts:${eventCreatedSec}]` : null,
          ]
            .filter(Boolean)
            .join(' ');

          await db.insert(acquisitionContactLogs).values({
            prospectId: matchedProspect.id,
            actorEmail: STRIPE_WEBHOOK_ACTOR,
            channel: 'SYSTEM',
            direction: 'INBOUND',
            actionType,
            summary: `${statusDescription} ${markers}.`,
          });
        }
      } catch (subError) {
        console.error(
          'Database update failed on subscription lifecycle webhook:',
          redactSensitiveMailError(subError)
        );
        return NextResponse.json(
          { error: 'Database update failed.' },
          { status: 500 }
        );
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
