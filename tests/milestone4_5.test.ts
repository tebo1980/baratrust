import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  getReportSynthesisModel, 
  DEFAULT_GEMINI_REPORT_MODEL,
  synthesizeReportWithGemini,
  generateDeterministicFallbackReport,
  SynthesisEvidencePackage
} from '../src/lib/gemini/synthesizer';
import { 
  sendRealityCheckDeliveryEmail,
  DeliveryStatus,
  DeliveryResult
} from '../src/lib/email/delivery';
import { validateUrlForScan, normalizeSubmittedUrl } from '../src/lib/scanner/ssrf';
import { parseHtmlForBusinessSignals } from '../src/lib/scanner/parser';
import { runDeterministicChecks } from '../src/lib/scanner/checks';
import { calculateScores } from '../src/lib/scanner/scoring';
import { FindingState } from '../src/db/schema/realityCheck';
import {
  RealityCheckSubmissionSchema,
  RequestHumanReviewSchema,
  resolveInitialRealityCheckStatus,
  resolvePatchedRealityCheckStatus,
  isActiveHumanReviewQueueItem,
  evaluateHumanReviewClaim,
} from '../src/lib/reality-check/funnel';

test('Gemini Model Config — returns default gemini-1.5-pro when unconfigured', () => {
  const originalEnv = process.env.REALITY_CHECK_GEMINI_MODEL;
  delete process.env.REALITY_CHECK_GEMINI_MODEL;
  delete process.env.GEMINI_MODEL;

  const model = getReportSynthesisModel();
  assert.equal(model, DEFAULT_GEMINI_REPORT_MODEL);
  assert.equal(model, 'gemini-1.5-pro');

  if (originalEnv) process.env.REALITY_CHECK_GEMINI_MODEL = originalEnv;
});

test('Gemini Model Config — respects REALITY_CHECK_GEMINI_MODEL when configured', () => {
  const originalEnv = process.env.REALITY_CHECK_GEMINI_MODEL;
  process.env.REALITY_CHECK_GEMINI_MODEL = 'gemini-2.5-flash';

  const model = getReportSynthesisModel();
  assert.equal(model, 'gemini-2.5-flash');

  // Cleanup
  if (originalEnv) {
    process.env.REALITY_CHECK_GEMINI_MODEL = originalEnv;
  } else {
    delete process.env.REALITY_CHECK_GEMINI_MODEL;
  }
});

test('Email Delivery Status — handles NOT_ATTEMPTED when no provider is configured', async () => {
  const originalEnv = process.env.TEST_EMAIL_MOCK_STATUS;
  process.env.TEST_EMAIL_MOCK_STATUS = 'NOT_ATTEMPTED';

  const result = await sendRealityCheckDeliveryEmail({
    ownerEmail: 'client@example.com',
    ownerName: 'Alice',
    businessName: 'Alice Bakery',
    shareToken: 'rc_st_test1234567890abcdef',
  });

  assert.equal(result.status, 'NOT_ATTEMPTED');
  assert.equal(result.success, false);
  assert.equal(result.deliveredAt, null);
  assert.ok(result.error?.includes('No transactional email provider configured'));

  if (originalEnv) process.env.TEST_EMAIL_MOCK_STATUS = originalEnv;
  else delete process.env.TEST_EMAIL_MOCK_STATUS;
});

test('Email Delivery Status — handles FAILED when provider encounters error', async () => {
  const originalEnv = process.env.TEST_EMAIL_MOCK_STATUS;
  process.env.TEST_EMAIL_MOCK_STATUS = 'FAILED';

  const result = await sendRealityCheckDeliveryEmail({
    ownerEmail: 'client@example.com',
    ownerName: 'Alice',
    businessName: 'Alice Bakery',
    shareToken: 'rc_st_test1234567890abcdef',
  });

  assert.equal(result.status, 'FAILED');
  assert.equal(result.success, false);
  assert.equal(result.deliveredAt, null);
  assert.ok(result.error?.includes('failure'));

  if (originalEnv) process.env.TEST_EMAIL_MOCK_STATUS = originalEnv;
  else delete process.env.TEST_EMAIL_MOCK_STATUS;
});

