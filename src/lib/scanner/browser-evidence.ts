import { validateUrlForScan } from './ssrf';
import {
  BrowserRenderedEvidence,
  BrowserViewportEvidence,
  BrowserComparisonEvidence,
  BrowserCheckItem,
  EvaluatedFinding,
  PlatformClassification,
  VisualReviewPromptContext,
} from './types';

export const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

const MAX_BROWSER_REDIRECTS = 5;
const VIEWPORT_NAV_TIMEOUT_MS = 8500;
const HYDRATION_SETTLE_MS = 750;
const REMOTE_CONNECT_TIMEOUT_MS = 6000;
export const MAX_SCREENSHOT_BYTES = 120 * 1024; // 120 KB raw binary cap per viewport (~160 KB base64)
export const MAX_TOTAL_BROWSER_EVIDENCE_BYTES = 360 * 1024; // 360 KB hard cap on serialized BrowserRenderedEvidence JSON
export const ANONYMOUS_SCREENSHOT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for unclaimed anonymous scans
export const CLAIMED_SCREENSHOT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days for active human-review scans
export const PUBLISHED_SCREENSHOT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days after report publication
const HORIZONTAL_OVERFLOW_THRESHOLD_PX = 16;
const MIN_TAP_TARGET_PX = 36;

export interface CaptureBrowserEvidenceOptions {
  url: string;
  platform?: PlatformClassification;
  timeoutMs?: number;
  captureScreenshots?: boolean;
  /**
   * Optional flag to simulate browser runtime unavailability in deterministic tests.
   */
  simulateUnavailable?: boolean;
  /**
   * Optional custom page evaluator/loader hook for deterministic unit tests
   * without requiring a live Chromium subprocess for every test case.
   */
  customLoader?: (params: {
    url: string;
    viewportLabel: 'desktop' | 'mobile';
    viewport: { width: number; height: number };
  }) => Promise<BrowserViewportEvidence>;
}

/**
 * Classifies all browser-rendered checks into AUTO, VERIFY, and HUMAN tiers:
 * - AUTO: Mechanically defensible observations (render status, horizontal overflow, CTA observed, navigation observed, screenshots).
 * - VERIFY: Machine-detected issues a human operator should confirm (desktop/mobile content or control disparity, high-opacity artwork overlapping text, sparse/splash render, small mobile tap targets).
 * - HUMAN: Subjective visual quality, brand alignment, and layout hierarchy judgments reserved for Todd & Noelah.
 */
export const BROWSER_EVIDENCE_CLASSIFICATION_GUIDE = {
  AUTO: [
    'Desktop (1440×900) and mobile (390×844) render completion status and HTTP status',
    'Horizontal document overflow exceeding viewport width (>16px)',
    'Presence of visible above-the-fold primary CTA candidates',
    'Presence of visible navigation landmarks or header controls',
    'Point-in-time desktop and mobile viewport screenshots',
  ],
  VERIFY: [
    'Desktop vs. mobile heading, navigation, or CTA disparity',
    'High-opacity positioned artwork/imagery overlapping readable text bounding boxes',
    'Visible text clipping extending outside the viewport edges',
    'Near-empty or logo/splash-only rendered DOM despite HTTP 200',
    'Mobile interactive controls smaller than conservative tap-target threshold (<36×36px)',
  ],
  HUMAN: [
    'Which viewport experience feels stronger or clearer for a first-time visitor',
    'Whether visual hierarchy, typography, and layout inspire customer trust',
    'Whether background artwork or design choices help or hurt readability in context',
  ],
} as const;

let sharedBrowserPromise: Promise<any> | null = null;

async function getSharedLocalChromiumBrowser(): Promise<any> {
  if (sharedBrowserPromise) {
    try {
      const existing = await sharedBrowserPromise;
      if (existing && (typeof existing.isConnected !== 'function' || existing.isConnected())) {
        return existing;
      }
    } catch {
      // Fall through to launch a fresh local instance
    }
    sharedBrowserPromise = null;
  }

  sharedBrowserPromise = (async () => {
    const { chromium } = await import('playwright');
    return chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  })().catch((err) => {
    sharedBrowserPromise = null;
    throw err;
  });

  return sharedBrowserPromise;
}

/**
 * Acquires a Playwright Chromium connection:
 * - In production serverless environments with BROWSER_WS_ENDPOINT set, connects over CDP or
 *   Playwright WebSocket protocol and marks `isRemoteConnection: true` so the remote session
 *   is cleanly closed in `finally` after the scan completes (avoiding stale WebSockets and idle billing).
 * - In local/container environments without BROWSER_WS_ENDPOINT, reuses a warm local headless Chromium singleton.
 */
async function acquireChromiumBrowserConnection(): Promise<{
  browser: any;
  isRemoteConnection: boolean;
}> {
  if (process.env.BROWSER_DISABLE === 'true') {
    throw new Error('Browser rendering is disabled via BROWSER_DISABLE=true');
  }

  const wsEndpoint = process.env.BROWSER_WS_ENDPOINT?.trim();
  if (wsEndpoint) {
    const { chromium } = await import('playwright');
    const usePlaywrightProtocol =
      process.env.BROWSER_WS_PROTOCOL?.trim().toLowerCase() === 'playwright' ||
      /\/playwright\b/i.test(wsEndpoint);
    const browser = usePlaywrightProtocol
      ? await chromium.connect(wsEndpoint, { timeout: REMOTE_CONNECT_TIMEOUT_MS })
      : await chromium.connectOverCDP(wsEndpoint, { timeout: REMOTE_CONNECT_TIMEOUT_MS });
    return { browser, isRemoteConnection: true };
  }

  const browser = await getSharedLocalChromiumBrowser();
  return { browser, isRemoteConnection: false };
}

export async function closeSharedChromiumBrowser(): Promise<void> {
  if (!sharedBrowserPromise) return;
  try {
    const browser = await sharedBrowserPromise;
    sharedBrowserPromise = null;
    await browser.close();
  } catch {
    sharedBrowserPromise = null;
  }
}

const CTA_PATTERN =
  /\b(call|book|order|schedule|quote|estimate|contact|reserve|menu|catering|truck|dine|buy|shop|get started|request|inquire|appointment|visit|locations?)\b/i;

/**
 * Captures rendered evidence for a single viewport with strict SSRF, redirect,
 * resource, and timeout protections.
 */
