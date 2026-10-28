import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  BROWSER_EVIDENCE_CLASSIFICATION_GUIDE,
  captureBrowserRenderedEvidence,
  compareDesktopAndMobileEvidence,
  buildBrowserEvidenceFindings,
  applyBrowserDomFallback,
  sanitizeBrowserEvidenceForPublic,
  enforceBrowserEvidencePayloadCap,
  evaluateScreenshotRetention,
  MAX_SCREENSHOT_BYTES,
  MAX_TOTAL_BROWSER_EVIDENCE_BYTES,
  prepareVisualReviewPromptContext,
  parseHtmlForBusinessSignals,
  runDeterministicChecks,
  calculateScores,
  classifySubmittedUrl,
  BrowserViewportEvidence,
  RawPageData,
} from '../src/lib/scanner';

import {
  partitionFunnelFindings,
  resolvePublicFindingBadge,
  buildFunnelScoreSummary,
} from '../src/lib/reality-check/funnel';

function makeRenderedViewport(
  viewportLabel: 'desktop' | 'mobile',
  overrides: Partial<BrowserViewportEvidence> = {}
): BrowserViewportEvidence {
  const viewport = viewportLabel === 'desktop' ? DESKTOP_VIEWPORT : MOBILE_VIEWPORT;
  return {
    viewportLabel,
    viewport,
    status: 'RENDERED',
    finalUrl: 'https://example-business.com/',
    httpStatus: 200,
    renderDurationMs: 650,
    pageTitle: 'Example Business | Louisville KY',
    documentDimensions: { width: viewport.width, height: 2200 },
    horizontalOverflowPx: 0,
    hasHorizontalOverflow: false,
    visibleTextLength: 1450,
    isNearEmptyRender: false,
    navigationObserved: true,
    primaryCtaObserved: true,
    primaryCtaCandidates: ['Call Now', 'Request a Quote'],
    majorHeadings: ['Example Business', 'Our Services', 'Contact Us'],
    visibleControlsCount: 12,
    visibleTopBarControls: ['Services', 'About', 'Contact', 'Call Now'],
    clippedTextElements: [],
    mediaTextOverlaps: [],
    smallTapTargets: [],
    consoleOrPageErrors: [],
    screenshotDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/',
    screenshotBytes: 42000,
    hasScreenshot: true,
    notes: [],
    ...overrides,
  };
}

// ==========================================
// 1. Desktop & Mobile Capture Success (Consistent Viewports)
// ==========================================
test('Browser Evidence 1 — Desktop (1440×900) and mobile (390×844) capture success produces INFO · OBSERVED finding and 0 score impact', async () => {
  const evidence = await captureBrowserRenderedEvidence({
    url: 'https://8.8.8.8',
    customLoader: async ({ viewportLabel }) => makeRenderedViewport(viewportLabel),
  });

  assert.equal(evidence.status, 'COMPLETED');
  assert.deepEqual(evidence.desktop.viewport, { width: 1440, height: 900 });
  assert.deepEqual(evidence.mobile.viewport, { width: 390, height: 844 });
  assert.equal(evidence.comparison.materiallyDifferent, false);
  assert.equal(evidence.comparison.objectiveWarnings.length, 0);

  const findings = buildBrowserEvidenceFindings(evidence);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].checkKey, 'browser_viewport_comparison');
  assert.equal(findings[0].state, 'PASS');
  assert.equal(findings[0].maxPoints, 0);
  assert.equal(findings[0].scoreContribution, 0);
  assert.equal(findings[0].evidenceSource, 'BROWSER_RENDER');

  const badge = resolvePublicFindingBadge(findings[0], false);
  assert.equal(badge.badgeText, 'INFO · OBSERVED');
  assert.equal(badge.isInformational, true);
});

// ==========================================
// 2. Browser Render Failure / Timeout Handling
// ==========================================
test('Browser Evidence 2 — Browser render failure or timeout degrades gracefully to UNKNOWN (HUMAN CHECK) without breaking scan', async () => {
  const evidence = await captureBrowserRenderedEvidence({
    url: 'https://8.8.8.8',
    customLoader: async ({ viewportLabel, viewport }) => ({
      viewportLabel,
      viewport,
      status: 'TIMEOUT',
      failureReason: 'Browser navigation timed out after 8500ms.',
      finalUrl: 'https://8.8.8.8/',
      renderDurationMs: 8502,
    }),
  });

  assert.equal(evidence.status, 'FAILED');
  const findings = buildBrowserEvidenceFindings(evidence);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].checkKey, 'browser_render_experience');
  assert.equal(findings[0].state, 'UNKNOWN');
  assert.equal(findings[0].maxPoints, 0);

  const badge = resolvePublicFindingBadge(findings[0], false);
  assert.equal(badge.badgeText, 'HUMAN CHECK');
  assert.equal(badge.badgeModifier, 'finding-badge--human');
});

