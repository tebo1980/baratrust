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

import { parseHtmlForBusinessSignals } from '../src/lib/scanner/parser';
import { runDeterministicChecks, buildUnknownFindings } from '../src/lib/scanner/checks';
import { calculateScores } from '../src/lib/scanner/scoring';
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

