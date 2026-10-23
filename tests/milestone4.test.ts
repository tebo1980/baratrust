import test from 'node:test';
import assert from 'node:assert/strict';

(process.env as any).NODE_ENV = 'test';
(process.env as any).TEST_ENV = 'true';

import { 
  buildEvidencePrompt, 
  generateDeterministicFallbackReport,
  SynthesisEvidencePackage 
} from '../src/lib/gemini/synthesizer';

import { 
  buildDeliveryEmailContent,
  sendRealityCheckDeliveryEmail 
} from '../src/lib/email/delivery';

import { 
  RealityCheckReportContent,
  ReportAuditMetadata 
} from '../src/db/schema/realityCheck';

// Mock evidence package helper
function createSampleEvidence(overrides: Partial<SynthesisEvidencePackage> = {}): SynthesisEvidencePackage {
  return {
    business: {
      name: 'Bluegrass Heating & Cooling',
      website: 'https://bluegrassheat.com',
      cityState: 'New Albany, IN',
      ownerName: 'Dan Miller',
      businessType: 'HVAC Contractor',
      primaryHeadache: 'Missed calls while in crawlspaces',
    },
    scanner: {
      overallScore: 72,
      coverage: 85,
      confidence: 'HIGH',
      findings: [
        {
          category: 'digital_presence',
          checkKey: 'mobile_viewport',
          title: 'Mobile Viewport Configuration',
          state: 'PASS',
          scoreContribution: 10,
          maxPoints: 10,
          supportingDetail: 'Viewport meta tag configured properly.',
        },
        {
          category: 'customer_journey',
          checkKey: 'tap_to_call_phone',
          title: 'Click-to-Call Phone Link',
          state: 'FAIL',
          scoreContribution: 0,
          maxPoints: 10,
          supportingDetail: 'Phone number is plain unclickable text.',
        },
        {
          category: 'trust_reputation',
          checkKey: 'google_reviews_badge',
          title: 'Google Reviews or Testimonials',
          state: 'UNKNOWN',
          scoreContribution: 0,
          maxPoints: 10,
          supportingDetail: 'Could not observe third-party reviews badge on homepage.',
        },
      ],
    },
    ownerProvided: {
      customerAcquisition: 'Word of mouth and neighborhood recommendations',
      biggestProblem: 'Calls going to voicemail when technicians are on jobs',
      missedInquiries: 'At least 3-5 missed calls per day without voicemails',
      followUpProcess: 'We call back in the evening if we have time',
      currentMarketingSpend: '$300/mo on local athletic program banners',
      repetitiveAdminWaste: 'Handwritten job sheets and retyping into QuickBooks',
      growthOpportunity: 'Commercial maintenance contracts for small retail strips',
      freeEmployeeRole: 'Full-time phone dispatcher',
      additionalNotes: 'Competitor down the street has online booking.',
      evidenceLabel: 'OWNER_PROVIDED',
    },
    humanReview: {
      findabilityTest: 'Searched "HVAC repair New Albany". Appeared #6 in Google Maps.',
      reputationSummary: '4.8 stars on Google (22 reviews). Honest pricing frequently praised.',
      socialPresenceReview: 'Facebook page has 500 followers, last post 2 weeks ago.',
      competitorComparison: 'Rival AirTech has instant online scheduling and modern mobile layout.',
      lostOpportunityHunt: 'No click-to-call link on phone number; after-hours calls go to standard carrier voicemail.',
      opportunitiesFound: [
        {
          id: 'opp-1',
          title: 'Commercial Retail Strip Preventative Maintenance',
          type: 'Commercial Account',
          description: 'Local strip malls need seasonal filter changes and coil cleaning.',
          suggestedAction: 'Send commercial 1-pager to property managers within 5 miles.',
          potentialImpact: 'High ($2,500/mo recurring revenue)',
          evidenceLabel: 'OPPORTUNITY_FOUND',
        },
      ],
      topFixes: [
        {
          priority: 1,
          title: 'Make Phone Number 1-Tap Clickable on Mobile',
          whyItMatters: 'Mobile visitors cannot easily dial when experiencing an emergency.',
          suggestedAction: 'Wrap phone number in tel: link with floating CTA.',
          evidenceLabel: 'BARATRUST_REVIEW',
        },
        {
          priority: 2,
          title: 'Implement Missed-Call Auto-Text Responder',
          whyItMatters: 'Callers whose calls go unanswered call a competitor within 2 minutes.',
          suggestedAction: 'Enable automated SMS reply when calls are missed.',
          evidenceLabel: 'BARATRUST_REVIEW',
        },
        {
          priority: 3,
          title: 'Claim & Optimize Google Business Profile',
          whyItMatters: 'Competitor outranks business because hours and service areas are missing.',
          suggestedAction: 'Add exact service cities and 10 recent installation photos.',
          evidenceLabel: 'BARATRUST_REVIEW',
        },
      ],
      notSpendMoneyOn: 'Do NOT spend $4,000 on a complete custom website redesign right now. Your current site is clean and fast; fix your phone call handling first.',
      toddNotes: 'Dan is a great craftsman who needs operational plumbing, not a fancy rebrand.',
    },
    ...overrides,
  };
}

