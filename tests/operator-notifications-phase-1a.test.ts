import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import Stripe from 'stripe';
import { createAcquisitionTestHarness } from './helpers/acquisition-harness';
import {
  setAckMailerTestTransport,
  redactSensitiveMailError,
  type AckMailerInput,
} from '../src/lib/customer-intake/ack-mailer';
import {
  TWO_BUSINESS_DAYS_COMMITMENT_TEXT,
  VERIFIED_BARATRUST_CALENDAR_URL,
} from '../src/lib/customer-intake/templates';
import {
  getOperatorAlertLedgerEntry,
  inspectDurableOperatorAlertGaps,
  listFailedOperatorAlerts,
  recoverFailedOperatorAlertsFromDb,
  resetOperatorAlertStateForTests,
  resolveApprovedOperatorAlertRecipients,
  setOperatorAlertTestTransport,
  simulateOperatorAlertColdStartForTests,
  type OperatorAlertType,
} from '../src/lib/notifications/operator-alerts';
import { DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID } from '../src/lib/stripe/client';
import { resetRateLimitStoreForTests } from '../src/lib/security/public-guard';

const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (p: string, opts?: { readOnly?: boolean }) => {
    prepare(sql: string): { get(...args: unknown[]): Record<string, unknown> | undefined };
    close(): void;
  };
};

type StripeWebhookRoute = typeof import('../src/app/api/webhooks/stripe/route');

interface CapturedOperatorAlert {
  eventKey: string;
  alertType: OperatorAlertType;
  referenceId: string;
  recipients: string[];
  replyToEmail?: string | null;
  subject: string;
  bodyText: string;
}

test('Phase 1A (1, 2, 9) — Contact Inquiry Sends One Operator Alert to Approved Recipients, Suppresses Duplicates, and Preserves Customer Acknowledgments', async () => {
  const prevAutoAck = process.env.CUSTOMER_AUTO_ACK_ENABLED;
  const prevOperatorEmails = process.env.OPERATOR_EMAILS;
  const prevOperatorNotif = process.env.OPERATOR_NOTIFICATION_EMAIL;

  process.env.CUSTOMER_AUTO_ACK_ENABLED = 'true';
  process.env.OPERATOR_EMAILS = 'tebo1980@gmail.com, noelah.operator@gmail.test';
  delete process.env.OPERATOR_NOTIFICATION_EMAIL;

  resetOperatorAlertStateForTests();
  resetRateLimitStoreForTests();

  const capturedCustomerAcks: AckMailerInput[] = [];
  const capturedOperatorAlerts: CapturedOperatorAlert[] = [];

  setAckMailerTestTransport(async (input) => {
    capturedCustomerAcks.push(input);
    return {
      outcome: 'SENT',
      provider: 'MOCK_ADAPTER',
      messageId: `<mock-ack-${capturedCustomerAcks.length}@baratrust.com>`,
      error: null,
    };
  });

  setOperatorAlertTestTransport(async (input) => {
    capturedOperatorAlerts.push(input);
    return {
      outcome: 'SENT',
      provider: 'CPANEL_SMTP_TLS',
      messageId: `<mock-op-alert-${capturedOperatorAlerts.length}@baratrust.com>`,
      error: null,
    };
  });

  const harness = await createAcquisitionTestHarness();

  try {
    // Verify recipient resolution includes both Todd and Noelah without duplicates
    const resolvedRecipients = resolveApprovedOperatorAlertRecipients();
    assert.deepEqual(resolvedRecipients, [
      'tebo1980@gmail.com',
      'noelah.operator@gmail.test',
    ]);

    // 1. Genuine new /contact inquiry -> 1 customer ack (unchanged) + 1 operator alert to both recipients
    const contactPayload = {
      submissionKey: 'p1a_contact_001',
      name: 'Clara Nguyen',
      email: 'Clara@SouthernIndianaFloral.example',
      phone: '502-555-0144',
      segment: 'BUSINESS',
      serviceCategory: 'BUSINESS_PULSE',
      organizationName: 'Southern Indiana Floral',
      websiteUrl: 'https://southernindianafloral.example',
      cityState: 'New Albany, IN',
      message: 'We would love to learn how Business Pulse works for a local florist.',
      privacyNoticeAccepted: true,
    };

    const res1 = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactPayload),
      })
    );
    assert.equal(res1.status, 200);
    const json1 = await res1.json();
    assert.equal(json1.deduplicated, false);
    assert.equal(json1.acknowledgmentSent, true);

    // Requirement 9: Customer acknowledgment remains completely unchanged
    assert.equal(capturedCustomerAcks.length, 1);
    assert.equal(
      capturedCustomerAcks[0].subject,
      'We received your business inquiry — BaraTrust'
    );
    assert.ok(capturedCustomerAcks[0].bodyText.includes(TWO_BUSINESS_DAYS_COMMITMENT_TEXT));
    assert.equal(
      capturedCustomerAcks[0].bodyText.split(VERIFIED_BARATRUST_CALENDAR_URL).length - 1,
      1
    );

    // Requirement 1: Exactly 1 internal operator alert with submission time, type, deadline & safe link
    assert.equal(capturedOperatorAlerts.length, 1);
    const op1 = capturedOperatorAlerts[0];
    assert.equal(op1.alertType, 'CONTACT_INQUIRY');
    assert.deepEqual(op1.recipients, ['tebo1980@gmail.com', 'noelah.operator@gmail.test']);
    assert.match(op1.subject, /\[BaraTrust Inquiry\].*Southern Indiana Floral/);
    assert.match(op1.bodyText, /Submitted At: 20/);
    assert.match(op1.bodyText, /Category: BUSINESS_PULSE/);
    assert.match(op1.bodyText, /Response Deadline: 20.*\(2 business days\)/);
    assert.match(op1.bodyText, /https:\/\/www\.baratrust\.com\/internal\/acquisition/);
    assert.match(op1.bodyText, /clara@southernindianafloral\.example/);

    // Requirement 2: Duplicate retries (same submissionKey AND rotated key within 15m) generate ZERO extra alerts
    const retrySameKey = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactPayload),
      })
    );
    assert.equal((await retrySameKey.json()).deduplicated, true);
    assert.equal(capturedOperatorAlerts.length, 1);
    assert.equal(capturedCustomerAcks.length, 1);

    const retryRotatedKey = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactPayload,
          submissionKey: 'p1a_contact_001_rotated',
        }),
      })
    );
    assert.equal((await retryRotatedKey.json()).deduplicated, true);
    assert.equal(capturedOperatorAlerts.length, 1);

    // Honeypot & opt-out submissions do NOT trigger operator lead alerts
    await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactPayload,
          submissionKey: 'p1a_honeypot_99',
          websiteConfirm: 'https://spam.example',
        }),
      })
    );
    assert.equal(capturedOperatorAlerts.length, 1);
  } finally {
    setAckMailerTestTransport(null);
    resetOperatorAlertStateForTests();
    if (prevAutoAck === undefined) delete process.env.CUSTOMER_AUTO_ACK_ENABLED;
    else process.env.CUSTOMER_AUTO_ACK_ENABLED = prevAutoAck;
    if (prevOperatorEmails === undefined) delete process.env.OPERATOR_EMAILS;
    else process.env.OPERATOR_EMAILS = prevOperatorEmails;
    if (prevOperatorNotif === undefined) delete process.env.OPERATOR_NOTIFICATION_EMAIL;
    else process.env.OPERATOR_NOTIFICATION_EMAIL = prevOperatorNotif;
    harness.close();
  }
});

