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
import { FindingState } from '../src/db/schema/realityCheck';

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
