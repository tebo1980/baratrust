import { HostedPlatformKey } from './types';
import { isExternalBusinessWebsiteLink } from './platform';

export interface ParsedHtmlData {
  title: string | null;
  viewportMeta: string | null;
  metaDescription: string | null;
  faviconUrl: string | null;
  ogTags: {
    title?: string;
    siteName?: string;
    image?: string;
    description?: string;
    type?: string;
  };
  derivedBusinessName: string | null;
  derivedCityState: string | null;
  jsonLdSchemas: any[];
  hasLocalBusinessSchema: boolean;
  hasOrganizationSchema: boolean;
  telLinks: string[];
  mailtoLinks: string[];
  socialLinks: { platform: string; url: string }[];
  externalWebsiteLinks: string[];
  hasForms: boolean;
  hasLeadCaptureForm: boolean;
  hasEmailNewsletterForm: boolean;
  hasMapEmbed: boolean;
  hasPrivacyOrTermsLink: boolean;
  visiblePhoneNumbers: string[];
  visibleAddressSignals: string[];
  detectedCtaKeywords: string[];
  detectedMenuOrServices: boolean;
  detectedReviewOrTestimonialKeywords: boolean;
  detectedAboutOrTeamKeywords: boolean;
  detectedQuoteOrCateringKeywords: boolean;
  detectedAfterHoursSignals: boolean;
  detectedPricingSignals: boolean;
  detectedBookingSignals: boolean;
  detectedLeadMagnetSignals: boolean;
  detectedProfileCategory: string | null;
  detectedProfileDescription: string | null;
  detectedProfileActivity: string | null;
  detectedHoursSignals: string[];
  detectedRatingSignals: string[];
  isClientRenderedSpa: boolean;
  spaReason?: string;
  textSnippet: string;
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  middot: '·',
  bull: '•',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
};

function decodeSinglePass(input: string): string {
  return input
    .replace(/&#x([0-9a-f]{1,6});?/gi, (full, hex) => {
      const code = parseInt(hex, 16);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return full;
      try {
        return String.fromCodePoint(code);
      } catch {
        return full;
      }
    })
    .replace(/&#(\d{1,7});?/g, (full, dec) => {
      const code = parseInt(dec, 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return full;
      try {
        return String.fromCodePoint(code);
      } catch {
        return full;
      }
    })
    .replace(/&([a-z0-9]+);/gi, (full, name) => {
      const lower = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(NAMED_HTML_ENTITIES, lower)
        ? NAMED_HTML_ENTITIES[lower]
        : full;
    });
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  // Run two passes to safely handle double-encoded entities such as &amp;#x48; or &amp;#xb7;
  const decoded = decodeSinglePass(decodeSinglePass(str));
  return decoded.replace(/\u00a0/g, ' ').trim();
}

/**
 * Formats a clean, word-boundary-safe excerpt that:
 * - decodes HTML entities first so it never cuts inside an entity
 * - normalizes upstream double/triple periods ("..", "...") into a single proper ellipsis ("…")
 * - stops at a sensible word boundary when exceeding maxLength
 */
