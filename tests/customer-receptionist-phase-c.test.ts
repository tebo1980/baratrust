import test from 'node:test';
import assert from 'node:assert/strict';
import { createAcquisitionTestHarness } from './helpers/acquisition-harness';
import {
  dispatchWebsiteCustomerAck,
  setAckMailerTestTransport,
  type AckMailerInput,
} from '../src/lib/customer-intake/ack-mailer';
import {
  computeBusinessDayDeadline,
  ONE_BUSINESS_DAY_COMMITMENT_TEXT,
  renderPreapprovedWebsiteAck,
  TWO_BUSINESS_DAYS_COMMITMENT_TEXT,
  VERIFIED_BARATRUST_CALENDAR_URL,
} from '../src/lib/customer-intake/templates';
import { retryWebsiteInquiryAckIfSafe } from '../src/lib/customer-intake/service';
import { resetRateLimitStoreForTests } from '../src/lib/security/public-guard';

const TEST_SYNC_SECRET = 'phase_c_test_sync_secret_at_least_32_characters_long_99';

function resetPhaseCEnv() {
  delete process.env.CUSTOMER_AUTO_ACK_ENABLED;
  delete process.env.CUSTOMER_RESPONSE_BUSINESS_DAYS;
  delete process.env.HUNTER_INQUIRY_SYNC_SECRET;
  delete process.env.TEST_ENFORCE_RATE_LIMIT;
  setAckMailerTestTransport(null);
  resetRateLimitStoreForTests();
}

test('Phase C Templates — renders approved service facts, verified calendar URL, and weekday-aware 1-day / 2-day commitments', () => {
  resetPhaseCEnv();

  const twoDay = renderPreapprovedWebsiteAck({
    templateKey: 'BUSINESS_INQUIRY',
    customerName: 'Sarah Jenkins',
    faqMatchedKeys: ['BUSINESS_PULSE_PRICE', 'HOW_TO_SCHEDULE'],
    commitmentDays: 2,
  });

  assert.equal(twoDay.subject, 'We received your business inquiry — BaraTrust');
  assert.equal(twoDay.commitmentBusinessDays, 2);
  assert.match(twoDay.body, /Hi Sarah,/);
  assert.ok(twoDay.body.includes(TWO_BUSINESS_DAYS_COMMITMENT_TEXT));
  assert.ok(twoDay.body.includes('$99/month'));
  assert.ok(twoDay.body.includes('free ($0)'));
  assert.ok(twoDay.body.includes(VERIFIED_BARATRUST_CALENDAR_URL));
  assert.equal(
    twoDay.body.split(VERIFIED_BARATRUST_CALENDAR_URL).length - 1,
    1,
    'Business acknowledgment must include the Google Calendar booking URL strictly once (never duplicated)'
  );
  assert.ok(twoDay.body.includes('reviewed by a real person'));

  const oneDay = renderPreapprovedWebsiteAck({
    templateKey: 'CONSUMER_INQUIRY',
    customerName: 'Marcus Vance',
    faqMatchedKeys: ['CAN_YOU_RESEARCH_MY_QUESTION'],
    commitmentDays: 1,
  });
  assert.equal(oneDay.commitmentBusinessDays, 1);
  assert.ok(oneDay.body.includes(ONE_BUSINESS_DAY_COMMITMENT_TEXT));
  assert.match(oneDay.body, /provide a clear quote after reviewing the scope/);
  assert.ok(!oneDay.body.includes('$99/month'));

  // Weekday-aware deadline checks:
  // Saturday 2026-11-14T15:00:00Z -> 1 business day = Monday 2026-11-16T22:00:00Z; 2 business days = Tuesday 2026-11-17T22:00:00Z
  const satOne = computeBusinessDayDeadline('2026-11-14T15:00:00.000Z', 1);
  assert.equal(satOne.toISOString(), '2026-11-16T22:00:00.000Z');

  const satTwo = computeBusinessDayDeadline('2026-11-14T15:00:00.000Z', 2);
  assert.equal(satTwo.toISOString(), '2026-11-17T22:00:00.000Z');

  // Late Friday 2026-11-13T23:15:00Z (after 5pm EST) -> 1 business day = Monday 2026-11-16T22:00:00Z
  const friLateOne = computeBusinessDayDeadline('2026-11-13T23:15:00.000Z', 1);
  assert.equal(friLateOne.toISOString(), '2026-11-16T22:00:00.000Z');
});