async function captureSingleViewportWithPlaywright(params: {
  browser: any;
  targetUrl: string;
  viewportLabel: 'desktop' | 'mobile';
  viewport: { width: number; height: number };
  isMobile: boolean;
  captureScreenshots: boolean;
  hostValidationCache: Map<string, { valid: boolean; error?: string; isPrivate?: boolean }>;
}): Promise<BrowserViewportEvidence> {
  const {
    browser,
    targetUrl,
    viewportLabel,
    viewport,
    isMobile,
    captureScreenshots,
    hostValidationCache,
  } = params;

  const startTime = Date.now();
  let context: any = null;

  try {
    context = await browser.newContext({
      viewport,
      isMobile,
      deviceScaleFactor: 1,
      acceptDownloads: false,
      serviceWorkers: 'block',
       javaScriptEnabled: true,
      userAgent: isMobile
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 BaraTrustRender/1.0'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 BaraTrustRender/1.0',
    });

    const page = await context.newPage();
    const consoleErrors: string[] = [];
    let ssrfBlockedError: string | null = null;
    let mainFrameRedirects = 0;

    page.on('pageerror', (err: Error) => {
      if (consoleErrors.length < 5 && err?.message) {
        consoleErrors.push(err.message.slice(0, 180));
      }
    });

    // Enforce SSRF & resource policy on every request & redirect inside the browser context
    await context.route('**/*', async (route: any, request: any) => {
      try {
        const reqUrl = request.url();
        if (reqUrl.startsWith('data:image/') || reqUrl.startsWith('blob:') || reqUrl === 'about:blank') {
          return await route.continue();
        }

        const parsed = new URL(reqUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          ssrfBlockedError = `Blocked non-HTTP protocol in browser request: ${parsed.protocol}`;
          return await route.abort('accessdenied');
        }

        const resourceType = request.resourceType();
        if (resourceType === 'media' || resourceType === 'websocket' || resourceType === 'eventsource') {
          return await route.abort('aborted');
        }

        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
          if (request.redirectedFrom()) {
            mainFrameRedirects++;
            if (mainFrameRedirects > MAX_BROWSER_REDIRECTS) {
              ssrfBlockedError = `Exceeded maximum browser redirect limit of ${MAX_BROWSER_REDIRECTS} hops.`;
              return await route.abort('failed');
            }
          }
        }

        const hostKey = `${parsed.protocol}//${parsed.host}`;
        let cached = hostValidationCache.get(hostKey);
        if (!cached) {
          const check = await validateUrlForScan(reqUrl);
          cached = {
            valid: check.valid,
            error: check.error,
            isPrivate: check.isPrivate,
          };
          hostValidationCache.set(hostKey, cached);
        }

        if (!cached.valid) {
          if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
            ssrfBlockedError = cached.error || 'Navigation target blocked by SSRF policy.';
          }
          return await route.abort('accessdenied');
        }

        return await route.continue();
      } catch {
        return await route.abort('failed');
      }
    });

    let response: any = null;
    try {
      response = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: VIEWPORT_NAV_TIMEOUT_MS,
      });
    } catch (navErr: any) {
      const msg = String(navErr?.message || 'Navigation failed');
      if (ssrfBlockedError) {
        return {
          viewportLabel,
          viewport,
          status: 'BLOCKED',
          failureReason: ssrfBlockedError,
          finalUrl: page.url() || targetUrl,
          renderDurationMs: Date.now() - startTime,
        };
      }
      if (/timeout|timed out/i.test(msg)) {
        return {
          viewportLabel,
          viewport,
          status: 'TIMEOUT',
          failureReason: `Browser navigation timed out after ${VIEWPORT_NAV_TIMEOUT_MS}ms.`,
          finalUrl: page.url() || targetUrl,
          renderDurationMs: Date.now() - startTime,
        };
      }
      return {
        viewportLabel,
        viewport,
        status: 'FAILED',
        failureReason: msg.slice(0, 200),
        finalUrl: page.url() || targetUrl,
        renderDurationMs: Date.now() - startTime,
      };
    }

    if (ssrfBlockedError) {
      return {
        viewportLabel,
        viewport,
        status: 'BLOCKED',
        failureReason: ssrfBlockedError,
        finalUrl: page.url() || targetUrl,
        renderDurationMs: Date.now() - startTime,
      };
    }

    const httpStatus = response ? response.status() : null;
    if (httpStatus === 401 || httpStatus === 403 || httpStatus === 429 || httpStatus === 503) {
      return {
        viewportLabel,
        viewport,
        status: 'BLOCKED',
        failureReason: `Site returned HTTP ${httpStatus} during browser render (bot challenge or access restriction).`,
        finalUrl: page.url() || targetUrl,
        httpStatus,
        renderDurationMs: Date.now() - startTime,
      };
    }

    // Allow client-side hydration and images/fonts to settle briefly
    await page.waitForLoadState('load', { timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(HYDRATION_SETTLE_MS);

    // Post-redirect SSRF check on final URL
    const finalUrl = page.url() || targetUrl;
    const finalCheck = await validateUrlForScan(finalUrl);
    if (!finalCheck.valid) {
      return {
        viewportLabel,
        viewport,
        status: 'BLOCKED',
        failureReason: `Post-navigation URL blocked: ${finalCheck.error || 'Restricted destination'}`,
        finalUrl,
        httpStatus,
        renderDurationMs: Date.now() - startTime,
      };
    }

    await page.evaluate("window.__name = window.__name || function(fn) { return fn; };");
    const domInspection = await page.evaluate(
      (cfg: { overflowThreshold: number; minTapTarget: number; ctaRegexSource: string }) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const docWidth = Math.max(
          document.documentElement?.scrollWidth || 0,
          document.body?.scrollWidth || 0,
          vw
        );
        const docHeight = Math.max(
          document.documentElement?.scrollHeight || 0,
          document.body?.scrollHeight || 0,
          vh
        );
        const horizontalOverflowPx = Math.max(0, Math.round(docWidth - vw));

        const getEffectiveOpacity = (el: Element | null): number => {
          let cur: Element | null = el;
          let op = 1;
          while (cur && cur !== document.documentElement) {
            const s = window.getComputedStyle(cur);
            if (s.display === 'none' || s.visibility === 'hidden') return 0;
            const val = parseFloat(s.opacity || '1');
            if (!Number.isNaN(val)) op *= val;
            cur = cur.parentElement;
          }
          return Number(op.toFixed(3));
        };

        const isVisible = (el: Element): boolean => {
          if (getEffectiveOpacity(el) <= 0.05) return false;
          const r = el.getBoundingClientRect();
          return r.width > 2 && r.height > 2;
        };

        const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
          .filter(isVisible)
          .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
          .filter((t) => t.length > 0);

        const uniqueHeadings = Array.from(new Set(headings)).slice(0, 10);

        const ctaRegex = new RegExp(cfg.ctaRegexSource, 'i');
        const interactiveEls = Array.from(
          document.querySelectorAll('a[href], button, input[type="submit"], input[type="button"], [role="button"]')
        ).filter(isVisible);

        const topBarControls: string[] = [];
        const ctaCandidates: string[] = [];
        const smallTapTargets: Array<{ label: string; width: number; height: number }> = [];

        for (const el of interactiveEls) {
          const r = el.getBoundingClientRect();
          const rawLabel = (
            el.textContent ||
            el.getAttribute('aria-label') ||
            el.getAttribute('title') ||
            ''
          )
            .replace(/\s+/g, ' ')
            .trim();
          const href = el.getAttribute('href') || '';

          if (r.top >= -4 && r.top <= 110 && r.bottom <= 150 && rawLabel.length > 0 && rawLabel.length <= 40) {
            if (!topBarControls.includes(rawLabel)) {
              topBarControls.push(rawLabel);
            }
          }

          const isActionableCta =
            (rawLabel.length > 0 && ctaRegex.test(rawLabel)) ||
            /^tel:|^mailto:/i.test(href);
          if (isActionableCta && r.top < vh * 1.15 && r.bottom > 0 && r.left < vw && r.right > 0) {
            const labelToRecord = rawLabel || href;
            if (labelToRecord && !ctaCandidates.includes(labelToRecord)) {
              ctaCandidates.push(labelToRecord.slice(0, 60));
            }
          }

          if (
            r.top < vh * 1.5 &&
            r.width > 0 &&
            r.height > 0 &&
            (r.width < cfg.minTapTarget || r.height < cfg.minTapTarget)
          ) {
            const tapLabel = rawLabel || el.tagName.toLowerCase();
            if (smallTapTargets.length < 6) {
              smallTapTargets.push({
                label: tapLabel.slice(0, 40),
                width: Math.round(r.width),
                height: Math.round(r.height),
              });
            }
          }
        }

        const navLandmarks = Array.from(
          document.querySelectorAll('nav, header nav, [role="navigation"]')
        ).filter(isVisible);
        const navigationObserved = navLandmarks.length > 0 || topBarControls.length >= 2;

        // Compute rendered bitmap boxes for visible images to detect high-opacity artwork overlapping text
        const computePaintedImageBox = (img: HTMLImageElement) => {
          const r = img.getBoundingClientRect();
          const style = window.getComputedStyle(img);
          const fit = style.objectFit || 'fill';
          const natW = img.naturalWidth || r.width;
          const natH = img.naturalHeight || r.height;
          if (fit !== 'contain' || !natW || !natH || !r.width || !r.height) {
            return r;
          }
          const scale = Math.min(r.width / natW, r.height / natH);
          const paintedW = natW * scale;
          const paintedH = natH * scale;
          const pos = (style.objectPosition || '50% 50%').toLowerCase();
          let offsetX = (r.width - paintedW) / 2;
          let offsetY = (r.height - paintedH) / 2;
          if (pos.includes('left') || pos.startsWith('0%')) offsetX = 0;
          else if (pos.includes('right') || pos.startsWith('100%')) offsetX = r.width - paintedW;
          if (pos.includes('top') || pos.endsWith(' 0%')) offsetY = 0;
          else if (pos.includes('bottom') || pos.endsWith(' 100%')) offsetY = r.height - paintedH;
          return {
            left: r.left + offsetX,
            top: r.top + offsetY,
            right: r.left + offsetX + paintedW,
            bottom: r.top + offsetY + paintedH,
            width: paintedW,
            height: paintedH,
          };
        };

        const candidateImages = Array.from(document.querySelectorAll('img'))
          .filter((img) => {
            if (!isVisible(img)) return false;
            const op = getEffectiveOpacity(img);
            // Ignore low-opacity background watermarks/overlays (e.g., opacity <= 0.65)
            if (op < 0.75) return false;
            const r = img.getBoundingClientRect();
            // Ignore full-bleed hero/section backgrounds that span >=85% of viewport width
            if (r.width >= vw * 0.85) return false;
            // Ignore tiny icons (<80px)
            return r.width >= 120 && r.height >= 120;
          })
          .map((img) => ({
            el: img,
            src: img.getAttribute('src') || '',
            paintedRect: computePaintedImageBox(img),
            opacity: getEffectiveOpacity(img),
          }));

        const textBlocks = Array.from(document.querySelectorAll('h1, h2, h3, h4, p'))
          .filter((el) => {
            if (!isVisible(el)) return false;
            const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
            return txt.length >= 15;
          });

        const clippedTextElements: Array<{
          text: string;
          left: number;
          right: number;
          viewportWidth: number;
        }> = [];
        const mediaTextOverlaps: Array<{
          text: string;
          mediaSrc: string;
          overlapRatio: number;
        }> = [];

        for (const tEl of textBlocks) {
          const tr = tEl.getBoundingClientRect();
          const txt = (tEl.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90);

          if ((tr.right > vw + 12 || tr.left < -12) && clippedTextElements.length < 5) {
            clippedTextElements.push({
              text: txt,
              left: Math.round(tr.left),
              right: Math.round(tr.right),
              viewportWidth: vw,
            });
          }

          for (const imgInfo of candidateImages) {
            if (tEl.contains(imgInfo.el) || imgInfo.el.contains(tEl)) continue;
            const mr = imgInfo.paintedRect;
            const xOverlap = Math.max(0, Math.min(tr.right, mr.right) - Math.max(tr.left, mr.left));
            const yOverlap = Math.max(0, Math.min(tr.bottom, mr.bottom) - Math.max(tr.top, mr.top));
            const overlapArea = xOverlap * yOverlap;
            const textArea = Math.max(1, tr.width * tr.height);
            const ratio = overlapArea / textArea;
            if (ratio >= 0.25 && mediaTextOverlaps.length < 6) {
              mediaTextOverlaps.push({
                text: txt,
                mediaSrc: imgInfo.src.slice(0, 100),
                overlapRatio: Number(ratio.toFixed(2)),
              });
            }
          }
        }

        const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
        const isBotChallengeText =
          /checking your browser|just a moment|attention required|cloudflare|verify you are human|access denied/i.test(
            bodyText.slice(0, 400)
          ) && bodyText.length < 600;

        return {
          pageTitle: document.title || null,
          documentDimensions: {
            width: Math.round(docWidth),
            height: Math.round(docHeight),
          },
          horizontalOverflowPx,
          hasHorizontalOverflow: horizontalOverflowPx > cfg.overflowThreshold,
          visibleTextLength: bodyText.length,
          isNearEmptyRender: bodyText.length < 80 && uniqueHeadings.length === 0,
          isBotChallengeText,
          navigationObserved,
          primaryCtaObserved: ctaCandidates.length > 0,
          primaryCtaCandidates: ctaCandidates.slice(0, 6),
          majorHeadings: uniqueHeadings,
          visibleControlsCount: interactiveEls.length,
          visibleTopBarControls: topBarControls.slice(0, 8),
          clippedTextElements,
          mediaTextOverlaps,
          smallTapTargets: vw <= 500 ? smallTapTargets : [],
        };
      },
      {
        overflowThreshold: HORIZONTAL_OVERFLOW_THRESHOLD_PX,
        minTapTarget: MIN_TAP_TARGET_PX,
        ctaRegexSource: CTA_PATTERN.source,
      }
    );

    if (domInspection.isBotChallengeText) {
      return {
        viewportLabel,
        viewport,
        status: 'BLOCKED',
        failureReason: 'Bot challenge / interstitial detected in rendered browser view.',
        finalUrl,
        httpStatus,
        renderDurationMs: Date.now() - startTime,
      };
    }

    let screenshotDataUrl: string | null = null;
    let screenshotBytes = 0;
    let screenshotOmittedReason: string | null = null;
    if (captureScreenshots) {
      try {
        let buf: Buffer = await page.screenshot({
          type: 'jpeg',
          quality: 46,
          fullPage: false,
          timeout: 3500,
        });
        if (buf && buf.byteLength > MAX_SCREENSHOT_BYTES) {
          // Adaptive compression fallback to fit within the 120 KB per-viewport cap
          buf = await page.screenshot({
            type: 'jpeg',
            quality: 32,
            fullPage: false,
            timeout: 3500,
          });
        }
        if (buf) {
          screenshotBytes = buf.byteLength;
          if (buf.byteLength <= MAX_SCREENSHOT_BYTES) {
            screenshotDataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
          } else {
            screenshotOmittedReason = `Screenshot omitted (${Math.round(
              buf.byteLength / 1024
            )} KB exceeded ${Math.round(MAX_SCREENSHOT_BYTES / 1024)} KB viewport cap)`;
          }
        }
      } catch {
        // Non-fatal: failed screenshot never breaks the scan
        screenshotOmittedReason = 'Screenshot capture skipped or timed out';
      }
    }

    const notes: string[] = [];
    if (domInspection.hasHorizontalOverflow) {
      notes.push(
        `Horizontal overflow of ${domInspection.horizontalOverflowPx}px detected (${domInspection.documentDimensions.width}px document at ${viewport.width}px viewport).`
      );
    }
    if (domInspection.mediaTextOverlaps.length > 0) {
      notes.push(
        `High-opacity positioned artwork overlaps ${domInspection.mediaTextOverlaps.length} readable text block(s) (e.g. "${domInspection.mediaTextOverlaps[0].text.slice(0, 55)}").`
      );
    }
    if (domInspection.clippedTextElements.length > 0) {
      notes.push(
        `${domInspection.clippedTextElements.length} visible text element(s) extend beyond viewport horizontal edges.`
      );
    }
    if (domInspection.isNearEmptyRender) {
      notes.push(
        `Rendered page contains minimal visible text (${domInspection.visibleTextLength} chars) and 0 headings.`
      );
    }

    return {
      viewportLabel,
      viewport,
      status: 'RENDERED',
      finalUrl,
      httpStatus,
      renderDurationMs: Date.now() - startTime,
      pageTitle: domInspection.pageTitle,
      documentDimensions: domInspection.documentDimensions,
      horizontalOverflowPx: domInspection.horizontalOverflowPx,
      hasHorizontalOverflow: domInspection.hasHorizontalOverflow,
      visibleTextLength: domInspection.visibleTextLength,
      isNearEmptyRender: domInspection.isNearEmptyRender,
      navigationObserved: domInspection.navigationObserved,
      primaryCtaObserved: domInspection.primaryCtaObserved,
      primaryCtaCandidates: domInspection.primaryCtaCandidates,
      majorHeadings: domInspection.majorHeadings,
      visibleControlsCount: domInspection.visibleControlsCount,
      visibleTopBarControls: domInspection.visibleTopBarControls,
      clippedTextElements: domInspection.clippedTextElements,
      mediaTextOverlaps: domInspection.mediaTextOverlaps,
      smallTapTargets: domInspection.smallTapTargets,
      consoleOrPageErrors: consoleErrors,
      screenshotDataUrl,
      screenshotBytes,
      hasScreenshot: Boolean(screenshotDataUrl),
      ...(screenshotOmittedReason ? { screenshotOmittedReason } : {}),
      notes,
    };
  } catch (err: any) {
    return {
      viewportLabel,
      viewport,
      status: 'FAILED',
      failureReason: String(err?.message || 'Unexpected browser render error').slice(0, 200),
      finalUrl: targetUrl,
      renderDurationMs: Date.now() - startTime,
    };
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }
}