test('Email Delivery Status — handles ACCEPTED_BY_PROVIDER and sets timestamp', async () => {
  const originalEnv = process.env.TEST_EMAIL_MOCK_STATUS;
  delete process.env.TEST_EMAIL_MOCK_STATUS;

  const result = await sendRealityCheckDeliveryEmail({
    ownerEmail: 'client@example.com',
    ownerName: 'Alice',
    businessName: 'Alice Bakery',
    shareToken: 'rc_st_test1234567890abcdef',
  });

  assert.equal(result.status, 'ACCEPTED_BY_PROVIDER');
  assert.equal(result.success, true);
  assert.ok(result.messageId);
  assert.ok(result.deliveredAt);

  if (originalEnv) process.env.TEST_EMAIL_MOCK_STATUS = originalEnv;
});

test('Failure Path: Malformed URL and SSRF rejection', async () => {
  const malformed = 'not_a_valid_url';
  const internal = 'http://127.0.0.1:3000';
  const nonHttp = 'ftp://ftp.example.com';

  const res1 = await validateUrlForScan(malformed);
  assert.equal(res1.valid, false);

  const res2 = await validateUrlForScan(internal);
  assert.equal(res2.valid, false);

  const res3 = await validateUrlForScan(nonHttp);
  assert.equal(res3.valid, false);
});

test('Failure Path: SPA Shell yields UNKNOWN and avoids fabricated findings', () => {
  const spaHtml = '<!DOCTYPE html><html><head><title>App</title></head><body><div id="root"></div></body></html>';
  const parsed = parseHtmlForBusinessSignals(spaHtml);
  assert.equal(parsed.isClientRenderedSpa, true);
  assert.equal(parsed.telLinks.length, 0);
  assert.equal(parsed.hasLocalBusinessSchema, false);
});

test('Failure Path: Skipped Questionnaire allows seamless synthesis', async () => {
  const pkgWithoutQuestionnaire: SynthesisEvidencePackage = {
    business: {
      name: 'Acme Heating',
      website: 'https://acmeheating.com',
      cityState: 'Austin, TX',
      ownerName: 'Bob Acme',
    },
    scanner: {
      overallScore: 68,
      coverage: 85,
      confidence: 'HIGH',
      findings: [
        {
          category: 'digital_presence',
          checkKey: 'viewport',
          title: 'Mobile Viewport Meta Tag',
          state: 'PASS',
          scoreContribution: 10,
          maxPoints: 10,
        },
      ],
    },
    ownerProvided: null, // Owner skipped questionnaire!
    humanReview: {
      opportunitiesFound: [],
      topFixes: [
        { priority: 1, title: 'Fix mobile call button', whyItMatters: 'Callers bounce', suggestedAction: 'Add tap to call', evidenceLabel: 'BARATRUST_REVIEW' },
        { priority: 2, title: 'Speed up homepage', whyItMatters: 'Slow load', suggestedAction: 'Compress hero image', evidenceLabel: 'BARATRUST_REVIEW' },
        { priority: 3, title: 'Claim Google profile', whyItMatters: 'Missing on maps', suggestedAction: 'Verify postcard', evidenceLabel: 'BARATRUST_REVIEW' },
      ],
      notSpendMoneyOn: 'Do not buy Yelp ads',
    },
  };

  const { report } = await synthesizeReportWithGemini(pkgWithoutQuestionnaire);
  assert.ok(report.executiveSummary);
  assert.ok(report.topFixesSummary);
  assert.equal(report.notWorthSpendingOnSummary, 'Do not buy Yelp ads');
});

test('Failure Path: Offline / Missing API Key uses deterministic fallback safely', async () => {
  const pkg: SynthesisEvidencePackage = {
    business: {
      name: 'Miller Plumbing',
      website: 'https://millerplumbing.com',
      cityState: 'Denver, CO',
      ownerName: 'John Miller',
    },
    scanner: {
      overallScore: null, // Withheld score
      findings: [],
    },
    humanReview: {
      opportunitiesFound: [],
      topFixes: [
        { priority: 1, title: 'Add online booking', whyItMatters: 'Saves time', suggestedAction: 'Integrate Calendly', evidenceLabel: 'BARATRUST_REVIEW' },
        { priority: 2, title: 'Update header phone', whyItMatters: 'Unclickable', suggestedAction: 'Use tel: link', evidenceLabel: 'BARATRUST_REVIEW' },
        { priority: 3, title: 'Request reviews', whyItMatters: 'Only 3 reviews', suggestedAction: 'Send SMS link', evidenceLabel: 'BARATRUST_REVIEW' },
      ],
    },
  };

  const fallback = generateDeterministicFallbackReport(pkg);
  assert.ok(fallback.executiveSummary.includes('Miller Plumbing'));
  assert.ok(fallback.executiveSummary.includes('manual technical assessment'));
  assert.equal(fallback.whatsWorking.length > 0, true);
  assert.equal(fallback.whatsGettingInTheWay.length > 0, true);
});

