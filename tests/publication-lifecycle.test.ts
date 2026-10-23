import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationHarness, loadModule } from './helpers/publication-harness';
import { generateDeterministicFallbackReport, SynthesisEvidencePackage } from '../src/lib/gemini/synthesizer';

function fixture() {
  const evidence = (key: string, clientVisible?: boolean) => ({
    source: `${key} source`, sourceUrl: `https://evidence.example/${key}`,
    note: `${key} research note`, observedAt: '2026-10-20',
    ...(clientVisible === undefined ? {} : { clientVisible }),
  });
  const citations = [evidence('PRIVATE_FALSE', false), evidence('PRIVATE_OMITTED'), evidence('PUBLIC_TRUE', true)];
  const humanReview: SynthesisEvidencePackage['humanReview'] = {
    toddNotes: 'PRIVATE_SCRATCHPAD never for clients',
    topFixes: citations.map((citation, index) => ({
      priority: index + 1, title: `Original fix ${index + 1}`, whyItMatters: 'Customers need clear contact paths',
      suggestedAction: 'Make contact details visible', evidenceLabel: 'BARATRUST_REVIEW', evidence: citation,
    })),
    opportunitiesFound: citations.map((citation, index) => ({
      id: `opp-${index}`, title: `Original opportunity ${index}`, type: 'Local', description: 'Improve local discovery',
      evidenceLabel: 'OPPORTUNITY_FOUND', evidence: citation,
    })),
    humanIntelligence: {
      brandReality: { apparentBrandMessage: 'Original brand message', evidence: citations[0] },
      customerVoice: { topLoves: ['Original customer praise'], evidence: citations[2] },
      advertisingFunnel: { adPresence: 'NOT_OBSERVED', platformsObserved: 'Public library', evidence: citations[1] },
      ghostFootprint: citations.map((citation, index) => ({
        id: `ghost-${index}`, assetType: 'Old listing', summary: `Original legacy finding ${index}`,
        ...citation, evidenceNote: citation.note, evidenceLabel: 'BARATRUST_REVIEW',
      })),
    },
  };
  const pkg: SynthesisEvidencePackage = {
    business: { name: 'Lifecycle Fixture', website: 'https://fixture.example', cityState: 'Louisville, KY', ownerName: 'Fixture Owner' },
    scanner: { overallScore: null, findings: [] }, humanReview,
  };
  const reportDraft = generateDeterministicFallbackReport(pkg);
  return { ...humanReview, reportDraft, status: 'draft', realityCheckStatus: 'IN_REVIEW' };
}

function assertClientSafe(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const marker of ['PRIVATE_FALSE', 'PRIVATE_OMITTED', 'PRIVATE_SCRATCHPAD']) {
    assert.ok(!text.includes(marker), `${marker} must not leak (including its URL and note)`);
  }
  assert.ok(text.includes('https://evidence.example/PUBLIC_TRUE'), 'Visible evidence URL survives');
  assert.ok(text.includes('PUBLIC_TRUE research note'), 'Visible evidence note survives');
}

test('Publication integration: draft insert/update and ready saves cannot publish or deliver', async t => {
  const h = await publicationHarness();
  t.after(h.close);
  const data = fixture();
  // Both insert and update branches, including legacy callers asking Save to publish.
  for (const [status, realityCheckStatus, expectedStatus, expectedCheck] of [
    ['draft', 'IN_REVIEW', 'draft', 'IN_REVIEW'],
    ['in_review', 'IN_REVIEW', 'in_review', 'IN_REVIEW'],
    ['ready_to_publish', 'READY_TO_PUBLISH', 'ready_to_publish', 'READY_TO_PUBLISH'],
    ['published', 'PUBLISHED', 'ready_to_publish', 'READY_TO_PUBLISH'],
  ]) {
    const response = await h.save({ ...data, status, realityCheckStatus });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, expectedStatus);
    assert.equal(body.realityCheckStatus, expectedCheck);
    const review = await h.review();
    assert.equal(review.status, expectedStatus);
    assert.equal((await h.check()).status, expectedCheck);
    assert.equal(review.publishedReport, null);
    assert.equal(review.publishedAt, null);
    assert.equal(h.deliveries.length, 0);
  }
  assert.match(await h.render(), /Review In Progress/);
  assertClientSafe(await h.render(true));
  const fresh = await publicationHarness();
  t.after(fresh.close);
  assert.equal((await fresh.save({ ...data, status: 'published', realityCheckStatus: 'PUBLISHED' })).status, 200);
  assert.equal((await fresh.review()).status, 'ready_to_publish', 'Insert must also reject premature publication');
  assert.equal((await fresh.check()).status, 'READY_TO_PUBLISH');
  assert.equal((await fresh.review()).publishedReport, null);
  assert.equal((await fresh.review()).publishedAt, null);
  assert.equal(fresh.deliveries.length, 0);
});

