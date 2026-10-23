import { validateUrlForScan, createSsrfSafeAgent } from './ssrf';
import { RawPageData } from './types';

export interface FetchResultSuccess {
  ok: true;
  data: RawPageData;
}

export interface FetchResultFailure {
  ok: false;
  errorType: 'TIMEOUT' | 'BLOCKED' | 'SSRF_BLOCKED' | 'DNS_ERROR' | 'SIZE_EXCEEDED' | 'NETWORK_ERROR' | 'NON_HTML_RESPONSE';
  message: string;
  httpStatus?: number;
  finalUrl?: string;
  normalizedUrl: string;
}

export type FetchResult = FetchResultSuccess | FetchResultFailure;

const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;
const MAX_BYTES = 2.5 * 1024 * 1024; // 2.5 MB

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 BaraTrustBot/2.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
};

// Singleton SSRF-safe undici agent to enforce connect-time DNS validation
const ssrfSafeAgent = createSsrfSafeAgent();

/**
 * Safely fetches an external website page with SSRF safeguards,
 * strict timeouts, redirect checking, and byte limits.
 */
export async function safeFetchWebsite(inputUrl: string): Promise<FetchResult> {
  const validation = await validateUrlForScan(inputUrl);
  if (!validation.valid || !validation.normalizedUrl) {
    return {
      ok: false,
      errorType: validation.isPrivate ? 'SSRF_BLOCKED' : 'DNS_ERROR',
      message: validation.error || 'Invalid or blocked URL',
      normalizedUrl: validation.normalizedUrl || inputUrl,
    };
  }

  let currentUrl = validation.normalizedUrl;
  let redirectsCount = 0;
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    while (redirectsCount <= MAX_REDIRECTS) {
      let res: Response;
      try {
        res = await fetch(currentUrl, {
          method: 'GET',
          headers: DEFAULT_HEADERS,
          redirect: 'manual', // We handle redirects manually to check SSRF at every hop
          signal: controller.signal,
          // @ts-ignore undici dispatcher in Node.js runtime
          dispatcher: ssrfSafeAgent,
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError' || controller.signal.aborted) {
          return {
            ok: false,
            errorType: 'TIMEOUT',
            message: `Website request timed out after ${TIMEOUT_MS / 1000}s.`,
            normalizedUrl: validation.normalizedUrl,
            finalUrl: currentUrl,
          };
        }
        const causeMessage =
          fetchErr?.cause && typeof fetchErr.cause.message === 'string'
            ? fetchErr.cause.message
            : '';
        const combinedErrorText = `${fetchErr.message || ''} ${causeMessage}`.trim();
        if (combinedErrorText.includes('SSRF') || combinedErrorText.includes('restricted IP')) {
          return {
            ok: false,
            errorType: 'SSRF_BLOCKED',
            message: causeMessage || fetchErr.message,
            normalizedUrl: validation.normalizedUrl,
            finalUrl: currentUrl,
          };
        }
        const detail =
          causeMessage && fetchErr.message === 'fetch failed'
            ? causeMessage
            : fetchErr.message || causeMessage || 'Connection refused';
        return {
          ok: false,
          errorType: 'NETWORK_ERROR',
          message: `Network error connecting to target: ${detail}`,
          normalizedUrl: validation.normalizedUrl,
          finalUrl: currentUrl,
        };
      }

      // Check for redirect responses (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        await res.body?.cancel().catch(() => {});
        redirectsCount++;
        if (redirectsCount > MAX_REDIRECTS) {
          return {
            ok: false,
            errorType: 'BLOCKED',
            message: `Exceeded maximum redirect limit of ${MAX_REDIRECTS} hops.`,
            httpStatus: res.status,
            normalizedUrl: validation.normalizedUrl,
            finalUrl: currentUrl,
          };
        }

        const locationHeader = res.headers.get('location');
        if (!locationHeader) {
          return {
            ok: false,
            errorType: 'NETWORK_ERROR',
            message: `Redirect status (${res.status}) received without Location header.`,
            httpStatus: res.status,
            normalizedUrl: validation.normalizedUrl,
            finalUrl: currentUrl,
          };
        }

        // Resolve relative redirects against current URL
        let nextUrl: string;
        try {
          nextUrl = new URL(locationHeader, currentUrl).toString();
        } catch {
          return {
            ok: false,
            errorType: 'NETWORK_ERROR',
            message: `Malformed redirect location: ${locationHeader}`,
            httpStatus: res.status,
            normalizedUrl: validation.normalizedUrl,
            finalUrl: currentUrl,
          };
        }

        // Validate redirect target for SSRF
        const redirectValidation = await validateUrlForScan(nextUrl);
        if (!redirectValidation.valid || !redirectValidation.normalizedUrl) {
          return {
            ok: false,
            errorType: redirectValidation.isPrivate ? 'SSRF_BLOCKED' : 'DNS_ERROR',
            message: `Redirect target blocked: ${redirectValidation.error}`,
            normalizedUrl: validation.normalizedUrl,
            finalUrl: nextUrl,
          };
        }

        currentUrl = redirectValidation.normalizedUrl;
        continue; // Follow redirect hop
      }

      // Handle HTTP blocking status codes
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        await res.body?.cancel().catch(() => {});
        return {
          ok: false,
          errorType: 'BLOCKED',
          message: `Site returned HTTP ${res.status} (Access restricted or bot protection active).`,
          httpStatus: res.status,
          normalizedUrl: validation.normalizedUrl,
          finalUrl: currentUrl,
        };
      }

      // Verify content-type is HTML / web content
      const contentType = res.headers.get('content-type') || '';
      if (contentType) {
        const ctLower = contentType.toLowerCase();
        const nonHtmlTypes = [
          'application/pdf',
          'application/zip',
          'application/octet-stream',
          'application/json',
          'image/',
          'video/',
          'audio/',
        ];
        if (nonHtmlTypes.some(type => ctLower.includes(type))) {
          await res.body?.cancel().catch(() => {});
          return {
            ok: false,
            errorType: 'NON_HTML_RESPONSE',
            message: `Target returned non-HTML content type (${contentType}). Reality Check requires an HTML website.`,
            httpStatus: res.status,
            normalizedUrl: validation.normalizedUrl,
            finalUrl: currentUrl,
          };
        }
      }

      // Read response body with size limit
      const contentLengthHeader = res.headers.get('content-length');
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > MAX_BYTES) {
        await res.body?.cancel().catch(() => {});
        return {
          ok: false,
          errorType: 'SIZE_EXCEEDED',
          message: `Response payload exceeds safe limit of ${MAX_BYTES / (1024 * 1024)}MB.`,
          httpStatus: res.status,
          normalizedUrl: validation.normalizedUrl,
          finalUrl: currentUrl,
        };
      }

      // Read text safely
      let htmlText = '';
      if (res.body) {
        const reader = res.body.getReader();
        let totalBytes = 0;
        const decoder = new TextDecoder('utf-8', { fatal: false });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalBytes += value.length;
            if (totalBytes > MAX_BYTES) {
              controller.abort();
              return {
                ok: false,
                errorType: 'SIZE_EXCEEDED',
                message: `Downloaded page exceeded ${MAX_BYTES / (1024 * 1024)}MB streaming limit.`,
                httpStatus: res.status,
                normalizedUrl: validation.normalizedUrl,
                finalUrl: currentUrl,
              };
            }
            htmlText += decoder.decode(value, { stream: true });
          }
        }
        htmlText += decoder.decode(); // Flush remaining
      } else {
        htmlText = await res.text();
      }

      const responseTimeMs = Date.now() - startTime;
      const headersMap: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headersMap[key.toLowerCase()] = val;
      });

      return {
        ok: true,
        data: {
          requestedUrl: inputUrl,
          finalUrl: currentUrl,
          normalizedUrl: validation.normalizedUrl,
          isHttps: currentUrl.startsWith('https://'),
          httpStatus: res.status,
          responseTimeMs,
          headers: headersMap,
          html: htmlText,
        },
      };
    }

    return {
      ok: false,
      errorType: 'BLOCKED',
      message: 'Unexpected end of redirect processing.',
      normalizedUrl: validation.normalizedUrl,
      finalUrl: currentUrl,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