test('Phase C1/C2 — Website contact form stores inquiry durably, enforces privacy notice, deduplicates retries, redacts SSN/cards, and sends 0 emails while disabled', async () => {
  resetPhaseCEnv();
  const harness = await createAcquisitionTestHarness();

  let sentCount = 0;
  setAckMailerTestTransport(async () => {
    sentCount += 1;
    return {
      outcome: 'SENT',
      provider: 'MOCK_ADAPTER',
      messageId: 'mock-msg-1',
      error: null,
    };
  });

  try {
    // 1. Rejects missing privacy notice acknowledgment
    const badPrivacyRes = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'sub_privacy_missing_01',
          name: 'Dana Owner',
          email: 'dana@riverbakery.test',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_PULSE',
          message: 'Interested in Business Pulse monitoring for our New Albany bakery.',
          privacyNoticeAccepted: false,
        }),
      })
    );
    assert.equal(badPrivacyRes.status, 400);
    assert.equal(harness.rawQuery('SELECT * FROM website_customer_inquiries').length, 0);

    // 2. Honeypot bot submission is silently ignored without DB write or mail send
    const botRes = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'sub_honeypot_bot_01',
          name: 'Bot Spammer',
          email: 'bot@spam.test',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_PULSE',
          message: 'Automated bot form fill testing honeypot field.',
          privacyNoticeAccepted: true,
          websiteConfirm: 'https://evil-bot.example',
        }),
      })
    );
    assert.equal(botRes.status, 200);
    assert.equal(harness.rawQuery('SELECT * FROM website_customer_inquiries').length, 0);

    // 3. Legitimate Business inquiry is stored durably; CUSTOMER_AUTO_ACK_ENABLED is disabled -> 0 emails sent
    const bizRes = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'sub_legit_biz_0001',
          name: 'Dana Owner',
          email: 'Dana@RiverBakery.test',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_PULSE',
          organizationName: 'River Valley Bakery',
          websiteUrl: 'https://riverbakery.test',
          message: 'How much is Business Pulse and can we schedule a call next week?',
          privacyNoticeAccepted: true,
        }),
      })
    );
    assert.equal(bizRes.status, 200);
    const bizJson = await bizRes.json();
    assert.equal(bizJson.success, true);
    assert.equal(bizJson.deduplicated, false);
    assert.equal(bizJson.acknowledgmentSent, false);
    assert.equal(sentCount, 0);

    // 4. Repeated submission (same submissionKey AND rotated submissionKey within 15m) does NOT create duplicates
    const retrySameKey = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'sub_legit_biz_0001',
          name: 'Dana Owner',
          email: 'dana@riverbakery.test',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_PULSE',
          organizationName: 'River Valley Bakery',
          message: 'How much is Business Pulse and can we schedule a call next week?',
          privacyNoticeAccepted: true,
        }),
      })
    );
    const retrySameJson = await retrySameKey.json();
    assert.equal(retrySameJson.deduplicated, true);

    const retryRotatedKey = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'sub_legit_biz_0002_rotated',
          name: 'Dana Owner',
          email: 'dana@riverbakery.test',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_PULSE',
          organizationName: 'River Valley Bakery',
          message: 'How much is Business Pulse and can we schedule a call next week?',
          privacyNoticeAccepted: true,
        }),
      })
    );
    const retryRotatedJson = await retryRotatedKey.json();
    assert.equal(retryRotatedJson.deduplicated, true);
    assert.equal(harness.rawQuery('SELECT * FROM website_customer_inquiries').length, 1);

    // 5. Consumer inquiry separates personal data (clears organizationName) and redacts SSN/card numbers before DB insert
    const consumerRes = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'sub_consumer_genealogy_01',
          name: 'Evelyn Carter',
          email: 'evelyn@personal.test',
          segment: 'CONSUMER',
          serviceCategory: 'CONSUMER_GENEALOGY',
          organizationName: 'Should Be Stripped For Consumer',
          message:
            'Looking for 1910 Clark County census family records. My SSN is 123-45-6789 and card is 4111-2222-3333-4444.',
          privacyNoticeAccepted: true,
        }),
      })
    );
    assert.equal(consumerRes.status, 200);

    const rows = harness.rawQuery(
      'SELECT segment, organization_name, message, ack_status, ack_template_key, human_status FROM website_customer_inquiries ORDER BY submitted_at ASC'
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].segment, 'BUSINESS');
    assert.equal(rows[0].organization_name, 'River Valley Bakery');
    assert.equal(rows[0].ack_status, 'DISABLED_PENDING_APPROVAL');
    assert.equal(rows[0].ack_template_key, 'BUSINESS_INQUIRY');
    assert.equal(rows[0].human_status, 'AWAITING_HUMAN_REVIEW');

    assert.equal(rows[1].segment, 'CONSUMER');
    assert.equal(rows[1].organization_name, null);
    assert.equal(rows[1].ack_template_key, 'CONSUMER_INQUIRY');
    assert.ok(!String(rows[1].message).includes('123-45-6789'));
    assert.ok(!String(rows[1].message).includes('4111-2222-3333-4444'));
    assert.ok(String(rows[1].message).includes('[REDACTED_SENSITIVE_ID]'));
    assert.ok(String(rows[1].message).includes('[REDACTED_PAYMENT_CARD]'));
  } finally {
    harness.close();
    resetPhaseCEnv();
  }
});