test('Phase 1A (3, 4) — Reality Check Discuss-Results & Owner Questionnaire Generate Accurate Unreviewed Alerts Without Duplicates', async () => {
  const prevOperatorEmails = process.env.OPERATOR_EMAILS;
  process.env.OPERATOR_EMAILS = 'tebo1980@gmail.com, noelah.operator@gmail.test';

  resetOperatorAlertStateForTests();
  resetRateLimitStoreForTests();

  const capturedAlerts: CapturedOperatorAlert[] = [];
  setOperatorAlertTestTransport(async (input) => {
    capturedAlerts.push(input);
    return {
      outcome: 'SENT',
      provider: 'CPANEL_SMTP_TLS',
      messageId: `<mock-rc-alert-${capturedAlerts.length}@baratrust.com>`,
      error: null,
    };
  });

  const harness = await createAcquisitionTestHarness();

  try {
    // 1. Anonymous URL-only scan generates ZERO operator alerts
    const scanRes = await harness.routes.realityCheck.POST(
      new Request('https://www.baratrust.com/api/reality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: 'https://jeffersonvillehardware.example',
          businessName: 'Jeffersonville Hardware',
          cityState: 'Jeffersonville, IN',
        }),
      })
    );
    assert.equal(scanRes.status, 200);
    const scanJson = await scanRes.json();
    const shareToken: string = scanJson.shareToken;
    assert.equal(capturedAlerts.length, 0);

    // 2. Requirement 4: Visitor submits "Discuss My Results" (PATCH /api/reality-check) -> 1 accurate alert
    const discussRes = await harness.routes.realityCheck.PATCH(
      new Request('https://www.baratrust.com/api/reality-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken,
          email: 'owner@jeffersonvillehardware.example',
          ownerName: ' Greg Foster ',
          phone: '812-555-0182',
          primaryHeadache: 'Phone rings constantly while helping counter customers.',
        }),
      })
    );
    assert.equal(discussRes.status, 200);
    const claimSetCookie = discussRes.headers.get('set-cookie') || '';
    const cookiePair = claimSetCookie.split(';')[0];

    assert.equal(capturedAlerts.length, 1);
    const discussAlert = capturedAlerts[0];
    assert.equal(discussAlert.alertType, 'REALITY_CHECK_DISCUSS');
    assert.match(discussAlert.subject, /Discuss Results Requested — Jeffersonville Hardware/);
    assert.match(
      discussAlert.bodyText,
      /Response Type: Reality Check — Request to Discuss Results/
    );
    assert.match(
      discussAlert.bodyText,
      /Review Status: NEEDS_HUMAN_REVIEW \(Automated scan only — NOT yet human-reviewed or published\)/
    );
    assert.match(discussAlert.bodyText, /https:\/\/www\.baratrust\.com\/internal\/reviews\//);

    // Duplicate Discuss-Results retry sends ZERO duplicate alerts
    const discussRetry = await harness.routes.realityCheck.PATCH(
      new Request('https://www.baratrust.com/api/reality-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken,
          email: 'owner@jeffersonvillehardware.example',
          ownerName: 'Greg Foster',
        }),
      })
    );
    assert.equal(discussRetry.status, 200);
    assert.equal(capturedAlerts.length, 1);

    // 3. Requirement 3: Owner submits Questionnaire -> 1 accurate questionnaire alert (explicitly NOT human-reviewed)
    const questPayload = {
      shareToken,
      customerAcquisition: 'Local word of mouth and walk-ins',
      biggestProblem: 'Inventory tracking and outdated seasonal hours online',
      missedInquiries: 'Calls missed during Saturday rush',
      growthOpportunity: 'Contractor bulk account ordering',
    };

    const questRes = await harness.routes.questionnaire.POST(
      new Request('https://www.baratrust.com/api/reality-check/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: cookiePair,
        },
        body: JSON.stringify(questPayload),
      })
    );
    assert.equal(questRes.status, 200);
    assert.equal(capturedAlerts.length, 2);

    const questAlert = capturedAlerts[1];
    assert.equal(questAlert.alertType, 'REALITY_CHECK_QUESTIONNAIRE');
    assert.match(questAlert.subject, /Owner Questionnaire — Jeffersonville Hardware/);
    assert.match(
      questAlert.bodyText,
      /Response Type: Reality Check — Owner Questionnaire Submission/
    );
    assert.match(
      questAlert.bodyText,
      /NOT been human-reviewed or published/
    );
    assert.match(questAlert.bodyText, /Questions Answered: 4 of 9/);
    assert.match(questAlert.bodyText, /https:\/\/www\.baratrust\.com\/internal\/reviews\//);

    // Duplicate identical questionnaire submission -> ZERO duplicate alerts
    const questRetryRes = await harness.routes.questionnaire.POST(
      new Request('https://www.baratrust.com/api/reality-check/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: cookiePair,
        },
        body: JSON.stringify(questPayload),
      })
    );
    assert.equal(questRetryRes.status, 200);
    assert.equal(capturedAlerts.length, 2);
  } finally {
    resetOperatorAlertStateForTests();
    if (prevOperatorEmails === undefined) delete process.env.OPERATOR_EMAILS;
    else process.env.OPERATOR_EMAILS = prevOperatorEmails;
    harness.close();
  }
});