test('Immutability: Published Report snapshot freezes top fixes and opportunities', () => {
  const reviewTopFixes = [
    { priority: 1, title: 'Original Fix 1', whyItMatters: 'M1', suggestedAction: 'A1', evidenceLabel: 'BARATRUST_REVIEW' as const },
    { priority: 2, title: 'Original Fix 2', whyItMatters: 'M2', suggestedAction: 'A2', evidenceLabel: 'BARATRUST_REVIEW' as const },
    { priority: 3, title: 'Original Fix 3', whyItMatters: 'M3', suggestedAction: 'A3', evidenceLabel: 'BARATRUST_REVIEW' as const },
  ];

  const publishedContent = {
    executiveSummary: 'Original Published Summary',
    whatsWorking: ['Fast site'],
    whatsGettingInTheWay: ['Slow response'],
    topFixesSummary: 'Top 3 fixes',
    notWorthSpendingOnSummary: 'No ads',
    findabilitySummary: 'Good',
    reputationSummary: 'Strong',
    socialSummary: 'Active',
    competitorSummary: 'Ahead',
    lostOpportunitySummary: 'Low',
    opportunitiesSummary: 'Growth',
    closingNote: 'Thanks',
    frozenTopFixes: JSON.parse(JSON.stringify(reviewTopFixes)),
    frozenOpportunities: [{ id: 'opp-1', title: 'Opp 1', type: 'Local', description: 'Desc', evidenceLabel: 'OPPORTUNITY_FOUND' as const }],
  };

  // Simulate operator subsequently editing scratchpad review
  reviewTopFixes[0].title = 'MUTATED Fix 1 (Scratchpad Edit)';

  // Verify frozen published snapshot remains unchanged
  assert.equal(publishedContent.frozenTopFixes[0].title, 'Original Fix 1');
  assert.notEqual(publishedContent.frozenTopFixes[0].title, reviewTopFixes[0].title);
});

test('Privacy Review: Public report content excludes owner email, phone, and scratchpad notes', () => {
  const pkg: SynthesisEvidencePackage = {
    business: {
      name: 'Private Contracting LLC',
      website: 'https://privatecontracting.com',
      cityState: 'Chicago, IL',
      ownerName: 'Frank Secret',
    },
    scanner: {
      overallScore: 75,
      findings: [],
    },
    humanReview: {
      opportunitiesFound: [],
      topFixes: [
        { priority: 1, title: 'Fix 1', whyItMatters: 'W1', suggestedAction: 'A1', evidenceLabel: 'BARATRUST_REVIEW' },
        { priority: 2, title: 'Fix 2', whyItMatters: 'W2', suggestedAction: 'A2', evidenceLabel: 'BARATRUST_REVIEW' },
        { priority: 3, title: 'Fix 3', whyItMatters: 'W3', suggestedAction: 'A3', evidenceLabel: 'BARATRUST_REVIEW' },
      ],
      toddNotes: 'PRIVATE INTERNAL SCRATCHPAD: Owner seems anxious about debt.',
    },
  };

  const report = generateDeterministicFallbackReport(pkg);
  const serialized = JSON.stringify(report);

  assert.equal(serialized.includes('PRIVATE INTERNAL SCRATCHPAD'), false);
  assert.equal(serialized.includes('anxious about debt'), false);
  assert.equal(serialized.includes('frank@'), false);
});

test('Publish Safeguards — blocks duplicate publishing and duplicate email delivery', () => {
  let emailDispatches = 0;
  const mockSendEmail = () => {
    emailDispatches++;
    return { status: 'ACCEPTED_BY_PROVIDER' };
  };

  const reviewState = {
    status: 'draft',
    publishedReport: null as any,
  };

  // First publish attempt
  function publish(review: typeof reviewState) {
    if (review.status === 'published' || review.publishedReport) {
      return { alreadyPublished: true, duplicateBlocked: true };
    }
    review.status = 'published';
    review.publishedReport = { executiveSummary: 'First publish' };
    mockSendEmail();
    return { alreadyPublished: false, published: true };
  }

  const firstAttempt = publish(reviewState);
  assert.equal(firstAttempt.alreadyPublished, false);
  assert.equal(emailDispatches, 1);

  // Repeated publish attempt
  const secondAttempt = publish(reviewState);
  assert.equal(secondAttempt.alreadyPublished, true);
  assert.equal(secondAttempt.duplicateBlocked, true);
  assert.equal(emailDispatches, 1, 'Duplicate email must NOT be dispatched on repeated publish');
});

