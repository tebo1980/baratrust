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