test('Publication integration: real publish freezes all client content; retries and later saves preserve it', async t => {
  const h = await publicationHarness();
  t.after(h.close);
  const data = fixture();
  assert.equal((await h.save({ ...data, status: 'ready_to_publish', realityCheckStatus: 'READY_TO_PUBLISH' })).status, 200);
  const response = await h.publish();
  assert.equal(response.status, 200);
  const result = await response.json();
  const published = await h.review();
  assert.equal(published.status, 'published');
  assert.equal((await h.check()).status, 'PUBLISHED');
  assert.ok(published.publishedAt);
  assert.equal(result.publishedAt, published.publishedAt.toISOString());
  assert.equal(published.publishedReport?.executiveSummary, data.reportDraft.executiveSummary);
  const frozen = published.publishedReport!;
  assert.deepEqual(frozen.frozenTopFixes?.map(f => f.title), data.topFixes.map(f => f.title));
  assert.deepEqual(frozen.frozenOpportunities?.map(o => o.title), data.opportunitiesFound.map(o => o.title));
  assert.equal(frozen.frozenHumanIntelligence?.brandReality?.apparentBrandMessage, 'Original brand message');
  // Check every destination, not just one occurrence of the public citation.
  for (const items of [frozen.frozenTopFixes!, frozen.frozenOpportunities!]) {
    assert.equal(items[0].evidence, null);
    assert.equal(items[1].evidence, null);
    assert.equal(items[2].evidence?.sourceUrl, 'https://evidence.example/PUBLIC_TRUE');
  }
  assert.equal(frozen.frozenHumanIntelligence?.brandReality?.evidence, null);
  assert.equal(frozen.frozenHumanIntelligence?.advertisingFunnel?.evidence, null);
  assert.equal(frozen.frozenHumanIntelligence?.customerVoice?.evidence?.clientVisible, true);
  assertClientSafe(frozen);
  const html = await h.render();
  assertClientSafe(html);
  assert.deepEqual(h.deliveries, [{
    ownerEmail: 'owner@example.test', ownerName: 'Fixture Owner', businessName: 'Lifecycle Fixture', shareToken: h.shareToken,
  }]);
  for (const edit of [false, true]) {
    if (edit) {
      const changed = JSON.parse(JSON.stringify(data).replaceAll('Original', 'EDITED').replaceAll('PUBLIC_TRUE', 'EDITED_EVIDENCE'));
      changed.toddNotes = 'NEW_INTERNAL_RESEARCH';
      changed.reportDraft.executiveSummary = 'EDITED report prose must never replace the frozen report';
      assert.equal((await h.save(changed)).status, 200);
      assert.equal((await h.review()).topFixes?.[0].title, 'EDITED fix 1', 'Operator edit really persisted');
      assert.equal((await h.review()).toddNotes, 'NEW_INTERNAL_RESEARCH');
    }
    const retry = await h.publish();
    assert.equal(retry.status, 200);
    const body = await retry.json();
    assert.equal(body.alreadyPublished, true);
    assert.equal(body.publishedAt, result.publishedAt);
    const current = await h.review();
    assert.equal(current.status, 'published');
    assert.equal((await h.check()).status, 'PUBLISHED');
    assert.deepEqual(current.publishedAt, published.publishedAt);
    assert.deepEqual(current.publishedReport, frozen);
    assert.equal(await h.render(), html, 'Rendered client report remains identical');
    assert.equal(h.deliveries.length, 1);
  }
});

test('Publication integration: overlapping real requests have one atomic winner and one delivery', { timeout: 10000 }, async t => {
  const h = await publicationHarness();
  t.after(h.close);
  assert.equal((await h.save(fixture())).status, 200);
  h.raceNextReviewReads();
  const responses = await Promise.all([h.publish(), h.publish()]);
  assert.deepEqual(responses.map(r => r.status), [200, 200]);
  const results = await Promise.all(responses.map(r => r.json()));
  assert.equal(h.competingReads(), 2, 'Both requests read before either writes');
  assert.equal(results.filter(r => r.alreadyPublished === true).length, 1);
  assert.equal(h.deliveries.length, 1);
  const frozen = await h.review();
  assert.equal(results[0].publishedAt, results[1].publishedAt);
  assertClientSafe(frozen.publishedReport);
  await h.publish();
  assert.deepEqual((await h.review()).publishedReport, frozen.publishedReport);
  assert.deepEqual((await h.review()).publishedAt, frozen.publishedAt);
  assert.equal(h.deliveries.length, 1);
});