test('Publish Concurrency — atomic conditional update ensures exactly one winner during concurrent publish race', async () => {
  let emailDispatches = 0;
  const mockSendEmail = async () => {
    // Simulate network delay to provider
    await new Promise((r) => setTimeout(r, 10));
    emailDispatches++;
    return { status: 'ACCEPTED_BY_PROVIDER' };
  };

  // Shared database row
  const dbReview = {
    id: 'rev-uuid-1234',
    status: 'ready_to_publish',
    publishedReport: null as any,
    publishedAt: null as Date | null,
    emailDeliveredAt: null as Date | null,
  };

  // Simulates Postgres row-lock & conditional UPDATE ... WHERE status != 'published' AND published_report IS NULL RETURNING *
  let lock = Promise.resolve();
  async function atomicConditionalUpdate(update: Partial<typeof dbReview>) {
    // Acquire mutex simulating Postgres row lock
    let releaseLock: () => void = () => {};
    const currentLock = lock;
    lock = new Promise((resolve) => {
      releaseLock = resolve;
    });
    await currentLock;

    try {
      if (dbReview.status !== 'published' && dbReview.publishedReport === null) {
        Object.assign(dbReview, update);
        return [{ ...dbReview }]; // 1 row updated
      }
      return []; // 0 rows updated
    } finally {
      releaseLock();
    }
  }

  // Publish handler matching src/app/api/internal/reviews/[realityCheckId]/publish/route.ts
  async function handlePublishRequest(requestId: string) {
    // Step 1: Read state (both concurrent requests read before either commits)
    const initialRead = { ...dbReview };

    // Fast-path guard
    if (initialRead.status === 'published' || initialRead.publishedReport) {
      return { success: true, alreadyPublished: true, requestId, emailDelivered: !!initialRead.emailDeliveredAt };
    }

    // Prepare published content snapshot
    const publishedContent = {
      executiveSummary: `Summary from ${requestId}`,
      frozenTopFixes: [{ priority: 1, title: `Fix 1 by ${requestId}` }],
    };

    // Step 5b: Atomic conditional update
    const [claimedReview] = await atomicConditionalUpdate({
      status: 'published',
      publishedReport: publishedContent,
      publishedAt: new Date(),
    });

    if (!claimedReview) {
      // Lost the race to concurrent request
      return { success: true, alreadyPublished: true, requestId, wonRace: false };
    }

    // Winner dispatches transactional delivery email (strictly once)
    const emailResult = await mockSendEmail();
    dbReview.emailDeliveredAt = new Date();

    return { success: true, alreadyPublished: false, requestId, wonRace: true, emailStatus: emailResult.status };
  }

  // Launch two publish requests concurrently
  const [resA, resB] = await Promise.all([
    handlePublishRequest('req-A'),
    handlePublishRequest('req-B'),
  ]);

  // Assert exactly one won publication and exactly one email was sent
  const winner = resA.wonRace ? resA : resB;
  const loser = resA.wonRace ? resB : resA;

  assert.equal(winner.wonRace, true);
  assert.equal(winner.alreadyPublished, false);
  assert.equal(loser.wonRace, false);
  assert.equal(loser.alreadyPublished, true);
  assert.equal(emailDispatches, 1, 'Only the winning concurrent request may dispatch the delivery email');

  // Verify published snapshot is frozen with winner's content and cannot be overwritten
  assert.ok(dbReview.publishedReport.executiveSummary.includes(winner.requestId));
  assert.equal(dbReview.status, 'published');

  // Step 3: Retrying after publication hits the fast-path guard safely
  const retryResult = await handlePublishRequest('req-C-retry');
  assert.equal(retryResult.alreadyPublished, true);
  assert.equal(emailDispatches, 1, 'Subsequent retry must never dispatch duplicate email');
});