/**
 * Compares desktop and mobile viewport evidence and produces objective warnings
 * and explicit AUTO / VERIFY / HUMAN check classifications.
 */
export function compareDesktopAndMobileEvidence(
  desktop: BrowserViewportEvidence,
  mobile: BrowserViewportEvidence
): {
  comparison: BrowserComparisonEvidence;
  checks: BrowserCheckItem[];
} {
  const missingDesktopElements: string[] = [];
  const missingMobileElements: string[] = [];
  const objectiveWarnings: string[] = [];
  const checks: BrowserCheckItem[] = [];

  const bothRendered = desktop.status === 'RENDERED' && mobile.status === 'RENDERED';

  // 1. AUTO: Render Status
  if (bothRendered) {
    checks.push({
      key: 'browser_render_status',
      title: 'Desktop & Mobile Browser Render',
      classification: 'AUTO',
      state: desktop.isNearEmptyRender && mobile.isNearEmptyRender ? 'VERIFY' : 'PASS',
      detail: `Rendered desktop (${desktop.viewport.width}×${desktop.viewport.height}) and mobile (${mobile.viewport.width}×${mobile.viewport.height}) viewports.`,
    });
  } else {
    const blockedOrTimeout =
      desktop.status === 'BLOCKED' ||
      mobile.status === 'BLOCKED' ||
      desktop.status === 'TIMEOUT' ||
      mobile.status === 'TIMEOUT';
    checks.push({
      key: 'browser_render_status',
      title: 'Desktop & Mobile Browser Render',
      classification: 'AUTO',
      state: 'UNKNOWN',
      detail: blockedOrTimeout
        ? `Browser render could not complete (${desktop.failureReason || mobile.failureReason || 'blocked or timed out'}). Static scan score is unaffected.`
        : `Browser render unavailable (${desktop.failureReason || mobile.failureReason || 'render skipped'}).`,
    });
  }

  if (!bothRendered) {
    return {
      comparison: {
        materiallyDifferent: false,
        missingDesktopElements,
        missingMobileElements,
        objectiveWarnings,
      },
      checks,
    };
  }

  // 2. AUTO: Horizontal Overflow
  if (desktop.hasHorizontalOverflow || mobile.hasHorizontalOverflow) {
    if (mobile.hasHorizontalOverflow) {
      objectiveWarnings.push(
        `Horizontal overflow detected at the mobile viewport (${mobile.horizontalOverflowPx}px wider than ${mobile.viewport.width}px screen).`
      );
    }
    if (desktop.hasHorizontalOverflow) {
      objectiveWarnings.push(
        `Horizontal overflow detected at the desktop viewport (${desktop.horizontalOverflowPx}px wider than ${desktop.viewport.width}px screen).`
      );
    }
    checks.push({
      key: 'browser_horizontal_overflow',
      title: 'Horizontal Viewport Overflow',
      classification: 'AUTO',
      state: 'ATTENTION',
      detail: objectiveWarnings.join(' '),
    });
  } else {
    checks.push({
      key: 'browser_horizontal_overflow',
      title: 'Horizontal Viewport Overflow',
      classification: 'AUTO',
      state: 'PASS',
      detail: 'No horizontal overflow detected at either desktop (1440×900) or mobile (390×844) viewport.',
    });
  }

  // 3. AUTO: Primary CTA Visibility
  if (desktop.primaryCtaObserved && mobile.primaryCtaObserved) {
    checks.push({
      key: 'browser_cta_visibility',
      title: 'Rendered Above-the-Fold CTA Visibility',
      classification: 'AUTO',
      state: 'PASS',
      detail: `Visible primary CTA controls detected at both desktop (${(desktop.primaryCtaCandidates || []).slice(0, 3).join(', ')}) and mobile (${(mobile.primaryCtaCandidates || []).slice(0, 3).join(', ')}).`,
    });
  } else if (!desktop.primaryCtaObserved && !mobile.primaryCtaObserved) {
    objectiveWarnings.push(
      'No obvious primary CTA control was observed above the fold on either desktop or mobile.'
    );
    checks.push({
      key: 'browser_cta_visibility',
      title: 'Rendered Above-the-Fold CTA Visibility',
      classification: 'VERIFY',
      state: 'VERIFY',
      detail: 'No obvious primary CTA control observed above the fold in browser render; verify conversion path manually.',
    });
  }

  // 4. VERIFY: Desktop vs. Mobile Content, Control & Layout Disparity
  const desktopHeadings = new Set((desktop.majorHeadings || []).map((h) => h.toLowerCase()));
  const mobileHeadings = new Set((mobile.majorHeadings || []).map((h) => h.toLowerCase()));

  for (const h of desktop.majorHeadings || []) {
    if (!mobileHeadings.has(h.toLowerCase())) {
      missingMobileElements.push(`Heading: "${h}"`);
    }
  }
  for (const h of mobile.majorHeadings || []) {
    if (!desktopHeadings.has(h.toLowerCase())) {
      missingDesktopElements.push(`Heading: "${h}"`);
    }
  }

  const desktopTopControls = desktop.visibleTopBarControls || [];
  const mobileTopControls = mobile.visibleTopBarControls || [];
  if (desktopTopControls.length >= 3 && mobileTopControls.length === 0) {
    missingMobileElements.push(
      `Top-bar navigation links collapsed on mobile (${desktopTopControls.slice(0, 5).join(', ')})`
    );
  } else if (mobileTopControls.length >= 3 && desktopTopControls.length === 0) {
    missingDesktopElements.push(
      `Top-bar navigation links missing on desktop (${mobileTopControls.slice(0, 5).join(', ')})`
    );
  }

  const desktopOverlapsCount = (desktop.mediaTextOverlaps || []).length;
  const mobileOverlapsCount = (mobile.mediaTextOverlaps || []).length;
  const hasViewportSpecificOverlap =
    (desktopOverlapsCount >= 2 && mobileOverlapsCount === 0) ||
    (mobileOverlapsCount >= 2 && desktopOverlapsCount === 0);

  if (desktopOverlapsCount >= 2 && mobileOverlapsCount === 0) {
    const sampleTexts = (desktop.mediaTextOverlaps || [])
      .slice(0, 2)
      .map((o) => `"${o.text.slice(0, 45)}"`)
      .join(', ');
    objectiveWarnings.push(
      `Desktop layout has high-opacity positioned artwork overlapping ${desktopOverlapsCount} readable text block(s) (${sampleTexts}) that render cleanly without overlap on mobile.`
    );
  } else if (desktopOverlapsCount > 0 || mobileOverlapsCount > 0) {
    const targetVp = desktopOverlapsCount >= mobileOverlapsCount ? 'desktop' : 'mobile';
    const targetList =
      desktopOverlapsCount >= mobileOverlapsCount
        ? desktop.mediaTextOverlaps || []
        : mobile.mediaTextOverlaps || [];
    objectiveWarnings.push(
      `Rendered ${targetVp} layout has high-opacity positioned artwork overlapping ${targetList.length} readable text block(s) (e.g. "${targetList[0]?.text.slice(0, 50)}").`
    );
  }

  if ((desktop.clippedTextElements || []).length > 0 || (mobile.clippedTextElements || []).length > 0) {
    objectiveWarnings.push(
      'Visible text elements extend beyond the horizontal viewport boundaries.'
    );
  }

  if (desktop.isNearEmptyRender || mobile.isNearEmptyRender) {
    objectiveWarnings.push(
      `Rendered page has minimal visible text (${desktop.visibleTextLength ?? 0} chars desktop / ${mobile.visibleTextLength ?? 0} chars mobile) and 0 headings (splash or image-only layout).`
    );
    checks.push({
      key: 'browser_sparse_render',
      title: 'Sparse / Splash-Style Rendered Content',
      classification: 'VERIFY',
      state: 'VERIFY',
      detail: `Browser render succeeded (HTTP ${desktop.httpStatus || 200}), but the page exposes only ${desktop.visibleTextLength ?? 0} characters of visible text and 0 headings. Review whether visitors have enough context to take action.`,
    });
  }

  if ((mobile.smallTapTargets || []).length > 0) {
    const sampleTap = (mobile.smallTapTargets || [])
      .slice(0, 2)
      .map((t) => `${t.label || 'button'} (${t.width}×${t.height}px)`)
      .join(', ');
    checks.push({
      key: 'browser_mobile_tap_targets',
      title: 'Mobile Tap-Target Sizing',
      classification: 'VERIFY',
      state: 'VERIFY',
      detail: `Detected mobile interactive control(s) smaller than ${MIN_TAP_TARGET_PX}×${MIN_TAP_TARGET_PX}px: ${sampleTap}.`,
    });
  }

  const textLenDelta = Math.abs((desktop.visibleTextLength || 0) - (mobile.visibleTextLength || 0));
  const maxTextLen = Math.max(desktop.visibleTextLength || 0, mobile.visibleTextLength || 0, 1);
  const significantTextDisparity = maxTextLen > 200 && textLenDelta / maxTextLen > 0.35;

  const materiallyDifferent =
    missingDesktopElements.length > 0 ||
    missingMobileElements.length > 0 ||
    hasViewportSpecificOverlap ||
    significantTextDisparity ||
    desktop.navigationObserved !== mobile.navigationObserved ||
    desktop.primaryCtaObserved !== mobile.primaryCtaObserved;

  if (desktopOverlapsCount > 0 || mobileOverlapsCount > 0) {
    checks.push({
      key: 'browser_artwork_text_overlap',
      title: 'Artwork / Media Overlapping Readable Text',
      classification: 'VERIFY',
      state: 'VERIFY',
      detail:
        desktopOverlapsCount >= 2 && mobileOverlapsCount === 0
          ? `On desktop (1440×900), positioned artwork overlaps ${desktopOverlapsCount} readable text blocks while mobile (390×844) stacks cleanly without overlap.`
          : `Positioned artwork overlaps readable text bounding boxes on the rendered page (${desktopOverlapsCount} desktop / ${mobileOverlapsCount} mobile).`,
    });
  }

  if (materiallyDifferent) {
    const reasons: string[] = [];
    if (hasViewportSpecificOverlap) {
      reasons.push(
        `desktop has ${desktopOverlapsCount} artwork-over-text collision(s) vs. ${mobileOverlapsCount} on mobile`
      );
    }
    if (missingMobileElements.length > 0) {
      reasons.push(`mobile omits/collapses ${missingMobileElements.slice(0, 2).join('; ')}`);
    }
    if (missingDesktopElements.length > 0) {
      reasons.push(`desktop omits ${missingDesktopElements.slice(0, 2).join('; ')}`);
    }
    if (significantTextDisparity) {
      reasons.push(
        `visible text length differs (${desktop.visibleTextLength} chars desktop vs. ${mobile.visibleTextLength} chars mobile)`
      );
    }
    checks.push({
      key: 'browser_viewport_disparity',
      title: 'Desktop vs. Mobile Experience Comparison',
      classification: 'VERIFY',
      state: 'VERIFY',
      detail: `Desktop and mobile experiences differ materially (${reasons.join('; ')}). Review both layouts.`,
    });
  } else {
    checks.push({
      key: 'browser_viewport_disparity',
      title: 'Desktop vs. Mobile Experience Comparison',
      classification: 'AUTO',
      state: 'PASS',
      detail: 'Desktop and mobile viewports expose consistent headings, navigation, and primary CTA controls.',
    });
  }

  // 5. HUMAN: Subjective Visual & Brand Judgment Reminder
  checks.push({
    key: 'browser_human_visual_judgment',
    title: 'Visual Hierarchy & Brand Presentation Judgment',
    classification: 'HUMAN',
    state: 'UNKNOWN',
    detail:
      'Which viewport layout feels stronger, whether visual hierarchy is clear, and whether design choices inspire buyer trust remain Todd & Noelah human judgments.',
  });

  return {
    comparison: {
      materiallyDifferent,
      missingDesktopElements,
      missingMobileElements,
      objectiveWarnings,
    },
    checks,
  };
}