test('Phase C2 — Failed ack preserves inquiry, uncertain delivery locks against repeat sends, and opt-outs/auto-replies never receive acks', async () => {
  resetPhaseCEnv();
  process.env.CUSTOMER_AUTO_ACK_ENABLED = 'true';
  const harness = await createAcquisitionTestHarness();

  const deliveredPayloads: AckMailerInput[] = [];
  let mode: 'fail_pre_data' | 'uncertain_post_data' | 'send_ok' = 'fail_pre_data';

  setAckMailerTestTransport(async (input) => {
    deliveredPayloads.push(input);
    if (mode === 'fail_pre_data') {
      return {
        outcome: 'FAILED_RETRYABLE',
        provider: 'MOCK_ADAPTER',
        messageId: null,
        error: 'Simulated pre-DATA connection refusal',
      };
    }
    if (mode === 'uncertain_post_data') {
      return {
        outcome: 'UNCERTAIN_DELIVERY_LOCKED',
        provider: 'MOCK_ADAPTER',
        messageId: null,
        error: 'Simulated timeout after DATA transmission',
      };
    }
    return {
      outcome: 'SENT',
      provider: 'MOCK_ADAPTER',
      messageId: `sent-${deliveredPayloads.length}`,
      error: null,
    };
  });

  try {
    // 1. Failed acknowledgment STILL records the customer inquiry durably
    const failedRes = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'sub_ack_fail_0001',
          name: 'glen hardware',
          email: 'glen@hardware.test',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_RESEARCH',
          organizationName: 'Glen Hardware',
          message: 'Can you compare two regional fastener suppliers for our shop?',
          privacyNoticeAccepted: true,
        }),
      })
    );
    assert.equal(failedRes.status, 200);
    const storedFail = harness.rawQuery(
      "SELECT id, ack_status, human_status FROM website_customer_inquiries WHERE external_submission_key = 'web_sub_ack_fail_0001'"
    );
    assert.equal(storedFail.length, 1);
    assert.equal(storedFail[0].ack_status, 'FAILED_RETRYABLE');
    assert.equal(storedFail[0].human_status, 'AWAITING_HUMAN_REVIEW');

    // 2. Uncertain delivery locks the inquiry and blocks automatic retry
    mode = 'uncertain_post_data';
    const uncertainRes = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'sub_ack_uncertain_0002',
          name: 'Claire Florist',
          email: 'claire@florist.test',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_PULSE',
          organizationName: 'Claire Florist',
          message: 'Interested in starting Business Pulse next month — please let us know.',
          privacyNoticeAccepted: true,
        }),
      })
    );
    assert.equal(uncertainRes.status, 200);
    const uncertainRow = harness.rawQuery(
      "SELECT id, ack_status FROM website_customer_inquiries WHERE external_submission_key = 'web_sub_ack_uncertain_0002'"
    )[0];
    assert.equal(uncertainRow.ack_status, 'UNCERTAIN_DELIVERY_LOCKED');

    const countBeforeRetry = deliveredPayloads.length;
    mode = 'send_ok';
    const retryBlocked = await retryWebsiteInquiryAckIfSafe(harness.db, String(uncertainRow.id));
    assert.equal(retryBlocked.attempted, false);
    assert.match(String(retryBlocked.blockedReason), /UNCERTAIN_DELIVERY_LOCKED/);
    assert.equal(deliveredPayloads.length, countBeforeRetry);

    // 3. Opt-outs and automated out-of-office / bounce senders NEVER trigger auto-ack even when enabled
    await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'sub_opt_out_0003',
          name: 'Opt Out Person',
          email: 'optout@company.test',
          segment: 'BUSINESS',
          serviceCategory: 'GENERAL_INQUIRY',
          message: 'Please unsubscribe me and do not contact us again.',
          privacyNoticeAccepted: true,
        }),
      })
    );

    await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'sub_auto_reply_0004',
          name: 'Vacation Responder',
          email: 'noreply@company.test',
          segment: 'BUSINESS',
          serviceCategory: 'GENERAL_INQUIRY',
          message: 'Automatic reply: I am out of the office until Monday with limited email.',
          privacyNoticeAccepted: true,
        }),
      })
    );

    assert.equal(
      deliveredPayloads.length,
      countBeforeRetry,
      'Neither opt-outs nor automated vacation/noreply messages may trigger acknowledgments'
    );
  } finally {
    harness.close();
    resetPhaseCEnv();
  }
});