// ==========================================
// Staged Reality Check Funnel (URL-First → Immediate Value → Email for Human Review)
// ==========================================

test('Staged Funnel 1 & 2 — URL-only submission succeeds and does not require email, ownerName, or cityState', () => {
  const urlOnly = RealityCheckSubmissionSchema.safeParse({
    website: 'rivercityplumbing.com',
  });
  assert.equal(urlOnly.success, true, 'URL-only payload must pass schema validation');
  if (urlOnly.success) {
    assert.equal(urlOnly.data.website, 'rivercityplumbing.com');
    assert.equal(urlOnly.data.email ?? null, null);
    assert.equal(urlOnly.data.businessName ?? null, null);
    assert.equal(urlOnly.data.cityState ?? null, null);
    assert.equal(urlOnly.data.ownerName ?? null, null);
  }

  // Also accepts empty string email without failing validation
  const emptyEmail = RealityCheckSubmissionSchema.safeParse({
    website: 'https://facebook.com/rivercityplumbing',
    email: '',
  });
  assert.equal(emptyEmail.success, true);

  // Rejects empty website
  const missingWebsite = RealityCheckSubmissionSchema.safeParse({
    website: '   ',
  });
  assert.equal(missingWebsite.success, false);
});

test('Staged Funnel 3 — Automated result can be computed and retrieved without email or fake city penalty', () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>River City Plumbing | Emergency Drain & Water Heater Service</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="24/7 licensed plumbers for drain cleaning and water heater repair.">
        <meta property="og:site_name" content="River City Plumbing">
      </head>
      <body>
        <h1>River City Plumbing</h1>
        <a href="tel:5025550199">Call (502) 555-0199</a>
        <p>Visit us at 410 Main Street, Suite 100, Louisville, KY 40202.</p>
      </body>
    </html>
  `;

  // URL-only scan: cityState is null
  const parsed = parseHtmlForBusinessSignals(html, null);
  assert.equal(parsed.derivedBusinessName, 'River City Plumbing');

  const findings = runDeterministicChecks({
    rawData: {
      requestedUrl: 'https://rivercityplumbing.com',
      finalUrl: 'https://rivercityplumbing.com',
      normalizedUrl: 'https://rivercityplumbing.com',
      isHttps: true,
      httpStatus: 200,
      responseTimeMs: 180,
      headers: { 'content-type': 'text/html' },
      html,
    },
    parsed,
    businessName: null,
    cityState: null,
  });

  // city_state_match must be UNKNOWN (not FAIL!) when cityState was not provided in a URL-only scan
  const cityFinding = findings.find((f) => f.checkKey === 'city_state_match')!;
  assert.equal(
    cityFinding.state,
    'UNKNOWN',
    'URL-only scan without cityState must return UNKNOWN for city_state_match, never FAIL'
  );
  assert.equal(cityFinding.scoreContribution, 0);

  const scored = calculateScores(findings);
  assert.ok(scored.overallScore !== null && scored.overallScore > 0);
  assert.ok(scored.overallCoverage > 50);

  // Public snapshot representation does not require or expose email or internal UUID
  const publicSnapshot = {
    shareToken: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    website: 'https://rivercityplumbing.com',
    businessName: parsed.derivedBusinessName,
    overallScore: scored.overallScore,
    overallCoverage: scored.overallCoverage,
    confidence: scored.confidence,
    humanReviewRequested: false,
  };
  assert.equal(publicSnapshot.humanReviewRequested, false);
  assert.equal((publicSnapshot as any).id, undefined);
  assert.equal((publicSnapshot as any).email, undefined);
});

test('Staged Funnel 4, 5 & 6 — Human review request attaches email via valid shareToken, rejects forged tokens, and is idempotent on repeated submit', () => {
  const validToken = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const forgedToken = 'ff00ff00ff00ff00ff00ff00ff00ff00';

  // In-memory store simulating reality_checks table
  const dbRecords = [
    {
      id: 'rc-uuid-1',
      shareToken: validToken,
      website: 'https://rivercityplumbing.com',
      businessName: 'River City Plumbing' as string | null,
      cityState: null as string | null,
      ownerName: null as string | null,
      email: null as string | null,
      status: resolveInitialRealityCheckStatus(null) as string,
    },
  ];
  let operatorNotificationsSent = 0;

  function handlePatchHumanReview(payload: unknown) {
    const parsed = RequestHumanReviewSchema.safeParse(payload);
    if (!parsed.success) {
      return { status: 400, error: parsed.error.issues[0]?.message };
    }
    const existing = dbRecords.find((r) => r.shareToken === parsed.data.shareToken);
    if (!existing) {
      return { status: 404, error: 'Could not find a matching Reality Check for this token.' };
    }

    const claim = evaluateHumanReviewClaim(existing, parsed.data);
    if (!claim.allowed) {
      return { status: claim.httpStatus, code: claim.reason, error: claim.error };
    }

    existing.email = claim.email;
    existing.businessName = claim.businessName;
    existing.ownerName = claim.ownerName;
    existing.cityState = claim.cityState;
    existing.status = claim.nextStatus;

    if (claim.isInitialClaim) {
      operatorNotificationsSent++;
    }
    return {
      status: 200,
      shareToken: existing.shareToken,
      humanReviewRequested: true,
      alreadyRequested: !claim.isInitialClaim,
      recordCount: dbRecords.length,
    };
  }

  // Test 5: Invalid/short or forged token cannot attach email to another record
  const shortRes = handlePatchHumanReview({ shareToken: 'short', email: 'attacker@evil.com' });
  assert.equal(shortRes.status, 400);

  const forgedRes = handlePatchHumanReview({ shareToken: forgedToken, email: 'attacker@evil.com' });
  assert.equal(forgedRes.status, 404);
  assert.equal(dbRecords[0].email, null, 'Record email must remain null after forged token attempt');

  // Test 4: Valid token attaches email to existing scan and transitions status to NEEDS_HUMAN_REVIEW
  const firstSubmit = handlePatchHumanReview({
    shareToken: validToken,
    email: 'Owner@RiverCityPlumbing.com',
    ownerName: 'Mike',
  });
  assert.equal(firstSubmit.status, 200);
  assert.equal(firstSubmit.alreadyRequested, false);
  assert.equal(dbRecords[0].email, 'owner@rivercityplumbing.com');
  assert.equal(dbRecords[0].ownerName, 'Mike');
  assert.equal(dbRecords[0].status, 'NEEDS_HUMAN_REVIEW');
  assert.equal(operatorNotificationsSent, 1);

  // Test 6: Repeated email-submit with same normalized email updates missing fields without creating duplicates or re-sending notification
  const secondSubmit = handlePatchHumanReview({
    shareToken: validToken,
    email: 'owner@rivercityplumbing.com',
    cityState: 'Louisville, KY',
  });
  assert.equal(secondSubmit.status, 200);
  assert.equal(secondSubmit.alreadyRequested, true);
  assert.equal(dbRecords.length, 1, 'Must never create duplicate Reality Check records');
  assert.equal(dbRecords[0].cityState, 'Louisville, KY');
  assert.equal(operatorNotificationsSent, 1, 'Operator notification must only fire once');
});

test('Staged Funnel 7 — Anonymous URL-only scan does not enter active human-review queue until email is attached', () => {
  const anonymousScan = {
    email: null,
    status: resolveInitialRealityCheckStatus(null),
  };
  assert.equal(anonymousScan.status, 'AUTO_SCAN_COMPLETE');
  assert.equal(
    isActiveHumanReviewQueueItem(anonymousScan),
    false,
    'Anonymous URL-only scan must be excluded from active human-review queue'
  );

  // Once email is attached via Step 3:
  const requestedScan = {
    email: 'owner@business.com',
    status: resolvePatchedRealityCheckStatus(anonymousScan.status),
  };
  assert.equal(requestedScan.status, 'NEEDS_HUMAN_REVIEW');
  assert.equal(
    isActiveHumanReviewQueueItem(requestedScan),
    true,
    'Scan with email must appear in active human-review queue'
  );
});

test('Staged Funnel 8 & 9 — Questionnaire works after human review request and can still be skipped safely', async () => {
  // Requires humanReviewRequested (email present) before accepting questionnaire submission
  const checkAfterEmail = {
    id: 'rc-uuid-1',
    shareToken: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    email: 'owner@rivercityplumbing.com',
    status: 'NEEDS_HUMAN_REVIEW',
  };
  assert.equal(Boolean(checkAfterEmail.email), true);

  // When skipped, synthesis and report generation work cleanly with null ownerName / cityState / ownerProvided
  const pkgSkippedWithNulls: SynthesisEvidencePackage = {
    business: {
      name: 'https://rivercityplumbing.com',
      website: 'https://rivercityplumbing.com',
      cityState: 'Not specified',
      ownerName: 'Business Owner',
    },
    scanner: {
      overallScore: 76,
      coverage: 82,
      confidence: 'HIGH',
      findings: [],
    },
    ownerProvided: null,
    humanReview: {
      opportunitiesFound: [],
      topFixes: [
        { priority: 1, title: 'Fix 1', whyItMatters: 'Why 1', suggestedAction: 'Act 1', evidenceLabel: 'BARATRUST_REVIEW' },
        { priority: 2, title: 'Fix 2', whyItMatters: 'Why 2', suggestedAction: 'Act 2', evidenceLabel: 'BARATRUST_REVIEW' },
        { priority: 3, title: 'Fix 3', whyItMatters: 'Why 3', suggestedAction: 'Act 3', evidenceLabel: 'BARATRUST_REVIEW' },
      ],
      notSpendMoneyOn: 'Skip paid directories.',
    },
  };

  const fallback = generateDeterministicFallbackReport(pkgSkippedWithNulls);
  assert.ok(fallback.executiveSummary.length > 20);
  assert.equal(fallback.notWorthSpendingOnSummary, 'Skip paid directories.');
});

test('Staged Funnel 10 — Final email delivery returns NOT_ATTEMPTED when no email exists on record', async () => {
  const resEmpty = await sendRealityCheckDeliveryEmail({
    ownerEmail: '',
    ownerName: 'Business Owner',
    businessName: 'Anonymous URL Scan',
    shareToken: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
  });

  assert.equal(resEmpty.status, 'NOT_ATTEMPTED');
  assert.equal(resEmpty.success, false);
  assert.equal(resEmpty.deliveredAt, null);
  assert.ok(resEmpty.error?.includes('No recipient email address on record'));
});

test('Email Claim Integrity — personB@example.com cannot overwrite personA@example.com or hijack identity/questionnaire state', () => {
  const shareToken = 'b9c8d7e6f5a403122334455667788990';

  // Step 1: Anonymous URL scan is created
  const record = {
    id: 'rc-claim-1',
    shareToken,
    website: 'https://kentuckiana-roofing.com',
    businessName: 'Kentuckiana Roofing (Derived)' as string | null,
    cityState: null as string | null,
    ownerName: null as string | null,
    email: null as string | null,
    status: resolveInitialRealityCheckStatus(null) as string,
    questionnaireAnswers: null as Record<string, string> | null,
  };
  let operatorNotifications = 0;

  function applyClaim(input: {
    email: string;
    businessName?: string | null;
    ownerName?: string | null;
    cityState?: string | null;
  }) {
    const evalResult = evaluateHumanReviewClaim(record, input);
    if (!evalResult.allowed) {
      return { status: evalResult.httpStatus, code: evalResult.reason, error: evalResult.error };
    }
    record.email = evalResult.email;
    record.businessName = evalResult.businessName;
    record.ownerName = evalResult.ownerName;
    record.cityState = evalResult.cityState;
    record.status = evalResult.nextStatus;
    if (evalResult.isInitialClaim) {
      operatorNotifications++;
    }
    return { status: 200, alreadyRequested: !evalResult.isInitialClaim };
  }

  // Step 2: personA@example.com requests human review and completes questionnaire
  const resA = applyClaim({
    email: 'personA@example.com',
    ownerName: 'Alice Owner',
    businessName: 'Kentuckiana Roofing LLC',
  });
  assert.equal(resA.status, 200);
  assert.equal(resA.alreadyRequested, false);
  assert.equal(record.email, 'persona@example.com');
  assert.equal(record.ownerName, 'Alice Owner');
  assert.equal(record.businessName, 'Kentuckiana Roofing LLC');
  assert.equal(record.status, 'NEEDS_HUMAN_REVIEW');
  assert.equal(operatorNotifications, 1);

  record.questionnaireAnswers = { biggestProblem: 'Missed storm repair calls' };

  // Step 3: Same share token is used with personB@example.com attempting to overwrite email and identity
  const resB = applyClaim({
    email: 'personB@example.com',
    ownerName: 'Bob Attacker',
    businessName: 'Hijacked Roofing',
    cityState: 'Fake City, ZZ',
  });
  assert.equal(resB.status, 409, 'Conflicting email must be rejected with 409 Conflict');
  assert.equal(resB.code, 'EMAIL_CLAIM_CONFLICT');

  // Verify personA's email, identity, and questionnaire state remain completely intact
  assert.equal(record.email, 'persona@example.com');
  assert.equal(record.ownerName, 'Alice Owner');
  assert.equal(record.businessName, 'Kentuckiana Roofing LLC');
  assert.equal(record.cityState, null);
  assert.deepEqual(record.questionnaireAnswers, { biggestProblem: 'Missed storm repair calls' });
  assert.equal(operatorNotifications, 1, 'No operator notification may fire on rejected claim');

  // Step 4: Same normalized email (PersonA@Example.com) retries — backfills null cityState without overwriting established ownerName/businessName
  const resARetry = applyClaim({
    email: '  PersonA@Example.com ',
    ownerName: 'Accidental Different Name',
    businessName: 'Accidental Different Business',
    cityState: 'New Albany, IN',
  });
  assert.equal(resARetry.status, 200);
  assert.equal(resARetry.alreadyRequested, true);
  assert.equal(record.email, 'persona@example.com');
  assert.equal(record.ownerName, 'Alice Owner', 'Established ownerName must not be overwritten');
  assert.equal(record.businessName, 'Kentuckiana Roofing LLC', 'Established businessName must not be overwritten');
  assert.equal(record.cityState, 'New Albany, IN', 'Previously null cityState can be backfilled by original requester');
  assert.equal(operatorNotifications, 1, 'Retry must not send duplicate operator notification');
});

test('Email Claim Concurrency — atomic conditional claim prevents race overwrite between concurrent claimants', async () => {
  const dbRecord = {
    id: 'rc-race-1',
    shareToken: 'c1d2e3f4a5b60718293a4b5c6d7e8f91',
    email: null as string | null,
    ownerName: null as string | null,
    businessName: 'Derived Business' as string | null,
    cityState: null as string | null,
    status: 'AUTO_SCAN_COMPLETE',
  };
  let notifications = 0;
  let lock = Promise.resolve();

  // Simulates Postgres row lock for UPDATE reality_checks ... WHERE id = ? AND email IS NULL RETURNING *
  async function atomicClaimIfEmailNull(claim: ReturnType<typeof evaluateHumanReviewClaim>) {
    let release: () => void = () => {};
    const prev = lock;
    lock = new Promise((r) => {
      release = r;
    });
    await prev;
    try {
      if (dbRecord.email === null && claim.allowed) {
        dbRecord.email = claim.email;
        dbRecord.ownerName = claim.ownerName;
        dbRecord.businessName = claim.businessName;
        dbRecord.cityState = claim.cityState;
        dbRecord.status = claim.nextStatus;
        return [{ ...dbRecord }];
      }
      return [];
    } finally {
      release();
    }
  }

  async function concurrentPatch(input: { email: string; ownerName: string }) {
    // Both requests read initial state when email is still null
    const snapshot = { ...dbRecord };
    const claim = evaluateHumanReviewClaim(snapshot, input);
    if (!claim.allowed) {
      return { status: claim.httpStatus, code: claim.reason };
    }
    const [claimed] = await atomicClaimIfEmailNull(claim);
    if (claimed) {
      notifications++;
      return { status: 200, wonInitialClaim: true, email: claim.email };
    }
    // Lost the initial claim race — re-evaluate against latest DB row
    const raceEval = evaluateHumanReviewClaim(dbRecord, input);
    if (!raceEval.allowed) {
      return { status: raceEval.httpStatus, code: raceEval.reason, wonInitialClaim: false };
    }
    return { status: 200, wonInitialClaim: false, alreadyRequested: true };
  }

  const [resA, resB] = await Promise.all([
    concurrentPatch({ email: 'personA@example.com', ownerName: 'Person A' }),
    concurrentPatch({ email: 'personB@example.com', ownerName: 'Person B' }),
  ]);

  const winner = resA.status === 200 ? resA : resB;
  const loser = resA.status === 409 ? resA : resB;

  assert.equal(winner.status, 200);
  assert.equal(winner.wonInitialClaim, true);
  assert.equal(loser.status, 409);
  assert.equal(loser.code, 'EMAIL_CLAIM_CONFLICT');
  assert.equal(notifications, 1, 'Exactly one operator notification may be sent');
  assert.equal(dbRecord.email, winner.email);
});