/**
 * Converts BrowserRenderedEvidence into zero-point (maxPoints: 0, isInformational: true)
 * EvaluatedFinding rows so the public Reality Check and Review Studio surface objective
 * browser observations WITHOUT altering the numeric score or scored check counts.
 */
export function buildBrowserEvidenceFindings(
  evidence?: BrowserRenderedEvidence | null
): EvaluatedFinding[] {
  if (!evidence) return [];
  const { desktop, mobile, comparison } = evidence;

  if (evidence.status === 'SKIPPED' || evidence.status === 'UNAVAILABLE') {
    return [];
  }

  const findings: EvaluatedFinding[] = [];
  const bothRendered = desktop.status === 'RENDERED' && mobile.status === 'RENDERED';

  if (!bothRendered) {
    const reason =
      desktop.failureReason ||
      mobile.failureReason ||
      'Automated browser render was blocked or timed out.';
    findings.push({
      category: 'digital_presence',
      checkKey: 'browser_render_experience',
      title: 'Rendered Desktop & Mobile Experience',
      state: 'UNKNOWN',
      scoreContribution: 0,
      maxPoints: 0,
      isInformational: true,
      observedValue: {
        desktopStatus: desktop.status,
        mobileStatus: mobile.status,
        failureReason: reason,
        classification: 'AUTO',
      },
      evidenceSource: 'BROWSER_RENDER',
      evidenceLabel: 'AUTO_DETECTED',
      supportingDetail: `Browser-rendered pass could not load the page (${reason}). Static HTML score is unaffected; deferred to human review.`,
    });
    return findings;
  }

  // 1. Horizontal overflow (ATTENTION if detected)
  if (desktop.hasHorizontalOverflow || mobile.hasHorizontalOverflow) {
    const targetDesc =
      mobile.hasHorizontalOverflow && desktop.hasHorizontalOverflow
        ? `both desktop (${desktop.horizontalOverflowPx}px) and mobile (${mobile.horizontalOverflowPx}px) viewports`
        : mobile.hasHorizontalOverflow
        ? `the mobile viewport (${mobile.horizontalOverflowPx}px wider than ${mobile.viewport.width}px screen)`
        : `the desktop viewport (${desktop.horizontalOverflowPx}px wider than ${desktop.viewport.width}px screen)`;
    findings.push({
      category: 'customer_journey',
      checkKey: 'browser_horizontal_overflow',
      title: 'Rendered Viewport Overflow Check',
      state: 'FAIL', // Renders as ATTENTION badge (0 points, never penalizes numeric score)
      scoreContribution: 0,
      maxPoints: 0,
      isInformational: true,
      observedValue: {
        desktopOverflowPx: desktop.horizontalOverflowPx,
        mobileOverflowPx: mobile.horizontalOverflowPx,
        classification: 'AUTO',
      },
      evidenceSource: 'BROWSER_RENDER',
      evidenceLabel: 'AUTO_DETECTED',
      supportingDetail: `Horizontal overflow detected at ${targetDesc}.`,
    });
  }

  // 2. Sparse / near-empty rendered output
  if (desktop.isNearEmptyRender && mobile.isNearEmptyRender) {
    findings.push({
      category: 'digital_presence',
      checkKey: 'browser_sparse_render',
      title: 'Rendered Page Content Density',
      state: 'UNKNOWN', // Renders as HUMAN CHECK badge (0 points)
      scoreContribution: 0,
      maxPoints: 0,
      isInformational: true,
      observedValue: {
        desktopTextLength: desktop.visibleTextLength,
        mobileTextLength: mobile.visibleTextLength,
        classification: 'VERIFY',
      },
      evidenceSource: 'BROWSER_RENDER',
      evidenceLabel: 'AUTO_DETECTED',
      supportingDetail: `Browser-rendered page loaded (HTTP ${desktop.httpStatus || 200}) as a minimal splash/logo view with ${desktop.visibleTextLength || 0} characters of visible text and 0 headings. Deferred to human review.`,
    });
  }

  // 3. Desktop vs. Mobile disparity or artwork-over-text collision
  const desktopOverlaps = desktop.mediaTextOverlaps || [];
  const mobileOverlaps = mobile.mediaTextOverlaps || [];

  if (desktopOverlaps.length > 0 || mobileOverlaps.length > 0 || comparison.materiallyDifferent) {
    const detailParts: string[] = [];
    if (desktopOverlaps.length > 0 && mobileOverlaps.length === 0) {
      detailParts.push(
        `Desktop (1440×900) has positioned artwork overlapping ${desktopOverlaps.length} readable text block(s) (including "${desktopOverlaps[0].text.slice(0, 48)}"), whereas mobile (390×844) stacks cleanly without overlap.`
      );
    } else if (desktopOverlaps.length > 0 || mobileOverlaps.length > 0) {
      const sample = (desktopOverlaps[0] || mobileOverlaps[0])?.text.slice(0, 48);
      detailParts.push(
        `Positioned artwork overlaps readable text bounding boxes on the rendered page (e.g. "${sample}").`
      );
    }
    if (comparison.missingMobileElements.length > 0) {
      detailParts.push(
        `Mobile view differs from desktop (${comparison.missingMobileElements.slice(0, 2).join('; ')}).`
      );
    }
    if (comparison.missingDesktopElements.length > 0) {
      detailParts.push(
        `Desktop view omits elements visible on mobile (${comparison.missingDesktopElements.slice(0, 2).join('; ')}).`
      );
    }

    findings.push({
      category: 'customer_journey',
      checkKey: 'browser_viewport_comparison',
      title: 'Desktop & Mobile Rendered Experience',
      state: 'UNKNOWN', // Renders as HUMAN CHECK badge (0 points)
      scoreContribution: 0,
      maxPoints: 0,
      isInformational: true,
      observedValue: {
        materiallyDifferent: comparison.materiallyDifferent,
        desktopOverlapsCount: desktopOverlaps.length,
        mobileOverlapsCount: mobileOverlaps.length,
        missingMobileElements: comparison.missingMobileElements,
        missingDesktopElements: comparison.missingDesktopElements,
        classification: 'VERIFY',
      },
      evidenceSource: 'BROWSER_RENDER',
      evidenceLabel: 'AUTO_DETECTED',
      supportingDetail: `Desktop and mobile experiences differ materially. ${detailParts.join(' ')} Review both layouts.`.trim(),
    });
  } else if (!desktop.isNearEmptyRender && !mobile.isNearEmptyRender) {
    findings.push({
      category: 'customer_journey',
      checkKey: 'browser_viewport_comparison',
      title: 'Desktop & Mobile Rendered Experience',
      state: 'PASS', // Renders as INFO · OBSERVED badge (0 points)
      scoreContribution: 0,
      maxPoints: 0,
      isInformational: true,
      observedValue: {
        materiallyDifferent: false,
        desktopHeadingsCount: (desktop.majorHeadings || []).length,
        mobileHeadingsCount: (mobile.majorHeadings || []).length,
        classification: 'AUTO',
      },
      evidenceSource: 'BROWSER_RENDER',
      evidenceLabel: 'AUTO_DETECTED',
      supportingDetail: `Desktop (1440×900) and mobile (390×844) rendered with consistent headings, navigation, and primary CTA visibility.`,
    });
  }

  return findings;
}

