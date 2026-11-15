import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import * as schema from '../src/db/schema';
import {
  sanitizeConfiguredSecret,
  verifyWebhookBearerSecret,
} from '../src/lib/auth/operator';
import {
  DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
  DEFAULT_BUSINESS_PULSE_PRICE_ID,
  DEFAULT_BUSINESS_PULSE_PRODUCT_ID,
  inspectBusinessPulseSubscriptionItems,
  isBaraTrustBusinessPulseCheckout,
  sanitizeStripeEnvValue,
} from '../src/lib/stripe/client';
import nextConfig from '../next.config.mjs';
import { createAcquisitionTestHarness } from './helpers/acquisition-harness';

type AtlasGatewayRoute = typeof import('../src/app/api/atlas-gateway/route');
type LegacyStripeCheckoutRoute = typeof import('../src/app/api/webhooks/stripe/checkout/route');
type LeadsRoute = typeof import('../src/app/api/leads/route');
type LeadsDiscoverRoute = typeof import('../src/app/api/leads/discover/route');
type AgentDemoRoute = typeof import('../src/app/api/agent-demo/route');
type AgentsRoute = typeof import('../src/app/api/agents/route');
type GenerateReportRoute = typeof import('../src/app/api/generate-report/route');
type ChatClearRoute = typeof import('../src/app/api/chat/clear/route');
type WalletsRefuelRoute = typeof import('../src/app/api/wallets/refuel/route');
type OutreachTriggerRoute = typeof import('../src/app/api/outreach/trigger/route');
type ShieldProofRoute = typeof import('../src/app/api/shield/proof/route');
type EngageRoute = typeof import('../src/app/api/engage/route');
type ColeRoute = typeof import('../src/app/api/agents/cole/route');
type WebhooksLeadsRoute = typeof import('../src/app/api/webhooks/leads/route');
type CapitalFundingRoute = typeof import('../src/app/api/internal/capital/funding-sources/route');
type SelfProspectingListRoute = typeof import('../src/app/api/internal/self-prospecting/prospects/route');
type StripeWebhookRoute = typeof import('../src/app/api/webhooks/stripe/route');

test('F-01 — Retired Unused Legacy Prototype Endpoints Return 410 Gone', async () => {
  const harness = await createAcquisitionTestHarness();
  try {
    const atlasGateway = harness.loadRoute<AtlasGatewayRoute>('src/app/api/atlas-gateway/route.ts');
    const legacyCheckout = harness.loadRoute<LegacyStripeCheckoutRoute>(
      'src/app/api/webhooks/stripe/checkout/route.ts'
    );

    const atlasPost = await atlasGateway.POST();
    assert.equal(atlasPost.status, 410);
    const atlasBody = await atlasPost.json();
    assert.match(atlasBody.error, /retired/i);

    const checkoutPost = await legacyCheckout.POST();
    assert.equal(checkoutPost.status, 410);
    const checkoutBody = await checkoutPost.json();
    assert.match(checkoutBody.error, /retired/i);
  } finally {
    harness.close();
  }
});