test('Phase 1A (5, 6, 7) — Business Pulse Purchase Sends One Alert, Suppresses Retries, and Never Alerts on Foreign Shared-Account Products', async () => {
  const prevWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const prevOperatorEmails = process.env.OPERATOR_EMAILS;

  const signingSecret = 'whsec_phase1a_stripe_alert_test_secret_2026';
  process.env.STRIPE_WEBHOOK_SECRET = signingSecret;
  process.env.OPERATOR_EMAILS = 'tebo1980@gmail.com, noelah.operator@gmail.test';

  resetOperatorAlertStateForTests();

  const capturedAlerts: CapturedOperatorAlert[] = [];
  setOperatorAlertTestTransport(async (input) => {
    capturedAlerts.push(input);
    return {
      outcome: 'SENT',
      provider: 'CPANEL_SMTP_TLS',
      messageId: `<mock-stripe-alert-${capturedAlerts.length}@baratrust.com>`,
      error: null,
    };
  });

  const signer = new Stripe('sk_test_phase1a_signer', {
    apiVersion: '2026-04-22.dahlia',
  });

  const postSigned = async (route: StripeWebhookRoute, payloadObj: Record<string, unknown>) => {
    const raw = JSON.stringify(payloadObj);
    const sig = signer.webhooks.generateTestHeaderString({
      payload: raw,
      secret: signingSecret,
    });
    return route.POST(
      new Request('https://www.baratrust.com/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sig },
        body: raw,
      })
    );
  };

  const harness = await createAcquisitionTestHarness();

  try {
    const stripeRoute = harness.loadRoute<StripeWebhookRoute>(
      'src/app/api/webhooks/stripe/route.ts'
    );

    // Requirement 7: Foreign Stripe checkout (even with spoofed metadata) + foreign subscription -> ZERO alerts
    const foreignRes = await postSigned(stripeRoute, {
      id: 'evt_p1a_foreign_1',
      object: 'event',
      created: 1706000100,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_p1a_foreign_1',
          object: 'checkout.session',
          mode: 'subscription',
          payment_link: 'plink_OTHER_SHARED_STRIPE_PROJECT',
          payment_status: 'paid',
          metadata: { baratrust_product: 'business_pulse' },
          customer: 'cus_foreign_p1a',
          subscription: 'sub_foreign_p1a',
          customer_details: {
            email: 'buyer@otherproject.example',
            name: 'Other Project Buyer',
          },
        },
      },
    });
    assert.equal(foreignRes.status, 200);
    assert.equal(capturedAlerts.length, 0);

    // Requirement 5: Valid BaraTrust Business Pulse checkout -> 1 onboarding alert, no secrets/card data
    const validPulseEvent = {
      id: 'evt_p1a_pulse_valid_1',
      object: 'event',
      created: 1706000200,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_p1a_pulse_valid_1',
          object: 'checkout.session',
          mode: 'subscription',
          payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
          payment_status: 'paid',
          customer: 'cus_p1a_pulse_1',
          subscription: 'sub_p1a_pulse_1',
          custom_fields: [
            { key: 'business_name', type: 'text', text: { value: 'New Albany Tire & Brake' } },
          ],
          customer_details: {
            email: 'owner@newalbanytire.example',
            name: 'Ray Morales',
            address: { city: 'New Albany', state: 'IN' },
          },
        },
      },
    };

    const validRes = await postSigned(stripeRoute, validPulseEvent);
    assert.equal(validRes.status, 200);
    assert.equal(capturedAlerts.length, 1);

    const pulseAlert = capturedAlerts[0];
    assert.equal(pulseAlert.alertType, 'BUSINESS_PULSE_PURCHASE');
    assert.match(pulseAlert.subject, /Business Pulse \(\$99\/mo\) — New Albany Tire & Brake/);
    assert.match(pulseAlert.bodyText, /Human onboarding follow-up required/);
    assert.match(pulseAlert.bodyText, /sub_p1a_pulse_1/);
    assert.match(pulseAlert.bodyText, /https:\/\/www\.baratrust\.com\/internal\/acquisition/);
    assert.equal(pulseAlert.bodyText.includes(signingSecret), false);

    // Requirement 6: Duplicate Stripe checkout retries (same event.id & redelivered session.id) -> ZERO extra alerts
    const dupEventRes = await postSigned(stripeRoute, validPulseEvent);
    assert.equal(dupEventRes.status, 200);
    assert.equal((await dupEventRes.json()).duplicate, true);
    assert.equal(capturedAlerts.length, 1);

    const dupSessionRes = await postSigned(stripeRoute, {
      ...validPulseEvent,
      id: 'evt_p1a_pulse_valid_1_retry',
    });
    assert.equal(dupSessionRes.status, 200);
    assert.equal((await dupSessionRes.json()).duplicate, true);
    assert.equal(capturedAlerts.length, 1);
  } finally {
    resetOperatorAlertStateForTests();
    if (prevWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevWebhookSecret;
    if (prevOperatorEmails === undefined) delete process.env.OPERATOR_EMAILS;
    else process.env.OPERATOR_EMAILS = prevOperatorEmails;
    harness.close();
  }
});