/**
 * Strips raw base64 screenshot payloads from public API responses while preserving
 * non-sensitive browser render observations and `hasScreenshot` flags.
 */
export function sanitizeBrowserEvidenceForPublic(
  evidence?: BrowserRenderedEvidence | null
): BrowserRenderedEvidence | null {
  if (!evidence) return null;
  return {
    ...evidence,
    desktop: {
      ...evidence.desktop,
      hasScreenshot: Boolean(evidence.desktop.screenshotDataUrl || evidence.desktop.hasScreenshot),
      screenshotDataUrl: null,
    },
    mobile: {
      ...evidence.mobile,
      hasScreenshot: Boolean(evidence.mobile.screenshotDataUrl || evidence.mobile.hasScreenshot),
      screenshotDataUrl: null,
    },
  };
}

/**
 * Enforces the hard caps on per-viewport screenshot bytes (MAX_SCREENSHOT_BYTES = 120 KB)
 * and total serialized BrowserRenderedEvidence payload (MAX_TOTAL_BROWSER_EVIDENCE_BYTES = 360 KB)
 * so Postgres JSONB storage cannot grow unboundedly.
 */
export function enforceBrowserEvidencePayloadCap(
  evidence: BrowserRenderedEvidence
): BrowserRenderedEvidence {
  const clampViewport = (vp: BrowserViewportEvidence): BrowserViewportEvidence => {
    if (!vp.screenshotDataUrl) return vp;
    const base64Part = vp.screenshotDataUrl.split(',')[1] || '';
    const approxBinaryBytes = Math.floor((base64Part.length * 3) / 4);
    if (approxBinaryBytes > MAX_SCREENSHOT_BYTES) {
      return {
        ...vp,
        screenshotDataUrl: null,
        hasScreenshot: false,
        screenshotBytes: vp.screenshotBytes || approxBinaryBytes,
        screenshotOmittedReason: `Screenshot omitted (${Math.round(
          approxBinaryBytes / 1024
        )} KB exceeded ${Math.round(MAX_SCREENSHOT_BYTES / 1024)} KB viewport cap)`,
      };
    }
    return vp;
  };

  const clamped: BrowserRenderedEvidence = {
    ...evidence,
    desktop: clampViewport(evidence.desktop),
    mobile: clampViewport(evidence.mobile),
  };

  const totalSerializedBytes = Buffer.byteLength(JSON.stringify(clamped), 'utf8');
  if (totalSerializedBytes > MAX_TOTAL_BROWSER_EVIDENCE_BYTES) {
    const omitMsg = `Screenshot omitted (total browser evidence payload ${Math.round(
      totalSerializedBytes / 1024
    )} KB exceeded ${Math.round(MAX_TOTAL_BROWSER_EVIDENCE_BYTES / 1024)} KB cap)`;
    return {
      ...clamped,
      desktop: {
        ...clamped.desktop,
        screenshotDataUrl: null,
        hasScreenshot: false,
        screenshotOmittedReason: clamped.desktop.screenshotOmittedReason || omitMsg,
      },
      mobile: {
        ...clamped.mobile,
        screenshotDataUrl: null,
        hasScreenshot: false,
        screenshotOmittedReason: clamped.mobile.screenshotOmittedReason || omitMsg,
      },
    };
  }

  return clamped;
}

