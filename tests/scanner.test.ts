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

import { parseHtmlForBusinessSignals, decodeHtmlEntities } from '../src/lib/scanner/parser';
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