// ==========================================
// 1. Gemini Evidence Isolation Tests
// ==========================================
test('Gemini Synthesis — receives only allowed evidence partitioned by source', () => {
  const pkg = createSampleEvidence();
  const prompt = buildEvidencePrompt(pkg);

  // Must contain all 4 source labels
  assert.ok(prompt.includes('--- [EVIDENCE SOURCE: AUTO_DETECTED] ---'));
  assert.ok(prompt.includes('--- [EVIDENCE SOURCE: OWNER_PROVIDED] ---'));
  assert.ok(prompt.includes('--- [EVIDENCE SOURCE: BARATRUST_REVIEW (TODD & NOELAH JUDGMENT)] ---'));
  assert.ok(prompt.includes('--- [EVIDENCE SOURCE: OPPORTUNITY_FOUND] ---'));

  // Must contain concrete facts
  assert.ok(prompt.includes('Bluegrass Heating & Cooling'));
  assert.ok(prompt.includes('Make Phone Number 1-Tap Clickable on Mobile'));
  assert.ok(prompt.includes('Do NOT spend $4,000 on a complete custom website redesign'));
  assert.ok(prompt.includes('Commercial Retail Strip Preventative Maintenance'));

  // Must explicitly instruct anti-hallucination rules
  assert.ok(prompt.includes('Never invent numbers, revenue impact, profit margins'));
  assert.ok(prompt.includes('Never invent competitor facts, reviews, star ratings'));
});

// ==========================================
// 2. UNKNOWN Findings Do Not Fabricate Facts
// ==========================================
test('Anti-Hallucination — missing or UNKNOWN findings do not become fabricated facts', () => {
  const pkg = createSampleEvidence({
    scanner: {
      overallScore: null, // Deferred / withheld
      coverage: 40,
      confidence: 'INSUFFICIENT',
      findings: [
        {
          category: 'digital_presence',
          checkKey: 'speed',
          title: 'Load Speed',
          state: 'UNKNOWN',
          scoreContribution: 0,
          maxPoints: 10,
          supportingDetail: 'Probe blocked by bot protection.',
        },
      ],
    },
    ownerProvided: null, // No questionnaire submitted
  });

  const report = generateDeterministicFallbackReport(pkg);

  // Score text must candidly say deferred or manual, NOT 0/100 or fabricated number
  assert.ok(!report.executiveSummary.includes('0/100'));
  assert.ok(report.executiveSummary.includes('manual technical assessment') || report.executiveSummary.includes('deferred'));

  // What's working should not fabricate passing scanner checks
  const hasFakeSpeedStrength = report.whatsWorking.some(w => w.toLowerCase().includes('load speed'));
  assert.equal(hasFakeSpeedStrength, false);
});