export type ScreenshotPruneReason =
  | 'ANONYMOUS_TTL_EXPIRED'
  | 'CLAIMED_TTL_EXPIRED'
  | 'PUBLISHED_TTL_EXPIRED';

/**
 * Evaluates whether persisted base64 screenshots inside BrowserRenderedEvidence should be
 * pruned according to the BaraTrust lifecycle policy while preserving all DOM metrics & checks:
 * - Anonymous unclaimed scans (no email, status AUTO_SCAN_COMPLETE/NEW): 24h TTL
 * - Claimed human-review scans (NEEDS_HUMAN_REVIEW / IN_REVIEW / READY_TO_PUBLISH): 30d TTL
 * - Published reports (PUBLISHED): 14d post-publish TTL
 */
export function evaluateScreenshotRetention(params: {
  evidence: BrowserRenderedEvidence | null | undefined;
  hasEmail: boolean;
  status: string;
  createdAt: Date | string;
  publishedAt?: Date | string | null;
  now?: Date;
}): {
  shouldPrune: boolean;
  reason: ScreenshotPruneReason | null;
  prunedEvidence: BrowserRenderedEvidence | null;
} {
  const { evidence, hasEmail, status, createdAt, publishedAt, now = new Date() } = params;
  if (!evidence) {
    return { shouldPrune: false, reason: null, prunedEvidence: null };
  }

  const hasAnyScreenshot = Boolean(
    evidence.desktop?.screenshotDataUrl || evidence.mobile?.screenshotDataUrl
  );
  if (!hasAnyScreenshot) {
    return { shouldPrune: false, reason: null, prunedEvidence: evidence };
  }

  const nowMs = now.getTime();
  const createdMs = new Date(createdAt).getTime();
  const publishedMs = publishedAt ? new Date(publishedAt).getTime() : createdMs;

  let reason: ScreenshotPruneReason | null = null;
  if (status === 'PUBLISHED' || status === 'completed') {
    if (nowMs - publishedMs > PUBLISHED_SCREENSHOT_TTL_MS) {
      reason = 'PUBLISHED_TTL_EXPIRED';
    }
  } else if (!hasEmail && (status === 'AUTO_SCAN_COMPLETE' || status === 'NEW')) {
    if (nowMs - createdMs > ANONYMOUS_SCREENSHOT_TTL_MS) {
      reason = 'ANONYMOUS_TTL_EXPIRED';
    }
  } else {
    if (nowMs - createdMs > CLAIMED_SCREENSHOT_TTL_MS) {
      reason = 'CLAIMED_TTL_EXPIRED';
    }
  }

  if (!reason) {
    return { shouldPrune: false, reason: null, prunedEvidence: evidence };
  }

  const prunedAt = now.toISOString();
  const prunedEvidence: BrowserRenderedEvidence = {
    ...evidence,
    desktop: {
      ...evidence.desktop,
      screenshotDataUrl: null,
      hasScreenshot: false,
      screenshotPrunedAt: prunedAt,
      screenshotPruneReason: reason,
    },
    mobile: {
      ...evidence.mobile,
      screenshotDataUrl: null,
      hasScreenshot: false,
      screenshotPrunedAt: prunedAt,
      screenshotPruneReason: reason,
    },
  };

  return {
    shouldPrune: true,
    reason,
    prunedEvidence,
  };
}

