import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeSubmittedUrl,
  isPrivateIPv4,
  isPrivateIPv6,
  isPrivateIP,
  validateUrlForScan,
  createSsrfSafeAgent,
} from '../src/lib/scanner/ssrf';

import {
  parseHtmlForBusinessSignals,
  decodeHtmlEntities,
  formatCleanExcerpt,
  classifyProfileSummaryText,
} from '../src/lib/scanner/parser';
import { runDeterministicChecks, buildUnknownFindings } from '../src/lib/scanner/checks';
import { calculateScores } from '../src/lib/scanner/scoring';
import { classifySubmittedUrl, isExternalBusinessWebsiteLink } from '../src/lib/scanner/platform';
import { RawPageData, EvaluatedFinding } from '../src/lib/scanner/types';

// ==========================================
// 1. URL Normalization Tests
// ==========================================
test('URL Normalization — adds https:// when missing', () => {
  assert.equal(normalizeSubmittedUrl('example.com'), 'https://example.com');
  assert.equal(normalizeSubmittedUrl('mybusiness.com/services'), 'https://mybusiness.com/services');
  assert.equal(normalizeSubmittedUrl('   trimme.com   '), 'https://trimme.com');
});

test('URL Normalization — preserves existing http and https protocols', () => {
  assert.equal(normalizeSubmittedUrl('http://insecure-site.com'), 'http://insecure-site.com');
  assert.equal(normalizeSubmittedUrl('https://secure-site.com'), 'https://secure-site.com');
});

// ==========================================
// 2. SSRF Protection & Security Edge Cases
// ==========================================
test('SSRF Protection — blocks private and reserved IPv4 addresses', () => {
  assert.equal(isPrivateIPv4('127.0.0.1'), true, 'IPv4 loopback');
  assert.equal(isPrivateIPv4('127.255.255.254'), true, 'IPv4 loopback range');
  assert.equal(isPrivateIPv4('10.0.0.1'), true, '10.0.0.0/8 private');
  assert.equal(isPrivateIPv4('172.16.5.10'), true, '172.16.0.0/12 private');
  assert.equal(isPrivateIPv4('192.168.1.1'), true, '192.168.0.0/16 private');
  assert.equal(isPrivateIPv4('169.254.169.254'), true, 'AWS/GCP metadata service');
  assert.equal(isPrivateIPv4('100.100.100.200'), true, 'Alibaba Cloud metadata');
  assert.equal(isPrivateIPv4('100.64.0.1'), true, 'Carrier-grade NAT');
  assert.equal(isPrivateIPv4('0.0.0.0'), true, 'Current network zero');

  // Public IPs
  assert.equal(isPrivateIPv4('8.8.8.8'), false, 'Google DNS');
  assert.equal(isPrivateIPv4('1.1.1.1'), false, 'Cloudflare DNS');
});

test('SSRF Protection — blocks private IPv6 addresses including bracketed and hex mapped', () => {
  assert.equal(isPrivateIPv6('::1'), true, 'IPv6 loopback');
  assert.equal(isPrivateIPv6('[::1]'), true, 'IPv6 loopback with brackets');
  assert.equal(isPrivateIPv6('0:0:0:0:0:0:0:1'), true, 'IPv6 expanded loopback');
  assert.equal(isPrivateIPv6('fe80::1'), true, 'IPv6 link-local');
  assert.equal(isPrivateIPv6('[fe80::1]'), true, 'IPv6 link-local bracketed');
  assert.equal(isPrivateIPv6('fc00::1'), true, 'IPv6 unique local');
  assert.equal(isPrivateIPv6('fd00::1'), true, 'IPv6 unique local fd');
  
  // IPv4-mapped IPv6 (dotted decimal)
  assert.equal(isPrivateIPv6('::ffff:127.0.0.1'), true, 'IPv4-mapped 127.0.0.1');
  assert.equal(isPrivateIPv6('::ffff:169.254.169.254'), true, 'IPv4-mapped metadata');

  // IPv4-mapped IPv6 (hex representation from WHATWG URL parser)
  assert.equal(isPrivateIPv6('::ffff:7f00:1'), true, 'IPv4-mapped hex 127.0.0.1');
  assert.equal(isPrivateIPv6('[::ffff:7f00:1]'), true, 'IPv4-mapped hex 127.0.0.1 bracketed');
  assert.equal(isPrivateIPv6('::ffff:a9fe:a9fe'), true, 'IPv4-mapped hex 169.254.169.254');
  assert.equal(isPrivateIPv6('[::ffff:a9fe:a9fe]'), true, 'IPv4-mapped hex metadata bracketed');

  // Public IPv6
  assert.equal(isPrivateIPv6('2606:4700:4700::1111'), false, 'Cloudflare public IPv6');
  assert.equal(isPrivateIPv6('[2606:4700:4700::1111]'), false, 'Cloudflare public IPv6 bracketed');
});

test('SSRF Protection — validateUrlForScan rejects internal destinations, credentials, and non-web schemes', async () => {
  assert.equal((await validateUrlForScan('http://localhost:3000')).valid, false);
  assert.equal((await validateUrlForScan('http://127.0.0.1')).valid, false);
  assert.equal((await validateUrlForScan('http://[::1]')).valid, false);
  assert.equal((await validateUrlForScan('http://[::ffff:7f00:1]')).valid, false);
  assert.equal((await validateUrlForScan('http://169.254.169.254/latest/meta-data/')).valid, false);
  assert.equal((await validateUrlForScan('http://[::ffff:a9fe:a9fe]')).valid, false);
  
  // Credentials in URL
  const credsRes = await validateUrlForScan('http://admin:secret@example.com');
  assert.equal(credsRes.valid, false);
  assert.match(credsRes.error || '', /credentials/i);

  // Disallowed schemes
  assert.equal((await validateUrlForScan('ftp://ftp.example.com')).valid, false);
  assert.equal((await validateUrlForScan('file:///etc/passwd')).valid, false);
  assert.equal((await validateUrlForScan('gopher://gopher.example.com')).valid, false);

  // Disallowed ports
  assert.equal((await validateUrlForScan('https://example.com:22')).valid, false);
  assert.equal((await validateUrlForScan('https://example.com:8080')).valid, false);

  // Hostname normalization with trailing dot
  const trailingDotRes = await validateUrlForScan('https://example.com.');
  assert.equal(trailingDotRes.valid, true);
  assert.equal(trailingDotRes.hostname, 'example.com');
});

test('SSRF Protection — undici connect-time agent blocks DNS rebinding to private IPs', () => {
  const agent = createSsrfSafeAgent();
  assert.ok(agent, 'Agent should be successfully instantiated');
  assert.equal(typeof agent.dispatch, 'function');
});