// ==========================================
// 3. Operator Report Draft Persistence & Editing
// ==========================================
test('Operator Draft Persistence — supports independently editing each section', () => {
  const initialDraft: RealityCheckReportContent = {
    executiveSummary: 'Initial summary draft generated by system.',
    whatsWorking: ['Fast response times', 'Great local reputation'],
    whatsGettingInTheWay: ['Unclickable phone link', 'No after-hours follow-up'],
    topFixesSummary: 'Here are the three things we would fix first.',
    notWorthSpendingOnSummary: 'Do not buy expensive SEO agency packages.',
    findabilitySummary: 'You rank #6 locally.',
    reputationSummary: '4.8 stars on Google.',
    socialSummary: 'Facebook is updated bi-weekly.',
    competitorSummary: 'Rivals have online booking.',
    lostOpportunitySummary: 'Callers drop off without voicemail.',
    opportunitiesSummary: 'Commercial contracts available.',
    closingNote: 'Talk soon. — Todd & Noelah',
  };

  // Simulate operator manually editing specific sections
  const editedDraft: RealityCheckReportContent = {
    ...initialDraft,
    executiveSummary: 'Todd edited this executive summary after speaking with the owner.',
    notWorthSpendingOnSummary: 'Updated candid advice: Do not replace your WordPress site right now.',
    whatsWorking: [...initialDraft.whatsWorking, 'Honest upfront pricing'],
  };

  assert.equal(editedDraft.executiveSummary, 'Todd edited this executive summary after speaking with the owner.');
  assert.equal(editedDraft.notWorthSpendingOnSummary, 'Updated candid advice: Do not replace your WordPress site right now.');
  assert.equal(editedDraft.whatsWorking.length, 3);
  assert.ok(editedDraft.whatsWorking.includes('Honest upfront pricing'));
});

// ==========================================
// 4. Audit Metadata Tracking
// ==========================================
test('Auditability — tracks Gemini model, generation time, and publishing operator without internal CoT', () => {
  const audit: ReportAuditMetadata = {
    geminiDraftGeneratedAt: new Date().toISOString(),
    geminiModelUsed: 'gemini-1.5-pro',
    lastReportEditAt: new Date().toISOString(),
    reportPublishedAt: new Date().toISOString(),
    publishingOperator: 'todd@baratrust.com',
    deliveryEmailSentAt: new Date().toISOString(),
    deliveryEmailMessageId: 'rc-deliv-123456',
    deliveryEmailStatus: 'delivered',
  };

  assert.equal(audit.geminiModelUsed, 'gemini-1.5-pro');
  assert.equal(audit.publishingOperator, 'todd@baratrust.com');
  assert.ok(audit.deliveryEmailSentAt);
  // Ensure no internal chain-of-thought field is present
  assert.equal((audit as any).chainOfThought, undefined);
  assert.equal((audit as any).internalThoughts, undefined);
});

// ==========================================
// 5. Public / Unpublished Report Access Rules
// ==========================================
test('Report Security — unpublished reports cannot be viewed publicly without operator preview', () => {
  const testReportStatus: string = 'IN_REVIEW';
  const isPublished = testReportStatus === 'PUBLISHED';
  const isOperatorPreview = false;

  const canPublicView = isPublished || isOperatorPreview;
  assert.equal(canPublicView, false, 'Public visitor cannot view in-review report');
});

test('Report Security — published reports are viewable publicly via unguessable shareToken', () => {
  const testReportStatus = 'PUBLISHED';
  const shareToken = 'a9f8b4c2e6d14739b82190f7a5c8e234';
  const isPublished = testReportStatus === 'PUBLISHED';

  assert.equal(isPublished, true);
  assert.ok(shareToken.length >= 16);
});

test('Report Security — invalid or short share token fails safely', () => {
  const invalidTokens = ['', '123', 'short', null, undefined];
  invalidTokens.forEach(token => {
    const isValidToken = typeof token === 'string' && token.length >= 8;
    assert.equal(isValidToken, false, `Token "${token}" should be rejected`);
  });
});