test('F-01 — Internal Legacy & Operator Routes Enforce Unauthenticated (401) and Non-Operator (403) Rejection', async () => {
  const prevWebhookSecret = process.env.WEBHOOK_SECRET_KEY;
  process.env.WEBHOOK_SECRET_KEY = 'whk_test_valid_internal_secret_2026_baratrust';
  const harness = await createAcquisitionTestHarness();

  try {
    const leadsRoute = harness.loadRoute<LeadsRoute>('src/app/api/leads/route.ts');
    const leadsDiscoverRoute = harness.loadRoute<LeadsDiscoverRoute>(
      'src/app/api/leads/discover/route.ts'
    );
    const agentDemoRoute = harness.loadRoute<AgentDemoRoute>('src/app/api/agent-demo/route.ts');
    const agentsRoute = harness.loadRoute<AgentsRoute>('src/app/api/agents/route.ts');
    const generateReportRoute = harness.loadRoute<GenerateReportRoute>(
      'src/app/api/generate-report/route.ts'
    );
    const chatClearRoute = harness.loadRoute<ChatClearRoute>('src/app/api/chat/clear/route.ts');
    const walletsRefuelRoute = harness.loadRoute<WalletsRefuelRoute>(
      'src/app/api/wallets/refuel/route.ts'
    );
    const outreachTriggerRoute = harness.loadRoute<OutreachTriggerRoute>(
      'src/app/api/outreach/trigger/route.ts'
    );
    const shieldProofRoute = harness.loadRoute<ShieldProofRoute>(
      'src/app/api/shield/proof/route.ts'
    );
    const engageRoute = harness.loadRoute<EngageRoute>('src/app/api/engage/route.ts');
    const coleRoute = harness.loadRoute<ColeRoute>('src/app/api/agents/cole/route.ts');
    const webhooksLeadsRoute = harness.loadRoute<WebhooksLeadsRoute>(
      'src/app/api/webhooks/leads/route.ts'
    );
    const capitalFundingRoute = harness.loadRoute<CapitalFundingRoute>(
      'src/app/api/internal/capital/funding-sources/route.ts'
    );
    const selfProspectingListRoute = harness.loadRoute<SelfProspectingListRoute>(
      'src/app/api/internal/self-prospecting/prospects/route.ts'
    );

    const makeJsonReq = (url: string, method: string, body: unknown, headers?: Record<string, string>) =>
      new Request(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(headers || {}) },
        body: JSON.stringify(body),
      });

    // 1. Unauthenticated caller -> 401 across all internal/operator routes
    harness.setClerkUser(null);

    assert.equal((await leadsRoute.GET()).status, 401);
    assert.equal(
      (
        await leadsRoute.POST(
          makeJsonReq('https://baratrust.test/api/leads', 'POST', {
            source: 'reddit',
            originalPost: 'Need HVAC repair',
          })
        )
      ).status,
      401
    );
    assert.equal(
      (
        await leadsDiscoverRoute.POST(
          makeJsonReq('https://baratrust.test/api/leads/discover', 'POST', {
            leads: [{ googlePlaceId: 'place_1', businessName: 'Test HVAC', website: null }],
          })
        )
      ).status,
      401
    );
    assert.equal(
      (
        await agentDemoRoute.POST(
          makeJsonReq('https://baratrust.test/api/agent-demo', 'POST', {
            agent: 'brix',
            input: 'Estimate AC replacement',
          })
        )
      ).status,
      401
    );
    assert.equal((await agentsRoute.GET()).status, 401);
    assert.equal(
      (
        await generateReportRoute.POST(
          makeJsonReq('https://baratrust.test/api/generate-report', 'POST', {
            clientName: 'Test Client',
          })
        )
      ).status,
      401
    );
    assert.equal(
      (
        await chatClearRoute.DELETE(
          makeJsonReq('https://baratrust.test/api/chat/clear', 'DELETE', {
            projectId: '00000000-0000-0000-0000-000000000001',
          })
        )
      ).status,
      401
    );
    assert.equal(
      (
        await walletsRefuelRoute.POST(
          makeJsonReq('https://baratrust.test/api/wallets/refuel', 'POST', {
            amountCents: 5000,
          })
        )
      ).status,
      401
    );
    assert.equal(
      (
        await outreachTriggerRoute.POST(
          makeJsonReq('https://baratrust.test/api/outreach/trigger', 'POST', {
            leadId: 1,
            businessName: 'Test Biz',
            phoneNumber: '5025550100',
          })
        )
      ).status,
      401
    );
    assert.equal(
      (
        await shieldProofRoute.POST(
          makeJsonReq('https://baratrust.test/api/shield/proof', 'POST', {
            projectId: 1,
            lat: '38.25',
            lng: '-85.75',
            photoUrl: 'https://example.com/photo.jpg',
          })
        )
      ).status,
      401
    );
    assert.equal(
      (
        await engageRoute.POST(
          makeJsonReq('https://baratrust.test/api/engage', 'POST', {
            leadId: 1,
            title: 'HVAC',
            region: 'Louisville, KY',
          })
        )
      ).status,
      401
    );
    assert.equal(
      (
        await coleRoute.POST(
          makeJsonReq('https://baratrust.test/api/agents/cole', 'POST', {
            leadId: 1,
            projectId: '00000000-0000-0000-0000-000000000001',
          })
        )
      ).status,
      401
    );
    assert.equal(
      (
        await webhooksLeadsRoute.POST(
          makeJsonReq(
            'https://baratrust.test/api/webhooks/leads',
            'POST',
            {
              tradeSector: 'HVAC',
              prospectContact: 'test@example.com',
              geographicMetadata: 'Louisville, KY',
            },
            { Authorization: 'Bearer wrong_secret' }
          )
        )
      ).status,
      401
    );
    assert.equal(
      (
        await capitalFundingRoute.POST(
          makeJsonReq('https://baratrust.test/api/internal/capital/funding-sources', 'POST', {
            businessName: 'Test Biz',
          })
        )
      ).status,
      401
    );
    assert.equal(
      (await selfProspectingListRoute.GET(new Request('https://baratrust.test/api/internal/self-prospecting/prospects')))
        .status,
      401
    );

    // 2. Non-operator Clerk self-signup user -> 403 Forbidden across all internal/operator routes
    harness.setClerkUser({
      id: 'user_self_signup_outsider',
      primaryEmailAddress: {
        emailAddress: 'outsider@example.org',
        verification: { status: 'verified' },
      },
    });

    assert.equal((await leadsRoute.GET()).status, 403);
    assert.equal(
      (
        await agentDemoRoute.POST(
          makeJsonReq('https://baratrust.test/api/agent-demo', 'POST', {
            agent: 'brix',
            input: 'Estimate AC replacement',
          })
        )
      ).status,
      403
    );
    assert.equal((await agentsRoute.GET()).status, 403);
    assert.equal(
      (
        await generateReportRoute.POST(
          makeJsonReq('https://baratrust.test/api/generate-report', 'POST', {
            clientName: 'Test Client',
          })
        )
      ).status,
      403
    );
    assert.equal(
      (
        await chatClearRoute.DELETE(
          makeJsonReq('https://baratrust.test/api/chat/clear', 'DELETE', {
            projectId: '00000000-0000-0000-0000-000000000001',
          })
        )
      ).status,
      403
    );
    assert.equal(
      (
        await walletsRefuelRoute.POST(
          makeJsonReq('https://baratrust.test/api/wallets/refuel', 'POST', {
            amountCents: 5000,
          })
        )
      ).status,
      403
    );
    assert.equal(
      (
        await engageRoute.POST(
          makeJsonReq('https://baratrust.test/api/engage', 'POST', {
            leadId: 1,
            title: 'HVAC',
            region: 'Louisville, KY',
          })
        )
      ).status,
      403
    );
    assert.equal(
      (
        await capitalFundingRoute.POST(
          makeJsonReq('https://baratrust.test/api/internal/capital/funding-sources', 'POST', {
            businessName: 'Test Biz',
          })
        )
      ).status,
      403
    );
    assert.equal(
      (await selfProspectingListRoute.GET(new Request('https://baratrust.test/api/internal/self-prospecting/prospects')))
        .status,
      403
    );

    // 3. Verified operator (Todd) & valid Bearer webhook secret succeed on authorized operations
    harness.setClerkUser({
      id: 'user_todd_verified',
      primaryEmailAddress: {
        emailAddress: 'todd@baratrust.com',
        verification: { status: 'verified' },
      },
    });

    const opAgentsRes = await agentsRoute.GET();
    assert.equal(opAgentsRes.status, 200);
    const opAgentsData = await opAgentsRes.json();
    assert.ok(Array.isArray(opAgentsData.agents));
    assert.ok(opAgentsData.agents.length > 0);

    // Valid Bearer webhook secret allows authenticated lead ingestion even without a browser Clerk session
    harness.setClerkUser(null);
    const authedLeadIngest = await leadsRoute.POST(
      makeJsonReq(
        'https://baratrust.test/api/leads',
        'POST',
        {
          source: 'https://example.com/post-1',
          originalPost: 'Looking for commercial HVAC inspection in New Albany.',
          draftMessage: 'Happy to help inspect your system.',
        },
        { Authorization: 'Bearer whk_test_valid_internal_secret_2026_baratrust' }
      )
    );
    assert.equal(authedLeadIngest.status, 201);

    // Re-authenticate as verified operator and confirm lead was persisted
    harness.setClerkUser({
      id: 'user_todd_verified',
      primaryEmailAddress: {
        emailAddress: 'todd@baratrust.com',
        verification: { status: 'verified' },
      },
    });
    const opLeadsRes = await leadsRoute.GET();
    assert.equal(opLeadsRes.status, 200);
    const opLeadsJson = await opLeadsRes.json();
    assert.equal(opLeadsJson.data.length, 1);
    assert.equal(opLeadsJson.data[0].source, 'https://example.com/post-1');
  } finally {
    if (prevWebhookSecret === undefined) delete process.env.WEBHOOK_SECRET_KEY;
    else process.env.WEBHOOK_SECRET_KEY = prevWebhookSecret;
    harness.close();
  }
});