test('Phase C1/C2/C3 — Reality Check funnel hooks cleanly without duplicates, enforces cross-channel cooldown, and exposes authenticated resumable sync', async () => {
  resetPhaseCEnv();
  process.env.CUSTOMER_AUTO_ACK_ENABLED = 'true';
  process.env.HUNTER_INQUIRY_SYNC_SECRET = TEST_SYNC_SECRET;
  const harness = await createAcquisitionTestHarness();

  let sentEmails = 0;
  setAckMailerTestTransport(async () => {
    sentEmails += 1;
    return {
      outcome: 'SENT',
      provider: 'MOCK_ADAPTER',
      messageId: `rc-ack-${sentEmails}`,
      error: null,
    };
  });

  try {
    // 1. Anonymous Reality Check scan works normally and creates 0 customer inquiries until email is submitted
    const scanRes = await harness.routes.realityCheck.POST(
      new Request('https://www.baratrust.com/api/reality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: 'https://newalbanyhardware.example',
          businessName: 'New Albany Hardware',
          cityState: 'New Albany, IN',
        }),
      })
    );
    assert.equal(scanRes.status, 200);
    const scanJson = await scanRes.json();
    assert.equal(scanJson.success, true);
    assert.equal(scanJson.overallScore, 78);
    assert.equal(harness.rawQuery('SELECT * FROM website_customer_inquiries').length, 0);

    // 2. Visitor claims results via PATCH /api/reality-check ("Discuss My Results") -> enters unified table once!
    const patchRes1 = await harness.routes.realityCheck.PATCH(
      new Request('https://www.baratrust.com/api/reality-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: scanJson.shareToken,
          email: 'owner@newalbanyhardware.example',
          ownerName: 'Tom Hardware',
          primaryHeadache: 'Want to fix tap-to-call and discuss Business Pulse.',
        }),
      })
    );
    assert.equal(patchRes1.status, 200);
    assert.equal(sentEmails, 1);

    // Repeated PATCH retry with same email does NOT create a second inquiry or send a second email
    const patchRes2 = await harness.routes.realityCheck.PATCH(
      new Request('https://www.baratrust.com/api/reality-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: scanJson.shareToken,
          email: 'owner@newalbanyhardware.example',
          phone: '502-555-0199',
        }),
      })
    );
    assert.equal(patchRes2.status, 200);
    assert.equal(sentEmails, 1);
    assert.equal(harness.rawQuery('SELECT * FROM website_customer_inquiries').length, 1);

    // 3. Same visitor submits Contact Form 5 minutes later -> recorded for human follow-up, but ack skipped (24h cross-channel cooldown!)
    const crossChannelRes = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'sub_cross_channel_same_owner',
          name: 'Tom Hardware',
          email: 'owner@newalbanyhardware.example',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_PULSE',
          organizationName: 'New Albany Hardware',
          message: 'Also forgot to mention we open a second storefront in Jeffersonville.',
          privacyNoticeAccepted: true,
        }),
      })
    );
    assert.equal(crossChannelRes.status, 200);
    assert.equal(sentEmails, 1, 'Cross-channel cooldown must skip sending a second auto-ack within 24h');

    const secondInq = harness.rawQuery(
      "SELECT ack_status FROM website_customer_inquiries WHERE external_submission_key = 'web_sub_cross_channel_same_owner'"
    )[0];
    assert.equal(secondInq.ack_status, 'SKIPPED_DUPLICATE_RECENT');

    // 4. Sync endpoint enforces Bearer auth and supports cursor pagination
    const unauthSync = await harness.routes.customerInquiriesSync.GET(
      new Request('https://www.baratrust.com/api/customer-inquiries/sync?limit=1')
    );
    assert.equal(unauthSync.status, 401);

    const wrongTokenSync = await harness.routes.customerInquiriesSync.GET(
      new Request('https://www.baratrust.com/api/customer-inquiries/sync?limit=1', {
        headers: { Authorization: 'Bearer wrong_secret_token_value' },
      })
    );
    assert.equal(wrongTokenSync.status, 401);

    const page1Res = await harness.routes.customerInquiriesSync.GET(
      new Request('https://www.baratrust.com/api/customer-inquiries/sync?limit=1', {
        headers: { Authorization: `Bearer ${TEST_SYNC_SECRET}` },
      })
    );
    assert.equal(page1Res.status, 200);
    const page1 = await page1Res.json();
    assert.equal(page1.items.length, 1);
    assert.equal(page1.hasMore, true);
    assert.ok(page1.nextCursor?.updatedAt);
    assert.ok(page1.nextCursor?.id);

    const page2Url = new URL('https://www.baratrust.com/api/customer-inquiries/sync');
    page2Url.searchParams.set('limit', '5');
    page2Url.searchParams.set('cursorUpdatedAt', page1.nextCursor.updatedAt);
    page2Url.searchParams.set('cursorId', page1.nextCursor.id);

    const page2Res = await harness.routes.customerInquiriesSync.GET(
      new Request(page2Url.toString(), {
        headers: { Authorization: `Bearer ${TEST_SYNC_SECRET}` },
      })
    );
    assert.equal(page2Res.status, 200);
    const page2 = await page2Res.json();
    assert.equal(page2.items.length, 1);
    assert.equal(page2.hasMore, false);
    assert.notEqual(page2.items[0].id, page1.items[0].id);
  } finally {
    harness.close();
    resetPhaseCEnv();
  }
});

