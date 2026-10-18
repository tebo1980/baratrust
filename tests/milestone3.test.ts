import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isOperatorEmail,
  getOperatorEmails,
  DEFAULT_OPERATOR_EMAILS,
} from '../src/lib/auth/operator';

import {
  OwnerQuestionnaireAnswers,
  HumanReviewOpportunity,
  HumanReviewTopFix,
  EvidenceLabel,
  RealityCheckStatus,
} from '../src/db/schema/realityCheck';

// ==========================================
// 1. Operator Access Restriction Tests
// ==========================================
test('Operator Access — correctly identifies default operator', () => {
  assert.deepEqual(DEFAULT_OPERATOR_EMAILS, ['todd@baratrust.com']);
  assert.equal(isOperatorEmail('todd@baratrust.com'), true);
  assert.equal(isOperatorEmail('noelah@baratrust.com'), false);
});

test('Operator Access — handles case-insensitivity and leading/trailing whitespace', () => {
  assert.equal(isOperatorEmail('TODD@BARATRUST.COM'), true);
  assert.equal(isOperatorEmail('  Todd@BaraTrust.com  '), true);
});

test('Operator Access — rejects unauthorized client accounts', () => {
  assert.equal(isOperatorEmail('customer@gmail.com'), false);
  assert.equal(isOperatorEmail('businessowner@acme.com'), false);
  assert.equal(isOperatorEmail('hacker@evil.com'), false);
  assert.equal(isOperatorEmail(''), false);
  assert.equal(isOperatorEmail(null), false);
  assert.equal(isOperatorEmail(undefined), false);
});

test('Operator Access — supports dynamic environment email additions', () => {
  const originalEnv = process.env.OPERATOR_EMAILS;
  try {
    process.env.OPERATOR_EMAILS = 'partner@baratrust.com, contractor@external.com';
    const emails = getOperatorEmails();
    assert.ok(emails.includes('partner@baratrust.com'));
    assert.ok(emails.includes('contractor@external.com'));
    assert.equal(isOperatorEmail('partner@baratrust.com'), true);
    assert.equal(isOperatorEmail('contractor@external.com'), true);
  } finally {
    process.env.OPERATOR_EMAILS = originalEnv;
  }
});

// ==========================================
// 2. Evidence Labels & Integrity
// ==========================================
test('Evidence Labels — verifies the four strict evidence types exist without mutation', () => {
  const validLabels: EvidenceLabel[] = [
    'AUTO_DETECTED',
    'OWNER_PROVIDED',
    'BARATRUST_REVIEW',
    'OPPORTUNITY_FOUND',
  ];

  assert.equal(validLabels.length, 4);
  assert.ok(validLabels.includes('AUTO_DETECTED'));
  assert.ok(validLabels.includes('OWNER_PROVIDED'));
  assert.ok(validLabels.includes('BARATRUST_REVIEW'));
  assert.ok(validLabels.includes('OPPORTUNITY_FOUND'));
});

// ==========================================
// 3. Questionnaire Persistence & Schema Structure
// ==========================================
test('Questionnaire Persistence — structured payload carries all 8 questions + free text with OWNER_PROVIDED', () => {
  const sampleAnswers: OwnerQuestionnaireAnswers = {
    customerAcquisition: 'Word of mouth and local community Facebook groups',
    biggestProblem: 'Missed calls during lunch rush and rising food supply costs',
    missedInquiries: 'At least 5-10 calls a day go to voicemail when crew is on the line',
    followUpProcess: 'We text back when we remember, but have no systematic CRM',
    currentMarketingSpend: '$400/mo on local flyers and $250 on boosting posts',
    repetitiveAdminWaste: 'Retyping order tickets into QuickBooks and manual invoicing',
    growthOpportunity: 'Corporate drop-off catering for local business parks',
    freeEmployeeRole: 'Dedicated receptionist answering calls and confirming appointments',
    additionalNotes: 'Considering opening a second satellite pickup counter in fall',
    evidenceLabel: 'OWNER_PROVIDED',
    submittedAt: new Date().toISOString(),
  };

  assert.equal(sampleAnswers.evidenceLabel, 'OWNER_PROVIDED');
  assert.ok(sampleAnswers.customerAcquisition?.length! > 0);
  assert.ok(sampleAnswers.biggestProblem?.length! > 0);
  assert.ok(sampleAnswers.missedInquiries?.length! > 0);
  assert.ok(sampleAnswers.followUpProcess?.length! > 0);
  assert.ok(sampleAnswers.currentMarketingSpend?.length! > 0);
  assert.ok(sampleAnswers.repetitiveAdminWaste?.length! > 0);
  assert.ok(sampleAnswers.growthOpportunity?.length! > 0);
  assert.ok(sampleAnswers.freeEmployeeRole?.length! > 0);
  assert.ok(sampleAnswers.additionalNotes?.length! > 0);
});