test('Publication integration: unauthorized save/publish/preview and incomplete publication stay blocked', async t => {
  const h = await publicationHarness();
  t.after(h.close);
  const data = fixture();
  await h.save(data);
  const original = await h.review();
  for (const identity of [null, { id: 'client', email: 'client@example.test', name: 'Client', isOperator: false }]) {
    h.setOperator(identity);
    assert.equal((await h.save(data)).status, 403);
    assert.equal((await h.publish()).status, 403);
    const preview = await h.render(true);
    assert.match(preview, /Preview Access Restricted/);
    assert.ok(!preview.includes('Original fix'));
    assert.deepEqual(await h.review(), original);
  }
  h.setOperator({ id: 'operator', email: 'todd@baratrust.com', name: 'Operator', isOperator: true });
  for (const patch of [
    { topFixes: data.topFixes.slice(0, 2) },
    { reportDraft: { ...data.reportDraft, executiveSummary: 'Too short' } },
    { reportDraft: { ...data.reportDraft, topFixesSummary: '' } },
    { reportDraft: { ...data.reportDraft, notWorthSpendingOnSummary: '' } },
  ]) {
    assert.equal((await h.save({ ...data, ...patch })).status, 200);
    assert.equal((await h.publish()).status, 400);
    assert.equal((await h.review()).publishedReport, null);
    assert.equal((await h.review()).publishedAt, null);
    assert.equal((await h.check()).status, 'IN_REVIEW');
    assert.equal(h.deliveries.length, 0);
  }
});

test('Publication integration: advertising states survive save/freeze/render, including legacy YES/NO', async t => {
  for (const [input, expected] of [['OBSERVED', 'OBSERVED'], ['NOT_OBSERVED', 'NOT_OBSERVED'], ['UNKNOWN', 'UNKNOWN'], ['YES', 'OBSERVED'], ['NO', 'NOT_OBSERVED']]) {
    const h = await publicationHarness();
    t.after(h.close);
    const data = fixture();
    // Exercise the structured advertising rendering path (fallback prose has its own unit coverage).
    data.reportDraft.advertisingFunnelSummary = '';
    const humanIntelligence = { advertisingFunnel: { adPresence: input, platformsObserved: 'Public library checked' } };
    assert.equal((await h.save({ ...data, humanIntelligence })).status, 200);
    assert.equal((await h.review()).humanIntelligence?.advertisingFunnel?.adPresence, expected);
    const preview = await h.render(true);
    if (expected === 'OBSERVED') assert.match(preview, /Public Ads: Observed/);
    if (expected === 'NOT_OBSERVED') assert.match(preview, /Public Ads: None Observed in Checked Channels/);
    if (expected === 'UNKNOWN') assert.doesNotMatch(preview, /Public Ads:/);
    assert.doesNotMatch(preview, /does not advertise|runs no ads|never advertises/i);
    if (expected === 'NOT_OBSERVED') assert.match(preview, /We did not observe active paid ads in the public channels checked during our review/);
    assert.equal((await h.publish()).status, 200);
    assert.equal((await h.review()).publishedReport?.frozenHumanIntelligence?.advertisingFunnel?.adPresence, expected);
    const published = await h.render();
    assert.doesNotMatch(published, /does not advertise|runs no ads|never advertises/i);
    if (expected === 'NOT_OBSERVED') assert.match(published, /We did not observe active paid ads in the public channels checked during our review/);
  }
});