/**
 * Future AI visual-review service boundary (prepared for future use; NOT used for
 * automated subjective scoring in this iteration).
 */
export function prepareVisualReviewPromptContext(
  evidence?: BrowserRenderedEvidence | null
): VisualReviewPromptContext | null {
  if (!evidence || evidence.status !== 'COMPLETED') return null;
  return {
    capturedAt: evidence.capturedAt,
    hasDesktopScreenshot: Boolean(evidence.desktop.screenshotDataUrl || evidence.desktop.hasScreenshot),
    hasMobileScreenshot: Boolean(evidence.mobile.screenshotDataUrl || evidence.mobile.hasScreenshot),
    desktopViewport: evidence.desktop.viewport,
    mobileViewport: evidence.mobile.viewport,
    objectiveWarnings: evidence.comparison.objectiveWarnings,
    candidateQuestionsForReview: [
      'Is readable text obscured or crowded by background/positioned imagery at either viewport?',
      'Does the mobile viewport have a materially clearer visual hierarchy than desktop (or vice versa)?',
      'Are primary conversion CTAs missing, pushed below the fold, or hidden behind menus?',
      'Does brand presentation or messaging change significantly between desktop and mobile?',
      'Does either viewport appear visually incomplete, broken, or splash-only?',
    ],
  };
}