export function formatCleanExcerpt(raw: string, maxLength = 120): string {
  if (!raw) return '';
  // Decode entities first and strip any trailing incomplete entity fragment if cut upstream
  let text = decodeHtmlEntities(raw.replace(/&[#a-z0-9]{0,10}$/i, ''))
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';

  const hadUpstreamEllipsis = /(?:\.{2,}|\.\s+\.(?:\s+\.)?|…)\s*$/.test(text);
  if (hadUpstreamEllipsis) {
    text = text
      .replace(/(?:\.{2,}|\.\s+\.(?:\s+\.)?|…)\s*$/, '')
      .replace(/[,;:.!?\-–—]+$/, '')
      .trim();
  }

  if (text.length > maxLength) {
    const slice = text.slice(0, maxLength + 1);
    const lastSpace = slice.lastIndexOf(' ');
    const boundary = lastSpace >= Math.floor(maxLength * 0.55) ? lastSpace : maxLength;
    text = slice
      .slice(0, boundary)
      .replace(/[,;:.!?\-–—]+$/, '')
      .trim();
    return text ? `${text}…` : '';
  }

  if (hadUpstreamEllipsis) {
    return text ? `${text}…` : '';
  }

  return text;
}

/**
 * Deterministically distinguishes a concise explicit business category
 * (e.g. "Mexican Food", "Plumbing Service") from a free-form business
 * description or bio snippet (e.g. "Located in historic downtown...").
 */
export function classifyProfileSummaryText(
  raw: string
): { kind: 'category' | 'description'; text: string } | null {
  if (!raw) return null;
  const decoded = decodeHtmlEntities(raw)
    .replace(/^[.\s·•|-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!decoded || decoded.length < 2) return null;

  const hadUpstreamEllipsis = /(?:\.{2,}|\.\s+\.(?:\s+\.)?|…)\s*$/.test(decoded);
  const candidate = decoded.replace(/\.$/, '').trim();
  const words = candidate.split(/\s+/).filter(Boolean);
  const hasInternalSentence = /[.!?]\s+[A-Za-z]/.test(candidate);
  const hasNarrativeLanguage =
    /\b(we|our|you|your|located|welcome|serving|call|visit|open|hours|street|downtown|alleyway|across|from|since|voted|follow|dm|message|email|http|www|proudly|specializing|offer|offers|offering)\b/i.test(
      candidate
    );

  if (
    !hadUpstreamEllipsis &&
    !hasInternalSentence &&
    !hasNarrativeLanguage &&
    candidate.length >= 2 &&
    candidate.length <= 45 &&
    words.length >= 1 &&
    words.length <= 6
  ) {
    return {
      kind: 'category',
      text: candidate,
    };
  }

  const excerpt = formatCleanExcerpt(decoded, 120);
  if (!excerpt || excerpt.length < 3) return null;
  return {
    kind: 'description',
    text: excerpt,
  };
}

/**
 * Extracts visible text content by removing scripts, styles, and tags.
 */
export function extractVisibleText(html: string): string {
  const stripped = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(stripped).replace(/\s+/g, ' ').trim();
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMetaContent(
  html: string,
  attrName: 'name' | 'property',
  attrValue: string
): string | null {
  const escapedVal = escapeRegExp(attrValue);
  const pattern1 = new RegExp(
    `<meta\\b[^>]*\\b${attrName}\\s*=\\s*(?:["']${escapedVal}["']|${escapedVal}(?=[\\s/>]))[^>]*\\bcontent\\s*=\\s*(?:["']([^"']*)["']|([^\\s>"']+))`,
    'i'
  );
  const pattern2 = new RegExp(
    `<meta\\b[^>]*\\bcontent\\s*=\\s*(?:["']([^"']*)["']|([^\\s>"']+))[^>]*\\b${attrName}\\s*=\\s*(?:["']${escapedVal}["']|${escapedVal}(?=[\\s/>]))`,
    'i'
  );
  const match = html.match(pattern1) || html.match(pattern2);
  if (!match) return null;
  const raw = (match[1] ?? match[2] ?? '').trim();
  return raw ? decodeHtmlEntities(raw) : null;
}

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

function extractCityStateFromTitleParts(parts: string[]): string | null {
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    const m = part.match(/^([A-Z][A-Za-z .'-]{1,35}?)(?:,\s*|\s+)([A-Z]{2})$/);
    if (m && US_STATE_CODES.has(m[2])) {
      return `${m[1].trim()}, ${m[2]}`;
    }
  }
  return null;
}

/**
 * Robust, dependency-free HTML extraction for deterministic business checks.
 */
export function parseHtmlForBusinessSignals(
  html: string,
  targetCityState?: string | null,
  platformKey?: HostedPlatformKey | null
): ParsedHtmlData {
  const visibleText = extractVisibleText(html);

  // 1. Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/\s+/g, ' ')) : null;

  // 2. Viewport (handles quotes, unquoted, mixed case, and attribute order)
  const viewportMeta = extractMetaContent(html, 'name', 'viewport');

  // 3. Meta description (handles quotes, unquoted, mixed case, and decodes HTML entities)
  const metaDescription = extractMetaContent(html, 'name', 'description');

  // 4. Favicon
  let faviconUrl: string | null = null;
  const faviconMatch = 
    html.match(/<link\b[^>]*rel\s*=\s*["']?[^"'>]*icon[^"'>]*["']?[^>]*href\s*=\s*["']?([^"'\s>]+)["']?/i) ||
    html.match(/<link\b[^>]*href\s*=\s*["']?([^"'\s>]+)["']?[^>]*rel\s*=\s*["']?[^"'>]*icon[^"'>]*["']?/i);
  if (faviconMatch) {
    faviconUrl = faviconMatch[1].trim();
  }

  // 5. OpenGraph (exact property matching so og:image never matches og:image:alt)
  const ogTags: ParsedHtmlData['ogTags'] = {};
  const ogTitle = extractMetaContent(html, 'property', 'og:title');
  if (ogTitle) ogTags.title = ogTitle;

  const ogSiteName = extractMetaContent(html, 'property', 'og:site_name');
  if (ogSiteName) ogTags.siteName = ogSiteName;

  const ogImage = extractMetaContent(html, 'property', 'og:image');
  if (ogImage) ogTags.image = ogImage;

  const ogDesc = extractMetaContent(html, 'property', 'og:description');
  if (ogDesc) ogTags.description = ogDesc;

  const ogType = extractMetaContent(html, 'property', 'og:type');
  if (ogType) ogTags.type = ogType;

  // 6. JSON-LD Schemas (handles multiple blocks and malformed blocks safely)
  const jsonLdSchemas: any[] = [];
  let hasLocalBusinessSchema = false;
  let hasOrganizationSchema = false;
  let jsonLdBusinessName: string | null = null;
  let derivedCityState: string | null = null;

  const scriptRegex = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const rawJson = match[1].trim();
    try {
      const parsed = JSON.parse(rawJson);
      jsonLdSchemas.push(parsed);

      const inspectItem = (item: any) => {
        if (!item || typeof item !== 'object') return;
        const typeStr = Array.isArray(item['@type']) 
          ? item['@type'].join(' ') 
          : String(item['@type'] || '');

        const localBusinessSubtypes = [
          'localbusiness', 'restaurant', 'store', 'contractor', 'plumber', 'plumbing', 
          'electrician', 'electrical', 'hvacbusiness', 'hvac', 'roofingcontractor', 'roofing', 'dentist',
          'medicalbusiness', 'automotivebusiness', 'localservice', 'service', 'bakery',
          'barsorpub', 'cafeorcoffeeshop', 'professionalservice', 'homeservices', 'homeandconstructionbusiness'
        ];

        const isLocalBiz = localBusinessSubtypes.some(sub => typeStr.toLowerCase().includes(sub));
        const isOrg = typeStr.toLowerCase().includes('organization');

        if (isLocalBiz) {
          hasLocalBusinessSchema = true;
        }

        if (isOrg) {
          hasOrganizationSchema = true;
        }

        if ((isLocalBiz || isOrg) && typeof item.name === 'string' && item.name.trim().length > 1 && !jsonLdBusinessName) {
          jsonLdBusinessName = decodeHtmlEntities(item.name.trim());
        }

        if (item.address && typeof item.address === 'object' && !derivedCityState) {
          const addr = Array.isArray(item.address) ? item.address[0] : item.address;
          if (addr && typeof addr.addressLocality === 'string' && addr.addressLocality.trim().length > 1) {
            const locality = addr.addressLocality.trim();
            const region = typeof addr.addressRegion === 'string' && addr.addressRegion.trim()
              ? `, ${addr.addressRegion.trim()}`
              : '';
            derivedCityState = `${locality}${region}`;
          }
        }

        if (item['@graph'] && Array.isArray(item['@graph'])) {
          item['@graph'].forEach(inspectItem);
        }
      };

      if (Array.isArray(parsed)) {
        parsed.forEach(inspectItem);
      } else {
        inspectItem(parsed);
      }
    } catch {
      // Malformed JSON-LD in target page ignored safely
    }
  }

  // 7. Links: tel:, mailto:, social, externalWebsiteLinks, terms/privacy (supports unquoted or quoted hrefs)
  const telLinks: string[] = [];
  const mailtoLinks: string[] = [];
  const socialLinks: { platform: string; url: string }[] = [];
  const externalWebsiteLinks: string[] = [];
  let hasPrivacyOrTermsLink = false;

  const anchorRegex = /<a\b[^>]*href\s*=\s*(?:["']([^"']*)["']|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let anchorMatch: RegExpExecArray | null;

  const socialPlatforms = [
    { name: 'Facebook', regex: /facebook\.com\/(?:pages\/|groups\/|people\/)?([^/?#]+)/i },
    { name: 'Instagram', regex: /instagram\.com\/([^/?#]+)/i },
    { name: 'LinkedIn', regex: /linkedin\.com\/(?:company|in)\/([^/?#]+)/i },
    { name: 'YouTube', regex: /youtube\.com\/(?:channel|c|user|@)/i },
    { name: 'X / Twitter', regex: /(?:twitter\.com|x\.com)\/([^/?#]+)/i },
    { name: 'TikTok', regex: /tiktok\.com\/@?([^/?#]+)/i },
  ];

  while ((anchorMatch = anchorRegex.exec(html)) !== null) {
    const href = (anchorMatch[1] || anchorMatch[2] || '').trim();
    const anchorText = anchorMatch[3].replace(/<[^>]+>/g, '').trim().toLowerCase();

    if (href.toLowerCase().startsWith('tel:')) {
      const cleanPhone = href.substring(4).trim();
      if (cleanPhone && !telLinks.includes(cleanPhone)) telLinks.push(cleanPhone);
    }

    if (href.toLowerCase().startsWith('mailto:')) {
      const cleanEmail = href.substring(7).split('?')[0].trim();
      if (cleanEmail && !mailtoLinks.includes(cleanEmail)) mailtoLinks.push(cleanEmail);
    }

    for (const sp of socialPlatforms) {
      if (sp.regex.test(href)) {
        if (!socialLinks.some(s => s.url === href)) {
          socialLinks.push({ platform: sp.name, url: href });
        }
      }
    }

    if (platformKey) {
      const externalUrl = isExternalBusinessWebsiteLink(href, platformKey);
      if (externalUrl && !externalWebsiteLinks.includes(externalUrl) && externalWebsiteLinks.length < 5) {
        externalWebsiteLinks.push(externalUrl);
      }
    }

    if (
      href.toLowerCase().includes('privacy') ||
      href.toLowerCase().includes('terms') ||
      anchorText.includes('privacy policy') ||
      anchorText.includes('terms of service') ||
      anchorText.includes('terms & conditions') ||
      anchorText.includes('terms of use')
    ) {
      hasPrivacyOrTermsLink = true;
    }
  }

  // 8. Forms & Inputs
  const formRegex = /<form\b[^>]*>([\s\S]*?)<\/form>/gi;
  let formMatch: RegExpExecArray | null;
  let hasForms = /<form\b/i.test(html);
  let hasLeadCaptureForm = false;
  let hasEmailNewsletterForm = false;

  while ((formMatch = formRegex.exec(html)) !== null) {
    hasForms = true;
    const formInner = formMatch[1].toLowerCase();

    const hasEmail = formInner.includes('type="email"') || formInner.includes("name='email'") || formInner.includes('name="email"');
    const hasPhone = formInner.includes('type="tel"') || formInner.includes("name='phone'") || formInner.includes('name="phone"');
    const hasTextarea = formInner.includes('<textarea');

    if ((hasEmail || hasPhone) && (hasTextarea || formInner.includes('message') || formInner.includes('quote') || formInner.includes('contact'))) {
      hasLeadCaptureForm = true;
    }

    if (hasEmail && (formInner.includes('newsletter') || formInner.includes('subscribe') || formInner.includes('sign up'))) {
      hasEmailNewsletterForm = true;
    }
  }

  // 9. Map embed check
  const hasMapEmbed = /<iframe[^>]+src=["'][^"']*(?:google\.com\/maps|maps\.google\.com|embed)[^"']*["']/i.test(html) ||
                      /<a[^>]+href=["'][^"']*(?:maps\.google\.com|goo\.gl\/maps|maps\.apple\.com)[^"']*["']/i.test(html);

  // 10. Phone numbers in visible text (and meta description for hosted profiles)
  const phoneSourceText = metaDescription ? `${visibleText} ${metaDescription}` : visibleText;
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?([2-9][0-8][0-9])\)?[-.\s]?([2-9][0-9]{2})[-.\s]?([0-9]{4})/g;
  const visiblePhoneNumbers: string[] = [];
  let phoneMatch: RegExpExecArray | null;
  while ((phoneMatch = phoneRegex.exec(phoneSourceText)) !== null) {
    const full = phoneMatch[0].trim();
    if (!visiblePhoneNumbers.includes(full) && visiblePhoneNumbers.length < 5) {
      visiblePhoneNumbers.push(full);
    }
  }

  // 11. Address signals in text
  const addressRegex = /\b\d{1,5}\s+[A-Za-z0-9.\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Suite|Ste|Pkwy|Highway|Hwy)\b|\b\d{5}(?:-\d{4})?\b/gi;
  const visibleAddressSignals: string[] = [];
  let addrMatch: RegExpExecArray | null;
  while ((addrMatch = addressRegex.exec(phoneSourceText)) !== null) {
    const addr = addrMatch[0].trim();
    if (!visibleAddressSignals.includes(addr) && visibleAddressSignals.length < 3) {
      visibleAddressSignals.push(addr);
    }
  }

  // 12. CTA Keywords
  const ctaCandidates = [
    'call now', 'call us', 'call today', 'book now', 'book online', 'order online',
    'get a quote', 'request a quote', 'request quote', 'free quote', 'request free quote',
    'free estimate', 'schedule service', 'schedule online', 'contact us', 'get started',
    'make an appointment', 'call ('
  ];
  const lowerText = visibleText.toLowerCase();
  const detectedCtaKeywords = ctaCandidates.filter(kw => lowerText.includes(kw));

  // 13. Service & Menu Language
  const detectedMenuOrServices = 
    lowerText.includes('our services') || 
    lowerText.includes('services') || 
    lowerText.includes('our menu') || 
    lowerText.includes('menu') || 
    lowerText.includes('what we do') ||
    lowerText.includes('capabilities');

  // 14. Review & Reputation Language
  const detectedReviewOrTestimonialKeywords =
    lowerText.includes('testimonial') ||
    lowerText.includes('reviews') ||
    lowerText.includes('customer review') ||
    lowerText.includes('what our customers say') ||
    lowerText.includes('what our clients say') ||
    lowerText.includes('5-star') ||
    lowerText.includes('5 star') ||
    lowerText.includes('google reviews');

  // 15. About & Owner Signals
  const detectedAboutOrTeamKeywords =
    lowerText.includes('about us') ||
    lowerText.includes('our story') ||
    lowerText.includes('our team') ||
    lowerText.includes('meet the team') ||
    lowerText.includes('founder') ||
    lowerText.includes('family owned') ||
    lowerText.includes('locally owned') ||
    lowerText.includes('years of experience') ||
    lowerText.includes('established in');

  // 16. Quote or Catering paths
  const detectedQuoteOrCateringKeywords =
    lowerText.includes('catering') ||
    lowerText.includes('private events') ||
    lowerText.includes('quote') ||
    lowerText.includes('estimate') ||
    lowerText.includes('consultation') ||
    lowerText.includes('commercial accounts');

  // 17. After hours & Emergency signals
  const detectedAfterHoursSignals =
    html.includes('sms:') ||
    lowerText.includes('24/7') ||
    lowerText.includes('emergency service') ||
    lowerText.includes('after hours') ||
    lowerText.includes('text us') ||
    lowerText.includes('live chat') ||
    html.includes('tawk.to') ||
    html.includes('intercom') ||
    html.includes('crisp.chat') ||
    html.includes('drift.com');

  // 18. Pricing signals (informational)
  const detectedPricingSignals =
    /\$\s*\d+/.test(visibleText) ||
    lowerText.includes('pricing') ||
    lowerText.includes('rates') ||
    lowerText.includes('packages');

  // 19. Booking signals (informational)
  const detectedBookingSignals =
    html.includes('calendly.com') ||
    html.includes('acuityscheduling.com') ||
    html.includes('squareup.com') ||
    html.includes('setmore.com') ||
    lowerText.includes('book online') ||
    lowerText.includes('schedule appointment') ||
    lowerText.includes('book appointment');

  // 20. Lead magnet signals (informational)
  const detectedLeadMagnetSignals =
    lowerText.includes('free guide') ||
    lowerText.includes('download') ||
    lowerText.includes('whitepaper') ||
    lowerText.includes('free checklist');

  // 21. Client-rendered SPA shell detection:
  // Minimal text (< 180 characters) combined with standard SPA mounts or scripts
  const hasSpaMount = 
    /<div\b[^>]*(?:id|class)\s*=\s*["']?(?:root|app|__next|__nuxt)["']?/i.test(html) ||
    /<(?:app-root|app-main)\b/i.test(html) ||
    /<noscript\b[^>]*>.*?(?:javascript|js).*?<\/noscript>/i.test(html);

  const isClientRenderedSpa = Boolean(
    visibleText.length < 180 && (hasSpaMount || /<script\b[^>]+src=/i.test(html))
  );

  // 22. Reliable Business Name & Location Derivation (do not invent names from weak evidence)
  const genericTitles = new Set([
    'home', 'welcome', 'index', 'untitled', 'website', 'official site', 'official website',
    'facebook', 'log into facebook', 'google', 'google maps', 'instagram', 'yelp', 'just a moment...',
    'attention required! | cloudflare', 'access denied', '403 forbidden', '404 not found'
  ]);
  const cleanCandidateName = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 80) return null;
    if (genericTitles.has(trimmed.toLowerCase())) return null;
    return trimmed;
  };

  let derivedBusinessName: string | null =
    cleanCandidateName(jsonLdBusinessName) ||
    cleanCandidateName(ogTags.siteName);

  const rawTitle = ogTags.title || title;
  const titleParts = rawTitle
    ? rawTitle
        .split(/\s*(?:\||—|–|-|:)\s*/)
        .map(p => p.trim())
        .filter(Boolean)
    : [];

  if (!derivedBusinessName && titleParts.length > 0) {
    for (const part of titleParts) {
      const cleaned = cleanCandidateName(part);
      if (cleaned && cleaned.length <= 50) {
        derivedBusinessName = cleaned;
        break;
      }
    }
  }

  if (!derivedCityState && titleParts.length > 1) {
    derivedCityState = extractCityStateFromTitleParts(titleParts);
  }

  // 23. Hosted-profile specific signals (category, description, audience/activity, hours, ratings)
  let detectedProfileCategory: string | null = null;
  let detectedProfileDescription: string | null = null;
  let detectedProfileActivity: string | null = null;
  const summarySource = ogTags.description || metaDescription || '';

  if (summarySource) {
    // Match Facebook / social profile activity metrics (e.g. "214 followers · 1 talking about this · 7 were here")
    const activityMatch = summarySource.match(
      /(\d[\d,.\sKMBkmb]*(?:likes?|followers?)(?:\s*[·•|-]\s*\d[\d,.\sKMBkmb]*(?:talking about this|were here|check-ins?|followers?|likes?|posts?))*)/i
    );
    if (activityMatch) {
      detectedProfileActivity = activityMatch[1].trim();
      const afterActivity = summarySource
        .slice((activityMatch.index ?? 0) + activityMatch[0].length)
        .replace(/^[.\s·•|-]+/, '')
        .trim();
      if (afterActivity && afterActivity.length >= 2) {
        const classified = classifyProfileSummaryText(afterActivity);
        if (classified?.kind === 'category') {
          detectedProfileCategory = classified.text;
        } else if (classified?.kind === 'description') {
          detectedProfileDescription = classified.text;
        }
      }

      // If city/state wasn't in the title, check "Business Name , City." before the activity segment
      if (!derivedCityState && typeof activityMatch.index === 'number' && activityMatch.index > 0) {
        const beforeActivity = summarySource.slice(0, activityMatch.index).trim().replace(/\.$/, '');
        const commaIdx = beforeActivity.lastIndexOf(',');
        if (commaIdx !== -1) {
          const candidateCity = beforeActivity.slice(commaIdx + 1).trim();
          if (candidateCity.length >= 2 && candidateCity.length <= 40) {
            derivedCityState = candidateCity;
          }
        }
      }
    }
  }

  const detectedHoursSignals: string[] = [];
  const hoursRegex = /\b(?:open now|closed now|hours\s*:|mon(?:day)?\s*[-–to]+\s*fri(?:day)?|\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*[-–to]+\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/gi;
  let hoursMatch: RegExpExecArray | null;
  while ((hoursMatch = hoursRegex.exec(phoneSourceText)) !== null) {
    const val = hoursMatch[0].trim();
    if (!detectedHoursSignals.includes(val) && detectedHoursSignals.length < 3) {
      detectedHoursSignals.push(val);
    }
  }

  const detectedRatingSignals: string[] = [];
  const ratingRegex = /\b(?:\d\.\d\s*(?:out of 5|stars?|\(\d+\s*reviews?\))|\d+\s+reviews?|recommended by \d+%)/gi;
  let ratingMatch: RegExpExecArray | null;
  while ((ratingMatch = ratingRegex.exec(phoneSourceText)) !== null) {
    const val = ratingMatch[0].trim();
    if (!detectedRatingSignals.includes(val) && detectedRatingSignals.length < 3) {
      detectedRatingSignals.push(val);
    }
  }

  return {
    title,
    viewportMeta,
    metaDescription,
    faviconUrl,
    ogTags,
    derivedBusinessName,
    derivedCityState,
    jsonLdSchemas,
    hasLocalBusinessSchema,
    hasOrganizationSchema,
    telLinks,
    mailtoLinks,
    socialLinks,
    externalWebsiteLinks,
    hasForms,
    hasLeadCaptureForm,
    hasEmailNewsletterForm,
    hasMapEmbed,
    hasPrivacyOrTermsLink,
    visiblePhoneNumbers,
    visibleAddressSignals,
    detectedCtaKeywords,
    detectedMenuOrServices,
    detectedReviewOrTestimonialKeywords,
    detectedAboutOrTeamKeywords,
    detectedQuoteOrCateringKeywords,
    detectedAfterHoursSignals,
    detectedPricingSignals,
    detectedBookingSignals,
    detectedLeadMagnetSignals,
    detectedProfileCategory,
    detectedProfileDescription,
    detectedProfileActivity,
    detectedHoursSignals,
    detectedRatingSignals,
    isClientRenderedSpa,
    spaReason: isClientRenderedSpa 
      ? 'Page appears to be a client-rendered SPA shell with minimal static text content; in-page DOM features cannot be reliably evaluated without a headless browser.' 
      : undefined,
    textSnippet: visibleText.substring(0, 500),
  };
}