test('Step 2A — Operator-authenticated internal test sends at most once to tebo1980@gmail.com while CUSTOMER_AUTO_ACK_ENABLED=false globally', async () => {
  resetPhaseCEnv();
  process.env.CUSTOMER_AUTO_ACK_ENABLED = 'false';
  process.env.CUSTOMER_RESPONSE_BUSINESS_DAYS = '2';
  process.env.HUNTER_INQUIRY_SYNC_SECRET = TEST_SYNC_SECRET;
  const harness = await createAcquisitionTestHarness();

  const sentPayloads: AckMailerInput[] = [];
  setAckMailerTestTransport(async (input) => {
    sentPayloads.push(input);
    return {
      outcome: 'SENT',
      provider: 'MOCK_ADAPTER',
      messageId: `<step2a-mock-${sentPayloads.length}@baratrust.com>`,
      error: null,
      diagnostics: {
        tcpConnected: true,
        tlsNegotiated: true,
        tlsProtocol: 'TLSv1.3',
        smtpAuthenticated: true,
        senderEmail: 'todd@baratrust.com',
        smtpResponse: '250 OK id=1tStep2AMock',
      },
    };
  });

  try {
    // 1. Direct mailer guard blocks non-allowlisted recipients even if authorizedInternalTest=true is passed
    const blockedMailer = await dispatchWebsiteCustomerAck(
      {
        inquiryId: 'inq-non-allowlisted',
        recipientEmail: 'someone@customer.example',
        subject: 'Test',
        bodyText: 'Test',
      },
      { authorizedInternalTest: true }
    );
    assert.equal(blockedMailer.outcome, 'FAILED_RETRYABLE');
    assert.equal(sentPayloads.length, 0);

    // 2. Unauthenticated POST to /api/customer-inquiries/sync returns 401 and sends 0 emails
    const unauthPost = await harness.routes.customerInquiriesSync.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_authorized_internal_test',
          recipientEmail: 'tebo1980@gmail.com',
        }),
      })
    );
    assert.equal(unauthPost.status, 401);
    assert.equal(sentPayloads.length, 0);

    // 3. Authenticated POST for non-allowlisted recipient returns 403, writes 0 rows, sends 0 emails
    const forbiddenRecipientPost = await harness.routes.customerInquiriesSync.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_SYNC_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_authorized_internal_test',
          recipientEmail: 'customer@realbusiness.example',
        }),
      })
    );
    assert.equal(forbiddenRecipientPost.status, 403);
    assert.equal(sentPayloads.length, 0);
    assert.equal(harness.rawQuery('SELECT * FROM website_customer_inquiries').length, 0);

    // 4. Ordinary public contact form submission (even before or after) NEVER triggers auto-ack while disabled
    const publicRes = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'sub_public_customer_step2a',
          name: 'Real Customer',
          email: 'owner@louisvilleplumbing.example',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_PULSE',
          organizationName: 'Louisville Plumbing',
          message: 'Interested in Business Pulse monitoring for our shop.',
          privacyNoticeAccepted: true,
        }),
      })
    );
    assert.equal(publicRes.status, 200);
    const publicJson = await publicRes.json();
    assert.equal(publicJson.acknowledgmentSent, false);
    assert.equal(sentPayloads.length, 0);

    // 5. Authorized operator internal test for tebo1980@gmail.com sends ONCE with approved template & booking URL
    const firstTestRes = await harness.routes.customerInquiriesSync.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_SYNC_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_authorized_internal_test',
          recipientEmail: 'tebo1980@gmail.com',
          submissionKey: 'step2a_unit_test_001',
        }),
      })
    );
    assert.equal(firstTestRes.status, 200);
    const firstJson = await firstTestRes.json();
    assert.equal(firstJson.ok, true);
    assert.equal(firstJson.attempted, true);
    assert.equal(firstJson.globalAutoAckEnabled, false);
    assert.equal(firstJson.deliveryOutcome, 'SENT');
    assert.equal(firstJson.inquirySummary.ackStatus, 'SENT');
    assert.equal(sentPayloads.length, 1);
    assert.equal(sentPayloads[0].recipientEmail, 'tebo1980@gmail.com');
    assert.ok(sentPayloads[0].bodyText.includes(TWO_BUSINESS_DAYS_COMMITMENT_TEXT));
    assert.ok(sentPayloads[0].bodyText.includes('$99/month'));
    assert.ok(sentPayloads[0].bodyText.includes(VERIFIED_BARATRUST_CALENDAR_URL));

    // 6. Repeat operator call with same submissionKey is blocked (ALREADY_SENT) -> 0 second emails
    const repeatSameKeyRes = await harness.routes.customerInquiriesSync.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_SYNC_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_authorized_internal_test',
          recipientEmail: 'tebo1980@gmail.com',
          submissionKey: 'step2a_unit_test_001',
        }),
      })
    );
    const repeatSameJson = await repeatSameKeyRes.json();
    assert.equal(repeatSameJson.attempted, false);
    assert.equal(repeatSameJson.blockedReason, 'ALREADY_SENT');
    assert.equal(sentPayloads.length, 1);

    // 7. Repeat operator call with a brand-new submissionKey within 15m deduplicates by content fingerprint -> ALREADY_SENT, 0 new rows, 0 second emails
    const repeatNewKeyRes = await harness.routes.customerInquiriesSync.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_SYNC_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_authorized_internal_test',
          recipientEmail: 'tebo1980@gmail.com',
          submissionKey: 'step2a_unit_test_002_different_key',
        }),
      })
    );
    const repeatNewJson = await repeatNewKeyRes.json();
    assert.equal(repeatNewJson.attempted, false);
    assert.equal(repeatNewJson.deduplicatedSubmission, true);
    assert.equal(repeatNewJson.blockedReason, 'ALREADY_SENT');
    assert.equal(sentPayloads.length, 1);

    // 8. A distinct inquiry for tebo1980@gmail.com within 24h records SKIPPED_DUPLICATE_RECENT and sends 0 emails
    const distinctSameRecipientRes = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'step2a_distinct_inquiry_cooldown_check',
          name: 'Todd Followup',
          email: 'tebo1980@gmail.com',
          segment: 'BUSINESS',
          serviceCategory: 'GENERAL_INQUIRY',
          organizationName: 'BaraTrust Cooldown Check',
          message: 'Distinct follow-up inquiry text within 24 hours to verify cooldown.',
          privacyNoticeAccepted: true,
        }),
      })
    );
    assert.equal(distinctSameRecipientRes.status, 200);
    const cooldownRows = harness.rawQuery(
      "SELECT ack_status FROM website_customer_inquiries WHERE external_submission_key = 'web_step2a_distinct_inquiry_cooldown_check'"
    );
    assert.equal(cooldownRows.length, 1);
    assert.equal(cooldownRows[0].ack_status, 'SKIPPED_DUPLICATE_RECENT');
    assert.equal(sentPayloads.length, 1);
  } finally {
    harness.close();
    resetPhaseCEnv();
  }
});