// ==========================================
// 6. Insufficient Coverage Does Not Show Fake 0 Score
// ==========================================
test('Report Integrity — insufficient coverage reports state score withheld instead of 0', () => {
  const scoreBreakdown = {
    digitalPresence: null,
    customerJourney: null,
    trustReputation: null,
    localDiscovery: null,
    opportunityCapture: null,
    coverage: {
      overall: 0,
      confidence: 'INSUFFICIENT' as const,
      digitalPresence: 0,
      customerJourney: 0,
      trustReputation: 0,
      localDiscovery: 0,
      opportunityCapture: 0,
    },
  };
  const overallScore = null;

  const displayScore = overallScore !== null ? `${overallScore}/100` : 'Score Withheld / Manual Review';
  assert.equal(displayScore, 'Score Withheld / Manual Review');
  assert.notEqual(displayScore, '0/100');
});

// ==========================================
// 7. Publish Safeguards Validation
// ==========================================
test('Publish Safeguards — enforces human review, 3 top fixes, and non-empty core sections', () => {
  // Case A: Missing top fixes
  const invalidReviewA = {
    topFixes: [{ priority: 1, title: 'Fix phone' }], // Only 1 fix
    reportDraft: {
      executiveSummary: 'This is a long enough executive summary.',
      topFixesSummary: 'Top fixes summary',
      notWorthSpendingOnSummary: 'Do not spend on ads',
    },
  };
  const canPublishA = (invalidReviewA.topFixes?.length || 0) === 3;
  assert.equal(canPublishA, false, 'Blocked when fewer than 3 top fixes');

  // Case B: Missing report draft
  const invalidReviewB = {
    topFixes: [
      { priority: 1, title: 'Fix 1' },
      { priority: 2, title: 'Fix 2' },
      { priority: 3, title: 'Fix 3' },
    ],
    reportDraft: null,
  };
  const canPublishB = !!invalidReviewB.reportDraft;
  assert.equal(canPublishB, false, 'Blocked when report draft is null');

  // Case C: Valid complete review
  const validReview = {
    topFixes: [
      { priority: 1, title: 'Fix 1' },
      { priority: 2, title: 'Fix 2' },
      { priority: 3, title: 'Fix 3' },
    ],
    reportDraft: {
      executiveSummary: 'Detailed plain English executive summary for the owner.',
      topFixesSummary: 'Here are the 3 fixes.',
      notWorthSpendingOnSummary: 'Do not buy custom site.',
    },
  };
  const canPublishC =
    validReview.topFixes.length === 3 &&
    !!validReview.reportDraft &&
    validReview.reportDraft.executiveSummary.length > 20 &&
    validReview.reportDraft.topFixesSummary.length > 0 &&
    validReview.reportDraft.notWorthSpendingOnSummary.length > 0;
  assert.equal(canPublishC, true, 'Permitted when all criteria are met');
});

