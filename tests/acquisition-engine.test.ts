import test from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import * as schema from '../src/db/schema';
import { resetRateLimitStoreForTests, FOLLOWUP_CLAIM_COOKIE_NAME } from '../src/lib/security/public-guard';
import { buildSafeAnalyticsPayload } from '../src/lib/analytics';
import { buildManualEmailComposeLinks } from '../src/lib/acquisition/service';
import { SampleBusinessPulsePreview, ILLUSTRATIVE_RETAIL_PULSE_ITEMS } from '../src/components/SampleBusinessPulse';
import { loadModule } from './helpers/publication-harness';
import { createAcquisitionTestHarness } from './helpers/acquisition-harness';

function extractCookieValue(setCookieHeader: string | null, name: string): string | null {
  if (!setCookieHeader) return null;
  const match = new RegExp(`${name}=([^;]+)`).exec(setCookieHeader);
  return match ? match[1] : null;
}

test('Acquisition Engine V1 — Operator Auth & Verified Clerk Identity Enforcement', async () => {
  const prevIds = process.env.OPERATOR_CLERK_USER_IDS;
  const prevEmails = process.env.OPERATOR_EMAILS;
  const harness = await createAcquisitionTestHarness();

  try {
    // 1. Unauthenticated -> 401
    harness.setClerkUser(null);
    const unauthRes = await harness.routes.acquisition.GET();
    assert.equal(unauthRes.status, 401);

    // 2. Non-operator authenticated Clerk user -> 403
    harness.setClerkUser({
      id: 'user_random_visitor',
      primaryEmailAddress: {
        emailAddress: 'visitor@otherbusiness.com',
        verification: { status: 'verified' },
      },
    });
    const nonOpRes = await harness.routes.acquisition.GET();
    assert.equal(nonOpRes.status, 403);

    // 3. Unverified email claim for Todd -> MUST be rejected (403)
    harness.setClerkUser({
      id: 'user_spoof_attempt',
      primaryEmailAddress: {
        emailAddress: 'todd@baratrust.com',
        verification: { status: 'unverified' },
      },
    });
    const unverifiedToddRes = await harness.routes.acquisition.GET();
    assert.equal(unverifiedToddRes.status, 403);

    // 4. Verified Todd Clerk identity -> 200
    harness.setClerkUser({
      id: 'user_todd_real',
      firstName: 'Todd',
      primaryEmailAddress: {
        emailAddress: 'todd@baratrust.com',
        verification: { status: 'verified' },
      },
    });
    const toddOkRes = await harness.routes.acquisition.GET();
    assert.equal(toddOkRes.status, 200);

    // 5. Noelah authorized via verified Clerk User ID (OPERATOR_CLERK_USER_IDS) -> 200
    process.env.OPERATOR_CLERK_USER_IDS = 'user_noelah_verified_id';
    harness.setClerkUser({
      id: 'user_noelah_verified_id',
      firstName: 'Noelah',
      primaryEmailAddress: {
        emailAddress: 'noelah@example.org',
        verification: { status: 'verified' },
      },
    });
    const noelahByIdRes = await harness.routes.acquisition.GET();
    assert.equal(noelahByIdRes.status, 200);

    // 6. Noelah authorized via verified email (OPERATOR_EMAILS) -> 200 when verified, 403 when unverified
    delete process.env.OPERATOR_CLERK_USER_IDS;
    process.env.OPERATOR_EMAILS = 'noelah.verified@baratrust.test';

    harness.setClerkUser({
      id: 'user_noelah_unverified_email',
      primaryEmailAddress: {
        emailAddress: 'noelah.verified@baratrust.test',
        verification: { status: 'unverified' },
      },
    });
    const noelahUnverifiedRes = await harness.routes.acquisition.GET();
    assert.equal(noelahUnverifiedRes.status, 403);

    harness.setClerkUser({
      id: 'user_noelah_verified_email',
      firstName: 'Noelah',
      primaryEmailAddress: {
        emailAddress: 'noelah.verified@baratrust.test',
        verification: { status: 'verified' },
      },
    });
    const noelahVerifiedRes = await harness.routes.acquisition.GET();
    assert.equal(noelahVerifiedRes.status, 200);
  } finally {
    if (prevIds === undefined) delete process.env.OPERATOR_CLERK_USER_IDS;
    else process.env.OPERATOR_CLERK_USER_IDS = prevIds;
    if (prevEmails === undefined) delete process.env.OPERATOR_EMAILS;
    else process.env.OPERATOR_EMAILS = prevEmails;
    harness.close();
  }
});