// ==========================================
// 3. Horizontal Overflow Detection
// ==========================================
test('Browser Evidence 3 — Horizontal overflow (>16px) triggers AUTO ATTENTION check and public ATTENTION badge with 0 score penalty', () => {
  const desktop = makeRenderedViewport('desktop');
  const mobile = makeRenderedViewport('mobile', {
    documentDimensions: { width: 512, height: 2400 },
    horizontalOverflowPx: 122,
    hasHorizontalOverflow: true,
  });

  const { comparison, checks } = compareDesktopAndMobileEvidence(desktop, mobile);
  const overflowCheck = checks.find((c) => c.key === 'browser_horizontal_overflow')!;
  assert.equal(overflowCheck.classification, 'AUTO');
  assert.equal(overflowCheck.state, 'ATTENTION');
  assert.ok(comparison.objectiveWarnings.some((w) => w.includes('122px wider than 390px screen')));

  const findings = buildBrowserEvidenceFindings({
    status: 'COMPLETED',
    capturedAt: new Date().toISOString(),
    desktop,
    mobile,
    comparison,
    checks,
  });

  const overflowFinding = findings.find((f) => f.checkKey === 'browser_horizontal_overflow')!;
  assert.ok(overflowFinding);
  assert.equal(overflowFinding.state, 'FAIL');
  assert.equal(overflowFinding.maxPoints, 0);
  assert.equal(overflowFinding.scoreContribution, 0);

  const badge = resolvePublicFindingBadge(overflowFinding, false);
  assert.equal(badge.badgeText, 'ATTENTION');
  assert.equal(badge.badgeModifier, 'finding-badge--attention');
});