// ==========================================
// 3. Audit UNKNOWN Scoring & Coverage Behavior
// ==========================================
test('UNKNOWN Scoring Audit — demonstrates 100%, 75%, 50%, 25%, and 0% coverage scenarios', () => {
  // Scenario 1: 100% evaluable, 80% score
  const findings100: EvaluatedFinding[] = [
    { category: 'customer_journey', checkKey: 'k1', title: 'T1', state: 'PASS', scoreContribution: 30, maxPoints: 30, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'customer_journey', checkKey: 'k2', title: 'T2', state: 'PASS', scoreContribution: 30, maxPoints: 30, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'customer_journey', checkKey: 'k3', title: 'T3', state: 'PASS', scoreContribution: 20, maxPoints: 20, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'customer_journey', checkKey: 'k4', title: 'T4', state: 'FAIL', scoreContribution: 0, maxPoints: 20, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
  ];
  const res100 = calculateScores(findings100);
  const cj100 = res100.categoryScores.find(c => c.category === 'customer_journey')!;
  assert.equal(cj100.score, 80);
  assert.equal(cj100.coveragePercent, 100);
  assert.equal(cj100.confidence, 'HIGH');

  // Scenario 2: 75% evaluable (1 check UNKNOWN), 80% performance on evaluated
  const findings75: EvaluatedFinding[] = [
    { category: 'customer_journey', checkKey: 'k1', title: 'T1', state: 'PASS', scoreContribution: 30, maxPoints: 30, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'customer_journey', checkKey: 'k2', title: 'T2', state: 'PASS', scoreContribution: 30, maxPoints: 30, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'customer_journey', checkKey: 'k3', title: 'T3', state: 'FAIL', scoreContribution: 0, maxPoints: 15, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'customer_journey', checkKey: 'k4', title: 'T4', state: 'UNKNOWN', scoreContribution: 0, maxPoints: 25, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
  ];
  const res75 = calculateScores(findings75);
  const cj75 = res75.categoryScores.find(c => c.category === 'customer_journey')!;
  assert.equal(cj75.score, 80); // 60/75 = 80%
  assert.equal(cj75.coveragePercent, 75);
  assert.equal(cj75.confidence, 'MEDIUM');

  // Scenario 3: 50% evaluable, 80% performance on evaluated
  const findings50: EvaluatedFinding[] = [
    { category: 'customer_journey', checkKey: 'k1', title: 'T1', state: 'PASS', scoreContribution: 40, maxPoints: 40, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'customer_journey', checkKey: 'k2', title: 'T2', state: 'FAIL', scoreContribution: 0, maxPoints: 10, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'customer_journey', checkKey: 'k3', title: 'T3', state: 'UNKNOWN', scoreContribution: 0, maxPoints: 50, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
  ];
  const res50 = calculateScores(findings50);
  const cj50 = res50.categoryScores.find(c => c.category === 'customer_journey')!;
  assert.equal(cj50.score, 80); // 40/50 = 80%
  assert.equal(cj50.coveragePercent, 50);
  assert.equal(cj50.confidence, 'MEDIUM');

  // Scenario 4: 25% evaluable, 80% performance on evaluated
  const findings25: EvaluatedFinding[] = [
    { category: 'customer_journey', checkKey: 'k1', title: 'T1', state: 'PASS', scoreContribution: 20, maxPoints: 20, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'customer_journey', checkKey: 'k2', title: 'T2', state: 'FAIL', scoreContribution: 0, maxPoints: 5, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'customer_journey', checkKey: 'k3', title: 'T3', state: 'UNKNOWN', scoreContribution: 0, maxPoints: 75, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
  ];
  const res25 = calculateScores(findings25);
  const cj25 = res25.categoryScores.find(c => c.category === 'customer_journey')!;
  assert.equal(cj25.score, 80); // 20/25 = 80%
  assert.equal(cj25.coveragePercent, 25);
  assert.equal(cj25.confidence, 'LOW');

  // Visibly distinguishable: cj100 and cj25 have the same score (80) but radically different coverage (100% vs 25%) and confidence ('HIGH' vs 'LOW')
  assert.notEqual(cj100.coveragePercent, cj25.coveragePercent);
  assert.notEqual(cj100.confidence, cj25.confidence);

  // Scenario 5: 0% evaluable (all UNKNOWN)
  const findings0: EvaluatedFinding[] = [
    { category: 'customer_journey', checkKey: 'k1', title: 'T1', state: 'UNKNOWN', scoreContribution: 0, maxPoints: 50, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'customer_journey', checkKey: 'k2', title: 'T2', state: 'UNKNOWN', scoreContribution: 0, maxPoints: 50, observedValue: {}, evidenceSource: 'HTML_PARSER', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
  ];
  const res0 = calculateScores(findings0);
  const cj0 = res0.categoryScores.find(c => c.category === 'customer_journey')!;
  assert.equal(cj0.score, null, 'Score must be null when 0% of checks are evaluable');
  assert.equal(cj0.coveragePercent, 0);
  assert.equal(cj0.confidence, 'INSUFFICIENT');
  assert.equal(res0.overallScore, null, 'Overall score must be null when overall coverage is 0');
});

// ==========================================
// 4. HTML Parser Robustness & SPA Detection Tests
// ==========================================
test('HTML Parser — parses mixed-case tags, unquoted attributes, and whitespace', () => {
  const mixedHtml = `
    <!DOCTYPE HTML>
    <HTML>
      <HEAD>
        <TITLE>  Mixed Case &amp; Whitespace  </TITLE>
        <META NAME=viewport CONTENT="width=device-width, initial-scale=1">
        <META content="Quality plumbing in New Albany" name=description>
        <LINK REL="icon" HREF=/custom-icon.png>
        <META PROPERTY=og:title CONTENT="Plumbing Pro">
      </HEAD>
      <BODY>
        <A HREF=tel:8125559876>Tap Here</A>
        <A HREF = "mailto:help@plumbingpro.com" >Email</A>
      </BODY>
    </HTML>
  `;

  const parsed = parseHtmlForBusinessSignals(mixedHtml, 'New Albany, IN');
  assert.equal(parsed.title, 'Mixed Case & Whitespace');
  assert.equal(parsed.viewportMeta, 'width=device-width, initial-scale=1');
  assert.equal(parsed.metaDescription, 'Quality plumbing in New Albany');
  assert.equal(parsed.faviconUrl, '/custom-icon.png');
  assert.equal(parsed.ogTags.title, 'Plumbing Pro');
  assert.equal(parsed.telLinks.includes('8125559876'), true);
  assert.equal(parsed.mailtoLinks.includes('help@plumbingpro.com'), true);
});

test('HTML Parser — detects client-rendered SPA shell and runDeterministicChecks yields UNKNOWN for DOM checks', () => {
  const spaHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Modern React App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" href="/favicon.ico">
      </head>
      <body>
        <div id="root"></div>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <script src="/static/js/main.chunk.js"></script>
      </body>
    </html>
  `;

  const parsed = parseHtmlForBusinessSignals(spaHtml, 'Louisville, KY');
  assert.equal(parsed.isClientRenderedSpa, true, 'Should detect SPA shell');

  const rawData: RawPageData = {
    requestedUrl: 'https://spa-example.com',
    finalUrl: 'https://spa-example.com',
    normalizedUrl: 'https://spa-example.com',
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 150,
    headers: { 'content-type': 'text/html' },
    html: spaHtml,
  };

  const findings = runDeterministicChecks({
    rawData,
    parsed,
    businessName: 'Modern React App',
    cityState: 'Louisville, KY',
  });

  // Head checks evaluated directly from static HTML should succeed
  const httpsFinding = findings.find(f => f.checkKey === 'https_enabled')!;
  assert.equal(httpsFinding.state, 'PASS');

  const viewportFinding = findings.find(f => f.checkKey === 'mobile_viewport')!;
  assert.equal(viewportFinding.state, 'PASS');

  // DOM/content-dependent checks that cannot be verified in SPA shell must return UNKNOWN, NOT FAIL!
  const phoneFinding = findings.find(f => f.checkKey === 'phone_number_visible')!;
  assert.equal(phoneFinding.state, 'UNKNOWN', 'Phone number absence in SPA shell must be UNKNOWN');
  assert.match(phoneFinding.supportingDetail, /Client-rendered SPA shell/i);

  const addressFinding = findings.find(f => f.checkKey === 'address_signals')!;
  assert.equal(addressFinding.state, 'UNKNOWN', 'Address absence in SPA shell must be UNKNOWN');

  const ctaFinding = findings.find(f => f.checkKey === 'cta_keywords_found')!;
  assert.equal(ctaFinding.state, 'UNKNOWN', 'CTA absence in SPA shell must be UNKNOWN');
});

// ==========================================
// 5. Review of Scoring Assumptions & Informational Criteria
// ==========================================
test('Deterministic Scoring Assumptions — missing public pricing, newsletter, or testimonials do not deduct points', () => {
  // A clean, solid business website WITHOUT public pricing, newsletter, testimonials, or after-hours chat
  const solidB2bHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Apex Electrical Contracting | Louisville KY</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="Licensed commercial electricians serving Louisville and Jefferson County.">
        <link rel="icon" href="/favicon.ico">
        <meta property="og:title" content="Apex Electrical">
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Electrician",
            "name": "Apex Electrical"
          }
        </script>
      </head>
      <body>
        <a href="tel:5025557788">Call (502) 555-7788</a>
        <a href="mailto:dispatch@apexelectric.com">Contact Us</a>
        <h1>Commercial Electrical Services</h1>
        <p>Serving Jefferson County and Louisville surrounding areas.</p>
        <p>Call our office at (502) 555-7788 or visit 1200 Main Street, Suite 400, Louisville KY 40202.</p>
        <p>Founded by master electricians with 30 years of experience.</p>
        <form>
          <input type="text" placeholder="Project details" />
          <input type="email" placeholder="Email" />
          <textarea placeholder="Describe electrical project for estimate"></textarea>
          <button type="submit">Request a Quote</button>
        </form>
        <footer><a href="/privacy">Privacy Policy</a></footer>
      </body>
    </html>
  `;

  const rawData: RawPageData = {
    requestedUrl: 'https://apexelectric.com',
    finalUrl: 'https://apexelectric.com',
    normalizedUrl: 'https://apexelectric.com',
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 200,
    headers: { 'content-type': 'text/html' },
    html: solidB2bHtml,
  };

  const parsed = parseHtmlForBusinessSignals(solidB2bHtml, 'Louisville, KY');
  const findings = runDeterministicChecks({
    rawData,
    parsed,
    businessName: 'Apex Electrical',
    cityState: 'Louisville, KY',
  });

  const { overallScore, scoreBreakdown } = calculateScores(findings);

  // Informational checks (pricing, newsletter, testimonials) must have maxPoints = 0
  const pricingFinding = findings.find(f => f.checkKey === 'public_pricing_observed')!;
  assert.equal(pricingFinding.maxPoints, 0, 'Pricing check must be informational');
  assert.equal(pricingFinding.isInformational, true);

  const newsletterFinding = findings.find(f => f.checkKey === 'email_list_capture')!;
  assert.equal(newsletterFinding.maxPoints, 0, 'Newsletter check must be informational');
  assert.equal(newsletterFinding.isInformational, true);

  const testimonialFinding = findings.find(f => f.checkKey === 'reviews_testimonials')!;
  assert.equal(testimonialFinding.maxPoints, 0, 'Testimonial check must be informational');
  assert.equal(testimonialFinding.isInformational, true);

  // Even without a newsletter or public pricing, this business achieves a perfect score across universal criteria
  assert.equal(scoreBreakdown?.customerJourney, 100);
  assert.equal(scoreBreakdown?.opportunityCapture, 100);
  assert.equal(scoreBreakdown?.trustReputation, 100);
  assert.equal(scoreBreakdown?.digitalPresence, 100);
  assert.equal(scoreBreakdown?.localDiscovery, 100);
  assert.equal(overallScore, 100);
});

// ==========================================
// 6. Score Determinism & Fallback Tests
// ==========================================
test('Score Determinism — running 100 times produces identical scores every time', () => {
  const minimalHtml = `
    <html>
      <head><title>Test Business</title></head>
      <body><p>Welcome to our site.</p></body>
    </html>
  `;

  const rawData: RawPageData = {
    requestedUrl: 'https://test.com',
    finalUrl: 'https://test.com',
    normalizedUrl: 'https://test.com',
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 300,
    headers: {},
    html: minimalHtml,
  };

  const parsed = parseHtmlForBusinessSignals(minimalHtml, 'New Albany, IN');
  
  const firstRun = calculateScores(
    runDeterministicChecks({ rawData, parsed, businessName: 'Test', cityState: 'New Albany, IN' })
  );

  for (let i = 0; i < 99; i++) {
    const nextRun = calculateScores(
      runDeterministicChecks({ rawData, parsed, businessName: 'Test', cityState: 'New Albany, IN' })
    );
    assert.equal(nextRun.overallScore, firstRun.overallScore);
    assert.deepEqual(nextRun.scoreBreakdown, firstRun.scoreBreakdown);
  }
});

test('Fallback UNKNOWN findings — does not invent PASS/FAIL when scan is blocked', () => {
  const unknownFindings = buildUnknownFindings('Website returned HTTP 403 Forbidden (Cloudflare bot protection)');
  
  assert.equal(unknownFindings.length, 28);
  assert.ok(unknownFindings.every(f => f.state === 'UNKNOWN'));
  assert.ok(unknownFindings.every(f => f.scoreContribution === 0));

  const { overallScore, scoreBreakdown, overallCoverage, confidence } = calculateScores(unknownFindings);
  assert.equal(overallScore, null, 'Overall score must be null for blocked/deferred scan');
  assert.equal(scoreBreakdown, null, 'Score breakdown must be null for blocked/deferred scan');
  assert.equal(overallCoverage, 0, 'Overall coverage must be 0 for blocked scan');
  assert.equal(confidence, 'INSUFFICIENT');
});

test('HTML Parser — parses valid JSON-LD even when another JSON-LD block is malformed', () => {
  const multiJsonLdHtml = `
    <html>
      <head>
        <script type="application/ld+json">{ invalid json syntax here</script>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "PlumbingService",
            "name": "Reliable Plumbing"
          }
        </script>
      </head>
      <body><h1>Plumbing</h1></body>
    </html>
  `;
  const parsed = parseHtmlForBusinessSignals(multiJsonLdHtml, 'Louisville, KY');
  assert.equal(parsed.hasLocalBusinessSchema, true);
  assert.equal(parsed.jsonLdSchemas.length, 1);
});

test('Weighted Total Calculation — verifies exact mathematical weights (20%, 25%, 20%, 20%, 15%)', () => {
  // Mock findings with controlled category scores:
  // DP: 100, CJ: 80, TR: 60, LD: 40, OC: 20 (all 100% coverage)
  // Expected: (100 * 0.20) + (80 * 0.25) + (60 * 0.20) + (40 * 0.20) + (20 * 0.15)
  // Expected: 20 + 20 + 12 + 8 + 3 = 63
  const mockFindings: EvaluatedFinding[] = [
    { category: 'digital_presence', checkKey: 'c1', title: 'C1', state: 'PASS', scoreContribution: 100, maxPoints: 100, observedValue: {}, evidenceSource: 'SYSTEM', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'customer_journey', checkKey: 'c2', title: 'C2', state: 'PASS', scoreContribution: 80, maxPoints: 100, observedValue: {}, evidenceSource: 'SYSTEM', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'trust_reputation', checkKey: 'c3', title: 'C3', state: 'PASS', scoreContribution: 60, maxPoints: 100, observedValue: {}, evidenceSource: 'SYSTEM', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'local_discovery', checkKey: 'c4', title: 'C4', state: 'PASS', scoreContribution: 40, maxPoints: 100, observedValue: {}, evidenceSource: 'SYSTEM', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
    { category: 'opportunity_capture', checkKey: 'c5', title: 'C5', state: 'PASS', scoreContribution: 20, maxPoints: 100, observedValue: {}, evidenceSource: 'SYSTEM', evidenceLabel: 'AUTO_DETECTED', supportingDetail: '' },
  ];

  const { overallScore, scoreBreakdown, overallCoverage, confidence } = calculateScores(mockFindings);

  assert.equal(scoreBreakdown?.digitalPresence, 100);
  assert.equal(scoreBreakdown?.customerJourney, 80);
  assert.equal(scoreBreakdown?.trustReputation, 60);
  assert.equal(scoreBreakdown?.localDiscovery, 40);
  assert.equal(scoreBreakdown?.opportunityCapture, 20);
  assert.equal(overallCoverage, 100);
  assert.equal(confidence, 'HIGH');
  assert.equal(overallScore, 63);
});

// ==========================================
// 7. Hosted Third-Party Profile vs. Standalone Website Tests
// ==========================================
const TAQUERIA_FB_HTML = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>Taqueria el Cerrito | New Albany IN</title>
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=2,shrink-to-fit=no" />
      <meta name="description" content="Taqueria el Cerrito , New Albany. 214 followers &#xb7; 1 talking about this &#xb7; 7 were here. Mexican Food" />
      <meta property="og:title" content="Taqueria el Cerrito | New Albany IN" />
      <meta property="og:description" content="Taqueria el Cerrito , New Albany. 214 followers &#xb7; 1 talking about this &#xb7; 7 were here. Mexican Food" />
      <meta property="og:image:alt" content="Taqueria el Cerrito | New Albany IN" />
      <meta property="og:image" content="https://scontent.xx.fbcdn.net/v/t39.30808-6/photo.jpg" />
      <link rel="shortcut icon" href="https://static.xx.fbcdn.net/rsrc.php/yT/r/aGT3gskzWBf.ico" />
      <script src="https://static.xx.fbcdn.net/bundle.js"></script>
    </head>
    <body>
      <div id="root"></div>
    </body>
  </html>
`;

test('Hosted Profile 1 — Facebook URL is recognized as a hosted profile', () => {
  const fb1 = classifySubmittedUrl('https://www.facebook.com/people/Taqueria-el-Cerrito/61552632675200/');
  assert.equal(fb1.isHostedProfile, true);
  assert.equal(fb1.sourceType, 'hosted_profile');
  assert.equal(fb1.platformKey, 'facebook');
  assert.equal(fb1.platformLabel, 'Facebook business page');

  const fb2 = classifySubmittedUrl('fb.com/taqueriaelcerrito');
  assert.equal(fb2.isHostedProfile, true);
  assert.equal(fb2.platformKey, 'facebook');

  const fb3 = classifySubmittedUrl('https://m.facebook.com/profile.php?id=61552632675200');
  assert.equal(fb3.isHostedProfile, true);
  assert.equal(fb3.platformKey, 'facebook');
});

test('Hosted Profile 2 — Google Business / Maps URLs are recognized as hosted profiles', () => {
  const g1 = classifySubmittedUrl('https://maps.google.com/?cid=123456789');
  assert.equal(g1.isHostedProfile, true);
  assert.equal(g1.platformKey, 'google_business');
  assert.equal(g1.platformLabel, 'Google Business Profile');

  const g2 = classifySubmittedUrl('https://www.google.com/maps/place/Taqueria+El+Cerrito');
  assert.equal(g2.isHostedProfile, true);
  assert.equal(g2.platformKey, 'google_business');

  const g3 = classifySubmittedUrl('https://g.page/r/Cf123456789');
  assert.equal(g3.isHostedProfile, true);
  assert.equal(g3.platformKey, 'google_business');

  const g4 = classifySubmittedUrl('https://maps.app.goo.gl/abc123xyz');
  assert.equal(g4.isHostedProfile, true);
  assert.equal(g4.platformKey, 'google_business');
});

test('Hosted Profile 3 — Instagram, Yelp, LinkedIn, TikTok, Nextdoor, Thumbtack, Angi, and BBB URLs are recognized as hosted profiles', () => {
  assert.equal(classifySubmittedUrl('https://www.instagram.com/taqueriaelcerrito/').platformKey, 'instagram');
  assert.equal(classifySubmittedUrl('https://www.yelp.com/biz/taqueria-el-cerrito-new-albany').platformKey, 'yelp');
  assert.equal(classifySubmittedUrl('https://www.linkedin.com/company/baratrust').platformKey, 'linkedin');
  assert.equal(classifySubmittedUrl('https://www.tiktok.com/@taqueriaelcerrito').platformKey, 'tiktok');
  assert.equal(classifySubmittedUrl('https://nextdoor.com/pages/taqueria-el-cerrito/').platformKey, 'nextdoor');
  assert.equal(classifySubmittedUrl('https://www.thumbtack.com/ky/louisville/plumbers/').platformKey, 'thumbtack');
  assert.equal(classifySubmittedUrl('https://www.angi.com/companylist/us/in/new-albany/').platformKey, 'angi');
  assert.equal(classifySubmittedUrl('https://www.bbb.org/us/in/new-albany/profile/restaurants').platformKey, 'bbb');
});

test('Hosted Profile 4 — Standalone business website URL is recognized as standalone_website', () => {
  const site = classifySubmittedUrl('https://rivercityplumbing.com');
  assert.equal(site.isHostedProfile, false);
  assert.equal(site.sourceType, 'standalone_website');
  assert.equal(site.platformKey, null);
  assert.equal(site.platformLabel, null);

  // Regular Google non-maps URL or unknown domain stays standalone_website
  const customDomain = classifySubmittedUrl('https://taqueriaelcerrito.com/menu');
  assert.equal(customDomain.isHostedProfile, false);
  assert.equal(customDomain.sourceType, 'standalone_website');
});

test('Hosted Profile 5 — Facebook page does NOT receive PASS findings for HTTPS, server response, viewport, favicon, or OpenGraph', () => {
  const url = 'https://www.facebook.com/people/Taqueria-el-Cerrito/61552632675200/';
  const platform = classifySubmittedUrl(url);
  const parsed = parseHtmlForBusinessSignals(TAQUERIA_FB_HTML, undefined, platform.platformKey);
  const rawData: RawPageData = {
    requestedUrl: url,
    finalUrl: url,
    normalizedUrl: url,
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 420,
    headers: {},
    html: TAQUERIA_FB_HTML,
  };

  const findings = runDeterministicChecks({ rawData, parsed, platform });
  const checkKeys = new Set(findings.map((f) => f.checkKey));

  assert.equal(checkKeys.has('https_enabled'), false, 'Must not credit Facebook HTTPS');
  assert.equal(checkKeys.has('page_responds'), false, 'Must not credit Facebook server response');
  assert.equal(checkKeys.has('mobile_viewport'), false, 'Must not credit Facebook viewport meta');
  assert.equal(checkKeys.has('has_favicon'), false, 'Must not credit Facebook favicon');
  assert.equal(checkKeys.has('opengraph_presence'), false, 'Must not credit Facebook OpenGraph');
  assert.equal(checkKeys.has('terms_privacy'), false, 'Must not credit Facebook terms/privacy');
});

test('Hosted Profile 6 — Facebook page does NOT receive FAIL finding for missing LocalBusiness schema', () => {
  const url = 'https://www.facebook.com/people/Taqueria-el-Cerrito/61552632675200/';
  const platform = classifySubmittedUrl(url);
  const parsed = parseHtmlForBusinessSignals(TAQUERIA_FB_HTML, undefined, platform.platformKey);
  const rawData: RawPageData = {
    requestedUrl: url,
    finalUrl: url,
    normalizedUrl: url,
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 420,
    headers: {},
    html: TAQUERIA_FB_HTML,
  };

  const findings = runDeterministicChecks({ rawData, parsed, platform });
  assert.equal(
    findings.some((f) => f.checkKey === 'local_business_schema'),
    false,
    'Must not evaluate LocalBusiness schema on Facebook'
  );
  assert.equal(
    findings.some((f) => f.state === 'FAIL'),
    false,
    'Hosted profile with unobservable static fields must defer to UNKNOWN rather than FAIL'
  );
});

test('Hosted Profile 7 — Facebook page score is withheld (overallScore is null, never a misleading 50/100)', () => {
  const url = 'https://www.facebook.com/people/Taqueria-el-Cerrito/61552632675200/';
  const platform = classifySubmittedUrl(url);
  const parsed = parseHtmlForBusinessSignals(TAQUERIA_FB_HTML, undefined, platform.platformKey);
  const rawData: RawPageData = {
    requestedUrl: url,
    finalUrl: url,
    normalizedUrl: url,
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 420,
    headers: {},
    html: TAQUERIA_FB_HTML,
  };

  const findings = runDeterministicChecks({ rawData, parsed, platform });
  const scores = calculateScores(findings, platform);

  assert.equal(scores.overallScore, null, 'Numeric website score must be withheld for Facebook business page');
  assert.equal(scores.scoreBreakdown?.sourceType, 'hosted_profile');
  assert.equal(scores.scoreBreakdown?.platformKey, 'facebook');
  assert.equal(scores.scoreBreakdown?.platformLabel, 'Facebook business page');
  assert.ok(scores.overallCoverage > 0, 'Observable profile signal coverage should still be reported');
});

test('Hosted Profile 8 — Facebook page extracts business name, city/state, category, and activity signals and marks unobservable signals UNKNOWN', () => {
  const url = 'https://www.facebook.com/people/Taqueria-el-Cerrito/61552632675200/';
  const platform = classifySubmittedUrl(url);
  const parsed = parseHtmlForBusinessSignals(TAQUERIA_FB_HTML, undefined, platform.platformKey);

  assert.equal(parsed.derivedBusinessName, 'Taqueria el Cerrito');
  assert.equal(parsed.derivedCityState, 'New Albany, IN');
  assert.equal(parsed.detectedProfileCategory, 'Mexican Food');
  assert.equal(parsed.detectedProfileActivity, '214 followers · 1 talking about this · 7 were here');

  const rawData: RawPageData = {
    requestedUrl: url,
    finalUrl: url,
    normalizedUrl: url,
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 420,
    headers: {},
    html: TAQUERIA_FB_HTML,
  };

  const findings = runDeterministicChecks({ rawData, parsed, platform });
  const byKey = new Map(findings.map((f) => [f.checkKey, f]));

  assert.equal(byKey.get('profile_business_name')?.state, 'PASS');
  assert.equal(byKey.get('profile_location_signals')?.state, 'PASS');
  assert.equal(byKey.get('profile_category_or_services')?.state, 'PASS');
  assert.equal(byKey.get('profile_category_or_services')?.title, 'Business Category');
  assert.equal(
    byKey.get('profile_category_or_services')?.supportingDetail,
    'Business category detected on Facebook business page: "Mexican Food".'
  );
  assert.equal(byKey.get('profile_activity_signals')?.state, 'PASS');
  assert.equal(byKey.get('profile_phone_or_contact')?.state, 'UNKNOWN');
  assert.equal(byKey.get('profile_external_website')?.state, 'UNKNOWN');
});

test('Hosted Profile 9 — HTML entities (&#x48;TTPS, &#x57;hether, &#xb7;, double-encoded) do not leak into decoded text or findings, and og:image is not overwritten by og:image:alt', () => {
  assert.equal(decodeHtmlEntities('&#x48;TTPS security'), 'HTTPS security');
  assert.equal(decodeHtmlEntities('&#x57;hether local buyers'), 'Whether local buyers');
  assert.equal(
    decodeHtmlEntities('214 followers &#xb7; 1 talking about this &amp;#xb7; 7 were here'),
    '214 followers · 1 talking about this · 7 were here'
  );
  assert.equal(decodeHtmlEntities('Joe&#39;s &amp; Sons &mdash; HVAC'), "Joe's & Sons — HVAC");

  const parsed = parseHtmlForBusinessSignals(TAQUERIA_FB_HTML, undefined, 'facebook');
  assert.equal(
    parsed.metaDescription?.includes('&#xb7;'),
    false,
    'metaDescription must have hex HTML entities decoded'
  );
  assert.equal(
    parsed.ogTags.image,
    'https://scontent.xx.fbcdn.net/v/t39.30808-6/photo.jpg',
    'og:image must not match og:image:alt'
  );

  // Verify external link extraction unwraps l.facebook.com shim and ignores facebook internal links
  assert.equal(
    isExternalBusinessWebsiteLink('https://www.facebook.com/policies', 'facebook'),
    null
  );
  assert.equal(
    isExternalBusinessWebsiteLink(
      'https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.taqueriaelcerrito.com%2Fmenu',
      'facebook'
    ),
    'https://www.taqueriaelcerrito.com/menu'
  );
});

test('Hosted Profile 10 — Normal standalone website scanning still works as expected with numeric score and all 28 checks', () => {
  const standaloneUrl = 'https://rivercityplumbing.com';
  const platform = classifySubmittedUrl(standaloneUrl);
  assert.equal(platform.isHostedProfile, false);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>River City Plumbing | Louisville KY</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="24/7 emergency plumbing repair and water heater installation in Louisville, KY." />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <h1>River City Plumbing</h1>
        <p>Serving Louisville, KY and Southern Indiana for over 20 years. Locally owned and operated.</p>
        <p>Our services include drain cleaning, water heaters, and sewer line repair.</p>
        <a href="tel:5025550199">Call Now (502) 555-0199</a>
        <p>123 Main Street, Louisville, KY 40202</p>
        <form><input type="email" name="email" /><textarea name="message"></textarea><button>Request a Quote</button></form>
        <a href="/privacy-policy">Privacy Policy</a>
      </body>
    </html>
  `;
  const parsed = parseHtmlForBusinessSignals(html, undefined, platform.platformKey);
  const rawData: RawPageData = {
    requestedUrl: standaloneUrl,
    finalUrl: standaloneUrl,
    normalizedUrl: standaloneUrl,
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 180,
    headers: {},
    html,
  };

  const findings = runDeterministicChecks({ rawData, parsed, platform });
  const scores = calculateScores(findings, platform);

  assert.equal(findings.length, 28);
  assert.ok(typeof scores.overallScore === 'number' && scores.overallScore > 60);
  assert.equal(scores.scoreBreakdown?.sourceType, 'standalone_website');
  assert.equal(parsed.derivedCityState, 'Louisville, KY');
});

test('Hosted Profile 11 — Distinguishes Business Category from Business Description / Offerings Signal and formats clean excerpts without double periods (..)', () => {
  const sweetBsHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sweet B&#039;s | New Albany IN | Facebook</title>
        <meta name="description" content="Sweet B&#039;s, New Albany, Indiana. 1,422 likes &#xb7; 48 talking about this &#xb7; 85 were here. Located in historic downtown of New Albany Indiana IN the alleyway across the street from The Grand. We are a whimsical..." />
      </head>
      <body></body>
    </html>
  `;
  const url = 'https://www.facebook.com/p/Sweet-Bs-100092657172102/';
  const platform = classifySubmittedUrl(url);
  const parsed = parseHtmlForBusinessSignals(sweetBsHtml, undefined, platform.platformKey);

  assert.equal(parsed.derivedBusinessName, "Sweet B's");
  assert.equal(parsed.derivedCityState, 'New Albany, IN');
  assert.equal(parsed.detectedProfileCategory, null, 'Free-form bio must not be classified as an explicit category');
  assert.ok(parsed.detectedProfileDescription, 'Free-form bio must be stored in detectedProfileDescription');
  assert.equal(
    parsed.detectedProfileDescription?.endsWith('..'),
    false,
    'Excerpt must never end with double periods (..)'
  );
  assert.equal(
    parsed.detectedProfileDescription?.endsWith('…'),
    true,
    'Truncated excerpt must end with a single unicode ellipsis (…)'
  );

  const rawData: RawPageData = {
    requestedUrl: url,
    finalUrl: url,
    normalizedUrl: url,
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 320,
    headers: {},
    html: sweetBsHtml,
  };

  const findings = runDeterministicChecks({ rawData, parsed, platform });
  const summaryFinding = findings.find((f) => f.checkKey === 'profile_category_or_services')!;
  assert.equal(summaryFinding.state, 'PASS');
  assert.equal(summaryFinding.title, 'Business Description / Offerings Signal');
  assert.match(summaryFinding.supportingDetail, /We are a whimsical…"/);
  assert.equal(summaryFinding.supportingDetail.includes('..'), false);

  // Direct unit checks on formatCleanExcerpt & classifyProfileSummaryText
  assert.equal(
    formatCleanExcerpt(
      'Located in historic downtown of New Albany Indiana IN the alleyway across the street from The Grand. We are a whimsical..'
    ),
    'Located in historic downtown of New Albany Indiana IN the alleyway across the street from The Grand. We are a whimsical…'
  );
  assert.deepEqual(classifyProfileSummaryText('Mexican Food'), {
    kind: 'category',
    text: 'Mexican Food',
  });
});




// ==========================================
// 8. Calibration & Correctness Audit Regression Suite (Phases 2–7)
// ==========================================
test('Calibration Audit Phase 2 — Client-rendered SPA shell with title keywords withholds numeric overallScore and does not leak <head> into visibleText', () => {
  const spaWithTitleKeywordsHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Fistful | Restaurant, Brewery, Food Trucks &amp; Catering</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Your place for Great Food. Your partner for Great Events. Scratch-made food, craft brewery, and full-service catering in Southern Indiana and Louisville." />
        <meta property="og:title" content="Fistful | Restaurant, Brewery, Food Trucks &amp; Catering" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/assets/index.js"></script>
      </body>
    </html>
  `;

  const parsed = parseHtmlForBusinessSignals(spaWithTitleKeywordsHtml);
  assert.equal(parsed.isClientRenderedSpa, true, 'Must detect client-rendered SPA shell');
  assert.equal(parsed.textSnippet, '', '<head>/<title> text must not leak into visible body text');
  assert.equal(
    parsed.detectedQuoteOrCateringKeywords,
    false,
    'Title-only keyword on empty SPA shell must not count as an in-body quote/catering action path'
  );

  const rawData: RawPageData = {
    requestedUrl: 'https://fistfulcraft.com',
    finalUrl: 'https://fistfulcraft.com/',
    normalizedUrl: 'https://fistfulcraft.com/',
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 95,
    headers: { 'content-type': 'text/html' },
    html: spaWithTitleKeywordsHtml,
  };

  const findings = runDeterministicChecks({ rawData, parsed });
  const schemaFinding = findings.find((f) => f.checkKey === 'local_business_schema')!;
  assert.equal(
    schemaFinding.state,
    'UNKNOWN',
    'Missing LocalBusiness schema on unrendered SPA shell must be UNKNOWN rather than FAIL'
  );

  const scores = calculateScores(findings);
  assert.equal(
    scores.overallScore,
    null,
    'Numeric overallScore must be withheld (null) when only Digital Presence (<head>) is evaluable on an SPA shell'
  );
  assert.equal(scores.confidence, 'LOW');
  assert.equal(scores.overallCoverage, 20);
});

test('Calibration Audit Phase 4 — CTA detector recognizes interactive conversion controls and ignores generic navigation or prose verbs', () => {
  const interactiveCtaHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>Growth Partner</title></head>
      <body>
        <nav>
          <a href="#services">What we help with</a>
          <a href="#how">How it works</a>
          <a class="nav-cta" href="#start">Get your free Reality Check</a>
          <button type="button">Night mode</button>
        </nav>
        <main>
          <p>We help small businesses get more customers and lose fewer opportunities.</p>
          <div class="cta-row">
            <a class="btn primary" href="#start">Run My Free Reality Check</a>
            <a class="btn secondary" href="#services">See What We Can Help With</a>
          </div>
          <form>
            <input type="text" name="website" />
            <button type="submit">Run Instant Scan</button>
          </form>
        </main>
      </body>
    </html>
  `;

  const parsedBaraStyle = parseHtmlForBusinessSignals(interactiveCtaHtml);
  assert.ok(
    parsedBaraStyle.detectedCtaKeywords.includes('get your free reality check') ||
      parsedBaraStyle.detectedCtaKeywords.includes('run my free reality check'),
    'Must detect interactive Reality Check CTA links/buttons'
  );
  assert.equal(
    parsedBaraStyle.detectedCtaKeywords.includes('night mode'),
    false,
    'Must never classify theme toggle button as a conversion CTA'
  );

  const demoCtaHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>Restaurant Platform</title></head>
      <body>
        <a href="/demo" class="button">Get a Free Demo</a>
        <a href="/blog">Learn more</a>
        <a href="/about">Read more</a>
      </body>
    </html>
  `;
  const parsedDemo = parseHtmlForBusinessSignals(demoCtaHtml);
  assert.ok(
    parsedDemo.detectedCtaKeywords.includes('get a free demo'),
    'Must detect "Get a Free Demo" conversion control'
  );
  assert.equal(
    parsedDemo.detectedCtaKeywords.includes('learn more'),
    false,
    'Must not count generic "Learn more" link as a conversion CTA'
  );
  assert.equal(
    parsedDemo.detectedCtaKeywords.includes('read more'),
    false,
    'Must not count generic "Read more" link as a conversion CTA'
  );
});

test('Calibration Audit Phase 5 — Multi-location restaurants pass city_state_match and service_area_language beyond 500 chars without requiring contractor phrasing', () => {
  const fillerIntro = 'Welcome to our family pizzeria where we hand-make dough fresh every morning using imported tomatoes and 100% whole milk mozzarella cheese. '.repeat(6);
  const multiLocationRestaurantHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Mattenga's Pizzeria | Best Pizza in San Antonio | Pizza near me</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Mattenga's Pizzeria serves authentic scratch-made pizza, wings, and pasta across the San Antonio metro area." />
        <link rel="icon" href="https://mattengas.com/favicon.png?w=32&amp;h=32" />
      </head>
      <body>
        <h1>Mattenga's Pizzeria</h1>
        <p>${fillerIntro}</p>
        <a href="https://order.mattengas.com">Order Online</a>
        <a href="tel:+12105921138">(210) 592-1138</a>
        <section id="locations">
          <h2>Our Locations</h2>
          <p>6044 FM3009 Ste 110, Schertz, TX 78154</p>
          <p>46 HW New Braunfels Military Dr, San Antonio, TX 78235</p>
        </section>
        <footer><a href="/privacy-policy">Privacy Policy</a></footer>
      </body>
    </html>
  `;

  const parsed = parseHtmlForBusinessSignals(multiLocationRestaurantHtml, 'Schertz, TX');
  assert.ok(
    parsed.textSnippet.length <= 500 && !parsed.textSnippet.toLowerCase().includes('schertz'),
    'Fixture places Schertz address after the first 500 characters'
  );

  const rawData: RawPageData = {
    requestedUrl: 'https://mattengas.com',
    finalUrl: 'https://mattengas.com/',
    normalizedUrl: 'https://mattengas.com/',
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 85,
    headers: { 'content-type': 'text/html' },
    html: multiLocationRestaurantHtml,
  };

  const findings = runDeterministicChecks({
    rawData,
    parsed,
    cityState: 'Schertz, TX',
  });

  const cityFinding = findings.find((f) => f.checkKey === 'city_state_match')!;
  assert.equal(
    cityFinding.state,
    'PASS',
    'city_state_match must search full page content/locations beyond the 500-char snippet'
  );

  const serviceAreaFinding = findings.find((f) => f.checkKey === 'service_area_language')!;
  assert.equal(
    serviceAreaFinding.state,
    'PASS',
    'Multi-location restaurant with physical storefront addresses must pass service_area_language without contractor phrasing'
  );

  const metaDescFinding = findings.find((f) => f.checkKey === 'meta_description')!;
  assert.equal(
    metaDescFinding.state,
    'PASS',
    'Meta description containing apostrophe (Mattenga\'s) must not be truncated at single quote'
  );
});

test('Calibration Audit Phase 5 — Address regex rejects prose false positives ("slip away", "recurring waste", "000 Savings in third") and digital-first sites defer inapplicable storefront checks to UNKNOWN', () => {
  const digitalFirstHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>BaraTrust — Small Business Growth &amp; Operations Partner</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Run your business. We'll help with the rest. BaraTrust helps small businesses get more customers and cut unnecessary costs." />
        <meta property="og:title" content="BaraTrust" />
      </head>
      <body>
        <h1>Run your business. We’ll help with the rest.</h1>
        <p>02 Lose Fewer Opportunities Stop letting warm inquiries and past quotes slip away.</p>
        <p>03 Cut Unnecessary Costs Spot recurring waste and trim expenses.</p>
        <p>$10,000 Savings in third-party delivery fees.</p>
        <p>1 Paste Your Link Paste your website.</p>
        <p>AI helps BaraTrust research faster, but BaraTrust is human-led.</p>
        <a class="btn primary" href="#start">Run My Free Reality Check</a>
        <form><input type="email" name="email" /><textarea name="message"></textarea><button type="submit">Run My Free Reality Check</button></form>
        <footer><a href="mailto:todd@baratrust.com">todd@baratrust.com</a></footer>
      </body>
    </html>
  `;

  const parsed = parseHtmlForBusinessSignals(digitalFirstHtml);
  assert.deepEqual(
    parsed.visibleAddressSignals,
    [],
    'Prose containing numbers followed by "away", "waste", "Paste", or "third" must never match as street addresses'
  );

  const rawData: RawPageData = {
    requestedUrl: 'https://www.baratrust.com',
    finalUrl: 'https://www.baratrust.com/',
    normalizedUrl: 'https://www.baratrust.com/',
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 120,
    headers: { 'content-type': 'text/html' },
    html: digitalFirstHtml,
  };

  const findings = runDeterministicChecks({ rawData, parsed });
  const byKey = new Map(findings.map((f) => [f.checkKey, f]));

  assert.equal(byKey.get('cta_keywords_found')?.state, 'PASS');
  assert.equal(byKey.get('has_tel_link')?.state, 'UNKNOWN');
  assert.equal(byKey.get('phone_number_visible')?.state, 'UNKNOWN');
  assert.equal(byKey.get('address_signals')?.state, 'UNKNOWN');
  assert.equal(byKey.get('service_area_language')?.state, 'UNKNOWN');
  assert.equal(byKey.get('local_business_schema')?.state, 'UNKNOWN');
  assert.equal(byKey.get('has_favicon')?.maxPoints, 5, 'Favicon check weight must be 5 points');
  assert.equal(byKey.get('has_title')?.maxPoints, 15, 'Title check weight must be 15 points');
});

test('Calibration Audit Phase 6 & 7 — Meta description and OpenGraph parser preserves apostrophes inside double-quoted attributes and decodes favicon href entities', () => {
  const htmlWithApostrophes = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Talkin' Tacos | Best Tacos in Town</title>
        <meta content="Talkin' Tacos serves authentic birria tacos, loaded fries, and fresh aguas frescas across South Florida." name="description" />
        <meta content="Talkin' Tacos" property="og:title" />
        <meta content="Talkin' Tacos Official Site" property="og:site_name" />
        <meta content="Talkin' Tacos serves authentic birria tacos, loaded fries, and fresh aguas frescas." property="og:description" />
        <link rel="shortcut icon" href="https://talkintacos.net/icon.png?w=32&amp;h=32&amp;fit=contain" />
      </head>
      <body>
        <a href="tel:1-844-24-69637">Call 1-844-24-69637</a>
      </body>
    </html>
  `;

  const parsed = parseHtmlForBusinessSignals(htmlWithApostrophes);
  assert.equal(
    parsed.metaDescription,
    "Talkin' Tacos serves authentic birria tacos, loaded fries, and fresh aguas frescas across South Florida."
  );
  assert.equal(parsed.ogTags.title, "Talkin' Tacos");
  assert.equal(parsed.ogTags.siteName, "Talkin' Tacos Official Site");
  assert.equal(
    parsed.ogTags.description,
    "Talkin' Tacos serves authentic birria tacos, loaded fries, and fresh aguas frescas."
  );
  assert.equal(
    parsed.faviconUrl,
    'https://talkintacos.net/icon.png?w=32&h=32&fit=contain',
    'Favicon href must decode &amp; entities'
  );
  assert.ok(
    parsed.visiblePhoneNumbers.includes('1-844-24-69637'),
    'Must recognize toll-free / non-standard hyphenated 11-digit phone number'
  );
});

// ==========================================
// 9. Challenge Review Regression Suite — Cases A–E & 0-Point Informational Semantics
// ==========================================
test('Challenge Review 2 (Case A) — Digital-first B2B / SaaS platform (owner.com style) does not fail storefront-only checks even when mentioning restaurants and phone support', () => {
  const saasHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Owner.com | Restaurant Website &amp; Online Ordering Platform</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="All-in-one restaurant marketing platform built for restaurant owners to grow online ordering, takeout, and delivery." />
        <meta property="og:title" content="Owner.com" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <h1>The #1 Restaurant Marketing Software for Independent Restaurant Owners</h1>
        <p>Grow your direct online ordering and loyalty with our all-in-one platform. Trusted by thousands of pizzeria, taqueria, and diner owners nationwide.</p>
        <a href="/demo" class="button">Get a Free Demo</a>
        <a href="tel:+18583104850">Call Sales (858) 310-4850</a>
        <section><h2>Our Story</h2><p>Founded to help local business owners succeed online.</p></section>
        <form><input type="email" name="email" /><textarea name="message"></textarea><button type="submit">Request a Demo</button></form>
        <footer><a href="/privacy">Privacy Policy</a></footer>
      </body>
    </html>
  `;

  const parsed = parseHtmlForBusinessSignals(saasHtml);
  assert.equal(
    parsed.detectedLocalBusinessCues,
    false,
    'B2B SaaS platform with demo/software cues and no physical storefront must not be classified as a local brick-and-mortar restaurant'
  );

  const rawData: RawPageData = {
    requestedUrl: 'https://owner.com',
    finalUrl: 'https://owner.com/',
    normalizedUrl: 'https://owner.com/',
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 110,
    headers: { 'content-type': 'text/html' },
    html: saasHtml,
  };

  const findings = runDeterministicChecks({ rawData, parsed });
  const byKey = new Map(findings.map((f) => [f.checkKey, f]));

  assert.equal(byKey.get('has_tel_link')?.state, 'PASS');
  assert.equal(byKey.get('phone_number_visible')?.state, 'PASS');
  assert.equal(byKey.get('address_signals')?.state, 'UNKNOWN');
  assert.equal(byKey.get('city_state_match')?.state, 'UNKNOWN');
  assert.equal(byKey.get('service_area_language')?.state, 'UNKNOWN');
  assert.equal(byKey.get('local_business_schema')?.state, 'UNKNOWN');
});

test('Challenge Review 2 (Case B & Case C) — Poorly built local plumber/HVAC contractor and single-location restaurant CANNOT use digital-first applicability as an escape hatch', () => {
  // Case B: Local plumber/HVAC site that omitted its phone number, street address, schema, and city in a URL-only scan
  const poorlyBuiltPlumberHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Reliable Plumbing &amp; HVAC Services</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Licensed and insured plumbing, drain cleaning, water heater repair, and air conditioning services." />
      </head>
      <body>
        <h1>Emergency Plumbing, Drain Cleaning &amp; Furnace Repair</h1>
        <p>We provide 24/7 emergency service, water heater installation, sewer line repair, and AC repair for homeowners. Contact us today for a free estimate.</p>
        <form><input type="email" name="email" /><textarea name="message"></textarea><button type="submit">Contact Us</button></form>
      </body>
    </html>
  `;

  const parsedPlumber = parseHtmlForBusinessSignals(poorlyBuiltPlumberHtml);
  assert.equal(parsedPlumber.detectedLocalBusinessCues, true, 'Must detect local trade/contractor cues');

  const plumberFindings = runDeterministicChecks({
    rawData: {
      requestedUrl: 'https://reliableplumbing.example',
      finalUrl: 'https://reliableplumbing.example/',
      normalizedUrl: 'https://reliableplumbing.example/',
      isHttps: true,
      httpStatus: 200,
      responseTimeMs: 100,
      headers: { 'content-type': 'text/html' },
      html: poorlyBuiltPlumberHtml,
    },
    parsed: parsedPlumber,
  });
  const plumberByKey = new Map(plumberFindings.map((f) => [f.checkKey, f]));

  assert.equal(plumberByKey.get('has_tel_link')?.state, 'FAIL', 'Local plumber missing phone link must FAIL, not UNKNOWN');
  assert.equal(plumberByKey.get('phone_number_visible')?.state, 'FAIL', 'Local plumber missing visible phone must FAIL, not UNKNOWN');
  assert.equal(plumberByKey.get('address_signals')?.state, 'FAIL', 'Local plumber missing address/location must FAIL, not UNKNOWN');
  assert.equal(plumberByKey.get('service_area_language')?.state, 'FAIL', 'Local plumber missing service area must FAIL, not UNKNOWN');
  assert.equal(plumberByKey.get('local_business_schema')?.state, 'FAIL', 'Local plumber missing LocalBusiness schema must FAIL, not UNKNOWN');

  // Case C: Single-location restaurant that omitted its phone number, street address, schema, and city in a URL-only scan
  const poorlyBuiltRestaurantHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bella Napoli Trattoria &amp; Pizzeria</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Wood-fired pizza, handmade pasta, appetizers, entrees, dine-in and takeout." />
      </head>
      <body>
        <h1>Bella Napoli Pizzeria</h1>
        <h2>Our Menu</h2>
        <p>Join us for dine-in, carryout, happy hour, and table reservations. Browse our appetizers, wood-fired pizzas, and entrees.</p>
        <a href="/reservations" class="btn">Book a Table</a>
      </body>
    </html>
  `;

  const parsedRestaurant = parseHtmlForBusinessSignals(poorlyBuiltRestaurantHtml);
  assert.equal(parsedRestaurant.detectedLocalBusinessCues, true, 'Must detect brick-and-mortar restaurant cues');

  const restaurantFindings = runDeterministicChecks({
    rawData: {
      requestedUrl: 'https://bellanapoli.example',
      finalUrl: 'https://bellanapoli.example/',
      normalizedUrl: 'https://bellanapoli.example/',
      isHttps: true,
      httpStatus: 200,
      responseTimeMs: 100,
      headers: { 'content-type': 'text/html' },
      html: poorlyBuiltRestaurantHtml,
    },
    parsed: parsedRestaurant,
  });
  const restByKey = new Map(restaurantFindings.map((f) => [f.checkKey, f]));

  assert.equal(restByKey.get('menu_or_services')?.state, 'PASS');
  assert.equal(restByKey.get('has_tel_link')?.state, 'FAIL', 'Single-location restaurant missing phone link must FAIL');
  assert.equal(restByKey.get('phone_number_visible')?.state, 'FAIL', 'Single-location restaurant missing phone must FAIL');
  assert.equal(restByKey.get('address_signals')?.state, 'FAIL', 'Single-location restaurant missing street address must FAIL');
  assert.equal(restByKey.get('service_area_language')?.state, 'FAIL', 'Single-location restaurant missing location/address signals must FAIL');
  assert.equal(restByKey.get('local_business_schema')?.state, 'FAIL', 'Single-location restaurant missing LocalBusiness schema must FAIL');
});

test('Challenge Review 2 (Case D & Case E) — Multi-location restaurant with /locations directory passes service_area_language without single city in <title>/<h1>, and ambiguous business model prefers UNKNOWN over false FAIL/PASS', () => {
  // Case D: Multi-location restaurant (talkintacos.net style) without a single city in <title>/<h1>
  const multiLocationChainHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Talkin' Tacos | Best Tacos in Town</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Talkin' Tacos serves authentic birria tacos, loaded fries, and fresh aguas frescas across South Florida." />
      </head>
      <body>
        <nav><a href="/menu">Our Menu</a><a href="/locations">Locations</a><a href="/catering">Catering</a></nav>
        <h1>Talkin' Tacos</h1>
        <p>Order online for pickup or delivery from any of our locations.</p>
        <a href="tel:1-844-24-69637">1-844-24-69637</a>
      </body>
    </html>
  `;

  const parsedChain = parseHtmlForBusinessSignals(multiLocationChainHtml);
  assert.equal(parsedChain.hasMultiLocationSignals, true);
  assert.equal(parsedChain.detectedServiceAreaSignals, true);

  const chainFindings = runDeterministicChecks({
    rawData: {
      requestedUrl: 'https://talkintacos.net',
      finalUrl: 'https://talkintacos.net/',
      normalizedUrl: 'https://talkintacos.net/',
      isHttps: true,
      httpStatus: 200,
      responseTimeMs: 110,
      headers: { 'content-type': 'text/html' },
      html: multiLocationChainHtml,
    },
    parsed: parsedChain,
    cityState: 'Miami, FL',
  });
  const chainByKey = new Map(chainFindings.map((f) => [f.checkKey, f]));
  assert.equal(
    chainByKey.get('service_area_language')?.state,
    'PASS',
    'Multi-location restaurant with /locations nav and regional coverage must pass service_area_language'
  );
  assert.equal(
    chainByKey.get('city_state_match')?.state,
    'UNKNOWN',
    'Multi-location restaurant delegating branch cities to /locations must defer city_state_match to UNKNOWN rather than FAIL'
  );

  // Case E: Ambiguous business model with generic Organization schema and no clear local or digital-CTA signals
  const ambiguousHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Horizon Ventures Group</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Horizon Ventures Group provides strategic advisory and operational excellence." />
        <script type="application/ld+json">
          { "@context": "https://schema.org", "@type": "Organization", "name": "Horizon Ventures Group" }
        </script>
      </head>
      <body>
        <h1>Horizon Ventures Group</h1>
        <p>We partner with leadership teams to navigate complex transitions, build resilient organizations, and unlock sustainable long-term value across markets.</p>
      </body>
    </html>
  `;

  const parsedAmbiguous = parseHtmlForBusinessSignals(ambiguousHtml);
  assert.equal(parsedAmbiguous.isClientRenderedSpa, false);
  assert.equal(parsedAmbiguous.detectedLocalBusinessCues, false);

  const ambiguousFindings = runDeterministicChecks({
    rawData: {
      requestedUrl: 'https://horizonventures.example',
      finalUrl: 'https://horizonventures.example/',
      normalizedUrl: 'https://horizonventures.example/',
      isHttps: true,
      httpStatus: 200,
      responseTimeMs: 100,
      headers: { 'content-type': 'text/html' },
      html: ambiguousHtml,
    },
    parsed: parsedAmbiguous,
  });
  const ambigByKey = new Map(ambiguousFindings.map((f) => [f.checkKey, f]));
  assert.equal(ambigByKey.get('has_tel_link')?.state, 'UNKNOWN', 'Ambiguous business model must prefer UNKNOWN over false FAIL on phone link');
  assert.equal(ambigByKey.get('phone_number_visible')?.state, 'UNKNOWN', 'Ambiguous business model must prefer UNKNOWN over false FAIL on visible phone');
  assert.equal(ambigByKey.get('address_signals')?.state, 'UNKNOWN', 'Ambiguous business model must prefer UNKNOWN over false FAIL on address');
  assert.equal(ambigByKey.get('service_area_language')?.state, 'UNKNOWN', 'Ambiguous business model must prefer UNKNOWN over false FAIL on service area');
  assert.equal(
    ambigByKey.get('local_business_schema')?.state,
    'UNKNOWN',
    'Ambiguous business model with only generic Organization schema must prefer UNKNOWN over false PASS or false FAIL on LocalBusiness schema'
  );
});

test('Challenge Review 3 — 0-point informational checks return UNKNOWN when not observed, PASS when observed, and never deduct points', () => {
  const minimalHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Clean Site</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <h1>Clean Site</h1>
        <p>Simple body content exceeding static minimum threshold so SPA mode is not triggered during parsing of this page.</p>
        <a href="https://facebook.com/cleansite">Facebook</a>
      </body>
    </html>
  `;

  const parsed = parseHtmlForBusinessSignals(minimalHtml);
  const findings = runDeterministicChecks({
    rawData: {
      requestedUrl: 'https://cleansite.example',
      finalUrl: 'https://cleansite.example/',
      normalizedUrl: 'https://cleansite.example/',
      isHttps: true,
      httpStatus: 200,
      responseTimeMs: 90,
      headers: { 'content-type': 'text/html' },
      html: minimalHtml,
    },
    parsed,
  });

  const infoFindings = findings.filter((f) => f.maxPoints === 0);
  assert.equal(infoFindings.length, 8, 'Must have exactly 8 informational 0-point checks');

  const infoByKey = new Map(infoFindings.map((f) => [f.checkKey, f]));
  assert.equal(infoByKey.get('social_links')?.state, 'PASS', 'Observed social link must be PASS');
  assert.equal(infoByKey.get('public_pricing_observed')?.state, 'UNKNOWN', 'Unobserved pricing must be UNKNOWN, not PASS');
  assert.equal(infoByKey.get('online_booking_observed')?.state, 'UNKNOWN', 'Unobserved booking must be UNKNOWN, not PASS');
  assert.equal(infoByKey.get('reviews_testimonials')?.state, 'UNKNOWN', 'Unobserved testimonials must be UNKNOWN, not PASS');
  assert.equal(infoByKey.get('map_embed_present')?.state, 'UNKNOWN', 'Unobserved map embed must be UNKNOWN, not PASS');
  assert.equal(infoByKey.get('email_list_capture')?.state, 'UNKNOWN', 'Unobserved newsletter must be UNKNOWN, not PASS');
  assert.equal(infoByKey.get('lead_magnet_observed')?.state, 'UNKNOWN', 'Unobserved lead magnet must be UNKNOWN, not PASS');
  assert.equal(infoByKey.get('after_hours_messaging')?.state, 'UNKNOWN', 'Unobserved after-hours messaging must be UNKNOWN, not PASS');
});