test('Acquisition Engine V1 — Public Analytics PII Blocking & Rate Limiting', async () => {
  resetRateLimitStoreForTests();
  process.env.TEST_ENFORCE_RATE_LIMIT = 'true';
  const harness = await createAcquisitionTestHarness();

  try {
    // Unit-level strict schema blocks PII keys
    assert.equal(
      buildSafeAnalyticsPayload({
        eventName: 'discuss_results_submitted',
        surface: 'post_scan',
        email: 'owner@shop.com',
      }),
      null
    );
    assert.deepEqual(
      buildSafeAnalyticsPayload({
        eventName: 'booking_link_clicked',
        surface: 'hero',
      }),
      { eventName: 'booking_link_clicked', surface: 'hero' }
    );

    // Endpoint rejects payload containing personal contact info (400)
    const piiRes = await harness.routes.conversionEvent.POST(
      new Request('https://baratrust.test/api/conversion-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.10',
        },
        body: JSON.stringify({
          eventName: 'discuss_results_submitted',
          surface: 'post_scan',
          email: 'leak@shop.com',
          phone: '502-555-0100',
        }),
      })
    );
    assert.equal(piiRes.status, 400);

    // Endpoint accepts clean non-PII event
    const okRes = await harness.routes.conversionEvent.POST(
      new Request('https://baratrust.test/api/conversion-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.11',
        },
        body: JSON.stringify({
          eventName: 'reality_check_started',
          surface: 'hero',
        }),
      })
    );
    assert.equal(okRes.status, 200);

    // Rate limiting triggers 429 on excessive calls from same IP
    let hit429 = false;
    for (let i = 0; i < 45; i++) {
      const r = await harness.routes.conversionEvent.POST(
        new Request('https://baratrust.test/api/conversion-event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '203.0.113.99',
          },
          body: JSON.stringify({
            eventName: 'sample_pulse_viewed',
            surface: 'pulse_section',
          }),
        })
      );
      if (r.status === 429) {
        hit429 = true;
        break;
      }
    }
    assert.equal(hit429, true);
  } finally {
    delete process.env.TEST_ENFORCE_RATE_LIMIT;
    resetRateLimitStoreForTests();
    harness.close();
  }
});