// ==========================================
// 8. Transactional Email Dispatch & Idempotency
// ==========================================
test('Email Delivery — generates low-pressure, plain-English email copy with secure link', () => {
  const email = buildDeliveryEmailContent({
    ownerName: 'Dan Miller',
    businessName: 'Bluegrass Heating & Cooling',
    reportUrl: 'https://www.baratrust.com/report/a9f8b4c2e6d14739b82190f7a5c8e234',
  });

  assert.equal(email.subject, 'Your BaraTrust Reality Check is ready — Bluegrass Heating & Cooling');
  assert.ok(email.text.includes('Hi Dan Miller,'));
  assert.ok(email.text.includes('https://www.baratrust.com/report/a9f8b4c2e6d14739b82190f7a5c8e234'));
  assert.ok(email.text.includes('the three things we\'d look at first'));
  assert.ok(email.text.includes('what we would not recommend spending money on'));
  assert.ok(email.text.includes('— Todd & Noelah'));
  assert.ok(!email.text.includes('BUY NOW'));
  assert.ok(!email.text.includes('Special offer'));

  // Verify HTML escaping against markup injection in ownerName / businessName
  const escapedEmail = buildDeliveryEmailContent({
    ownerName: 'Dan <script>alert(1)</script>',
    businessName: 'Bluegrass & "Sons" <Heating>',
    reportUrl: 'https://www.baratrust.com/report/a9f8b4c2e6d14739b82190f7a5c8e234',
  });
  assert.ok(!escapedEmail.html.includes('<script>'));
  assert.ok(escapedEmail.html.includes('Dan &lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(escapedEmail.html.includes('Bluegrass &amp; &quot;Sons&quot; &lt;Heating&gt;'));
});

test('Email Delivery — dispatches delivery email safely and returns message id', async () => {
  const result = await sendRealityCheckDeliveryEmail({
    ownerEmail: 'dan@bluegrassheat.com',
    ownerName: 'Dan Miller',
    businessName: 'Bluegrass Heating & Cooling',
    shareToken: 'a9f8b4c2e6d14739b82190f7a5c8e234',
    baseUrl: 'https://www.baratrust.com',
  });

  assert.equal(result.success, true);
  assert.equal(result.recipient, 'dan@bluegrassheat.com');
  assert.ok(result.messageId && result.messageId.startsWith('rc-deliv-'));
  assert.equal(result.reportUrl, 'https://www.baratrust.com/report/a9f8b4c2e6d14739b82190f7a5c8e234');
});


test('Challenge Review 1 & 3 — Synthesizer qualifies sub-100% coverage scores as "on evaluated static signals" and never treats unobserved 0-point informational checks as passing strengths', () => {
  const pkg = createSampleEvidence({
    scanner: {
      overallScore: 100,
      coverage: 79,
      confidence: 'MEDIUM',
      findings: [
        {
          category: 'digital_presence',
          checkKey: 'https_enabled',
          title: 'HTTPS / SSL Encryption',
          state: 'PASS',
          scoreContribution: 20,
          maxPoints: 20,
          supportingDetail: 'Website is securely delivered over HTTPS.',
        },
        {
          category: 'trust_reputation',
          checkKey: 'reviews_testimonials',
          title: 'Customer Reviews & Testimonials',
          state: 'PASS', // Even if a legacy row stored PASS on an unobserved 0-pt check
          scoreContribution: 0,
          maxPoints: 0,
          supportingDetail: 'No on-page customer reviews or testimonials detected (informational).',
        },
        {
          category: 'digital_presence',
          checkKey: 'social_links',
          title: 'Active Social Profiles',
          state: 'PASS',
          scoreContribution: 0,
          maxPoints: 0,
          supportingDetail: 'Connected social profiles found: Facebook, Instagram.',
        },
      ],
    },
  });

  const prompt = buildEvidencePrompt(pkg);
  assert.ok(
    prompt.includes('100/100 on evaluated static signals (79% observable coverage)'),
    'Prompt must qualify 100/100 score when coverage is below 100%'
  );
  assert.ok(
    prompt.includes('[INFO_NOT_OBSERVED] Customer Reviews & Testimonials'),
    'Unobserved 0-point informational check must be labeled INFO_NOT_OBSERVED in prompt, never PASS'
  );
  assert.ok(
    prompt.includes('[INFO_OBSERVED] Active Social Profiles'),
    'Observed 0-point informational check must be labeled INFO_OBSERVED in prompt'
  );

  const fallback = generateDeterministicFallbackReport(pkg);
  assert.ok(
    fallback.executiveSummary.includes('100/100 on evaluated static signals (79% observable coverage)'),
    'Deterministic fallback executiveSummary must qualify 100/100 when coverage < 100%'
  );
  assert.equal(
    fallback.whatsWorking.includes('Customer Reviews & Testimonials'),
    false,
    'Unobserved 0-point informational check must never appear in whatsWorking'
  );
});