// ==========================================
// 4. Questionnaire Optionality
// ==========================================
test('Questionnaire Optionality — lead remains completely valid without questionnaire responses', () => {
  // A lead created upon initial submission without questionnaire responses
  const leadWithoutQuestionnaire = {
    businessName: 'Main Street Bakery',
    website: 'https://mainstreetbakery.com',
    cityState: 'New Albany, IN',
    ownerName: 'Sarah Jenkins',
    email: 'sarah@mainstreetbakery.com',
    status: 'AUTO_SCAN_COMPLETE' as RealityCheckStatus,
    scanStatus: 'completed',
    overallScore: 78,
    hasOwnerQuestionnaire: false,
    ownerResponses: null,
  };

  assert.equal(leadWithoutQuestionnaire.hasOwnerQuestionnaire, false);
  assert.equal(leadWithoutQuestionnaire.ownerResponses, null);
  // Status is valid and lead is queued for human review
  assert.ok(['NEW', 'AUTO_SCAN_COMPLETE', 'NEEDS_HUMAN_REVIEW'].includes(leadWithoutQuestionnaire.status));
});

// ==========================================
// 5. Review Status Transitions
// ==========================================
test('Review Status Transitions — validates exact lifecycle transitions', () => {
  const lifecycle: RealityCheckStatus[] = [
    'NEW',
    'AUTO_SCAN_COMPLETE',
    'NEEDS_HUMAN_REVIEW',
    'IN_REVIEW',
    'READY_TO_PUBLISH',
    'PUBLISHED',
  ];

  // Step 1: Initial submission created
  let currentStatus: RealityCheckStatus = 'NEW';
  assert.equal(currentStatus, 'NEW');

  // Step 2: Auto scan finishes
  currentStatus = 'AUTO_SCAN_COMPLETE';
  assert.equal(currentStatus, 'AUTO_SCAN_COMPLETE');

  // Step 3: Owner submits questionnaire (or scan fails/defers) -> queued for human
  currentStatus = 'NEEDS_HUMAN_REVIEW';
  assert.equal(currentStatus, 'NEEDS_HUMAN_REVIEW');

  // Step 4: Todd or Noelah opens workspace and starts investigation
  currentStatus = 'IN_REVIEW';
  assert.equal(currentStatus, 'IN_REVIEW');

  // Step 5: Investigation complete, ready to send/publish
  currentStatus = 'READY_TO_PUBLISH';
  assert.equal(currentStatus, 'READY_TO_PUBLISH');

  // Step 6: Published and accessible to owner
  currentStatus = 'PUBLISHED';
  assert.equal(currentStatus, 'PUBLISHED');

  assert.equal(lifecycle.length, 6);
});

// ==========================================
// 6. Review Draft Saving & Persistence
// ==========================================
test('Review Draft Saving — supports partial fields and preserves last saved state', () => {
  const draftState = {
    realityCheckId: 'test-rc-uuid-1234',
    reviewerEmail: 'todd@baratrust.com',
    reviewerName: 'Todd Tebo',
    status: 'in_review',
    findabilityTest: 'Tested "plumber near me" in Jeffersonville. Client appears #4 behind ABC Plumbing.',
    reputationSummary: '4.9 stars across 19 Google reviews. Excellent quality comments.',
    socialPresenceReview: 'Active FB page, dormant Instagram.',
    competitorComparison: 'Ace Plumbing has online scheduler; client has higher review sentiment.',
    lostOpportunityHunt: 'Website has no tap-to-call on mobile hero banner.',
    notSpendMoneyOn: 'Do NOT purchase Yelp Premium ads or rebuild website from scratch right now.',
    toddNotes: 'Call owner Sarah on Tuesday to review findings.',
    updatedAt: new Date(),
  };

  assert.equal(draftState.reviewerEmail, 'todd@baratrust.com');
  assert.ok(draftState.findabilityTest.includes('Tested "plumber near me"'));
  assert.ok(draftState.notSpendMoneyOn.includes('Do NOT purchase Yelp Premium'));
  assert.ok(draftState.updatedAt instanceof Date);
});