test('Phase 1A (8, 10, 11, 12) — SMTP Failure Preserves Records & Recovers Cleanly, Credentials Redacted, Auth Intact, and Hunter RESEARCH_ONLY', async () => {
  const prevSmtpPass = process.env.CPANEL_SMTP_PASS;
  const prevStripeKey = process.env.STRIPE_SECRET_KEY;
  const prevWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const prevSyncSecret = process.env.HUNTER_INQUIRY_SYNC_SECRET;
  const prevOperatorEmails = process.env.OPERATOR_EMAILS;

  const fakeSmtpSecret = 'SuperSecretCpanelPass!2026#X9';
  const fakeWebhookSecret = 'whsec_SuperSecretWebhookKey_2026_Z8';
  const fakeSyncSecret = 'sync_secret_baratrust_hunter_32chars_minimum_999';

  process.env.CPANEL_SMTP_PASS = fakeSmtpSecret;
  process.env.STRIPE_SECRET_KEY = 'sk_test_FakeSecretKeyValueForRedactionCheck';
  process.env.STRIPE_WEBHOOK_SECRET = fakeWebhookSecret;
  process.env.HUNTER_INQUIRY_SYNC_SECRET = fakeSyncSecret;
  process.env.OPERATOR_EMAILS = 'tebo1980@gmail.com, noelah.operator@gmail.test';

  resetOperatorAlertStateForTests();
  resetRateLimitStoreForTests();

  const capturedErrorLogs: string[] = [];
  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    capturedErrorLogs.push(args.map((a) => String(a)).join(' '));
  };

  let shouldFailSmtp = true;
  const deliveredAlerts: CapturedOperatorAlert[] = [];

  setOperatorAlertTestTransport(async (input) => {
    if (shouldFailSmtp) {
      const b64Pass = Buffer.from(fakeSmtpSecret, 'utf8').toString('base64');
      return {
        outcome: 'FAILED_RETRYABLE',
        provider: 'CPANEL_SMTP_TLS',
        messageId: null,
        error: `Pre-DATA SMTP auth failed for ${fakeSmtpSecret} (${b64Pass}) and ${fakeWebhookSecret}`,
      };
    }
    deliveredAlerts.push(input);
    return {
      outcome: 'SENT',
      provider: 'CPANEL_SMTP_TLS',
      messageId: `<recovered-${deliveredAlerts.length}@baratrust.com>`,
      error: null,
    };
  });

  const signer = new Stripe('sk_test_phase1a_outage_signer', {
    apiVersion: '2026-04-22.dahlia',
  });

  const harness = await createAcquisitionTestHarness();

  try {
    const stripeRoute = harness.loadRoute<StripeWebhookRoute>(
      'src/app/api/webhooks/stripe/route.ts'
    );

    // Requirement 8A: /contact inquiry during SMTP outage still returns 200 & saves inquiry in DB
    const contactBody = {
      submissionKey: 'p1a_smtp_fail_contact_1',
      name: 'Owen Harper',
      email: 'owen@harperplumbing.example',
      segment: 'BUSINESS',
      serviceCategory: 'BUSINESS_RESEARCH',
      organizationName: 'Harper Plumbing',
      // Include accidental SSN, card number, and secret value to test redaction (Requirement 12)
      message: `Need help reviewing vendor contracts. Ref 123-45-6789 and card 4111 1111 1111 1111 ${fakeSmtpSecret}`,
      privacyNoticeAccepted: true,
    };

    const cRes1 = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactBody),
      })
    );
    assert.equal(cRes1.status, 200);
    const savedInquiries = harness.rawQuery('SELECT * FROM website_customer_inquiries');
    assert.equal(savedInquiries.length, 1);
    assert.equal(deliveredAlerts.length, 0);
    assert.equal(listFailedOperatorAlerts().length, 1);

    // Requirement 8B: Stripe Business Pulse checkout during SMTP outage still returns 200 & saves business + onboarding
    const pulseCheckoutEvent = {
      id: 'evt_p1a_smtp_fail_stripe_1',
      object: 'event',
      created: 1707000100,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_p1a_smtp_fail_stripe_1',
          object: 'checkout.session',
          mode: 'subscription',
          payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
          payment_status: 'paid',
          customer: 'cus_p1a_smtp_fail_1',
          subscription: 'sub_p1a_smtp_fail_1',
          customer_details: {
            email: 'buyer@kentuckianalawn.example',
            name: 'Lydia Brooks',
          },
        },
      },
    };
    const rawStripe = JSON.stringify(pulseCheckoutEvent);
    const sigStripe = signer.webhooks.generateTestHeaderString({
      payload: rawStripe,
      secret: fakeWebhookSecret,
    });
    const sRes1 = await stripeRoute.POST(
      new Request('https://www.baratrust.com/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sigStripe },
        body: rawStripe,
      })
    );
    assert.equal(sRes1.status, 200);
    assert.equal(harness.rawQuery('SELECT * FROM businesses').length, 1);
    assert.equal(harness.rawQuery('SELECT * FROM acquisition_prospects').length, 1);
    assert.equal(listFailedOperatorAlerts().length, 2);

    // Recover SMTP -> retrying both events delivers each missed alert ONCE and clears FAILED_RETRYABLE state
    shouldFailSmtp = false;

    const cResRetry = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactBody),
      })
    );
    assert.equal(cResRetry.status, 200);

    const sResRetry = await stripeRoute.POST(
      new Request('https://www.baratrust.com/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sigStripe },
        body: rawStripe,
      })
    );
    assert.equal(sResRetry.status, 200);

    assert.equal(deliveredAlerts.length, 2);
    assert.equal(listFailedOperatorAlerts().length, 0);
    assert.equal(
      getOperatorAlertLedgerEntry('stripe_pulse_checkout:cs_p1a_smtp_fail_stripe_1')?.status,
      'SENT'
    );

    // Requirement 12: Zero sensitive credentials or raw SSN/cards in logs or delivered alert content
    const b64Smtp = Buffer.from(fakeSmtpSecret, 'utf8').toString('base64');
    const combinedLogs = capturedErrorLogs.join('\n');
    assert.ok(combinedLogs.includes('[OPERATOR_ALERT_FAILURE]'));
    assert.equal(combinedLogs.includes(fakeSmtpSecret), false);
    assert.equal(combinedLogs.includes(b64Smtp), false);
    assert.equal(combinedLogs.includes(fakeWebhookSecret), false);
    assert.equal(combinedLogs.includes(fakeSyncSecret), false);
    assert.equal(
      redactSensitiveMailError(`Auth failed: ${fakeSmtpSecret} / ${b64Smtp}`).includes(
        fakeSmtpSecret
      ),
      false
    );

    const contactAlertBody = deliveredAlerts[0].bodyText;
    assert.equal(contactAlertBody.includes(fakeSmtpSecret), false);
    assert.equal(contactAlertBody.includes('123-45-6789'), false);
    assert.equal(contactAlertBody.includes('4111 1111 1111 1111'), false);

    // Requirement 11: Existing authentication & authorization protections remain intact
    harness.setClerkUser(null);
    const unauthAcq = await harness.routes.acquisition.GET();
    assert.equal(unauthAcq.status, 401);

    const unauthSync = await harness.routes.customerInquiriesSync.GET(
      new Request('https://www.baratrust.com/api/customer-inquiries/sync')
    );
    assert.equal(unauthSync.status, 401);

    harness.setClerkUser({
      id: 'user_outsider_non_operator',
      primaryEmailAddress: {
        emailAddress: 'outsider@example.org',
        verification: { status: 'verified' },
      },
    });
    const forbiddenAcq = await harness.routes.acquisition.GET();
    assert.equal(forbiddenAcq.status, 403);

    // Requirement 10: BaraTrust Hunter remains in RESEARCH_ONLY
    const hunterDbPath = path.resolve(
      'C:/Projects/BaraTrust/baratrust-hunter/data/hunter.db'
    );
    const hdb = new DatabaseSync(hunterDbPath, { readOnly: true });
    try {
      const row = hdb
        .prepare("SELECT value_json FROM system_settings WHERE key = 'global'")
        .get() as { value_json: string } | undefined;
      assert.ok(row);
      const parsed = JSON.parse(row.value_json);
      assert.equal(parsed.operationalMode, 'RESEARCH_ONLY');
    } finally {
      hdb.close();
    }
  } finally {
    console.error = origConsoleError;
    resetOperatorAlertStateForTests();
    if (prevSmtpPass === undefined) delete process.env.CPANEL_SMTP_PASS;
    else process.env.CPANEL_SMTP_PASS = prevSmtpPass;
    if (prevStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prevStripeKey;
    if (prevWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevWebhookSecret;
    if (prevSyncSecret === undefined) delete process.env.HUNTER_INQUIRY_SYNC_SECRET;
    else process.env.HUNTER_INQUIRY_SYNC_SECRET = prevSyncSecret;
    if (prevOperatorEmails === undefined) delete process.env.OPERATOR_EMAILS;
    else process.env.OPERATOR_EMAILS = prevOperatorEmails;
    harness.close();
  }
});