test('F-02 — Synthetic Signed Stripe Webhook Verification, Shared-Account Scoping, Onboarding & Retry Idempotency', async () => {
  const prevStripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const prevPulseLinkId = process.env.STRIPE_BUSINESS_PULSE_PAYMENT_LINK_ID;

  const signingSecret = 'whsec_synthetic_unit_test_secret_baratrust_2026';
  // Deliberately include escaped trailing \n to verify newline sanitization works end-to-end
  process.env.STRIPE_WEBHOOK_SECRET = `${signingSecret}\\n`;
  delete process.env.STRIPE_BUSINESS_PULSE_PAYMENT_LINK_ID;

  const stripeHelper = new Stripe('sk_test_synthetic_event_signer', {
    apiVersion: '2026-04-22.dahlia',
  });

  const signPayload = (eventObj: Record<string, unknown>) => {
    const payload = JSON.stringify(eventObj);
    const signature = stripeHelper.webhooks.generateTestHeaderString({
      payload,
      secret: signingSecret,
    });
    return { payload, signature };
  };

  const harness = await createAcquisitionTestHarness();

  try {
    const stripeWebhook = harness.loadRoute<StripeWebhookRoute>(
      'src/app/api/webhooks/stripe/route.ts'
    );

    // 1. Missing signature -> 400 generic error
    const missingSigRes = await stripeWebhook.POST(
      new Request('https://baratrust.test/api/webhooks/stripe', {
        method: 'POST',
        body: '{}',
      })
    );
    assert.equal(missingSigRes.status, 400);
    const missingSigBody = await missingSigRes.json();
    assert.equal(missingSigBody.error, 'Missing stripe-signature header.');

    // 2. Forged signature -> 400 generic error without leaking internal constructEvent details
    const forgedRes = await stripeWebhook.POST(
      new Request('https://baratrust.test/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1700000000,v1=deadbeef0000000000000000' },
        body: JSON.stringify({ id: 'evt_forged', type: 'checkout.session.completed' }),
      })
    );
    assert.equal(forgedRes.status, 400);
    const forgedBody = await forgedRes.json();
    assert.equal(forgedBody.error, 'Invalid webhook signature.');

    // 3. Shared Stripe Account Protection: Signed checkout from a DIFFERENT app/payment link is ignored
    const otherAppCheckout = signPayload({
      id: 'evt_other_app_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_live_other_app_999',
          object: 'checkout.session',
          payment_link: 'plink_OTHER_SHARED_ACCOUNT_PRODUCT',
          payment_status: 'paid',
          customer: 'cus_other_app_123',
          subscription: 'sub_other_app_123',
          customer_details: {
            email: 'buyer@otherproduct.example',
            name: 'Other App Buyer',
          },
        },
      },
    });
    const otherAppRes = await stripeWebhook.POST(
      new Request('https://baratrust.test/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': otherAppCheckout.signature },
        body: otherAppCheckout.payload,
      })
    );
    assert.equal(otherAppRes.status, 200);
    const otherAppJson = await otherAppRes.json();
    assert.equal(otherAppJson.ignored, true);
    assert.equal(otherAppJson.reason, 'non_business_pulse_checkout');
    assert.equal(harness.rawQuery('SELECT * FROM "businesses"').length, 0);
    assert.equal(harness.rawQuery('SELECT * FROM "acquisition_prospects"').length, 0);

    // 4. Brand-new Business Pulse ($99/mo) customer via active Payment Link -> records business + queues onboarding + logs event
    const newPulseCustomerEvent = {
      id: 'evt_pulse_new_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_live_pulse_new_001',
          object: 'checkout.session',
          payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
          payment_status: 'paid',
          customer: 'cus_pulse_new_001',
          subscription: 'sub_pulse_new_001',
          customer_details: {
            email: 'Owner@RiverCityPlumbing.example',
            name: 'Dana Mercer',
            address: {
              city: 'New Albany',
              state: 'IN',
            },
          },
        },
      },
    };
    const signedNewPulse = signPayload(newPulseCustomerEvent);
    const pulseRes1 = await stripeWebhook.POST(
      new Request('https://baratrust.test/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': signedNewPulse.signature },
        body: signedNewPulse.payload,
      })
    );
    assert.equal(pulseRes1.status, 200);

    const bizRowsAfterFirst = harness.rawQuery('SELECT * FROM "businesses"');
    assert.equal(bizRowsAfterFirst.length, 1);
    assert.equal(bizRowsAfterFirst[0].owner_email, 'owner@rivercityplumbing.example');
    assert.equal(bizRowsAfterFirst[0].tier, 'Business Pulse');
    assert.equal(bizRowsAfterFirst[0].is_active, 1);
    assert.equal(bizRowsAfterFirst[0].stripe_subscription_id, 'sub_pulse_new_001');

    const prospectRowsAfterFirst = harness.rawQuery('SELECT * FROM "acquisition_prospects"');
    assert.equal(prospectRowsAfterFirst.length, 1);
    assert.equal(prospectRowsAfterFirst[0].stage, 'CUSTOMER_ACQUIRED');
    assert.equal(prospectRowsAfterFirst[0].permission_status, 'INBOUND_REQUEST');
    assert.equal(prospectRowsAfterFirst[0].contact_value, 'owner@rivercityplumbing.example');
    assert.equal(prospectRowsAfterFirst[0].location, 'New Albany, IN');

    const logRowsAfterFirst = harness.rawQuery('SELECT * FROM "acquisition_contact_logs"');
    assert.equal(logRowsAfterFirst.length, 1);
    assert.equal(logRowsAfterFirst[0].action_type, 'STRIPE_CHECKOUT_COMPLETED');

    // 5. Webhook Retry / Duplicate Delivery Idempotency -> replaying the same checkout session creates zero duplicates
    const signedReplay = signPayload({
      ...newPulseCustomerEvent,
      id: 'evt_pulse_new_1_retry',
    });
    const pulseReplayRes = await stripeWebhook.POST(
      new Request('https://baratrust.test/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': signedReplay.signature },
        body: signedReplay.payload,
      })
    );
    assert.equal(pulseReplayRes.status, 200);
    assert.equal(harness.rawQuery('SELECT * FROM "businesses"').length, 1);
    assert.equal(harness.rawQuery('SELECT * FROM "acquisition_prospects"').length, 1);
    assert.equal(harness.rawQuery('SELECT * FROM "acquisition_contact_logs"').length, 1);

    // 6. Existing RESEARCHED prospect converting via Business Pulse -> promoted in place without duplicate prospect
    await harness.db.insert(schema.acquisitionProspects).values({
      businessName: 'Kentuckiana Comfort HVAC',
      location: 'Jeffersonville, IN',
      industry: 'HVAC',
      contactMethod: 'EMAIL',
      contactValue: 'service@kentuckianacomfort.example',
      permissionStatus: 'PUBLIC_BUSINESS_CONTACT',
      stage: 'RESEARCHED',
    });

    const existingProspectCheckout = signPayload({
      id: 'evt_pulse_existing_prospect',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_live_pulse_existing_002',
          object: 'checkout.session',
          payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
          payment_status: 'paid',
          customer: 'cus_pulse_existing_002',
          subscription: 'sub_pulse_existing_002',
          customer_details: {
            email: 'SERVICE@kentuckianacomfort.example',
            name: 'Sam Carter',
          },
        },
      },
    });
    const existingRes = await stripeWebhook.POST(
      new Request('https://baratrust.test/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': existingProspectCheckout.signature },
        body: existingProspectCheckout.payload,
      })
    );
    assert.equal(existingRes.status, 200);
    const allProspects = harness.rawQuery('SELECT * FROM "acquisition_prospects" ORDER BY "business_name" ASC');
    assert.equal(allProspects.length, 2);
    const promoted = allProspects.find((p) => p.business_name === 'Kentuckiana Comfort HVAC');
    assert.ok(promoted);
    assert.equal(promoted.stage, 'CUSTOMER_ACQUIRED');
    assert.ok(promoted.converted_to_pulse_at);

    // 7. Subscription cancellation (`customer.subscription.deleted`) -> deactivates matching business cleanly
    const subDeleted = signPayload({
      id: 'evt_sub_deleted_001',
      object: 'event',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_pulse_new_001',
          object: 'subscription',
          status: 'canceled',
        },
      },
    });
    const subDeletedRes = await stripeWebhook.POST(
      new Request('https://baratrust.test/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': subDeleted.signature },
        body: subDeleted.payload,
      })
    );
    assert.equal(subDeletedRes.status, 200);
    const canceledBiz = harness.rawQuery(
      `SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_pulse_new_001'`
    );
    assert.equal(canceledBiz.length, 1);
    assert.equal(canceledBiz[0].tier, 'Canceled');
    assert.equal(canceledBiz[0].is_active, 0);

    // 8. Missing STRIPE_WEBHOOK_SECRET -> fails closed with 500
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const missingSecretRes = await stripeWebhook.POST(
      new Request('https://baratrust.test/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': signedNewPulse.signature },
        body: signedNewPulse.payload,
      })
    );
    assert.equal(missingSecretRes.status, 500);
  } finally {
    if (prevStripeWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevStripeWebhookSecret;
    if (prevPulseLinkId === undefined) delete process.env.STRIPE_BUSINESS_PULSE_PAYMENT_LINK_ID;
    else process.env.STRIPE_BUSINESS_PULSE_PAYMENT_LINK_ID = prevPulseLinkId;
    harness.close();
  }
});