test('Acquisition Engine V1 — End-to-End Reality Check, Discuss Results, Protection, AI Review, Manual Outreach & Deduplicated Metrics', async () => {
  resetRateLimitStoreForTests();
  const harness = await createAcquisitionTestHarness();

  try {
    // 1. Honeypot on Reality Check scan is rejected
    const botScanRes = await harness.routes.realityCheck.POST(
      new Request('https://baratrust.test/api/reality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.5' },
        body: JSON.stringify({
          website: 'https://newalbanyhardware.example',
          websiteConfirm: 'http://spam-bot.example',
        }),
      })
    );
    assert.equal(botScanRes.status, 400);

    // 2. Email-free Reality Check scan succeeds immediately
    const scanRes = await harness.routes.realityCheck.POST(
      new Request('https://baratrust.test/api/reality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.6' },
        body: JSON.stringify({
          website: 'https://newalbanyhardware.example',
        }),
      })
    );
    assert.equal(scanRes.status, 200);
    const scanJson = await scanRes.json();
    assert.equal(scanJson.success, true);
    assert.equal(scanJson.humanReviewRequested, false);
    assert.equal(scanJson.status, 'AUTO_SCAN_COMPLETE');
    const shareToken: string = scanJson.shareToken;
    assert.ok(shareToken.length >= 16);

    // 3. Honeypot on Discuss My Results PATCH does not mutate record
    const botPatchRes = await harness.routes.realityCheck.PATCH(
      new Request('https://baratrust.test/api/reality-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.7' },
        body: JSON.stringify({
          shareToken,
          email: 'bot@spam.example',
          websiteConfirm: 'filled-by-bot',
        }),
      })
    );
    const botPatchJson = await botPatchRes.json();
    assert.equal(botPatchJson.ignored, true);

    // 4. Legitimate visitor submits "Discuss My Results" optional follow-up
    const discussRes = await harness.routes.realityCheck.PATCH(
      new Request('https://baratrust.test/api/reality-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.6' },
        body: JSON.stringify({
          shareToken,
          email: 'dana@newalbanyhardware.example',
          ownerName: 'Dana Mercer',
          businessName: 'New Albany Hardware & Supply',
          phone: '812-555-0142',
          preferredContactMethod: 'INTRO_CALL',
          followUpNote: 'Interested in local seasonal event ideas and mobile tap-to-call fix.',
        }),
      })
    );
    assert.equal(discussRes.status, 200);
    const claimCookie = extractCookieValue(
      discussRes.headers.get('set-cookie'),
      FOLLOWUP_CLAIM_COOKIE_NAME
    );
    assert.ok(claimCookie, 'Signed HttpOnly claim cookie must be issued');

    // 5. Unauthorized modification with conflicting email is blocked (409)
    const hijackPatchRes = await harness.routes.realityCheck.PATCH(
      new Request('https://baratrust.test/api/reality-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.8' },
        body: JSON.stringify({
          shareToken,
          email: 'attacker@evil.example',
          businessName: 'Hijacked Name',
        }),
      })
    );
    assert.equal(hijackPatchRes.status, 409);

    // 6. Questionnaire protection: unverified third party cannot post (403)
    const unverifiedQuestPost = await harness.routes.questionnaire.POST(
      new Request('https://baratrust.test/api/reality-check/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.9' },
        body: JSON.stringify({
          shareToken,
          biggestProblem: 'Attacker overwrite attempt',
        }),
      })
    );
    assert.equal(unverifiedQuestPost.status, 403);

    // Verified claimant with signed cookie succeeds (200)
    const validQuestPost = await harness.routes.questionnaire.POST(
      new Request('https://baratrust.test/api/reality-check/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${FOLLOWUP_CLAIM_COOKIE_NAME}=${claimCookie}`,
          'x-forwarded-for': '198.51.100.6',
        },
        body: JSON.stringify({
          shareToken,
          biggestProblem: 'Contractors cannot tap our number easily from mobile search.',
        }),
      })
    );
    assert.equal(validQuestPost.status, 200);

    // Unverified GET hides private owner responses; verified GET exposes them
    const anonQuestGet = await harness.routes.questionnaire.GET(
      new Request(
        `https://baratrust.test/api/reality-check/questionnaire?shareToken=${shareToken}`,
        { headers: { 'x-forwarded-for': '198.51.100.9' } }
      )
    );
    const anonQuestJson = await anonQuestGet.json();
    assert.equal(anonQuestJson.responses, null);

    const ownerQuestGet = await harness.routes.questionnaire.GET(
      new Request(
        `https://baratrust.test/api/reality-check/questionnaire?shareToken=${shareToken}`,
        {
          headers: {
            cookie: `${FOLLOWUP_CLAIM_COOKIE_NAME}=${claimCookie}`,
            'x-forwarded-for': '198.51.100.6',
          },
        }
      )
    );
    const ownerQuestJson = await ownerQuestGet.json();
    assert.match(ownerQuestJson.responses.biggestProblem, /Contractors cannot tap/);

    // Lock check: once Reality Check is PUBLISHED, questionnaire edits are blocked (409)
    await harness.db
      .update(schema.realityChecks)
      .set({ status: 'PUBLISHED' })
      .where(eq(schema.realityChecks.shareToken, shareToken));

    const lockedQuestPost = await harness.routes.questionnaire.POST(
      new Request('https://baratrust.test/api/reality-check/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${FOLLOWUP_CLAIM_COOKIE_NAME}=${claimCookie}`,
          'x-forwarded-for': '198.51.100.6',
        },
        body: JSON.stringify({
          shareToken,
          biggestProblem: 'Attempted post-publish mutation',
        }),
      })
    );
    assert.equal(lockedQuestPost.status, 409);

    // 7. Operator imports inbound "Discuss My Results" lead into Acquisition Engine
    const wsInitialRes = await harness.routes.acquisition.GET();
    const wsInitial = await wsInitialRes.json();
    assert.equal(wsInitial.unimportedDiscussLeads.length, 1);
    const inboundRcId: string = wsInitial.unimportedDiscussLeads[0].id;

    const importRes = await harness.routes.acquisition.POST(
      new Request('https://baratrust.test/api/internal/acquisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importFromRealityCheckId: inboundRcId }),
      })
    );
    assert.equal(importRes.status, 201);
    const importedProspect = (await importRes.json()).prospect;
    assert.equal(importedProspect.permissionStatus, 'INBOUND_REQUEST');
    assert.equal(importedProspect.stage, 'CONVERSATION_STARTED');

    // 8. SMS contact method is strictly rejected (400)
    const smsRejectRes = await harness.routes.acquisition.POST(
      new Request('https://baratrust.test/api/internal/acquisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: 'SMS Test Co',
          location: 'Louisville, KY',
          industry: 'Retail',
          contactMethod: 'SMS',
        }),
      })
    );
    assert.equal(smsRejectRes.status, 400);

    // 9. Operator adds a researched local prospect
    const createRes = await harness.routes.acquisition.POST(
      new Request('https://baratrust.test/api/internal/acquisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: 'Falls City Outfitters',
          location: 'Jeffersonville, IN',
          industry: 'Specialty Retail',
          websiteUrl: 'https://fallscityoutfitters.example',
          sourceUrls: [
            {
              label: 'Riverfront Trail Event Vendor Packet',
              url: 'https://jeffersonvilleparks.example/vendor-packet',
            },
          ],
          researchNotes:
            'Well-run outdoor retail shop in Jeffersonville; upcoming riverfront trail kickoff vendor deadline closes in 3 weeks.',
          decisionMakerName: 'Samir Patel',
          decisionMakerRole: 'Owner',
          decisionMakerSource: 'Public website About Us page',
          contactMethod: 'EMAIL',
          contactValue: 'samir@fallscityoutfitters.example',
          permissionStatus: 'PUBLIC_BUSINESS_CONTACT',
        }),
      })
    );
    assert.equal(createRes.status, 201);
    const prospectId: string = (await createRes.json()).prospect.id;

    // 10. Run AI Assist -> stamped UNVERIFIED_AI and AI_DRAFTED; outreach MUST still be blocked!
    const assistRes = await harness.routes.acquisitionAssist.POST(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}/assist`, {
        method: 'POST',
      }),
      { params: Promise.resolve({ prospectId }) }
    );
    assert.equal(assistRes.status, 200);
    const assisted = (await assistRes.json()).prospect;
    assert.equal(assisted.assessmentStatus, 'UNVERIFIED_AI');
    assert.equal(assisted.draftStatus, 'AI_DRAFTED');
    assert.equal(assisted.approvedBy, null);

    // Attempt to log outreach BEFORE human approval -> MUST fail (400)
    const prematureSendRes = await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOG_OUTREACH_SENT',
          channel: 'EMAIL',
        }),
      }),
      { params: Promise.resolve({ prospectId }) }
    );
    assert.equal(prematureSendRes.status, 400);

    // 11. Human verifies fit assessment -> HUMAN_REVIEWED
    const verifyRes = await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_ASSESSMENT',
          fitScore: 88,
          fitExplanation: 'Verified strong local Grow fit in Jeffersonville.',
        }),
      }),
      { params: Promise.resolve({ prospectId }) }
    );
    assert.equal(verifyRes.status, 200);
    assert.equal((await verifyRes.json()).prospect.assessmentStatus, 'HUMAN_REVIEWED');

    // 12. Human approves outreach draft -> APPROVED_FOR_OUTREACH
    const approveRes = await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE_DRAFT',
          outreachSubject: 'Quick Jeffersonville riverfront event note for Falls City Outfitters',
          outreachDraft: assisted.outreachDraft,
        }),
      }),
      { params: Promise.resolve({ prospectId }) }
    );
    assert.equal(approveRes.status, 200);
    const approvedProspect = (await approveRes.json()).prospect;
    assert.equal(approvedProspect.draftStatus, 'APPROVED_FOR_OUTREACH');
    assert.equal(approvedProspect.stage, 'APPROVED_FOR_OUTREACH');

    // 13. Editing an approved draft resets approval back to EDITED and blocks outreach until re-approved
    const editRes = await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_FIELDS',
          outreachDraft: `${assisted.outreachDraft}\n\nP.S. Happy to share the organizer link directly.`,
        }),
      }),
      { params: Promise.resolve({ prospectId }) }
    );
    const editedProspect = (await editRes.json()).prospect;
    assert.equal(editedProspect.draftStatus, 'EDITED');
    assert.equal(editedProspect.approvedBy, null);

    const blockedAfterEditRes = await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LOG_OUTREACH_SENT', channel: 'EMAIL' }),
      }),
      { params: Promise.resolve({ prospectId }) }
    );
    assert.equal(blockedAfterEditRes.status, 400);

    // 14. Re-approve edited draft & verify manual Gmail/mailto compose does NOT mark sent
    const reapproveRes = await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE_DRAFT',
          outreachSubject: editedProspect.outreachSubject,
          outreachDraft: editedProspect.outreachDraft,
        }),
      }),
      { params: Promise.resolve({ prospectId }) }
    );
    assert.equal(reapproveRes.status, 200);

    const composeLinks = buildManualEmailComposeLinks({
      toEmail: editedProspect.contactValue,
      subject: editedProspect.outreachSubject,
      body: editedProspect.outreachDraft,
    });
    assert.ok(composeLinks?.gmailComposeHref.startsWith('https://mail.google.com/mail/?view=cm'));
    assert.ok(composeLinks?.mailtoHref.startsWith('mailto:'));

    const checkBeforeSend = await harness.routes.acquisitionDetail.GET(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}`),
      { params: Promise.resolve({ prospectId }) }
    );
    const beforeSendJson = await checkBeforeSend.json();
    assert.equal(beforeSendJson.prospect.outreachSentAt, null);
    assert.equal(beforeSendJson.prospect.stage, 'APPROVED_FOR_OUTREACH');

    // 15. Explicit LOG_OUTREACH_SENT records sent timestamp & contact history
    const logSentRes = await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOG_OUTREACH_SENT',
          channel: 'EMAIL',
          summary: 'Sent personal 1-to-1 email from Gmail.',
          nextFollowUpAt: '2026-11-14T13:00:00Z',
        }),
      }),
      { params: Promise.resolve({ prospectId }) }
    );
    assert.equal(logSentRes.status, 200);
    const afterSent = (await logSentRes.json()).prospect;
    assert.equal(afterSent.stage, 'OUTREACH_SENT');
    assert.ok(afterSent.outreachSentAt);

    // 16. Log inbound reply, confirmed meeting booked, meeting attended, and customer acquired
    await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOG_CONTACT_NOTE',
          direction: 'INBOUND',
          channel: 'EMAIL',
          summary: 'Samir replied asking for a 15-min chat Thursday morning.',
        }),
      }),
      { params: Promise.resolve({ prospectId }) }
    );

    await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_OUTCOME', stage: 'MEETING_BOOKED' }),
      }),
      { params: Promise.resolve({ prospectId }) }
    );

    await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_OUTCOME', stage: 'MEETING_ATTENDED' }),
      }),
      { params: Promise.resolve({ prospectId }) }
    );

    await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_OUTCOME', stage: 'CUSTOMER_ACQUIRED' }),
      }),
      { params: Promise.resolve({ prospectId }) }
    );

    // 17. Test Opt-Out / Do Not Contact enforcement on a third prospect
    const optOutCreateRes = await harness.routes.acquisition.POST(
      new Request('https://baratrust.test/api/internal/acquisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: 'Quiet Corner Cafe',
          location: 'Clarksville, IN',
          industry: 'Restaurant',
          contactMethod: 'EMAIL',
          contactValue: 'hello@quietcorner.example',
          outreachDraft: 'Initial draft message before opt-out.',
        }),
      })
    );
    const optOutId: string = (await optOutCreateRes.json()).prospect.id;

    const markOptOutRes = await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${optOutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MARK_OPT_OUT',
          reason: 'Owner asked not to receive outreach.',
        }),
      }),
      { params: Promise.resolve({ prospectId: optOutId }) }
    );
    assert.equal(markOptOutRes.status, 200);
    const optedOutProspect = (await markOptOutRes.json()).prospect;
    assert.equal(optedOutProspect.optOut, true);
    assert.equal(optedOutProspect.permissionStatus, 'DO_NOT_CONTACT');
    assert.equal(optedOutProspect.stage, 'OPTED_OUT');

    // Opted-out prospect blocks draft approval, outreach send, and AI assist
    const approveOptedOut = await harness.routes.acquisitionDetail.PATCH(
      new Request(`https://baratrust.test/api/internal/acquisition/${optOutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE_DRAFT',
          outreachDraft: 'Attempting to approve opted out prospect message.',
        }),
      }),
      { params: Promise.resolve({ prospectId: optOutId }) }
    );
    assert.equal(approveOptedOut.status, 400);

    const assistOptedOut = await harness.routes.acquisitionAssist.POST(
      new Request(`https://baratrust.test/api/internal/acquisition/${optOutId}/assist`, {
        method: 'POST',
      }),
      { params: Promise.resolve({ prospectId: optOutId }) }
    );
    assert.equal(assistOptedOut.status, 400);

    // 18. Verify booking link clicks stay separate from confirmed meetings AND customers/conversations deduplicate
    for (let i = 0; i < 3; i++) {
      await harness.routes.conversionEvent.POST(
        new Request('https://baratrust.test/api/conversion-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.50' },
          body: JSON.stringify({
            eventName: 'booking_link_clicked',
            surface: 'pulse_section',
          }),
        })
      );
    }

    // Insert matching Stripe active member row for Falls City Outfitters to test deduplication
    await harness.db.insert(schema.businesses).values({
      clerkId: 'user_samir_stripe',
      ownerName: 'Samir Patel',
      ownerEmail: 'samir@fallscityoutfitters.example',
      businessName: 'Falls City Outfitters',
      industry: 'Specialty Retail',
      tier: 'Active Member',
      isActive: true,
      stripeSubscriptionId: 'sub_live_test_123',
    });

    const finalWorkspaceRes = await harness.routes.acquisition.GET();
    const finalWorkspace = await finalWorkspaceRes.json();
    const m = finalWorkspace.measurements;

    assert.equal(m.prospectsResearched, 3);
    assert.equal(m.prospectsApprovedForOutreach, 1);
    assert.equal(m.realityChecksTotalScans, 1);
    assert.equal(m.realityChecksFollowUpRequests, 1);
    // Conversations started: New Albany Hardware (imported inbound RC — deduplicated!) + Falls City Outfitters = 2
    assert.equal(m.conversationsStarted, 2);
    // Confirmed meetings: ONLY Falls City Outfitters (1) — NOT inflated by the 3 Calendly clicks!
    assert.equal(m.meetingsBooked, 1);
    assert.equal(m.meetingsAttended, 1);
    assert.equal(m.unconfirmedBookingClicks, 3);
    // Business Pulse customers acquired: Falls City Outfitters in BOTH acquisition_prospects and businesses -> deduplicated to 1!
    assert.equal(m.businessPulseCustomersAcquired, 1);
  } finally {
    resetRateLimitStoreForTests();
    harness.close();
  }
});

