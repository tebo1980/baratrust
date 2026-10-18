import { safeFetchWebsite } from './fetcher';
import { parseHtmlForBusinessSignals } from './parser';
import { runDeterministicChecks, buildUnknownFindings } from './checks';
import { calculateScores } from './scoring';
import { ScanResult, ScanStatus } from './types';
import { normalizeSubmittedUrl } from './ssrf';

export * from './types';
export * from './ssrf';
export * from './fetcher';
export * from './parser';
export * from './checks';
export * from './scoring';

export interface ExecuteScanOptions {
  websiteUrl: string;
  businessName?: string | null;
  cityState?: string | null;
}

/**
 * High-level scanner orchestrator.
 * 1. Validates and normalizes URL (with SSRF protection).
 * 2. Fetches website HTML with timeout & size limits.
 * 3. If unreachable/blocked, records failure reason and returns UNKNOWN findings for human review.
 * 4. If reachable, extracts observable signals, executes deterministic checks, and calculates weighted scores.
 */
export async function executeDeterministicScan(options: ExecuteScanOptions): Promise<ScanResult> {
  const { websiteUrl, businessName, cityState } = options;
  const normalizedUrl = normalizeSubmittedUrl(websiteUrl);
  const scannedAt = new Date().toISOString();

  // 1. Fetch website safely
  const fetchResult = await safeFetchWebsite(normalizedUrl);

  // 2. Handle fetch failures gracefully
  if (!fetchResult.ok) {
    let scanStatus: ScanStatus = 'failed';
    if (fetchResult.errorType === 'TIMEOUT') scanStatus = 'timeout';
    else if (fetchResult.errorType === 'BLOCKED') scanStatus = 'blocked';

    const fallbackFindings = buildUnknownFindings(fetchResult.message);
    const { overallScore, overallCoverage, confidence, scoreBreakdown, categoryScores } = calculateScores(fallbackFindings);

    return {
      scanStatus,
      scanFailureReason: `[${fetchResult.errorType}] ${fetchResult.message}`,
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

  // 3. Parse HTML
  const rawData = fetchResult.data;
  const parsed = parseHtmlForBusinessSignals(rawData.html, cityState || undefined);

  // 4. Run deterministic checks
  const findings = runDeterministicChecks({
    rawData,
    parsed,
    businessName: businessName || parsed.derivedBusinessName || null,
    cityState: cityState || parsed.derivedCityState || null,
  });

  // 5. Calculate scores
  const { overallScore, overallCoverage, confidence, scoreBreakdown, categoryScores } = calculateScores(findings);

  return {
    scanStatus: 'completed',
    overallScore,
    overallCoverage,
    confidence,
    scoreBreakdown,
    categoryScores,
    findings,
    normalizedUrl: rawData.normalizedUrl,
    derivedBusinessName: parsed.derivedBusinessName,
    derivedCityState: parsed.derivedCityState,
    httpStatus: rawData.httpStatus,
    responseTimeMs: rawData.responseTimeMs,
    scannedAt,
  };
}