test('Final Activation — CUSTOMER_AUTO_ACK_ENABLED=true dispatches approved Business, Consumer, and Reality Check templates with single booking link and preserves AWAITING_HUMAN_REVIEW', async () => {
  resetPhaseCEnv();
  process.env.CUSTOMER_AUTO_ACK_ENABLED = 'true';
  process.env.CUSTOMER_RESPONSE_BUSINESS_DAYS = '2';
  const harness = await createAcquisitionTestHarness();

  const delivered: AckMailerInput[] = [];
  setAckMailerTestTransport(async (input) => {
    delivered.push(input);
    return {
      outcome: 'SENT',
      provider: 'MOCK_ADAPTER',
      messageId: `<live-ack-${delivered.length}@baratrust.com>`,
      error: null,
    };
  });

  try {
    // 1. Business Contact Form path (with scheduling FAQ trigger) -> BUSINESS_INQUIRY, single booking link, SENT, AWAITING_HUMAN_REVIEW
    const bizRes = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'final_act_biz_001',
          name: 'Rachel Meyer',
          email: 'rachel@meyerbakery.example',
          segment: 'BUSINESS',
          serviceCategory: 'BUSINESS_PULSE',
          organizationName: 'Meyer Bakery',
          message: 'How much is Business Pulse and how can I schedule a call this week?',
          privacyNoticeAccepted: true,
        }),
      })
    );
    assert.equal(bizRes.status, 200);
    const bizJson = await bizRes.json();
    assert.equal(bizJson.acknowledgmentSent, true);
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].subject, 'We received your business inquiry — BaraTrust');
    assert.ok(delivered[0].bodyText.includes(TWO_BUSINESS_DAYS_COMMITMENT_TEXT));
    assert.ok(delivered[0].bodyText.includes('free ($0)'));
    assert.ok(delivered[0].bodyText.includes('$99/month'));
    assert.equal(
      delivered[0].bodyText.split(VERIFIED_BARATRUST_CALENDAR_URL).length - 1,
      1,
      'Business inquiry acknowledgment must contain exactly 1 Google Calendar URL'
    );

    // 2. Consumer Contact Form path -> CONSUMER_INQUIRY, single booking link, SENT, AWAITING_HUMAN_REVIEW
    const conRes = await harness.routes.customerInquiries.POST(
      new Request('https://www.baratrust.com/api/customer-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionKey: 'final_act_con_001',
          name: 'David Brooks',
          email: 'david@personalclient.example',
          segment: 'CONSUMER',
          serviceCategory: 'CONSUMER_DECISION_RESEARCH',
          message: 'Can you research two assisted-living facilities and how do I book a time?',
          privacyNoticeAccepted: true,
        }),
      })
    );
    assert.equal(conRes.status, 200);
    const conJson = await conRes.json();
    assert.equal(conJson.acknowledgmentSent, true);
    assert.equal(delivered.length, 2);
    assert.equal(delivered[1].subject, 'We received your research request — BaraTrust');
    assert.ok(delivered[1].bodyText.includes(TWO_BUSINESS_DAYS_COMMITMENT_TEXT));
    assert.ok(delivered[1].bodyText.includes('provide a clear quote after reviewing the scope'));
    assert.equal(
      delivered[1].bodyText.split(VERIFIED_BARATRUST_CALENDAR_URL).length - 1,
      1,
      'Consumer inquiry acknowledgment must contain exactly 1 Google Calendar URL'
    );

    // 3. Reality Check "Discuss My Results" path -> BUSINESS_INQUIRY, single booking link, SENT, AWAITING_HUMAN_REVIEW
    const scanRes = await harness.routes.realityCheck.POST(
      new Request('https://www.baratrust.com/api/reality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: 'https://clarksvilleplumbing.example',
          businessName: 'Clarksville Plumbing',
          cityState: 'Clarksville, IN',
        }),
      })
    );
    const scanJson = await scanRes.json();
    const rcPatchRes = await harness.routes.realityCheck.PATCH(
      new Request('https://www.baratrust.com/api/reality-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: scanJson.shareToken,
          email: 'owner@clarksvilleplumbing.example',
          ownerName: 'Mark Owner',
          primaryHeadache: 'How do I schedule a call to discuss Business Pulse?',
        }),
      })
    );
    assert.equal(rcPatchRes.status, 200);
    assert.equal(delivered.length, 3);
    assert.equal(delivered[2].subject, 'We received your business inquiry — BaraTrust');
    assert.equal(
      delivered[2].bodyText.split(VERIFIED_BARATRUST_CALENDAR_URL).length - 1,
      1,
      'Reality Check inquiry acknowledgment must contain exactly 1 Google Calendar URL'
    );

    // 4. Verify all 3 inquiries recorded SENT ack status while human_status remains AWAITING_HUMAN_REVIEW (auto-ack never counts as human response)
    const dbRows = harness.rawQuery(
      'SELECT external_submission_key, ack_template_key, ack_status, ack_message_id, ack_sent_at, human_status FROM website_customer_inquiries ORDER BY submitted_at ASC'
    );
    assert.equal(dbRows.length, 3);
    for (const r of dbRows) {
      assert.equal(r.ack_status, 'SENT');
      assert.ok(r.ack_message_id);
      assert.ok(r.ack_sent_at);
      assert.equal(r.human_status, 'AWAITING_HUMAN_REVIEW');
    }
    assert.equal(dbRows[0].ack_template_key, 'BUSINESS_INQUIRY');
    assert.equal(dbRows[1].ack_template_key, 'CONSUMER_INQUIRY');
    assert.equal(dbRows[2].ack_template_key, 'BUSINESS_INQUIRY');
  } finally {
    harness.close();
    resetPhaseCEnv();
  }
});