test('Part 3 — Secret Sanitization & Global Security Response Headers Configuration', async () => {
  assert.equal(sanitizeStripeEnvValue('sk_live_abc123\\n'), 'sk_live_abc123');
  assert.equal(sanitizeStripeEnvValue('whsec_xyz789\\r\\n'), 'whsec_xyz789');
  assert.equal(sanitizeConfiguredSecret('  secret_value_1234567890\\n'), 'secret_value_1234567890');
  assert.equal(
    verifyWebhookBearerSecret('Bearer secret_value_1234567890', 'secret_value_1234567890\\n'),
    true
  );
  assert.equal(verifyWebhookBearerSecret('Bearer short', 'short'), false);

  assert.equal(nextConfig.poweredByHeader, false);
  const headersFn = nextConfig.headers;
  assert.equal(typeof headersFn, 'function');
  const rules = await headersFn!();
  assert.ok(Array.isArray(rules) && rules.length > 0);
  const rootRule = rules.find((r: { source: string }) => r.source === '/:path*');
  assert.ok(rootRule);

  const headerMap = new Map(
    rootRule.headers.map((h: { key: string; value: string }) => [h.key.toLowerCase(), h.value])
  );
  assert.equal(headerMap.get('x-content-type-options'), 'nosniff');
  assert.equal(headerMap.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(headerMap.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(headerMap.get('content-security-policy'), "frame-ancestors 'self'");
});

test('Stage 1 — Cross-Project Stripe Ownership Helpers Reject Spoofed Metadata & Foreign Shared-Account Items', () => {
  // Approved Business Pulse Payment Link in subscription mode -> accepted
  assert.equal(
    isBaraTrustBusinessPulseCheckout({
      id: 'cs_ok_1',
      mode: 'subscription',
      payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
    } as unknown as Stripe.Checkout.Session),
    true
  );

  // One-time payment mode -> rejected even if Payment Link string matched
  assert.equal(
    isBaraTrustBusinessPulseCheckout({
      id: 'cs_wrong_mode',
      mode: 'payment',
      payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
    } as unknown as Stripe.Checkout.Session),
    false
  );

  // Spoofed metadata with foreign Payment Link -> strictly rejected
  assert.equal(
    isBaraTrustBusinessPulseCheckout({
      id: 'cs_spoof_foreign_link',
      mode: 'subscription',
      payment_link: 'plink_OTHER_BUSINESS_ON_SHARED_STRIPE',
      metadata: { baratrust_product: 'business_pulse' },
    } as unknown as Stripe.Checkout.Session),
    false
  );

  // Spoofed metadata without Payment Link -> strictly rejected (metadata is never proof of ownership)
  assert.equal(
    isBaraTrustBusinessPulseCheckout({
      id: 'cs_spoof_no_link',
      mode: 'subscription',
      payment_link: null,
      metadata: { baratrust_product: 'business_pulse' },
    } as unknown as Stripe.Checkout.Session),
    false
  );

  // Server-populated line_items matching exact Business Pulse price + product (no conflicting Payment Link) -> accepted
  assert.equal(
    isBaraTrustBusinessPulseCheckout({
      id: 'cs_server_line_items_match',
      mode: 'subscription',
      payment_link: null,
      line_items: {
        data: [
          {
            price: {
              id: DEFAULT_BUSINESS_PULSE_PRICE_ID,
              product: DEFAULT_BUSINESS_PULSE_PRODUCT_ID,
            },
          },
        ],
      },
    } as unknown as Stripe.Checkout.Session),
    true
  );

  // Server-populated line_items with wrong price or wrong product -> rejected
  assert.equal(
    isBaraTrustBusinessPulseCheckout({
      id: 'cs_server_line_items_wrong_price',
      mode: 'subscription',
      payment_link: null,
      line_items: {
        data: [
          {
            price: {
              id: 'price_FOREIGN_SHARED_ACCOUNT_99',
              product: DEFAULT_BUSINESS_PULSE_PRODUCT_ID,
            },
          },
        ],
      },
    } as unknown as Stripe.Checkout.Session),
    false
  );

  // Subscription item ownership inspection
  assert.equal(
    inspectBusinessPulseSubscriptionItems({
      id: 'sub_verified',
      items: {
        data: [
          {
            price: {
              id: DEFAULT_BUSINESS_PULSE_PRICE_ID,
              product: DEFAULT_BUSINESS_PULSE_PRODUCT_ID,
            },
          },
        ],
      },
    } as unknown as Stripe.Subscription),
    'verified_match'
  );

  assert.equal(
    inspectBusinessPulseSubscriptionItems({
      id: 'sub_foreign',
      items: {
        data: [
          {
            price: {
              id: 'price_OTHER_SHARED_BUSINESS',
              product: 'prod_OTHER_SHARED_BUSINESS',
            },
          },
        ],
      },
    } as unknown as Stripe.Subscription),
    'foreign_mismatch'
  );

  assert.equal(
    inspectBusinessPulseSubscriptionItems({
      id: 'sub_no_items',
    } as unknown as Stripe.Subscription),
    'unknown_no_items'
  );
});

test('Stage 1 — Full 11-Scenario Subscription Lifecycle, Out-of-Order Ordering, Shared-Account Isolation & DB Outage Recovery', async () => {
  const prevStripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const prevPulseLinkId = process.env.STRIPE_BUSINESS_PULSE_PAYMENT_LINK_ID;
  const prevPulseProductId = process.env.STRIPE_BUSINESS_PULSE_PRODUCT_ID;
  const prevPulsePriceId = process.env.STRIPE_BUSINESS_PULSE_PRICE_ID;

  const signingSecret = 'whsec_stage1_lifecycle_verification_secret_2026';
  process.env.STRIPE_WEBHOOK_SECRET = signingSecret;
  delete process.env.STRIPE_BUSINESS_PULSE_PAYMENT_LINK_ID;
  delete process.env.STRIPE_BUSINESS_PULSE_PRODUCT_ID;
  delete process.env.STRIPE_BUSINESS_PULSE_PRICE_ID;

  const stripeSigner = new Stripe('sk_test_stage1_signer', {
    apiVersion: '2026-04-22.dahlia',
  });

  const pulseItems = {
    object: 'list',
    data: [
      {
        id: 'si_pulse_item_1',
        object: 'subscription_item',
        price: {
          id: DEFAULT_BUSINESS_PULSE_PRICE_ID,
          object: 'price',
          product: DEFAULT_BUSINESS_PULSE_PRODUCT_ID,
          unit_amount: 9900,
          currency: 'usd',
          type: 'recurring',
        },
      },
    ],
  };

  const foreignItems = {
    object: 'list',
    data: [
      {
        id: 'si_foreign_item_1',
        object: 'subscription_item',
        price: {
          id: 'price_SHARED_ACCOUNT_OTHER_PROJECT',
          object: 'price',
          product: 'prod_SHARED_ACCOUNT_OTHER_PROJECT',
          unit_amount: 4900,
          currency: 'usd',
          type: 'recurring',
        },
      },
    ],
  };

  const postSigned = async (
    route: StripeWebhookRoute,
    eventPayload: Record<string, unknown>
  ) => {
    const body = JSON.stringify(eventPayload);
    const signature = stripeSigner.webhooks.generateTestHeaderString({
      payload: body,
      secret: signingSecret,
    });
    return route.POST(
      new Request('https://baratrust.test/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': signature },
        body,
      })
    );
  };

  const harness = await createAcquisitionTestHarness();

  try {
    const stripeWebhook = harness.loadRoute<StripeWebhookRoute>(
      'src/app/api/webhooks/stripe/route.ts'
    );

    // -------------------------------------------------------------------------
    // SCENARIO 10: Webhook arrives with invalid or missing signature (+ unpaid session check)
    // -------------------------------------------------------------------------
    const invalidSigRes = await stripeWebhook.POST(
      new Request('https://baratrust.test/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1700000000,v1=0000badsignature0000' },
        body: JSON.stringify({
          id: 'evt_bad_sig',
          type: 'checkout.session.completed',
          data: { object: { id: 'cs_bad_sig', payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID } },
        }),
      })
    );
    assert.equal(invalidSigRes.status, 400);
    const invalidSigJson = await invalidSigRes.json();
    assert.equal(invalidSigJson.error, 'Invalid webhook signature.');
    assert.equal(harness.rawQuery('SELECT * FROM "businesses"').length, 0);

    // Unsettled payment_status must not infer paid onboarding
    const unpaidCheckoutRes = await postSigned(stripeWebhook, {
      id: 'evt_unsettled_checkout',
      object: 'event',
      created: 1700000500,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_unsettled_001',
          object: 'checkout.session',
          mode: 'subscription',
          payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
          payment_status: 'unpaid',
          customer: 'cus_unsettled_001',
          subscription: 'sub_unsettled_001',
          customer_details: { email: 'unpaid@shop.example', name: 'Unpaid Attempt' },
        },
      },
    });
    assert.equal(unpaidCheckoutRes.status, 200);
    assert.equal((await unpaidCheckoutRes.json()).reason, 'payment_not_settled');
    assert.equal(harness.rawQuery('SELECT * FROM "businesses"').length, 0);

    // -------------------------------------------------------------------------
    // SCENARIO 1: First-time Business Pulse customer successfully subscribes
    // -------------------------------------------------------------------------
    const firstSubCheckoutEvent = {
      id: 'evt_s1_checkout_001',
      object: 'event',
      created: 1700001000,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_s1_pulse_001',
          object: 'checkout.session',
          mode: 'subscription',
          payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
          payment_status: 'paid',
          customer: 'cus_s1_pulse_001',
          subscription: 'sub_s1_pulse_001',
          custom_fields: [
            {
              key: 'business_name',
              type: 'text',
              text: { value: 'Falls City Electric LLC' },
            },
          ],
          customer_details: {
            email: 'Elena@FallsCityElectric.example',
            name: 'Elena Vance',
            address: { city: 'Louisville', state: 'KY' },
          },
        },
      },
    };

    const s1Res = await postSigned(stripeWebhook, firstSubCheckoutEvent);
    assert.equal(s1Res.status, 200);

    const s1BizRows = harness.rawQuery(
      `SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_s1_pulse_001'`
    );
    assert.equal(s1BizRows.length, 1);
    assert.equal(s1BizRows[0].business_name, 'Falls City Electric LLC');
    assert.equal(s1BizRows[0].owner_name, 'Elena Vance');
    assert.equal(s1BizRows[0].owner_email, 'elena@fallscityelectric.example');
    assert.equal(s1BizRows[0].stripe_customer_id, 'cus_s1_pulse_001');
    assert.equal(s1BizRows[0].stripe_subscription_id, 'sub_s1_pulse_001');
    assert.equal(s1BizRows[0].tier, 'Business Pulse');
    assert.equal(s1BizRows[0].is_active, 1);

    const s1ProspectRows = harness.rawQuery(
      `SELECT * FROM "acquisition_prospects" WHERE "contact_value" = 'elena@fallscityelectric.example'`
    );
    assert.equal(s1ProspectRows.length, 1);
    assert.equal(s1ProspectRows[0].stage, 'CUSTOMER_ACQUIRED');
    assert.equal(s1ProspectRows[0].permission_status, 'INBOUND_REQUEST');
    assert.equal(s1ProspectRows[0].draft_status, 'NONE');
    assert.equal(s1ProspectRows[0].outreach_sent_at, null);
    assert.ok(s1ProspectRows[0].next_follow_up_at, 'Human onboarding follow-up timestamp must be set');
    assert.match(String(s1ProspectRows[0].research_notes), /\[stripe_customer:cus_s1_pulse_001\]/);
    assert.match(String(s1ProspectRows[0].research_notes), /\[stripe_subscription:sub_s1_pulse_001\]/);

    // Verify zero outbound messages or marketing logs were emitted
    const outboundLogs = harness.rawQuery(
      `SELECT * FROM "acquisition_contact_logs" WHERE "direction" = 'OUTBOUND'`
    );
    assert.equal(outboundLogs.length, 0);
    assert.equal(harness.rawQuery('SELECT * FROM "messages"').length, 0);

    // Also confirm an existing researched prospect preserves prior operator researchNotes when converting
    await harness.db.insert(schema.acquisitionProspects).values({
      businessName: 'Bridgepoint Roofing',
      location: 'New Albany, IN',
      industry: 'Roofing',
      researchNotes: 'Met Todd at New Albany chamber coffee; requested Business Pulse link.',
      contactMethod: 'EMAIL',
      contactValue: 'mark@bridgepointroofing.example',
      permissionStatus: 'PRIOR_RELATIONSHIP',
      stage: 'CONVERSATION_STARTED',
    });

    const s1ExistingProspectRes = await postSigned(stripeWebhook, {
      id: 'evt_s1_checkout_002',
      object: 'event',
      created: 1700001200,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_s1_pulse_002',
          object: 'checkout.session',
          mode: 'subscription',
          payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
          payment_status: 'paid',
          customer: 'cus_s1_pulse_002',
          subscription: 'sub_s1_pulse_002',
          customer_details: {
            email: 'mark@bridgepointroofing.example',
            name: 'Mark Donovan',
          },
        },
      },
    });
    assert.equal(s1ExistingProspectRes.status, 200);
    const bridgepointRows = harness.rawQuery(
      `SELECT * FROM "acquisition_prospects" WHERE "contact_value" = 'mark@bridgepointroofing.example'`
    );
    assert.equal(bridgepointRows.length, 1);
    assert.equal(bridgepointRows[0].stage, 'CUSTOMER_ACQUIRED');
    assert.match(
      String(bridgepointRows[0].research_notes),
      /Met Todd at New Albany chamber coffee/
    );
    assert.match(
      String(bridgepointRows[0].research_notes),
      /\[stripe_subscription:sub_s1_pulse_002\]/
    );

    // -------------------------------------------------------------------------
    // SCENARIO 3: Stripe retries the same checkout event (both same event.id and same session.id)
    // -------------------------------------------------------------------------
    const s3ExactRetryRes = await postSigned(stripeWebhook, firstSubCheckoutEvent);
    assert.equal(s3ExactRetryRes.status, 200);
    assert.equal((await s3ExactRetryRes.json()).duplicate, true);

    const s3SessionRetryRes = await postSigned(stripeWebhook, {
      ...firstSubCheckoutEvent,
      id: 'evt_s1_checkout_001_redelivery',
    });
    assert.equal(s3SessionRetryRes.status, 200);
    assert.equal((await s3SessionRetryRes.json()).duplicate, true);

    assert.equal(harness.rawQuery('SELECT * FROM "businesses"').length, 2);
    assert.equal(harness.rawQuery('SELECT * FROM "acquisition_prospects"').length, 2);
    assert.equal(
      harness.rawQuery(
        `SELECT * FROM "acquisition_contact_logs" WHERE "action_type" = 'STRIPE_CHECKOUT_COMPLETED'`
      ).length,
      2
    );

    // -------------------------------------------------------------------------
    // SCENARIO 2: Existing Business Pulse customer renews (+ transient past_due does NOT falsely cancel)
    // -------------------------------------------------------------------------
    const s2RenewalEvent = {
      id: 'evt_s2_renewal_001',
      object: 'event',
      created: 1702600000,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_s1_pulse_001',
          object: 'subscription',
          customer: 'cus_s1_pulse_001',
          status: 'active',
          items: pulseItems,
        },
      },
    };
    const s2Res = await postSigned(stripeWebhook, s2RenewalEvent);
    assert.equal(s2Res.status, 200);

    // Replay of same renewal event is idempotent
    const s2ReplayRes = await postSigned(stripeWebhook, s2RenewalEvent);
    assert.equal(s2ReplayRes.status, 200);
    assert.equal((await s2ReplayRes.json()).duplicate, true);

    const s2Biz = harness.rawQuery(
      `SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_s1_pulse_001'`
    )[0];
    assert.equal(s2Biz.tier, 'Business Pulse');
    assert.equal(s2Biz.is_active, 1);
    assert.equal(harness.rawQuery('SELECT * FROM "businesses"').length, 2);
    assert.equal(harness.rawQuery('SELECT * FROM "acquisition_prospects"').length, 2);
    assert.equal(
      harness.rawQuery(
        `SELECT * FROM "acquisition_contact_logs" WHERE "action_type" = 'STRIPE_SUBSCRIPTION_RENEWED'`
      ).length,
      1
    );

    // Transient past_due retry state must NOT falsely cancel active subscription
    const s2PastDueRes = await postSigned(stripeWebhook, {
      id: 'evt_s2_past_due_001',
      object: 'event',
      created: 1702600100,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_s1_pulse_001',
          object: 'subscription',
          customer: 'cus_s1_pulse_001',
          status: 'past_due',
          items: pulseItems,
        },
      },
    });
    assert.equal(s2PastDueRes.status, 200);
    const afterPastDueBiz = harness.rawQuery(
      `SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_s1_pulse_001'`
    )[0];
    assert.equal(afterPastDueBiz.is_active, 1);
    assert.equal(afterPastDueBiz.tier, 'Business Pulse');

    // -------------------------------------------------------------------------
    // SCENARIO 6: Business Pulse subscription becomes unpaid
    // -------------------------------------------------------------------------
    const s6UnpaidRes = await postSigned(stripeWebhook, {
      id: 'evt_s6_unpaid_001',
      object: 'event',
      created: 1702604000,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_s1_pulse_001',
          object: 'subscription',
          customer: 'cus_s1_pulse_001',
          status: 'unpaid',
          items: pulseItems,
        },
      },
    });
    assert.equal(s6UnpaidRes.status, 200);
    const s6Biz = harness.rawQuery(
      `SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_s1_pulse_001'`
    )[0];
    assert.equal(s6Biz.tier, 'Past Due / Unpaid');
    assert.equal(s6Biz.is_active, 0);

    // -------------------------------------------------------------------------
    // SCENARIO 7: Business Pulse subscription becomes active again
    // -------------------------------------------------------------------------
    const s7ReactivateRes = await postSigned(stripeWebhook, {
      id: 'evt_s7_reactivated_001',
      object: 'event',
      created: 1702605000,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_s1_pulse_001',
          object: 'subscription',
          customer: 'cus_s1_pulse_001',
          status: 'active',
          items: pulseItems,
        },
      },
    });
    assert.equal(s7ReactivateRes.status, 200);
    const s7Biz = harness.rawQuery(
      `SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_s1_pulse_001'`
    )[0];
    assert.equal(s7Biz.tier, 'Business Pulse');
    assert.equal(s7Biz.is_active, 1);
    assert.equal(
      harness.rawQuery(
        `SELECT * FROM "acquisition_contact_logs" WHERE "action_type" = 'STRIPE_SUBSCRIPTION_REACTIVATED'`
      ).length,
      1
    );

    // -------------------------------------------------------------------------
    // SCENARIO 4 (Part A — Stale unpaid event arriving out-of-order AFTER recovery must NOT falsely cancel)
    // -------------------------------------------------------------------------
    const s4StaleUnpaidRes = await postSigned(stripeWebhook, {
      id: 'evt_s4_delayed_unpaid_older',
      object: 'event',
      created: 1702604500, // older than 1702605000 reactivation
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_s1_pulse_001',
          object: 'subscription',
          customer: 'cus_s1_pulse_001',
          status: 'unpaid',
          items: pulseItems,
        },
      },
    });
    assert.equal(s4StaleUnpaidRes.status, 200);
    assert.equal((await s4StaleUnpaidRes.json()).reason, 'stale_out_of_order_event');
    const afterStaleUnpaidBiz = harness.rawQuery(
      `SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_s1_pulse_001'`
    )[0];
    assert.equal(afterStaleUnpaidBiz.is_active, 1);
    assert.equal(afterStaleUnpaidBiz.tier, 'Business Pulse');

    // -------------------------------------------------------------------------
    // SCENARIO 4 (Part B — Subscription event arrives BEFORE checkout.session.completed, then stale active arrives AFTER cancel)
    // -------------------------------------------------------------------------
    const s4EarlyCancelEvent = {
      id: 'evt_s4_pre_checkout_cancel',
      object: 'event',
      created: 1703002000,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_ooo_900',
          object: 'subscription',
          customer: 'cus_ooo_900',
          status: 'canceled',
          items: pulseItems,
        },
      },
    };

    // Arrives BEFORE checkout.session.completed -> returns non-2xx (409) so Stripe retries after checkout commits
    const s4BeforeCheckoutRes = await postSigned(stripeWebhook, s4EarlyCancelEvent);
    assert.equal(s4BeforeCheckoutRes.status, 409);
    assert.equal((await s4BeforeCheckoutRes.json()).retryable, true);
    assert.equal(
      harness.rawQuery(`SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_ooo_900'`)
        .length,
      0
    );

    // Now checkout.session.completed (created earlier at 1703001000) lands
    const s4CheckoutRes = await postSigned(stripeWebhook, {
      id: 'evt_s4_ooo_checkout',
      object: 'event',
      created: 1703001000,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_s4_ooo_900',
          object: 'checkout.session',
          mode: 'subscription',
          payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
          payment_status: 'paid',
          customer: 'cus_ooo_900',
          subscription: 'sub_ooo_900',
          customer_details: {
            email: 'ooo@rivervalleyglass.example',
            name: 'Jordan Pike',
          },
        },
      },
    });
    assert.equal(s4CheckoutRes.status, 200);

    // Stripe retries the earlier-queued cancellation event -> now succeeds (200) and marks Canceled
    const s4RetryCancelRes = await postSigned(stripeWebhook, s4EarlyCancelEvent);
    assert.equal(s4RetryCancelRes.status, 200);
    const oooAfterCancel = harness.rawQuery(
      `SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_ooo_900'`
    )[0];
    assert.equal(oooAfterCancel.tier, 'Canceled');
    assert.equal(oooAfterCancel.is_active, 0);

    // Delayed older `active` update (created 1703001500 < 1703002000) arrives late -> ignored, stays Canceled
    const s4DelayedActiveRes = await postSigned(stripeWebhook, {
      id: 'evt_s4_delayed_active_older',
      object: 'event',
      created: 1703001500,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_ooo_900',
          object: 'subscription',
          customer: 'cus_ooo_900',
          status: 'active',
          items: pulseItems,
        },
      },
    });
    assert.equal(s4DelayedActiveRes.status, 200);
    assert.equal((await s4DelayedActiveRes.json()).reason, 'stale_out_of_order_event');
    const oooStillCanceled = harness.rawQuery(
      `SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_ooo_900'`
    )[0];
    assert.equal(oooStillCanceled.tier, 'Canceled');
    assert.equal(oooStillCanceled.is_active, 0);

    // -------------------------------------------------------------------------
    // SCENARIO 5: Business Pulse subscription is canceled (`customer.subscription.deleted`)
    // -------------------------------------------------------------------------
    const s5DeleteRes = await postSigned(stripeWebhook, {
      id: 'evt_s5_deleted_002',
      object: 'event',
      created: 1703500000,
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_s1_pulse_002',
          object: 'subscription',
          customer: 'cus_s1_pulse_002',
          status: 'canceled',
          items: pulseItems,
        },
      },
    });
    assert.equal(s5DeleteRes.status, 200);
    const s5Biz = harness.rawQuery(
      `SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_s1_pulse_002'`
    )[0];
    assert.equal(s5Biz.tier, 'Canceled');
    assert.equal(s5Biz.is_active, 0);
    // Customer and onboarding prospect records are preserved (zero data loss)
    assert.equal(
      harness.rawQuery(
        `SELECT * FROM "acquisition_prospects" WHERE "contact_value" = 'mark@bridgepointroofing.example'`
      ).length,
      1
    );

    // -------------------------------------------------------------------------
    // SCENARIO 8: Unrelated Stripe product generates a checkout event (even with spoofed metadata)
    // -------------------------------------------------------------------------
    const bizCountBeforeForeign = harness.rawQuery('SELECT * FROM "businesses"').length;
    const prospectCountBeforeForeign = harness.rawQuery('SELECT * FROM "acquisition_prospects"').length;
    const logCountBeforeForeign = harness.rawQuery('SELECT * FROM "acquisition_contact_logs"').length;

    const s8ForeignLinkSpoofRes = await postSigned(stripeWebhook, {
      id: 'evt_s8_foreign_checkout_1',
      object: 'event',
      created: 1704000000,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_s8_foreign_1',
          object: 'checkout.session',
          mode: 'subscription',
          payment_link: 'plink_OTHER_SHARED_BUSINESS',
          payment_status: 'paid',
          metadata: { baratrust_product: 'business_pulse' },
          customer: 'cus_foreign_888',
          subscription: 'sub_foreign_888',
          customer_details: {
            email: 'customer@otherbusiness.example',
            name: 'Foreign Product Customer',
          },
        },
      },
    });
    assert.equal(s8ForeignLinkSpoofRes.status, 200);
    assert.equal((await s8ForeignLinkSpoofRes.json()).reason, 'non_business_pulse_checkout');

    const s8MetadataOnlySpoofRes = await postSigned(stripeWebhook, {
      id: 'evt_s8_foreign_checkout_2',
      object: 'event',
      created: 1704000100,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_s8_foreign_2',
          object: 'checkout.session',
          mode: 'subscription',
          payment_link: null,
          payment_status: 'paid',
          metadata: { baratrust_product: 'business_pulse' },
          customer: 'cus_s1_pulse_001', // Even sharing an existing BaraTrust customer ID!
          subscription: 'sub_foreign_889',
          customer_details: {
            email: 'elena@fallscityelectric.example',
            name: 'Elena Vance',
          },
        },
      },
    });
    assert.equal(s8MetadataOnlySpoofRes.status, 200);
    assert.equal((await s8MetadataOnlySpoofRes.json()).reason, 'non_business_pulse_checkout');

    assert.equal(harness.rawQuery('SELECT * FROM "businesses"').length, bizCountBeforeForeign);
    assert.equal(
      harness.rawQuery('SELECT * FROM "acquisition_prospects"').length,
      prospectCountBeforeForeign
    );
    assert.equal(
      harness.rawQuery('SELECT * FROM "acquisition_contact_logs"').length,
      logCountBeforeForeign
    );

    // -------------------------------------------------------------------------
    // SCENARIO 9: Unrelated subscription is updated or deleted on the shared Stripe account
    // -------------------------------------------------------------------------
    // 9a: Foreign subscription items carrying the SAME Stripe customer ID as active BaraTrust customer cus_s1_pulse_001
    const s9ForeignUpdateRes = await postSigned(stripeWebhook, {
      id: 'evt_s9_foreign_sub_update',
      object: 'event',
      created: 1704001000,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_foreign_shared_acct_777',
          object: 'subscription',
          customer: 'cus_s1_pulse_001',
          status: 'unpaid',
          items: foreignItems,
        },
      },
    });
    assert.equal(s9ForeignUpdateRes.status, 200);
    assert.equal((await s9ForeignUpdateRes.json()).reason, 'foreign_subscription');

    // 9b: Foreign subscription deletion without items payload
    const s9ForeignDeleteNoItemsRes = await postSigned(stripeWebhook, {
      id: 'evt_s9_foreign_sub_delete',
      object: 'event',
      created: 1704001100,
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_foreign_shared_acct_778',
          object: 'subscription',
          customer: 'cus_s1_pulse_001',
          status: 'canceled',
        },
      },
    });
    assert.equal(s9ForeignDeleteNoItemsRes.status, 200);
    assert.equal(
      (await s9ForeignDeleteNoItemsRes.json()).reason,
      'unconfirmed_or_foreign_subscription'
    );

    // 9c: Incomplete/abandoned checkout subscription attempt (!existingBiz) is ignored with 200 (no retry storm)
    const s9IncompleteRes = await postSigned(stripeWebhook, {
      id: 'evt_s9_incomplete_expired',
      object: 'event',
      created: 1704001200,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_abandoned_incomplete_001',
          object: 'subscription',
          customer: 'cus_abandoned_001',
          status: 'incomplete_expired',
          items: pulseItems,
        },
      },
    });
    assert.equal(s9IncompleteRes.status, 200);
    assert.equal(
      (await s9IncompleteRes.json()).reason,
      'incomplete_unconfirmed_subscription'
    );

    // Confirm Elena's BaraTrust Business Pulse subscription remains 100% active & untouched!
    const elenaStillActive = harness.rawQuery(
      `SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_s1_pulse_001'`
    )[0];
    assert.equal(elenaStillActive.tier, 'Business Pulse');
    assert.equal(elenaStillActive.is_active, 1);
    assert.equal(
      harness.rawQuery('SELECT * FROM "acquisition_contact_logs"').length,
      logCountBeforeForeign
    );

    // -------------------------------------------------------------------------
    // SCENARIO 11: Valid webhook arrives while database is temporarily unavailable -> 500 for Stripe retry, then clean recovery
    // -------------------------------------------------------------------------
    const outageCheckoutEvent = {
      id: 'evt_s11_outage_checkout',
      object: 'event',
      created: 1705000000,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_s11_outage_001',
          object: 'checkout.session',
          mode: 'subscription',
          payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
          payment_status: 'paid',
          customer: 'cus_s11_outage_001',
          subscription: 'sub_s11_outage_001',
          customer_details: {
            email: 'hank@clarksvilleauto.example',
            name: 'Hank Miller',
          },
        },
      },
    };

    const outageSubUpdateEvent = {
      id: 'evt_s11_outage_sub_update',
      object: 'event',
      created: 1705000100,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_s1_pulse_001',
          object: 'subscription',
          customer: 'cus_s1_pulse_001',
          status: 'active',
          items: pulseItems,
        },
      },
    };

    harness.setDbFailureMode('all');

    const s11CheckoutFailRes = await postSigned(stripeWebhook, outageCheckoutEvent);
    assert.equal(s11CheckoutFailRes.status, 500);
    const s11CheckoutFailText = JSON.stringify(await s11CheckoutFailRes.json());
    assert.equal(s11CheckoutFailText.includes('SECRET_HOST_DETAIL'), false);

    const s11SubFailRes = await postSigned(stripeWebhook, outageSubUpdateEvent);
    assert.equal(s11SubFailRes.status, 500);
    const s11SubFailText = JSON.stringify(await s11SubFailRes.json());
    assert.equal(s11SubFailText.includes('SECRET_HOST_DETAIL'), false);

    // Restore database and verify Stripe's retry succeeds cleanly with zero partial/duplicate artifacts
    harness.setDbFailureMode('none');

    const s11CheckoutRecoveredRes = await postSigned(stripeWebhook, outageCheckoutEvent);
    assert.equal(s11CheckoutRecoveredRes.status, 200);

    const s11SubRecoveredRes = await postSigned(stripeWebhook, outageSubUpdateEvent);
    assert.equal(s11SubRecoveredRes.status, 200);

    const hankBiz = harness.rawQuery(
      `SELECT * FROM "businesses" WHERE "stripe_subscription_id" = 'sub_s11_outage_001'`
    );
    assert.equal(hankBiz.length, 1);
    assert.equal(hankBiz[0].tier, 'Business Pulse');
    assert.equal(hankBiz[0].is_active, 1);
  } finally {
    harness.setDbFailureMode('none');
    if (prevStripeWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevStripeWebhookSecret;
    if (prevPulseLinkId === undefined) delete process.env.STRIPE_BUSINESS_PULSE_PAYMENT_LINK_ID;
    else process.env.STRIPE_BUSINESS_PULSE_PAYMENT_LINK_ID = prevPulseLinkId;
    if (prevPulseProductId === undefined) delete process.env.STRIPE_BUSINESS_PULSE_PRODUCT_ID;
    else process.env.STRIPE_BUSINESS_PULSE_PRODUCT_ID = prevPulseProductId;
    if (prevPulsePriceId === undefined) delete process.env.STRIPE_BUSINESS_PULSE_PRICE_ID;
    else process.env.STRIPE_BUSINESS_PULSE_PRICE_ID = prevPulsePriceId;
    harness.close();
  }
});