test('Phase 1A Final Reliability — Cold-Start Non-Suppression, Post-DATA Lock, Hunter Sync Cleanliness & Operator Recovery', async () => {
  const prevWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const prevSyncSecret = process.env.HUNTER_INQUIRY_SYNC_SECRET;
  const prevOperatorEmails = process.env.OPERATOR_EMAILS;

  const signingSecret = 'whsec_cold_start_reliability_test_secret_2026';
  const syncSecret = 'hunter_sync_secret_cold_start_reliability_test_32chars';

  process.env.STRIPE_WEBHOOK_SECRET = signingSecret;
  process.env.HUNTER_INQUIRY_SYNC_SECRET = syncSecret;
  process.env.OPERATOR_EMAILS = 'tebo1980@gmail.com, noelah.operator@gmail.test';

  resetOperatorAlertStateForTests();
  resetRateLimitStoreForTests();

  const origConsoleError = console.error;
  console.error = () => {};

  let transportMode: 'fail_retryable' | 'uncertain_locked' | 'sent' = 'fail_retryable';
  const deliveredAlerts: CapturedOperatorAlert[] = [];

  setOperatorAlertTestTransport(async (input) => {
    if (transportMode === 'fail_retryable') {
      return {
        outcome: 'FAILED_RETRYABLE',
        provider: 'CPANEL_SMTP_TLS',
        messageId: null,
        error: 'Simulated pre-DATA SMTP timeout',
      };
    }
    if (transportMode === 'uncertain_locked') {
      return {
        outcome: 'UNCERTAIN_DELIVERY_LOCKED',
        provider: 'CPANEL_SMTP_TLS',
        messageId: null,
        error: 'Simulated post-DATA socket drop',
      };
    }
    deliveredAlerts.push(input);
    return {
      outcome: 'SENT',
      provider: 'CPANEL_SMTP_TLS',
      messageId: `<coldstart-recovered-${deliveredAlerts.length}@baratrust.com>`,
      error: null,
    };
  });

  const signer = new Stripe('sk_test_cold_start_signer', {
    apiVersion: '2026-04-22.dahlia',
  });

  const harness = await createAcquisitionTestHarness();

  try {
    const stripeRoute = harness.loadRoute<StripeWebhookRoute>(
      'src/app/api/webhooks/stripe/route.ts'
    );

    // 1. Trigger all 4 event types during pre-DATA SMTP outage (`FAILED_RETRYABLE`)
    const contactPayload = {
      submissionKey: 'cold_start_contact_01',
      name: 'Maya Brooks',
      email: 'maya@brooksaccounting.example',
      segment: 'BUSINESS',
      serviceCategory: 'BUSINESS_PULSE',
      organizationName: 'Brooks Accounting',
      message: 'Please follow up regarding Business Pulse.',
      privacyNoticeAccepted: true,
    };
    assert.equal(
      (
        await harness.routes.customerInquiries.POST(
          new Request('https://www.baratrust.com/api/customer-inquiries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactPayload),
          })
        )
      ).status,
      200
    );

    const scanRes = await harness.routes.realityCheck.POST(
      new Request('https://www.baratrust.com/api/reality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: 'https://newalbanyprintshop.example',
          businessName: 'New Albany Print Shop',
          cityState: 'New Albany, IN',
        }),
      })
    );
    const shareToken: string = (await scanRes.json()).shareToken;

    const discussRes = await harness.routes.realityCheck.PATCH(
      new Request('https://www.baratrust.com/api/reality-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken,
          email: 'owner@newalbanyprintshop.example',
          ownerName: 'Carl Myers',
        }),
      })
    );
    assert.equal(discussRes.status, 200);
    const claimCookie = (discussRes.headers.get('set-cookie') || '').split(';')[0];

    const questPayload = {
      shareToken,
      biggestProblem: 'Turnaround quotes take too long',
      missedInquiries: 'Yes, email quotes sit overnight',
    };
    assert.equal(
      (
        await harness.routes.questionnaire.POST(
          new Request('https://www.baratrust.com/api/reality-check/questionnaire', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', cookie: claimCookie },
            body: JSON.stringify(questPayload),
          })
        )
      ).status,
      200
    );

    const stripeEvent = {
      id: 'evt_cold_start_pulse_01',
      object: 'event',
      created: 1708000100,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_cold_start_pulse_01',
          object: 'checkout.session',
          mode: 'subscription',
          payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
          payment_status: 'paid',
          customer: 'cus_cold_start_01',
          subscription: 'sub_cold_start_01',
          customer_details: {
            email: 'owner@clarksvillehvac.example',
            name: 'Nina Patel',
          },
        },
      },
    };
    const rawStripe = JSON.stringify(stripeEvent);
    const sigStripe = signer.webhooks.generateTestHeaderString({
      payload: rawStripe,
      secret: signingSecret,
    });
    assert.equal(
      (
        await stripeRoute.POST(
          new Request('https://www.baratrust.com/api/webhooks/stripe', {
            method: 'POST',
            headers: { 'stripe-signature': sigStripe },
            body: rawStripe,
          })
        )
      ).status,
      200
    );

    // None of the 4 failed alerts was falsely marked SENT
    assert.equal(deliveredAlerts.length, 0);

    // 2. SIMULATE VERCEL COLD START (wipes 100% of in-memory alert state)
    simulateOperatorAlertColdStartForTests();
    assert.equal(listFailedOperatorAlerts().length, 0); // In-RAM ledger is empty after cold start

    // Verify Clerk-authenticated GET /api/internal/acquisition STILL identifies all 4 missed alerts from Neon!
    const wsBeforeRecovery = await (await harness.routes.acquisition.GET()).json();
    assert.equal(wsBeforeRecovery.operatorAlertHealth.failedRetryableCount, 4);
    assert.equal(wsBeforeRecovery.operatorAlertHealth.uncertainLockedCount, 0);

    // Verify internal OP_ALERT_* flags are stripped cleanly from Hunter sync payload AND public questionnaire GET
    const syncRes = await harness.routes.customerInquiriesSync.GET(
      new Request('https://www.baratrust.com/api/customer-inquiries/sync', {
        headers: { Authorization: `Bearer ${syncSecret}` },
      })
    );
    assert.equal(syncRes.status, 200);
    const syncJson = await syncRes.json();
    for (const item of syncJson.items) {
      assert.equal(
        item.securityFlags.some((f: string) => f.startsWith('OP_ALERT_')),
        false
      );
    }

    const publicQuestGet = await harness.routes.questionnaire.GET(
      new Request(
        `https://www.baratrust.com/api/reality-check/questionnaire?shareToken=${shareToken}`,
        { headers: { cookie: claimCookie } }
      )
    );
    const publicQuestJson = await publicQuestGet.json();
    assert.equal('operatorAlertMeta' in (publicQuestJson.responses || {}), false);

    // 3. Restore SMTP -> Caller/Stripe retries AFTER cold start MUST NOT be hidden by duplicate suppression!
    transportMode = 'sent';

    await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactPayload),
      })
    );
    await stripeRoute.POST(
      new Request('https://www.baratrust.com/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sigStripe },
        body: rawStripe,
      })
    );

    // Both retried alerts recovered cleanly across cold start!
    assert.equal(deliveredAlerts.length, 2);

    // Simulate a SECOND cold start and retry again -> now that Neon has SENT, 0 duplicate emails!
    simulateOperatorAlertColdStartForTests();
    await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactPayload),
      })
    );
    await stripeRoute.POST(
      new Request('https://www.baratrust.com/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sigStripe },
        body: rawStripe,
      })
    );
    assert.equal(deliveredAlerts.length, 2);

    // 4. For the 2 events where the visitor NEVER retried (`REALITY_CHECK_DISCUSS` & `REALITY_CHECK_QUESTIONNAIRE`),
    // Todd or Noelah triggers explicit cold-start recovery via Clerk-authenticated POST /api/internal/acquisition!
    simulateOperatorAlertColdStartForTests();
    const recoverRes = await harness.routes.acquisition.POST(
      new Request('https://www.baratrust.com/api/internal/acquisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECOVER_FAILED_OPERATOR_ALERTS' }),
      })
    );
    assert.equal(recoverRes.status, 200);
    const recoverJson = await recoverRes.json();
    assert.equal(recoverJson.recovery.attemptedCount, 2);
    assert.equal(recoverJson.recovery.recoveredCount, 2);
    assert.equal(recoverJson.recovery.failedCount, 0);
    assert.equal(recoverJson.operatorAlertHealth.failedRetryableCount, 0);
    assert.equal(deliveredAlerts.length, 4);

    // Running recovery a second time after cold start sends ZERO duplicates
    simulateOperatorAlertColdStartForTests();
    const recoverAgainRes = await harness.routes.acquisition.POST(
      new Request('https://www.baratrust.com/api/internal/acquisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECOVER_FAILED_OPERATOR_ALERTS' }),
      })
    );
    const recoverAgainJson = await recoverAgainRes.json();
    assert.equal(recoverAgainJson.recovery.attemptedCount, 0);
    assert.equal(deliveredAlerts.length, 4);

    // 5. Post-DATA ambiguous drop (`UNCERTAIN_DELIVERY_LOCKED`) is NOT falsely marked SENT and is locked against blind repeats
    transportMode = 'uncertain_locked';
    await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'cold_start_uncertain_02',
          name: 'Evan Cross',
          email: 'evan@crossroofing.example',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_PULSE',
          organizationName: 'Cross Roofing',
          message: 'Checking availability.',
          privacyNoticeAccepted: true,
        }),
      })
    );

    transportMode = 'sent';
    simulateOperatorAlertColdStartForTests();

    const wsUncertain = await (await harness.routes.acquisition.GET()).json();
    assert.equal(wsUncertain.operatorAlertHealth.uncertainLockedCount, 1);
    assert.equal(wsUncertain.operatorAlertHealth.failedRetryableCount, 0);

    // Recovery skips UNCERTAIN_DELIVERY_LOCKED so uncertain post-DATA drops never spam duplicates
    const recoverUncertain = await (
      await harness.routes.acquisition.POST(
        new Request('https://www.baratrust.com/api/internal/acquisition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'RECOVER_FAILED_OPERATOR_ALERTS' }),
        })
      )
    ).json();
    assert.equal(recoverUncertain.recovery.attemptedCount, 0);
    assert.equal(deliveredAlerts.length, 4);
  } finally {
    console.error = origConsoleError;
    resetOperatorAlertStateForTests();
    if (prevWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevWebhookSecret;
    if (prevSyncSecret === undefined) delete process.env.HUNTER_INQUIRY_SYNC_SECRET;
    else process.env.HUNTER_INQUIRY_SYNC_SECRET = prevSyncSecret;
    if (prevOperatorEmails === undefined) delete process.env.OPERATOR_EMAILS;
    else process.env.OPERATOR_EMAILS = prevOperatorEmails;
    harness.close();
  }
});