/**
 * Captures desktop (1440×900) and mobile (390×844) browser-rendered evidence safely.
 */
export async function captureBrowserRenderedEvidence(
  options: CaptureBrowserEvidenceOptions
): Promise<BrowserRenderedEvidence> {
  const {
    url,
    platform,
    captureScreenshots = true,
    simulateUnavailable = false,
    customLoader,
  } = options;
  const capturedAt = new Date().toISOString();

  // 1. Skip hosted third-party social profiles (Facebook, Google Maps, etc.)
  if (platform?.isHostedProfile) {
    return {
      status: 'SKIPPED',
      capturedAt,
      totalDurationMs: 0,
      desktop: {
        viewportLabel: 'desktop',
        viewport: DESKTOP_VIEWPORT,
        status: 'SKIPPED',
        failureReason: `Skipped browser render for third-party ${platform.platformLabel || 'hosted profile'}.`,
      },
      mobile: {
        viewportLabel: 'mobile',
        viewport: MOBILE_VIEWPORT,
        status: 'SKIPPED',
        failureReason: `Skipped browser render for third-party ${platform.platformLabel || 'hosted profile'}.`,
      },
      comparison: {
        materiallyDifferent: false,
        missingDesktopElements: [],
        missingMobileElements: [],
        objectiveWarnings: [],
      },
      checks: [],
    };
  }

  // 2. Validate initial URL against SSRF policy BEFORE launching or touching browser
  const initialValidation = await validateUrlForScan(url);
  if (!initialValidation.valid || !initialValidation.normalizedUrl) {
    const blockReason = initialValidation.error || 'URL rejected by SSRF validation.';
    const blockedDesktop: BrowserViewportEvidence = {
      viewportLabel: 'desktop',
      viewport: DESKTOP_VIEWPORT,
      status: 'BLOCKED',
      failureReason: blockReason,
      finalUrl: url,
    };
    const blockedMobile: BrowserViewportEvidence = {
      viewportLabel: 'mobile',
      viewport: MOBILE_VIEWPORT,
      status: 'BLOCKED',
      failureReason: blockReason,
      finalUrl: url,
    };
    const { comparison, checks } = compareDesktopAndMobileEvidence(blockedDesktop, blockedMobile);
    return {
      status: 'BLOCKED',
      capturedAt,
      totalDurationMs: 0,
      desktop: blockedDesktop,
      mobile: blockedMobile,
      comparison,
      checks,
    };
  }

  const targetUrl = initialValidation.normalizedUrl;
  const startTime = Date.now();

  if (simulateUnavailable) {
    const reason = 'Browser automation runtime unavailable (simulated unavailable runtime)';
    return {
      status: 'UNAVAILABLE',
      capturedAt,
      totalDurationMs: Date.now() - startTime,
      desktop: {
        viewportLabel: 'desktop',
        viewport: DESKTOP_VIEWPORT,
        status: 'SKIPPED',
        failureReason: reason,
      },
      mobile: {
        viewportLabel: 'mobile',
        viewport: MOBILE_VIEWPORT,
        status: 'SKIPPED',
        failureReason: reason,
      },
      comparison: {
        materiallyDifferent: false,
        missingDesktopElements: [],
        missingMobileElements: [],
        objectiveWarnings: [],
      },
      checks: [],
    };
  }

  // 3. Support deterministic customLoader in unit tests
  if (customLoader) {
    const [desktop, mobile] = await Promise.all([
      customLoader({ url: targetUrl, viewportLabel: 'desktop', viewport: DESKTOP_VIEWPORT }),
      customLoader({ url: targetUrl, viewportLabel: 'mobile', viewport: MOBILE_VIEWPORT }),
    ]);
    const { comparison, checks } = compareDesktopAndMobileEvidence(desktop, mobile);
    const overallStatus =
      desktop.status === 'RENDERED' && mobile.status === 'RENDERED'
        ? 'COMPLETED'
        : desktop.status === 'BLOCKED' || mobile.status === 'BLOCKED'
        ? 'BLOCKED'
        : 'FAILED';
    return enforceBrowserEvidencePayloadCap({
      status: overallStatus,
      capturedAt,
      totalDurationMs: Date.now() - startTime,
      desktop,
      mobile,
      comparison,
      checks,
    });
  }

  // 4. Acquire Playwright Chromium (remote CDP/WS endpoint or warm local singleton)
  let browser: any;
  let isRemoteConnection = false;
  try {
    const conn = await acquireChromiumBrowserConnection();
    browser = conn.browser;
    isRemoteConnection = conn.isRemoteConnection;
  } catch (launchErr: any) {
    const reason = `Browser automation runtime unavailable (${String(launchErr?.message || 'Playwright launch failed').slice(0, 120)})`;
    return {
      status: 'UNAVAILABLE',
      capturedAt,
      totalDurationMs: Date.now() - startTime,
      desktop: {
        viewportLabel: 'desktop',
        viewport: DESKTOP_VIEWPORT,
        status: 'SKIPPED',
        failureReason: reason,
      },
      mobile: {
        viewportLabel: 'mobile',
        viewport: MOBILE_VIEWPORT,
        status: 'SKIPPED',
        failureReason: reason,
      },
      comparison: {
        materiallyDifferent: false,
        missingDesktopElements: [],
        missingMobileElements: [],
        objectiveWarnings: [],
      },
      checks: [],
    };
  }

  try {
    const hostValidationCache = new Map<string, { valid: boolean; error?: string; isPrivate?: boolean }>();
    try {
      const parsedInitial = new URL(targetUrl);
      hostValidationCache.set(`${parsedInitial.protocol}//${parsedInitial.host}`, {
        valid: true,
      });
    } catch {}

    const [desktop, mobile] = await Promise.all([
      captureSingleViewportWithPlaywright({
        browser,
        targetUrl,
        viewportLabel: 'desktop',
        viewport: DESKTOP_VIEWPORT,
        isMobile: false,
        captureScreenshots,
        hostValidationCache,
      }),
      captureSingleViewportWithPlaywright({
        browser,
        targetUrl,
        viewportLabel: 'mobile',
        viewport: MOBILE_VIEWPORT,
        isMobile: true,
        captureScreenshots,
        hostValidationCache,
      }),
    ]);

    const { comparison, checks } = compareDesktopAndMobileEvidence(desktop, mobile);
    const overallStatus =
      desktop.status === 'RENDERED' && mobile.status === 'RENDERED'
        ? 'COMPLETED'
        : desktop.status === 'BLOCKED' || mobile.status === 'BLOCKED'
        ? 'BLOCKED'
        : 'FAILED';

    return enforceBrowserEvidencePayloadCap({
      status: overallStatus,
      capturedAt,
      totalDurationMs: Date.now() - startTime,
      desktop,
      mobile,
      comparison,
      checks,
    });
  } finally {
    if (isRemoteConnection && browser) {
      await browser.close().catch(() => {});
    }
  }
}