// ==========================================
// 4. Calibration Case 1 — Fistful (https://fistfulcraft.com)
// ==========================================
test('Browser Evidence 4 (Fistful Calibration) — Detects desktop positioned artwork overlapping 5 readable text blocks while mobile stacks cleanly, plus top-bar/tap-target disparity, while keeping overallScore withheld (null)', () => {
  // Static SPA shell from fistfulcraft.com
  const fistfulSpaHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Fistful | Restaurant, Brewery, Food Trucks &amp; Catering</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Your place for Great Food. Your partner for Great Events. Scratch-made food, craft brewery, and full-service catering in Southern Indiana and Louisville." />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/assets/index.js"></script>
      </body>
    </html>
  `;

  const parsed = parseHtmlForBusinessSignals(fistfulSpaHtml);
  const rawData: RawPageData = {
    requestedUrl: 'https://fistfulcraft.com',
    finalUrl: 'https://fistfulcraft.com/',
    normalizedUrl: 'https://fistfulcraft.com/',
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 95,
    headers: { 'content-type': 'text/html' },
    html: fistfulSpaHtml,
  };

  const staticFindings = runDeterministicChecks({ rawData, parsed });
  const staticScores = calculateScores(staticFindings);
  assert.equal(staticScores.overallScore, null, 'Fistful static score must remain withheld (null)');
  assert.equal(staticScores.overallCoverage, 20);
  assert.equal(staticScores.confidence, 'LOW');

  // Rendered desktop (1440×900) and mobile (390×844) evidence matching live Playwright capture of fistfulcraft.com
  const fistfulDesktop = makeRenderedViewport('desktop', {
    finalUrl: 'https://fistfulcraft.com/',
    pageTitle: 'Fistful | Restaurant, Brewery, Food Trucks & Catering',
    documentDimensions: { width: 1440, height: 4722 },
    visibleTextLength: 1944,
    navigationObserved: true,
    primaryCtaObserved: true,
    primaryCtaCandidates: ['Restaurant', 'Food Trucks', 'Catering', 'Order Now', 'Dine In', 'Book A Truck'],
    majorHeadings: [
      'Your place for Great Food.Your partner for Great Events.',
      'Built with Heart.Shared with Everyone.',
      'Three Ways to Experience Fistful',
      'Restaurant & Brewery',
      'Food Trucks',
      'Full-Service Catering',
      "Let's Connect",
    ],
    visibleTopBarControls: ['Restaurant', 'Food Trucks', 'Catering', 'Connect', 'Order Now'],
    mediaTextOverlaps: [
      {
        text: 'I believe food should be bold, intentional, and never boring.',
        mediaSrc: '/assets/fist_icon_transparent-DgEFgzk3.png',
        overlapRatio: 0.5,
      },
      {
        text: 'Built with Heart.Shared with Everyone.',
        mediaSrc: '/assets/fist_icon_transparent-DgEFgzk3.png',
        overlapRatio: 0.5,
      },
      {
        text: 'Every dish we serve is built to deliver layered flavor, real satisfaction, and the kind of',
        mediaSrc: '/assets/fist_icon_transparent-DgEFgzk3.png',
        overlapRatio: 0.5,
      },
      {
        text: 'Fistful began on a food truck in 2016, driven by a simple idea: make everything from scrat',
        mediaSrc: '/assets/fist_icon_transparent-DgEFgzk3.png',
        overlapRatio: 0.5,
      },
      {
        text: '- Chef Dereck, founder of Fistful',
        mediaSrc: '/assets/fist_icon_transparent-DgEFgzk3.png',
        overlapRatio: 0.5,
      },
    ],
  });

  const fistfulMobile = makeRenderedViewport('mobile', {
    finalUrl: 'https://fistfulcraft.com/',
    pageTitle: 'Fistful | Restaurant, Brewery, Food Trucks & Catering',
    documentDimensions: { width: 390, height: 6044 },
    visibleTextLength: 1894,
    navigationObserved: true,
    primaryCtaObserved: true,
    primaryCtaCandidates: ['Dine In', 'Book A Truck', 'Catering', 'Visit the Restaurant'],
    majorHeadings: [
      'Your place for Great Food.Your partner for Great Events.',
      'Built with Heart.Shared with Everyone.',
      'Three Ways to Experience Fistful',
      'Restaurant & Brewery',
      'Food Trucks',
      'Full-Service Catering',
      "Let's Connect",
    ],
    visibleTopBarControls: [],
    mediaTextOverlaps: [],
    smallTapTargets: [{ label: 'button', width: 32, height: 32 }],
  });

  const { comparison, checks } = compareDesktopAndMobileEvidence(fistfulDesktop, fistfulMobile);
  assert.equal(comparison.materiallyDifferent, true);
  assert.ok(
    comparison.objectiveWarnings.some((w) =>
      w.includes('Desktop layout has high-opacity positioned artwork overlapping 5 readable text block(s)')
    )
  );
  assert.ok(
    comparison.missingMobileElements.some((m) => m.includes('Top-bar navigation links collapsed on mobile'))
  );

  const overlapCheck = checks.find((c) => c.key === 'browser_artwork_text_overlap')!;
  assert.equal(overlapCheck.classification, 'VERIFY');
  assert.equal(overlapCheck.state, 'VERIFY');

  const disparityCheck = checks.find((c) => c.key === 'browser_viewport_disparity')!;
  assert.equal(disparityCheck.classification, 'VERIFY');
  assert.equal(disparityCheck.state, 'VERIFY');

  const tapTargetCheck = checks.find((c) => c.key === 'browser_mobile_tap_targets')!;
  assert.equal(tapTargetCheck.classification, 'VERIFY');

  const browserFindings = buildBrowserEvidenceFindings({
    status: 'COMPLETED',
    capturedAt: new Date().toISOString(),
    desktop: fistfulDesktop,
    mobile: fistfulMobile,
    comparison,
    checks,
  });

  assert.equal(browserFindings.length, 1);
  assert.equal(browserFindings[0].checkKey, 'browser_viewport_comparison');
  assert.equal(browserFindings[0].state, 'UNKNOWN');
  assert.equal(browserFindings[0].maxPoints, 0);
  assert.ok(browserFindings[0].supportingDetail.includes('Desktop (1440×900) has positioned artwork overlapping 5 readable text block(s)'));

  // Verify partitioning surfaces the browser finding in highlightedFindings without changing scored counts
  const staticPartitioned = partitionFunnelFindings(staticFindings, false);
  const combined = [...staticFindings, ...browserFindings];
  const partitioned = partitionFunnelFindings(combined, false);
  assert.equal(partitioned.passingFindings.length, staticPartitioned.passingFindings.length);
  assert.equal(partitioned.failingFindings.length, staticPartitioned.failingFindings.length);
  assert.equal(partitioned.unknownFindings.length, staticPartitioned.unknownFindings.length);
  assert.equal(
    partitioned.highlightedFindings.some((f) => f.checkKey === 'browser_viewport_comparison'),
    true,
    'Actionable browser disparity finding must be surfaced in highlightedFindings on SPA sites'
  );
});

// ==========================================
// 5. Calibration Case 2 — The Mercantile New Albany (https://themercantilenewalbany.com)
// ==========================================
test('Browser Evidence 5 (Mercantile Calibration) — Detects minimal splash/logo render (40 chars text, 0 headings) as HUMAN CHECK while keeping numeric score withheld (null)', () => {
  const mercantileDesktop = makeRenderedViewport('desktop', {
    finalUrl: 'https://themercantilenewalbany.com/',
    pageTitle: 'The Mercantile',
    documentDimensions: { width: 1440, height: 900 },
    visibleTextLength: 40,
    isNearEmptyRender: true,
    navigationObserved: false,
    primaryCtaObserved: false,
    primaryCtaCandidates: [],
    majorHeadings: [],
    visibleControlsCount: 1,
    visibleTopBarControls: [],
  });

  const mercantileMobile = makeRenderedViewport('mobile', {
    finalUrl: 'https://themercantilenewalbany.com/',
    pageTitle: 'The Mercantile',
    documentDimensions: { width: 390, height: 844 },
    visibleTextLength: 40,
    isNearEmptyRender: true,
    navigationObserved: false,
    primaryCtaObserved: false,
    primaryCtaCandidates: [],
    majorHeadings: [],
    visibleControlsCount: 1,
    visibleTopBarControls: [],
  });

  const { comparison, checks } = compareDesktopAndMobileEvidence(mercantileDesktop, mercantileMobile);
  const sparseCheck = checks.find((c) => c.key === 'browser_sparse_render')!;
  assert.ok(sparseCheck);
  assert.equal(sparseCheck.classification, 'VERIFY');
  assert.equal(sparseCheck.state, 'VERIFY');

  const findings = buildBrowserEvidenceFindings({
    status: 'COMPLETED',
    capturedAt: new Date().toISOString(),
    desktop: mercantileDesktop,
    mobile: mercantileMobile,
    comparison,
    checks,
  });

  const sparseFinding = findings.find((f) => f.checkKey === 'browser_sparse_render')!;
  assert.ok(sparseFinding);
  assert.equal(sparseFinding.state, 'UNKNOWN');
  assert.equal(sparseFinding.maxPoints, 0);
  assert.match(sparseFinding.supportingDetail, /minimal splash\/logo view with 40 characters of visible text and 0 headings/);

  const badge = resolvePublicFindingBadge(sparseFinding, false);
  assert.equal(badge.badgeText, 'HUMAN CHECK');
});

// ==========================================
// 6. Browser-Blocked Site (Bot Challenge / HTTP 403)
// ==========================================
test('Browser Evidence 6 — Browser-blocked site is marked BLOCKED / UNKNOWN with zero score or confidence penalty', async () => {
  const evidence = await captureBrowserRenderedEvidence({
    url: 'https://8.8.8.8',
    customLoader: async ({ viewportLabel, viewport }) => ({
      viewportLabel,
      viewport,
      status: 'BLOCKED',
      failureReason: 'Site returned HTTP 403 during browser render (bot challenge or access restriction).',
      finalUrl: 'https://8.8.8.8/',
      httpStatus: 403,
      renderDurationMs: 310,
    }),
  });

  assert.equal(evidence.status, 'BLOCKED');
  const findings = buildBrowserEvidenceFindings(evidence);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].checkKey, 'browser_render_experience');
  assert.equal(findings[0].state, 'UNKNOWN');
  assert.equal(findings[0].maxPoints, 0);
  assert.equal(findings[0].scoreContribution, 0);
});

// ==========================================
// 7. SSRF & Hosted Profile Protections
// ==========================================
test('Browser Evidence 7 — SSRF protections block private IPs, localhost, metadata IPs, non-HTTP schemes, and non-80/443 ports before launching browser, and skip hosted profiles', async () => {
  const unsafeUrls = [
    'http://127.0.0.1/admin',
    'http://localhost:3000',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.1/internal',
    'http://192.168.1.1/',
    'file:///etc/passwd',
    'https://8.8.8.8:8443/secret',
    'https://admin:secret@8.8.8.8/',
  ];

  for (const unsafeUrl of unsafeUrls) {
    let loaderCalled = false;
    const res = await captureBrowserRenderedEvidence({
      url: unsafeUrl,
      customLoader: async ({ viewportLabel }) => {
        loaderCalled = true;
        return makeRenderedViewport(viewportLabel);
      },
    });
    assert.equal(res.status, 'BLOCKED', `URL must be blocked before browser launch: ${unsafeUrl}`);
    assert.equal(loaderCalled, false, `customLoader must never be invoked for blocked URL: ${unsafeUrl}`);
  }

  // Hosted social profile is skipped cleanly
  const fbPlatform = classifySubmittedUrl('https://www.facebook.com/taqueriaelcerrito');
  const skipped = await captureBrowserRenderedEvidence({
    url: 'https://www.facebook.com/taqueriaelcerrito',
    platform: fbPlatform,
  });
  assert.equal(skipped.status, 'SKIPPED');
  assert.deepEqual(buildBrowserEvidenceFindings(skipped), []);
});

// ==========================================
// 8. Score & Scored Check Count Invariance
// ==========================================
test('Browser Evidence 8 — Adding browser findings never changes overallScore, overallCoverage, confidence, or scored PASS/FAIL/UNKNOWN counts', () => {
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
  const parsed = parseHtmlForBusinessSignals(html);
  const rawData: RawPageData = {
    requestedUrl: 'https://rivercityplumbing.com',
    finalUrl: 'https://rivercityplumbing.com/',
    normalizedUrl: 'https://rivercityplumbing.com/',
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 120,
    headers: { 'content-type': 'text/html' },
    html,
  };

  const staticFindings = runDeterministicChecks({ rawData, parsed });
  const scoresBefore = calculateScores(staticFindings);
  const partitionBefore = partitionFunnelFindings(staticFindings, false);

  // Create browser findings with both FAIL (overflow) and UNKNOWN (disparity)
  const desktop = makeRenderedViewport('desktop');
  const mobile = makeRenderedViewport('mobile', {
    hasHorizontalOverflow: true,
    horizontalOverflowPx: 95,
    visibleTopBarControls: [],
  });
  const { comparison, checks } = compareDesktopAndMobileEvidence(desktop, mobile);
  const browserFindings = buildBrowserEvidenceFindings({
    status: 'COMPLETED',
    capturedAt: new Date().toISOString(),
    desktop,
    mobile,
    comparison,
    checks,
  });

  const combinedFindings = [...staticFindings, ...browserFindings];
  const scoresAfter = calculateScores(combinedFindings);
  const partitionAfter = partitionFunnelFindings(combinedFindings, false);

  assert.equal(scoresAfter.overallScore, scoresBefore.overallScore);
  assert.equal(scoresAfter.overallCoverage, scoresBefore.overallCoverage);
  assert.equal(scoresAfter.confidence, scoresBefore.confidence);
  assert.equal(partitionAfter.passingFindings.length, partitionBefore.passingFindings.length);
  assert.equal(partitionAfter.failingFindings.length, partitionBefore.failingFindings.length);
  assert.equal(partitionAfter.unknownFindings.length, partitionBefore.unknownFindings.length);

  const summaryBefore = buildFunnelScoreSummary({
    overallScore: scoresBefore.overallScore!,
    overallCoverage: scoresBefore.overallCoverage,
    passingCount: partitionBefore.passingFindings.length,
    failingCount: partitionBefore.failingFindings.length,
    unknownCount: partitionBefore.unknownFindings.length,
  });
  const summaryAfter = buildFunnelScoreSummary({
    overallScore: scoresAfter.overallScore!,
    overallCoverage: scoresAfter.overallCoverage,
    passingCount: partitionAfter.passingFindings.length,
    failingCount: partitionAfter.failingFindings.length,
    unknownCount: partitionAfter.unknownFindings.length,
  });
  assert.deepEqual(summaryAfter, summaryBefore);
});

// ==========================================
// 9. Public Screenshot Sanitization & Backward Compatibility
// ==========================================
test('Browser Evidence 9 — sanitizeBrowserEvidenceForPublic strips raw screenshot data URLs while preserving hasScreenshot and metadata, and null/legacy scans remain backward-compatible', () => {
  const desktop = makeRenderedViewport('desktop');
  const mobile = makeRenderedViewport('mobile');
  const { comparison, checks } = compareDesktopAndMobileEvidence(desktop, mobile);
  const fullEvidence = {
    status: 'COMPLETED' as const,
    capturedAt: '2026-10-25T10:00:00.000Z',
    totalDurationMs: 1850,
    desktop,
    mobile,
    comparison,
    checks,
  };

  const sanitized = sanitizeBrowserEvidenceForPublic(fullEvidence)!;
  assert.equal(sanitized.desktop.screenshotDataUrl, null, 'Public response must strip raw desktop base64 screenshot');
  assert.equal(sanitized.mobile.screenshotDataUrl, null, 'Public response must strip raw mobile base64 screenshot');
  assert.equal(sanitized.desktop.hasScreenshot, true);
  assert.equal(sanitized.mobile.hasScreenshot, true);

  // Full evidence remains untouched for Review Studio
  assert.ok(fullEvidence.desktop.screenshotDataUrl?.startsWith('data:image/jpeg;base64,'));
  assert.ok(fullEvidence.mobile.screenshotDataUrl?.startsWith('data:image/jpeg;base64,'));

  // Future AI visual review boundary
  const promptCtx = prepareVisualReviewPromptContext(fullEvidence);
  assert.ok(promptCtx);
  assert.equal(promptCtx.hasDesktopScreenshot, true);
  assert.equal(promptCtx.hasMobileScreenshot, true);
  assert.ok(promptCtx.candidateQuestionsForReview.length >= 4);

  // Classification guide exposes AUTO, VERIFY, and HUMAN tiers
  assert.ok(BROWSER_EVIDENCE_CLASSIFICATION_GUIDE.AUTO.length > 0);
  assert.ok(BROWSER_EVIDENCE_CLASSIFICATION_GUIDE.VERIFY.length > 0);
  assert.ok(BROWSER_EVIDENCE_CLASSIFICATION_GUIDE.HUMAN.length > 0);

  // Null/legacy backward compatibility
  assert.equal(sanitizeBrowserEvidenceForPublic(null), null);
  assert.equal(sanitizeBrowserEvidenceForPublic(undefined), null);
  assert.deepEqual(buildBrowserEvidenceFindings(null), []);
  assert.deepEqual(buildBrowserEvidenceFindings(undefined), []);
  assert.equal(prepareVisualReviewPromptContext(null), null);
});

// ==========================================
// 10. Browser Runtime Unavailable Fallback (UNAVAILABLE)
// ==========================================
test('Browser Evidence 10 — When browser runtime is unavailable (simulateUnavailable, BROWSER_DISABLE=true, or unreachable BROWSER_WS_ENDPOINT), returns UNAVAILABLE with 0 findings and 0 score impact', async () => {
  // 10a. simulateUnavailable flag
  const sim = await captureBrowserRenderedEvidence({
    url: 'https://8.8.8.8',
    simulateUnavailable: true,
  });
  assert.equal(sim.status, 'UNAVAILABLE');
  assert.deepEqual(sim.checks, []);
  assert.deepEqual(buildBrowserEvidenceFindings(sim), []);

  // 10b. BROWSER_DISABLE=true env fallback
  const prevDisable = process.env.BROWSER_DISABLE;
  try {
    process.env.BROWSER_DISABLE = 'true';
    const disabledRes = await captureBrowserRenderedEvidence({
      url: 'https://8.8.8.8',
    });
    assert.equal(disabledRes.status, 'UNAVAILABLE');
    assert.deepEqual(buildBrowserEvidenceFindings(disabledRes), []);
  } finally {
    if (prevDisable === undefined) delete process.env.BROWSER_DISABLE;
    else process.env.BROWSER_DISABLE = prevDisable;
  }

  // 10c. Unreachable remote BROWSER_WS_ENDPOINT degrades gracefully to UNAVAILABLE without crashing
  const prevWs = process.env.BROWSER_WS_ENDPOINT;
  try {
    process.env.BROWSER_WS_ENDPOINT = 'ws://127.0.0.1:1/devtools/browser/nonexistent';
    const unreachableRes = await captureBrowserRenderedEvidence({
      url: 'https://8.8.8.8',
    });
    assert.equal(unreachableRes.status, 'UNAVAILABLE');
    assert.deepEqual(buildBrowserEvidenceFindings(unreachableRes), []);
  } finally {
    if (prevWs === undefined) delete process.env.BROWSER_WS_ENDPOINT;
    else process.env.BROWSER_WS_ENDPOINT = prevWs;
  }
});

// ==========================================
// 11. Screenshot Size Caps (120 KB Viewport Cap & 360 KB Total Payload Cap)
// ==========================================
test('Browser Evidence 11 — enforceBrowserEvidencePayloadCap omits oversized viewport screenshots (>120 KB) while preserving all DOM metrics and checks', () => {
  assert.equal(MAX_SCREENSHOT_BYTES, 120 * 1024);
  assert.equal(MAX_TOTAL_BROWSER_EVIDENCE_BYTES, 360 * 1024);

  // Create a synthetic base64 screenshot representing ~140 KB binary (>120 KB cap)
  const oversizedBase64 = Buffer.alloc(140 * 1024, 0x41).toString('base64');
  const desktop = makeRenderedViewport('desktop', {
    screenshotDataUrl: `data:image/jpeg;base64,${oversizedBase64}`,
    screenshotBytes: 140 * 1024,
    hasScreenshot: true,
  });
  const mobile = makeRenderedViewport('mobile');
  const { comparison, checks } = compareDesktopAndMobileEvidence(desktop, mobile);

  const capped = enforceBrowserEvidencePayloadCap({
    status: 'COMPLETED',
    capturedAt: '2026-10-25T10:00:00.000Z',
    totalDurationMs: 1500,
    desktop,
    mobile,
    comparison,
    checks,
  });

  assert.equal(capped.desktop.screenshotDataUrl, null, 'Oversized desktop screenshot must be omitted');
  assert.equal(capped.desktop.hasScreenshot, false);
  assert.ok(capped.desktop.screenshotOmittedReason?.includes('exceeded 120 KB viewport cap'));
  assert.equal(capped.desktop.visibleTextLength, 1450, 'DOM metrics must remain intact when screenshot is omitted');

  assert.ok(capped.mobile.screenshotDataUrl, 'Valid-sized mobile screenshot must be preserved');
  assert.equal(capped.mobile.hasScreenshot, true);
});

// ==========================================
// 12. Screenshot Retention & Lifecycle Policy (24h Anonymous / 30d Claimed / 14d Published)
// ==========================================
test('Browser Evidence 12 — evaluateScreenshotRetention enforces 24h anonymous TTL, 30d claimed human-review TTL, and 14d post-publish TTL while preserving DOM metrics', () => {
  const desktop = makeRenderedViewport('desktop');
  const mobile = makeRenderedViewport('mobile');
  const { comparison, checks } = compareDesktopAndMobileEvidence(desktop, mobile);
  const sampleEvidence = {
    status: 'COMPLETED' as const,
    capturedAt: '2026-10-01T00:00:00.000Z',
    totalDurationMs: 1400,
    desktop,
    mobile,
    comparison,
    checks,
  };

  const createdAt = new Date('2026-10-01T00:00:00.000Z');

  // 1. Anonymous unclaimed scan at +12 hours -> retained (so user can still claim human review)
  const anon12h = evaluateScreenshotRetention({
    evidence: sampleEvidence,
    hasEmail: false,
    status: 'AUTO_SCAN_COMPLETE',
    createdAt,
    now: new Date('2026-10-01T12:00:00.000Z'),
  });
  assert.equal(anon12h.shouldPrune, false);
  assert.ok(anon12h.prunedEvidence?.desktop.screenshotDataUrl);

  // 2. Anonymous unclaimed scan at +25 hours -> pruned (ANONYMOUS_TTL_EXPIRED)
  const anon25h = evaluateScreenshotRetention({
    evidence: sampleEvidence,
    hasEmail: false,
    status: 'AUTO_SCAN_COMPLETE',
    createdAt,
    now: new Date('2026-10-02T01:00:00.000Z'),
  });
  assert.equal(anon25h.shouldPrune, true);
  assert.equal(anon25h.reason, 'ANONYMOUS_TTL_EXPIRED');
  assert.equal(anon25h.prunedEvidence?.desktop.screenshotDataUrl, null);
  assert.equal(anon25h.prunedEvidence?.mobile.screenshotDataUrl, null);
  assert.equal(anon25h.prunedEvidence?.desktop.screenshotPruneReason, 'ANONYMOUS_TTL_EXPIRED');
  assert.equal(anon25h.prunedEvidence?.desktop.visibleTextLength, 1450, 'DOM metrics must remain preserved after screenshot pruning');
  assert.equal(anon25h.prunedEvidence?.checks.length, checks.length, 'Checks must remain preserved after screenshot pruning');

  // 3. Claimed human-review scan at +10 days -> retained
  const claimed10d = evaluateScreenshotRetention({
    evidence: sampleEvidence,
    hasEmail: true,
    status: 'NEEDS_HUMAN_REVIEW',
    createdAt,
    now: new Date('2026-10-11T00:00:00.000Z'),
  });
  assert.equal(claimed10d.shouldPrune, false);

  // 4. Claimed human-review scan at +31 days -> pruned (CLAIMED_TTL_EXPIRED)
  const claimed31d = evaluateScreenshotRetention({
    evidence: sampleEvidence,
    hasEmail: true,
    status: 'IN_REVIEW',
    createdAt,
    now: new Date('2026-11-01T01:00:00.000Z'),
  });
  assert.equal(claimed31d.shouldPrune, true);
  assert.equal(claimed31d.reason, 'CLAIMED_TTL_EXPIRED');

  // 5. Published report at +7 days post-publish -> retained; at +15 days post-publish -> pruned (PUBLISHED_TTL_EXPIRED)
  const publishedAt = new Date('2026-10-05T00:00:00.000Z');
  const pub7d = evaluateScreenshotRetention({
    evidence: sampleEvidence,
    hasEmail: true,
    status: 'PUBLISHED',
    createdAt,
    publishedAt,
    now: new Date('2026-10-12T00:00:00.000Z'),
  });
  assert.equal(pub7d.shouldPrune, false);

  const pub15d = evaluateScreenshotRetention({
    evidence: sampleEvidence,
    hasEmail: true,
    status: 'PUBLISHED',
    createdAt,
    publishedAt,
    now: new Date('2026-10-20T01:00:00.000Z'),
  });
  assert.equal(pub15d.shouldPrune, true);
  assert.equal(pub15d.reason, 'PUBLISHED_TTL_EXPIRED');
});

// ==========================================
// 13. Browser DOM Fallback Resolution & Desktop/Mobile Discrepancy Handling
// ==========================================
test('Browser Evidence 13 — applyBrowserDomFallback resolves SPA checks (phone, price, CTA, address) from rendered DOM with BROWSER_RENDER provenance while preserving numeric score and desktop/mobile discrepancies', () => {
  const spaShellHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Fistful Craft Tacos & Ale</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Craft tacos and ale in New Albany, IN." />
        <link rel="icon" href="/favicon.png" />
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/assets/index.js"></script>
      </body>
    </html>
  `;
  const rawData: RawPageData = {
    requestedUrl: 'https://fistfulcraft.com',
    finalUrl: 'https://fistfulcraft.com/',
    normalizedUrl: 'https://fistfulcraft.com/',
    isHttps: true,
    httpStatus: 200,
    responseTimeMs: 100,
    headers: { 'content-type': 'text/html' },
    html: spaShellHtml,
  };
  const parsed = parseHtmlForBusinessSignals(spaShellHtml, 'New Albany, IN');
  const staticFindings = runDeterministicChecks({
    rawData,
    parsed,
    businessName: 'Fistful',
    cityState: 'New Albany, IN',
  });
  const staticScores = calculateScores(staticFindings);

  // 13a. When browser render is unavailable, SPA checks remain UNKNOWN / HUMAN CHECK with no false absence
  const unavailResolved = applyBrowserDomFallback(staticFindings, null, { cityState: 'New Albany, IN' });
  const unavailPrice = unavailResolved.find((f) => f.checkKey === 'public_pricing_observed')!;
  assert.equal(unavailPrice.state, 'UNKNOWN');
  assert.equal(resolvePublicFindingBadge(unavailPrice, false).badgeText, 'HUMAN CHECK');

  // 13b. When both desktop and mobile viewports render phone, price, CTA, and address, fallback resolves them with BROWSER_RENDER
  const sharedSignals = {
    telLinks: ['tel:812-557-0226'],
    mailtoLinks: ['mailto:sales@fistfuloftacos.com'],
    visiblePhoneNumbers: ['812-557-0226'],
    visibleAddressSignals: ['2708 Paoli Pike, New Albany, IN 47150'],
    detectedPricingSignals: true,
    pricingSnippets: ['$12'],
    detectedMenuOrServices: true,
    detectedAboutOrTeamKeywords: true,
    hasPrivacyOrTermsLink: true,
    socialLinks: [{ platform: 'facebook', url: 'https://www.facebook.com/fistfulnewalbany' }],
    hasMapEmbed: true,
    hasForms: false,
    hasLeadCaptureForm: false,
    detectedQuoteOrCateringKeywords: true,
    detectedBookingSignals: false,
    detectedReviewOrTestimonialKeywords: false,
    searchableText: 'Fistful Craft Tacos & Ale 2708 Paoli Pike New Albany IN 812-557-0226 Starting at $12 per person',
  };

  const desktop = makeRenderedViewport('desktop', {
    primaryCtaObserved: true,
    primaryCtaCandidates: ['Order Online', 'Catering Inquiry'],
    renderedSignals: sharedSignals,
  });
  const mobile = makeRenderedViewport('mobile', {
    primaryCtaObserved: true,
    primaryCtaCandidates: ['Order Online', 'Catering Inquiry'],
    renderedSignals: sharedSignals,
  });
  const { comparison, checks } = compareDesktopAndMobileEvidence(desktop, mobile);
  const completedEvidence = {
    status: 'COMPLETED' as const,
    capturedAt: new Date().toISOString(),
    desktop,
    mobile,
    comparison,
    checks,
  };

  const fallbackFindings = applyBrowserDomFallback(staticFindings, completedEvidence, {
    cityState: 'New Albany, IN',
  });

  for (const key of [
    'phone_number_visible',
    'has_tel_link',
    'address_signals',
    'cta_keywords_found',
    'public_pricing_observed',
    'social_links',
  ]) {
    const resolved = fallbackFindings.find((f) => f.checkKey === key)!;
    assert.equal(resolved.state, 'PASS', `${key} should resolve to PASS from rendered DOM`);
    assert.equal(resolved.evidenceSource, 'BROWSER_RENDER');
    assert.equal(resolved.scoreContribution, 0, 'Browser fallback must keep scoreContribution = 0');
  }

  const resolvedPricingBadge = resolvePublicFindingBadge(
    fallbackFindings.find((f) => f.checkKey === 'public_pricing_observed')!,
    false
  );
  assert.equal(resolvedPricingBadge.badgeText, 'INFO · OBSERVED');

  // Verify numeric static score and coverage are never silently inflated by BROWSER_RENDER findings
  const postFallbackScores = calculateScores(fallbackFindings);
  assert.equal(postFallbackScores.overallScore, staticScores.overallScore);
  assert.equal(postFallbackScores.overallCoverage, staticScores.overallCoverage);

  // 13c. When desktop and mobile disagree (e.g. phone and CTA present on desktop, missing on mobile), do NOT fabricate a single PASS truth
  const mobileMissingPhoneAndCta = makeRenderedViewport('mobile', {
    primaryCtaObserved: false,
    primaryCtaCandidates: [],
    renderedSignals: {
      ...sharedSignals,
      telLinks: [],
      visiblePhoneNumbers: [],
    },
  });
  const discrepancyEvidence = {
    status: 'COMPLETED' as const,
    capturedAt: new Date().toISOString(),
    desktop,
    mobile: mobileMissingPhoneAndCta,
    ...compareDesktopAndMobileEvidence(desktop, mobileMissingPhoneAndCta),
  };

  const discrepancyFindings = applyBrowserDomFallback(staticFindings, discrepancyEvidence, {
    cityState: 'New Albany, IN',
  });
  const discrepantPhone = discrepancyFindings.find((f) => f.checkKey === 'phone_number_visible')!;
  assert.equal(discrepantPhone.state, 'UNKNOWN', 'Desktop/mobile phone disagreement must remain UNKNOWN');
  assert.equal(discrepantPhone.evidenceSource, 'BROWSER_RENDER');
  assert.equal(discrepantPhone.observedValue?.viewportDiscrepancy, true);
  assert.match(discrepantPhone.supportingDetail, /Observed on desktop.*not observed on mobile/i);

  const discrepantCta = discrepancyFindings.find((f) => f.checkKey === 'cta_keywords_found')!;
  assert.equal(discrepantCta.state, 'UNKNOWN', 'Desktop/mobile CTA disagreement must remain UNKNOWN');
  assert.equal(discrepantCta.observedValue?.viewportDiscrepancy, true);
/* end test 13 */

});