test('Phase 1A Concurrency Gate — Two Independent Serverless Instances Racing Simultaneously Send Strictly One Alert Each and Handle 90s Locks Safely', async () => {
  const prevWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const prevOperatorEmails = process.env.OPERATOR_EMAILS;

  const signingSecret = 'whsec_concurrency_gate_test_secret_2026';
  process.env.STRIPE_WEBHOOK_SECRET = signingSecret;
  process.env.OPERATOR_EMAILS = 'tebo1980@gmail.com, noelah.operator@gmail.test';

  resetOperatorAlertStateForTests();
  resetRateLimitStoreForTests();

  const origConsoleError = console.error;
  console.error = () => {};

  let smtpAvailable = false;
  const deliveredAlerts: CapturedOperatorAlert[] = [];

  setOperatorAlertTestTransport(async (input) => {
    if (!smtpAvailable) {
      return {
        outcome: 'FAILED_RETRYABLE',
        provider: 'CPANEL_SMTP_TLS',
        messageId: null,
        error: 'Simulated initial SMTP outage before DATA',
      };
    }
    // Real async network delay so concurrent serverless instances genuinely overlap mid-flight
    await new Promise((resolve) => setTimeout(resolve, 35));
    deliveredAlerts.push(input);
    return {
      outcome: 'SENT',
      provider: 'CPANEL_SMTP_TLS',
      messageId: `<concurrent-ok-${deliveredAlerts.length}@baratrust.com>`,
      error: null,
    };
  });

  const signer = new Stripe('sk_test_concurrency_signer', {
    apiVersion: '2026-04-22.dahlia',
  });

  const harness = await createAcquisitionTestHarness();

  try {
    const stripeRoute = harness.loadRoute<StripeWebhookRoute>(
      'src/app/api/webhooks/stripe/route.ts'
    );

    // 1. Seed all 4 failed alert types (`FAILED_RETRYABLE` in DB)
    await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'conc_contact_01',
          name: 'Tara Simmons',
          email: 'tara@simmonscatering.example',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_PULSE',
          organizationName: 'Simmons Catering',
          message: 'Interested in Business Pulse.',
          privacyNoticeAccepted: true,
        }),
      })
    );

    const scanRes = await harness.routes.realityCheck.POST(
      new Request('https://www.baratrust.com/api/reality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: 'https://floydscoffee.example',
          businessName: 'Floyds Knobs Coffee',
          cityState: 'Floyds Knobs, IN',
        }),
      })
    );
    const shareToken: string = (await scanRes.json()).shareToken;

    const patchRes = await harness.routes.realityCheck.PATCH(
      new Request('https://www.baratrust.com/api/reality-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken,
          email: 'owner@floydscoffee.example',
          ownerName: 'Benny Cole',
        }),
      })
    );
    const claimCookie = (patchRes.headers.get('set-cookie') || '').split(';')[0];

    await harness.routes.questionnaire.POST(
      new Request('https://www.baratrust.com/api/reality-check/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: claimCookie },
        body: JSON.stringify({
          shareToken,
          biggestProblem: 'Catering order tracking',
          growthOpportunity: 'Morning office coffee delivery',
        }),
      })
    );

    const rawStripe = JSON.stringify({
      id: 'evt_conc_pulse_01',
      object: 'event',
      created: 1709000100,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_conc_pulse_01',
          object: 'checkout.session',
          mode: 'subscription',
          payment_link: DEFAULT_BUSINESS_PULSE_PAYMENT_LINK_ID,
          payment_status: 'paid',
          customer: 'cus_conc_01',
          subscription: 'sub_conc_01',
          customer_details: {
            email: 'owner@sellersburgauto.example',
            name: 'Diane Ross',
          },
        },
      },
    });
    const sigStripe = signer.webhooks.generateTestHeaderString({
      payload: rawStripe,
      secret: signingSecret,
    });
    await stripeRoute.POST(
      new Request('https://www.baratrust.com/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sigStripe },
        body: rawStripe,
      })
    );

    assert.equal(deliveredAlerts.length, 0);
    const preHealth = await inspectDurableOperatorAlertGaps(harness.db);
    assert.equal(preHealth.failedRetryableCount, 4);

    // 2. Restore SMTP and race TWO INDEPENDENT SERVERLESS INSTANCES (separate isolated ledgers, zero shared RAM)
    smtpAvailable = true;
    simulateOperatorAlertColdStartForTests();

    const baseNow = Date.now();
    const [resInstanceA, resInstanceB] = await Promise.all([
      recoverFailedOperatorAlertsFromDb(harness.db, {
        nowMs: baseNow,
        isolatedLedger: new Map(),
      }),
      recoverFailedOperatorAlertsFromDb(harness.db, {
        nowMs: baseNow,
        isolatedLedger: new Map(),
      }),
    ]);

    // Across both racing instances combined, strictly 4 alerts are attempted & recovered (1 each, ZERO duplicates!)
    assert.equal(resInstanceA.attemptedCount + resInstanceB.attemptedCount, 4);
    assert.equal(resInstanceA.recoveredCount + resInstanceB.recoveredCount, 4);
    assert.ok(
      resInstanceA.skippedConcurrentCount + resInstanceB.skippedConcurrentCount >= 4,
      'Losing concurrent serverless instance must skip rows already claimed in DB'
    );
    assert.equal(deliveredAlerts.length, 4);

    const uniqueKeys = new Set(deliveredAlerts.map((a) => a.eventKey));
    assert.equal(uniqueKeys.size, 4);

    const postHealth = await inspectDurableOperatorAlertGaps(harness.db);
    assert.equal(postHealth.failedRetryableCount, 0);
    assert.equal(postHealth.inFlightCount, 0);

    // 3. Stale-lock safety:
    // Seed an active IN_FLIGHT lock only 25s old (<90s) -> recovery MUST NOT send while original SMTP could be active
    smtpAvailable = false;
    const lockTestRes = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'conc_inflight_lock_01',
          name: 'Paula Grant',
          email: 'paula@grantbakery.example',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_PULSE',
          organizationName: 'Grant Bakery',
          message: 'Testing active vs stale IN_FLIGHT lock behavior.',
          privacyNoticeAccepted: true,
        }),
      })
    );
    assert.equal(lockTestRes.status, 200);

    const activeStartMs = 1_800_000_000_000;
    harness.rawQuery(
      `UPDATE "website_customer_inquiries" SET "security_flags" = '["OP_ALERT_IN_FLIGHT:${activeStartMs}"]' WHERE "external_submission_key" = 'web_conc_inflight_lock_01'`
    );

    smtpAvailable = true;
    // At +25s (<90s), lock is still active -> another instance MUST NOT claim or send
    const duringActiveLock = await recoverFailedOperatorAlertsFromDb(harness.db, {
      nowMs: activeStartMs + 25_000,
      isolatedLedger: new Map(),
    });
    assert.equal(duringActiveLock.attemptedCount, 0);
    assert.equal(duringActiveLock.quarantinedStaleCount, 0);
    assert.equal(deliveredAlerts.length, 4);

    const healthDuringActive = await inspectDurableOperatorAlertGaps(harness.db);
    assert.equal(healthDuringActive.inFlightCount, 1);

    // At +95s (>=90s, past 9s SMTP timeout & 30s serverless ceiling), interrupted lock is quarantined
    // as UNCERTAIN_DELIVERY_LOCKED rather than blindly re-sent!
    const afterStaleExpiry = await recoverFailedOperatorAlertsFromDb(harness.db, {
      nowMs: activeStartMs + 95_000,
      isolatedLedger: new Map(),
    });
    assert.equal(afterStaleExpiry.attemptedCount, 0);
    assert.equal(afterStaleExpiry.quarantinedStaleCount, 1);
    assert.equal(deliveredAlerts.length, 4);

    const healthAfterQuarantine = await inspectDurableOperatorAlertGaps(harness.db);
    assert.equal(healthAfterQuarantine.inFlightCount, 0);
    assert.equal(healthAfterQuarantine.uncertainLockedCount, 1);
  } finally {
    console.error = origConsoleError;
    resetOperatorAlertStateForTests();
    if (prevWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevWebhookSecret;
    if (prevOperatorEmails === undefined) delete process.env.OPERATOR_EMAILS;
    else process.env.OPERATOR_EMAILS = prevOperatorEmails;
    harness.close();
  }
});