test('Publication integration: absent Human Intelligence stays absent even after post-publication research', async t => {
  const h = await publicationHarness();
  t.after(h.close);
  const data = fixture();
  for (const field of ['brandRealitySummary', 'customerVoiceSummary', 'advertisingFunnelSummary', 'ghostFootprintSummary'] as const) {
    data.reportDraft[field] = '';
  }
  assert.equal((await h.save({ ...data, humanIntelligence: null })).status, 200);
  const headings = /Brand Reality &amp; First-Impression Alignment|Customer Voice &amp; Review Intelligence|Advertising Presence &amp; Funnel Assessment|Legacy Digital Footprint &amp; Cleanup Items/;
  assert.doesNotMatch(await h.render(true), headings);
  assert.equal((await h.publish()).status, 200);
  const frozen = (await h.review()).publishedReport;
  assert.equal(frozen?.frozenHumanIntelligence, null);
  const html = await h.render();
  assert.doesNotMatch(html, headings);
  assert.equal((await h.save(data)).status, 200);
  assert.deepEqual((await h.review()).publishedReport, frozen);
  assert.equal(await h.render(), html, 'Frozen null must not fall back to new internal research');
});

test('Synthesis integration: Gemini optional output cannot fabricate empty Human Intelligence sections', async () => {
  let calls = 0;
  const data = fixture();
  const synthesizer = loadModule<typeof import('../src/lib/gemini/synthesizer')>('src/lib/gemini/synthesizer.ts', {
    'node:process': { env: { NODE_ENV: 'production', TEST_ENV: 'false', GEMINI_API_KEY: 'fixture-key' } },
    '@google/generative-ai': {
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return { generateContent: async () => {
            calls++;
            return { response: { text: () => JSON.stringify({ ...data.reportDraft,
              brandRealitySummary: 'FABRICATED brand', customerVoiceSummary: 'FABRICATED reviews',
              advertisingFunnelSummary: 'FABRICATED ads', ghostFootprintSummary: 'FABRICATED legacy assets',
            }) } };
          } };
        }
      },
    },
  });
  const pkg: SynthesisEvidencePackage = {
    business: { name: 'Fixture', website: 'https://fixture.example', cityState: 'Louisville', ownerName: 'Owner' },
    scanner: { overallScore: null, findings: [] },
    humanReview: { ...data, humanIntelligence: null },
  };
  const fields = ['brandRealitySummary', 'customerVoiceSummary', 'advertisingFunnelSummary', 'ghostFootprintSummary'] as const;
  for (const humanIntelligence of [null, {}, {
    brandReality: { messageClarity: 'UNKNOWN' as const },
    customerVoice: { topLoves: [], topComplaints: [] },
    advertisingFunnel: { adPresence: 'UNKNOWN' as const, recommendation: 'UNKNOWN' as const },
    ghostFootprint: [],
  }]) {
    const { report } = await synthesizer.synthesizeReportWithGemini({ ...pkg, humanReview: { ...data, humanIntelligence } });
    for (const field of fields) assert.equal(report[field], '', field);
  }
  const populated = await synthesizer.synthesizeReportWithGemini({ ...pkg, humanReview: data });
  for (const field of fields) assert.match(populated.report[field]!, /^FABRICATED /, 'Supported sections still accept model output');
  const partial = await synthesizer.synthesizeReportWithGemini({ ...pkg, humanReview: {
    ...data, humanIntelligence: { brandReality: { apparentBrandMessage: 'Recorded brand observation' } },
  } });
  assert.equal(partial.report.brandRealitySummary, 'FABRICATED brand');
  for (const field of fields.slice(1)) assert.equal(partial.report[field], '', 'Each optional section is gated independently');
  assert.equal(calls, 5, 'Exercises Gemini response processing, not the test-mode fallback');
});

test('Publication integration: unsafe non-HTTP evidence sourceUrl schemes are stripped from public report anchors', async t => {
  const h = await publicationHarness();
  t.after(h.close);
  const data = fixture();
  data.topFixes[0].evidence = {
    source: 'Unsafe Javascript Citation',
    sourceUrl: 'javascript:alert(1)',
    note: 'Safe note text',
    clientVisible: true,
  };
  data.humanIntelligence!.brandReality!.evidence = {
    source: 'Valid HTTPS Citation',
    sourceUrl: 'example.com/public-proof',
    note: 'Public brand proof',
    clientVisible: true,
  };
  assert.equal((await h.save(data)).status, 200);
  assert.equal((await h.publish()).status, 200);
  const frozen = (await h.review()).publishedReport;
  assert.equal(frozen?.frozenTopFixes?.[0]?.evidence?.sourceUrl, undefined);
  assert.equal(
    frozen?.frozenHumanIntelligence?.brandReality?.evidence?.sourceUrl,
    'https://example.com/public-proof'
  );
  const html = await h.render();
  assert.doesNotMatch(html, /javascript:/i);
  assert.match(html, /Unsafe Javascript Citation/);
  assert.match(html, /https:\/\/example\.com\/public-proof/);
});
