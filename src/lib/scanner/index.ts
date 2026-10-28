import { safeFetchWebsite } from './fetcher';
import { parseHtmlForBusinessSignals } from './parser';
import { runDeterministicChecks, buildUnknownFindings } from './checks';
import { calculateScores } from './scoring';
import { BrowserRenderedEvidence, ScanResult, ScanStatus } from './types';
import { normalizeSubmittedUrl } from './ssrf';
import { classifySubmittedUrl } from './platform';
import {
  captureBrowserRenderedEvidence,
  buildBrowserEvidenceFindings,
  applyBrowserDomFallback,
} from './browser-evidence';

export * from './types';
export * from './ssrf';
export * from './fetcher';
export * from './parser';
export * from './checks';
export * from './scoring';
export * from './platform';
export * from './browser-evidence';

export interface ExecuteScanOptions {
  websiteUrl: string;
  businessName?: string | null;
  cityState?: string | null;
  enableBrowserRender?: boolean;
  browserEvidence?: BrowserRenderedEvidence | null;
}

/**
 * High-level scanner orchestrator.
 * 1. Validates and normalizes URL (with SSRF protection).
 * 2. Fetches website HTML with timeout & size limits.
 * 3. If unreachable/blocked, records failure reason and returns UNKNOWN findings for human review.
 * 4. If reachable, extracts observable signals, executes deterministic checks, and calculates weighted scores.
 * 5. Optionally runs a browser-rendered desktop + mobile evidence pass without altering numeric scores.
 */
export async function executeDeterministicScan(options: ExecuteScanOptions): Promise<ScanResult> {
  const { websiteUrl, businessName, cityState, enableBrowserRender = false } = options;
  const normalizedUrl = normalizeSubmittedUrl(websiteUrl);
  const scannedAt = new Date().toISOString();
  const initialPlatform = classifySubmittedUrl(normalizedUrl);

  // 1. Fetch website safely
  const fetchResult = await safeFetchWebsite(normalizedUrl);

  // 2. Handle fetch failures gracefully
  if (!fetchResult.ok) {
    let scanStatus: ScanStatus = 'failed';
    if (fetchResult.errorType === 'TIMEOUT') scanStatus = 'timeout';
    else if (fetchResult.errorType === 'BLOCKED') scanStatus = 'blocked';

    const fallbackFindings = buildUnknownFindings(fetchResult.message, initialPlatform);
    const { overallScore, overallCoverage, confidence, scoreBreakdown, categoryScores } =
      calculateScores(fallbackFindings, initialPlatform);

    return {
      scanStatus,
      scanFailureReason: `[${fetchResult.errorType}] ${fetchResult.message}`,
      sourceType: initialPlatform.sourceType,
      platformKey: initialPlatform.platformKey,
      platformLabel: initialPlatform.platformLabel,
      overallScore,
      overallCoverage,
      confidence,
      scoreBreakdown,
      categoryScores,
      findings: fallbackFindings,
      normalizedUrl: fetchResult.normalizedUrl,
      derivedBusinessName: null,
      derivedCityState: null,
      httpStatus: fetchResult.httpStatus,
      scannedAt,
    };
  }

  // 3. Parse HTML (re-classify against finalUrl in case of shortlink redirects like g.page / fb.me)
  const rawData = fetchResult.data;
  const platform = classifySubmittedUrl(normalizedUrl, rawData.finalUrl);
  const parsed = parseHtmlForBusinessSignals(
    rawData.html,
    cityState || undefined,
    platform.platformKey
  );

  // 4. Run deterministic checks
  const findings = runDeterministicChecks({
    rawData,
    parsed,
    businessName: businessName || parsed.derivedBusinessName || null,
    cityState: cityState || parsed.derivedCityState || null,
    platform,
  });

  // 5. Calculate scores from static checks ONLY (browser evidence never alters numeric score)
  const { overallScore, overallCoverage, confidence, scoreBreakdown, categoryScores } =
    calculateScores(findings, platform);

  // 6. Optional browser-rendered desktop + mobile evidence layer
  let resolvedBrowserEvidence: BrowserRenderedEvidence | null = options.browserEvidence ?? null;
  if (!resolvedBrowserEvidence && enableBrowserRender && !platform.isHostedProfile) {
    try {
      resolvedBrowserEvidence = await captureBrowserRenderedEvidence({
        url: rawData.finalUrl || rawData.normalizedUrl,
        platform,
      });
    } catch {
      resolvedBrowserEvidence = null;
    }
  }

  const resolvedFindings = applyBrowserDomFallback(findings, resolvedBrowserEvidence, {
    cityState: cityState || parsed.derivedCityState || null,
  });
  const browserFindings = buildBrowserEvidenceFindings(resolvedBrowserEvidence);
  const combinedFindings =
    browserFindings.length > 0 ? [...resolvedFindings, ...browserFindings] : resolvedFindings;
  const enrichedScoreBreakdown = scoreBreakdown
    ? {
        ...scoreBreakdown,
        ...(resolvedBrowserEvidence ? { browserEvidence: resolvedBrowserEvidence } : {}),
      }
    : scoreBreakdown;

  return {
    scanStatus: 'completed',
    sourceType: platform.sourceType,
    platformKey: platform.platformKey,
    platformLabel: platform.platformLabel,
    overallScore,
    overallCoverage,
    confidence,
    scoreBreakdown: enrichedScoreBreakdown,
    categoryScores,
    findings: combinedFindings,
    browserEvidence: resolvedBrowserEvidence,
    normalizedUrl: rawData.normalizedUrl,
    derivedBusinessName: parsed.derivedBusinessName,
    derivedCityState: parsed.derivedCityState,
    httpStatus: rawData.httpStatus,
    responseTimeMs: rawData.responseTimeMs,
    scannedAt,
  };
}