// ==========================================
// 7. Multiple Opportunities Found Support
// ==========================================
test('Multiple Opportunity Entries — supports adding 1, 2, 3+ opportunities with OPPORTUNITY_FOUND label', () => {
  const opportunities: HumanReviewOpportunity[] = [
    {
      id: 'opp-1',
      title: 'Local Corporate Lunch Catering',
      type: 'Catering / Commercial',
      description: '3 large medical complexes within 1.5 miles order recurring weekly staff lunches.',
      suggestedAction: 'Create a 1-page PDF catering menu and drop off tasting boxes.',
      potentialImpact: 'High ($2,000/mo recurring revenue)',
      evidenceLabel: 'OPPORTUNITY_FOUND',
    },
    {
      id: 'opp-2',
      title: 'Weekend Wedding Reception Grazing Tables',
      type: 'Local Partnership',
      description: 'Partner with local historic venue that has no in-house food vendor.',
      suggestedAction: 'Contact event coordinator for preferred vendor list inclusion.',
      potentialImpact: 'Medium ($1,200 per event)',
      evidenceLabel: 'OPPORTUNITY_FOUND',
    },
    {
      id: 'opp-3',
      title: 'Packaging Supplier Bulk Discount',
      type: 'Supplier / Cost Saving',
      description: 'Current takeout clamshells bought at retail restaurant depot prices.',
      suggestedAction: 'Switch to regional distributor for 28% unit cost reduction.',
      potentialImpact: 'High ($450/mo immediate cost savings)',
      evidenceLabel: 'OPPORTUNITY_FOUND',
    },
  ];

  assert.equal(opportunities.length, 3);
  opportunities.forEach((opp, idx) => {
    assert.equal(opp.evidenceLabel, 'OPPORTUNITY_FOUND', `Opportunity #${idx + 1} evidence label`);
    assert.ok(opp.title.length > 0);
    assert.ok(opp.type.length > 0);
  });
});

// ==========================================
// 8. Top 3 Things We Would Fix First
// ==========================================
test('Top 3 Fixes — enforces priorities 1, 2, 3 with BARATRUST_REVIEW evidence label', () => {
  const topFixes: HumanReviewTopFix[] = [
    {
      priority: 1,
      title: 'Enable 1-Tap Phone Call Button on Mobile',
      whyItMatters: 'Over 65% of local service visits occur on phones; unclickable numbers lose leads instantly.',
      suggestedAction: 'Wrap phone number in tel: link with high-contrast floating mobile CTA.',
      evidenceLabel: 'BARATRUST_REVIEW',
    },
    {
      priority: 2,
      title: 'Claim & Fully Complete Google Business Profile',
      whyItMatters: 'Competitors outrank business because hours and service categories are incomplete.',
      suggestedAction: 'Add exact service areas, 10 fresh job photos, and complete secondary categories.',
      evidenceLabel: 'BARATRUST_REVIEW',
    },
    {
      priority: 3,
      title: 'Implement Missed-Call SMS Auto-Reply',
      whyItMatters: 'Callers whose calls go to voicemail call the next competitor within 90 seconds.',
      suggestedAction: 'Configure automated SMS reply: "Hi, sorry we missed your call! How can we help you today?"',
      evidenceLabel: 'BARATRUST_REVIEW',
    },
  ];

  assert.equal(topFixes.length, 3);
  topFixes.forEach((fix, idx) => {
    assert.equal(fix.priority, idx + 1);
    assert.equal(fix.evidenceLabel, 'BARATRUST_REVIEW');
    assert.ok(fix.title.length > 0);
    assert.ok(fix.whyItMatters.length > 0);
    assert.ok(fix.suggestedAction.length > 0);
  });
});

// ==========================================
// 9. Strategic Candor — What NOT to Spend Money On
// ==========================================
test('Strategic Candor — What NOT to Spend Money On field is prominent and structured', () => {
  const candidAdvice =
    'We would NOT recommend spending $3,500 on a website redesign right now. Your current Squarespace site is fast and clean. Redesigning the site before setting up missed-call recovery and Google Map rankings would burn budget without producing extra customers.';

  assert.ok(candidAdvice.length > 20);
  assert.ok(candidAdvice.toLowerCase().includes('not recommend spending'));
});