test('Acquisition Engine V1 — Sample Business Pulse Illustrative Disclosures & 4-Pillar Structure', () => {
  assert.equal(ILLUSTRATIVE_RETAIL_PULSE_ITEMS.length, 4);
  assert.deepEqual(
    ILLUSTRATIVE_RETAIL_PULSE_ITEMS.map((i) => i.pillar),
    ['PROTECT', 'IMPROVE', 'GROW', 'SAVE']
  );

  const sampleCompMod = loadModule<typeof import('../src/components/SampleBusinessPulse')>(
    'src/components/SampleBusinessPulse.tsx',
    {}
  );
  const landingHtml = renderToStaticMarkup(
    React.createElement(sampleCompMod.SampleBusinessPulsePreview, { theme: 'landing' })
  );
  const darkHtml = renderToStaticMarkup(
    React.createElement(sampleCompMod.SampleBusinessPulsePreview, { theme: 'dark' })
  );
  const samplePageMod = loadModule<{ default: React.ComponentType }>(
    'src/app/sample-pulse/page.tsx',
    {
      '../landing.css': {},
      '@/components/SampleBusinessPulse': sampleCompMod,
      '@/components/ContactLinks': loadModule('src/components/ContactLinks.tsx', {}),
    }
  );
  const fullPageHtml = renderToStaticMarkup(React.createElement(samplePageMod.default));

  for (const html of [landingHtml, darkHtml, fullPageHtml]) {
    assert.match(html, /Illustrative/i);
    assert.match(html, /fictional/i);
    assert.match(html, /Riverbend Trail/i);
    assert.match(html, /No Change Recommended/i);
  }
  assert.match(
    fullPageHtml,
    /does not represent an actual customer, verified real-world business findings, or achieved financial results/i
  );
  assert.match(fullPageHtml, /\$99\/month/i);
});
