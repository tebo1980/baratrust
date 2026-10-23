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
  detectedServiceAreaSignals?: boolean;
  detectedLocationSignals?: boolean;
  hasMultiLocationSignals?: boolean;
  detectedLocalBusinessCues?: boolean;
  searchableText?: string;
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
 * Extracts visible body text content by removing head metadata, scripts, styles, and tags.
 */
export function extractVisibleText(html: string): string {
  const stripped = html
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ')
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

/**
 * Extracts an HTML attribute value from a single opening tag string,
 * matching double-quoted ("..."), single-quoted ('...'), or unquoted values
 * without truncating at apostrophes inside double quotes (or vice versa).
 */
export function extractHtmlAttribute(tag: string, attrName: string): string | null {
  const escaped = escapeRegExp(attrName);
  const regex = new RegExp(
    `(?:^|[\\s/"'])${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + '`]+' + `))`,
    'i'
  );
  const match = tag.match(regex);
  if (!match) return null;
  const val = match[1] ?? match[2] ?? match[3];
  return typeof val === 'string' ? val : null;
}

function extractMetaContent(
  html: string,
  attrName: 'name' | 'property' | 'itemprop',
  attrValue: string
): string | null {
  const metaTagRegex = /<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
  const targetLower = attrValue.toLowerCase();
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = metaTagRegex.exec(html)) !== null) {
    const tag = tagMatch[0];
    const keyVal = extractHtmlAttribute(tag, attrName);
    if (keyVal && keyVal.trim().toLowerCase() === targetLower) {
      const contentVal = extractHtmlAttribute(tag, 'content');
      if (contentVal !== null) {
        const cleaned = decodeHtmlEntities(contentVal);
        if (cleaned) return cleaned;
      }
    }
  }
  return null;
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

const NON_CTA_CONTROL_LABELS = new Set([
  'learn more',
  'read more',
  'more',
  'details',
  'view details',
  'home',
  'about',
  'about us',
  'our story',
  'services',
  'our services',
  'what we help with',
  'how it works',
  'who it’s for',
  "who it's for",
  'faq',
  'faqs',
  'blog',
  'news',
  'careers',
  'jobs',
  'login',
  'log in',
  'sign in',
  'logout',
  'log out',
  'menu',
  'close',
  'cancel',
  'back',
  'next',
  'previous',
  'skip',
  'skip to content',
  'privacy',
  'privacy policy',
  'terms',
  'terms of service',
  'terms & conditions',
  'cookie policy',
  'day mode',
  'night mode',
  'dark mode',
  'light mode',
  'toggle theme',
]);

/**
 * Evaluates whether an interactive control (<a/>, <button/>, <input type="submit|button"/>)
 * represents a genuine action-oriented customer conversion callout.
 */
function isActionableCtaControl(
  labelRaw: string,
  tagAttrs: string,
  isSubmitButton: boolean
): string | null {
  const clean = labelRaw
    .replace(/\s+/g, ' ')
    .replace(/[→↗»›]+$/g, '')
    .trim();
  if (!clean || clean.length < 3 || clean.length > 60) return null;

  const lower = clean.toLowerCase();
  if (NON_CTA_CONTROL_LABELS.has(lower)) return null;

  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 9) return null;

  // High-intent standalone conversion phrases in a button/link
  if (
    /\b(?:free demo|get a demo|get a free demo|book a demo|request a demo|schedule a demo|see demo|watch demo|call now|call us|call today|book now|book online|order online|order now|get a quote|request a quote|request quote|free quote|request free quote|free estimate|schedule service|schedule online|contact us|get started|start now|start free|make an appointment|book appointment|schedule appointment|reserve a table|make a reservation|inquire now|talk to sales|speak to an expert|request consultation|free consultation)\b/i.test(
      lower
    )
  ) {
    return lower;
  }

  // Action verb + conversion intent object/modifier inside an interactive element
  const hasActionVerb =
    /^(?:get|run|start|request|book|schedule|order|call|contact|claim|try|join|reserve|inquire|apply|calculate|check|scan|talk|speak|hire|find|view|see|send|submit)\b/i.test(
      lower
    );
  const hasConversionIntent =
    /\b(?:free|demo|quote|estimate|consultation|audit|assessment|reality check|check|scan|trial|appointment|service|call|online|now|today|us|sales|team|expert|table|reservation|order|pricing|plans|help|started|message|inquiry|report|custom|project|offer|menu)\b/i.test(
      lower
    );

  if (hasActionVerb && hasConversionIntent) {
    return lower;
  }

  // Submit buttons with clear action verbs
  if (isSubmitButton && hasActionVerb) {
    return lower;
  }

  // CTA-classed or conversion-linked anchors/buttons with an action verb
  const classVal = (extractHtmlAttribute(tagAttrs, 'class') || '').toLowerCase();
  const hrefVal = (extractHtmlAttribute(tagAttrs, 'href') || '').toLowerCase();
  const hasCtaStylingOrHref =
    /\b(?:cta|btn|button)\b/.test(classVal) ||
    /(?:^#(?:start|contact|quote|book|order|demo|reality-check)|\/(?:contact|quote|book|schedule|demo|order|get-started|estimate|inquire)|^(?:tel:|mailto:))/.test(
      hrefVal
    );

  if (hasCtaStylingOrHref && hasActionVerb) {
    return lower;
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

  // 3. Meta description (handles quotes with apostrophes, unquoted, mixed case, and decodes HTML entities)
  const metaDescription =
    extractMetaContent(html, 'name', 'description') ||
    extractMetaContent(html, 'itemprop', 'description');

  // 4. Favicon (handles rel="icon", "shortcut icon", "apple-touch-icon", "mask-icon" in any attribute order)
  let faviconUrl: string | null = null;
  const linkTagRegex = /<link\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkTagRegex.exec(html)) !== null) {
    const tag = linkMatch[0];
    const rel = extractHtmlAttribute(tag, 'rel');
    if (rel && /\b(?:icon|apple-touch-icon|mask-icon)\b/i.test(rel)) {
      const href = extractHtmlAttribute(tag, 'href');
      if (href && href.trim()) {
        faviconUrl = decodeHtmlEntities(href.trim());
        break;
      }
    }
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
  const jsonLdAddressSignals: string[] = [];

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
          'localbusiness', 'restaurant', 'foodestablishment', 'store', 'contractor', 'plumber', 'plumbing',
          'electrician', 'electrical', 'hvacbusiness', 'hvac', 'roofingcontractor', 'roofing', 'dentist',
          'medicalbusiness', 'automotivebusiness', 'localservice', 'service', 'bakery',
          'barsorpub', 'barorpub', 'brewery', 'cafeorcoffeeshop', 'professionalservice', 'homeservices', 'homeandconstructionbusiness'
        ];

        const isLocalBiz = localBusinessSubtypes.some(sub => typeStr.toLowerCase().includes(sub));
        const isOrg = /\b(?:organization|corporation|brand|onlinebusiness|softwareapplication|website)\b/i.test(typeStr);

        if (isLocalBiz) {
          hasLocalBusinessSchema = true;
        }

        if (isOrg) {
          hasOrganizationSchema = true;
        }

        if ((isLocalBiz || isOrg) && typeof item.name === 'string' && item.name.trim().length > 1 && !jsonLdBusinessName) {
          jsonLdBusinessName = decodeHtmlEntities(item.name.trim());
        }

        if (item.address && typeof item.address === 'object') {
          const addrList = Array.isArray(item.address) ? item.address : [item.address];
          for (const addr of addrList) {
            if (!addr || typeof addr !== 'object') continue;
            const street = typeof addr.streetAddress === 'string' ? addr.streetAddress.trim() : '';
            const locality = typeof addr.addressLocality === 'string' ? addr.addressLocality.trim() : '';
            const region = typeof addr.addressRegion === 'string' ? addr.addressRegion.trim() : '';
            if (locality.length > 1 && !derivedCityState) {
              derivedCityState = region ? `${locality}, ${region}` : locality;
            }
            const formattedAddr = [street, locality, region].filter(Boolean).join(', ');
            if (formattedAddr && !jsonLdAddressSignals.includes(formattedAddr)) {
              jsonLdAddressSignals.push(formattedAddr);
            }
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

  // 7. Links: tel:, mailto:, social, externalWebsiteLinks, terms/privacy, about, interactive CTAs
  const telLinks: string[] = [];
  const mailtoLinks: string[] = [];
  const socialLinks: { platform: string; url: string }[] = [];
  const externalWebsiteLinks: string[] = [];
  const interactiveCtaSignals: string[] = [];
  let hasPrivacyOrTermsLink = false;
  let hasAboutLink = false;

  const anchorRegex = /<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/a>/gi;
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
    const attrs = anchorMatch[1] || '';
    const href = (extractHtmlAttribute(attrs, 'href') || '').trim();
    const rawAnchorText = decodeHtmlEntities(anchorMatch[2].replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    const anchorText = rawAnchorText.toLowerCase();

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

    if (
      /(?:^|\/)(?:about|about-us|our-story|our-team|who-we-are)(?:\/|$|\?|#)/i.test(href) ||
      anchorText === 'about' ||
      anchorText === 'about us' ||
      anchorText === 'our story' ||
      anchorText === 'our team' ||
      anchorText === 'who we are'
    ) {
      hasAboutLink = true;
    }

    const ctaMatch = isActionableCtaControl(
      rawAnchorText || extractHtmlAttribute(attrs, 'aria-label') || '',
      attrs,
      false
    );
    if (ctaMatch && !interactiveCtaSignals.includes(ctaMatch) && interactiveCtaSignals.length < 8) {
      interactiveCtaSignals.push(ctaMatch);
    }
  }

  // Inspect <button> and <input type="submit|button"> controls for CTA semantics
  const buttonRegex = /<button\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/button>/gi;
  let buttonMatch: RegExpExecArray | null;
  while ((buttonMatch = buttonRegex.exec(html)) !== null) {
    const attrs = buttonMatch[1] || '';
    const typeAttr = (extractHtmlAttribute(attrs, 'type') || '').toLowerCase();
    const isSubmit = typeAttr === 'submit' || (!typeAttr && /<form\b/i.test(html));
    const label = decodeHtmlEntities(buttonMatch[2].replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    const ctaMatch = isActionableCtaControl(
      label || extractHtmlAttribute(attrs, 'aria-label') || '',
      attrs,
      isSubmit
    );
    if (ctaMatch && !interactiveCtaSignals.includes(ctaMatch) && interactiveCtaSignals.length < 8) {
      interactiveCtaSignals.push(ctaMatch);
    }
  }

  const inputBtnRegex = /<input\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
  let inputBtnMatch: RegExpExecArray | null;
  while ((inputBtnMatch = inputBtnRegex.exec(html)) !== null) {
    const attrs = inputBtnMatch[1] || '';
    const typeAttr = (extractHtmlAttribute(attrs, 'type') || '').toLowerCase();
    if (typeAttr === 'submit' || typeAttr === 'button') {
      const val = extractHtmlAttribute(attrs, 'value') || extractHtmlAttribute(attrs, 'aria-label') || '';
      const ctaMatch = isActionableCtaControl(decodeHtmlEntities(val), attrs, typeAttr === 'submit');
      if (ctaMatch && !interactiveCtaSignals.includes(ctaMatch) && interactiveCtaSignals.length < 8) {
        interactiveCtaSignals.push(ctaMatch);
      }
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

  // 10. Phone numbers in visible text (and meta description / telLinks)
  const phoneSourceText = metaDescription ? `${visibleText} ${metaDescription}` : visibleText;
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?([2-9][0-8][0-9])\)?[-.\s]?(?:([2-9][0-9]{2})[-.\s]?([0-9]{4})|([2-9][0-9])[-.\s]?([0-9]{5}))/g;
  const visiblePhoneNumbers: string[] = [];
  let phoneMatch: RegExpExecArray | null;
  while ((phoneMatch = phoneRegex.exec(phoneSourceText)) !== null) {
    const full = phoneMatch[0].trim();
    if (!visiblePhoneNumbers.includes(full) && visiblePhoneNumbers.length < 5) {
      visiblePhoneNumbers.push(full);
    }
  }
  if (visiblePhoneNumbers.length === 0 && telLinks.length > 0) {
    for (const tel of telLinks) {
      const digits = tel.replace(/\D/g, '');
      if (digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))) {
        if (!visiblePhoneNumbers.includes(tel)) {
          visiblePhoneNumbers.push(tel);
        }
      }
    }
  }

  // 11. Address signals in text (word-bounded street suffixes & bounded street tokens so prose words like "away", "waste", "third" never match)
  const streetAddressRegex =
    /(?<![$#.,\d])\b[1-9]\d{0,4}\s+(?:[A-Za-z0-9.#-]+\s+){1,5}(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Lane|Ln\.?|Drive|Dr\.?|Court|Ct\.?|Way|Suite|Ste\.?|Parkway|Pkwy\.?|Highway|Hwy\.?|Circle|Cir\.?|Plaza|Plz\.?|Trail|Trl\.?|FM\s*\d+)\b/gi;
  const cityStateZipRegex =
    /\b[A-Z][A-Za-z .'-]{1,25},\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+\d{5}(?:-\d{4})?\b/g;

  const visibleAddressSignals: string[] = [...jsonLdAddressSignals.slice(0, 3)];
  let addrMatch: RegExpExecArray | null;
  while ((addrMatch = streetAddressRegex.exec(phoneSourceText)) !== null) {
    const addr = addrMatch[0].trim();
    if (!visibleAddressSignals.includes(addr) && visibleAddressSignals.length < 3) {
      visibleAddressSignals.push(addr);
    }
  }
  while ((addrMatch = cityStateZipRegex.exec(phoneSourceText)) !== null) {
    const addr = addrMatch[0].trim();
    if (!visibleAddressSignals.includes(addr) && visibleAddressSignals.length < 3) {
      visibleAddressSignals.push(addr);
    }
  }

  // 12. CTA Keywords & Actionable Controls
  const ctaCandidates = [
    'call now', 'call us', 'call today', 'book now', 'book online', 'order online', 'order now',
    'get a quote', 'request a quote', 'request quote', 'free quote', 'request free quote',
    'free estimate', 'schedule service', 'schedule online', 'contact us', 'get started',
    'make an appointment', 'call (', 'free demo', 'get a free demo', 'get a demo',
    'book a demo', 'request a demo', 'schedule a demo', 'talk to sales', 'inquire now'
  ];
  const lowerText = visibleText.toLowerCase();
  const detectedCtaKeywords: string[] = [];
  for (const kw of ctaCandidates) {
    if (lowerText.includes(kw) && !detectedCtaKeywords.includes(kw)) {
      detectedCtaKeywords.push(kw);
    }
  }
  for (const ctrlCta of interactiveCtaSignals) {
    if (!detectedCtaKeywords.includes(ctrlCta)) {
      detectedCtaKeywords.push(ctrlCta);
    }
  }

  // 13. Service & Menu Language
  const detectedMenuOrServices = 
    lowerText.includes('our services') || 
    lowerText.includes('services') || 
    lowerText.includes('our menu') || 
    lowerText.includes('menu') || 
    lowerText.includes('what we do') ||
    lowerText.includes('what we can help with') ||
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
    hasAboutLink ||
    lowerText.includes('about us') ||
    lowerText.includes('our story') ||
    lowerText.includes('our team') ||
    lowerText.includes('meet the team') ||
    lowerText.includes('who we are') ||
    lowerText.includes('founder') ||
    lowerText.includes('founded by') ||
    lowerText.includes('family owned') ||
    lowerText.includes('locally owned') ||
    lowerText.includes('owner-operated') ||
    lowerText.includes('human-led') ||
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
  // Minimal visible body text (< 180 characters) combined with standard SPA mounts or scripts
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

  // Full searchable text (title + meta description + og description + full visible body text + addresses)
  const searchableText = [
    title || '',
    metaDescription || '',
    ogTags.description || '',
    visibleText,
    visibleAddressSignals.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Service area & geographic/location coverage signals across business models
  const hasExplicitTerritoryPhrase =
    /\b(?:service area|service areas|serving|proudly serving|we serve|areas we serve|serves\s+[\w\s,'-]{2,40}\s+across|across\s+(?:south|north|central|east|west|greater)\s+[a-z]+|county|counties|surrounding areas|metro area|greater [a-z]+|tri-state)\b/i.test(
      searchableText
    );
  const hasMultiLocationNavOrHeading =
    /\b(?:our locations|find a location|all locations|multiple locations|store locator|view locations|choose a location|select a location)\b/i.test(
      lowerText
    ) ||
    /<a\b[^>]*href\s*=\s*["'][^"']*\/locations?(?:[/"'?#]|$)[^>]*>/i.test(html);
  const hasMultiLocationSignals =
    !isClientRenderedSpa && (hasMultiLocationNavOrHeading || visibleAddressSignals.length >= 2);
  const hasStorefrontOrMultiLocationSignals =
    visibleAddressSignals.length > 0 ||
    hasMapEmbed ||
    hasMultiLocationSignals ||
    /\b(?:visit us at|located in|located at|dine-in|carryout|curbside pickup|local delivery)\b/i.test(
      lowerText
    );

  const detectedLocationSignals =
    visibleAddressSignals.length > 0 ||
    hasMapEmbed ||
    hasLocalBusinessSchema ||
    hasMultiLocationSignals ||
    Boolean(derivedCityState);

  // Detect local service/trade contractor or brick-and-mortar hospitality/storefront cues
  // so poorly built local business sites cannot bypass phone/address/location checks,
  // while guarding against B2B SaaS platforms that market software to those industries.
  const hasTradeOrContractorCues =
    /\b(?:plumb(?:ing|er|ers)|drain cleaning|water heater|sewer line|hvac|heating and cooling|heating & cooling|air conditioning|ac repair|furnace|roofer|roofing|siding|gutter|electrician|electrical contractor|landscap(?:ing|er)|lawn care|tree service|tree removal|pest control|exterminator|garage door|locksmith|auto repair|body shop|towing|carpet cleaning|pressure washing|power washing|handyman|home remodeling|kitchen remodeling|bathroom remodeling|general contractor|concrete|paving|asphalt|fencing|house painting|foundation repair|septic|licensed and insured|licensed & insured|free estimate|free estimates|emergency service|same-day service)\b/i.test(
      searchableText
    );
  const hasBrickAndMortarHospitalityOrClinicCues =
    /\b(?:pizzeria|taqueria|trattoria|bakery|bistro|diner|bar & grill|steakhouse|brewery|taproom|brewpub|coffee shop|food truck|dine-in|dine in|takeout|take-out|carryout|carry-out|curbside pickup|table reservations?|our menu|view menu|lunch menu|dinner menu|appetizers|entrees|happy hour|barbershop|hair salon|nail salon|day spa|dental|dentist|orthodontist|chiropractor|veterinar(?:y|ian)|animal hospital|pet grooming|auto detailing|dry cleaner|walk-ins? welcome|hours of operation)\b/i.test(
      searchableText
    );
  const hasB2bSaasPlatformCues =
    /\b(?:book a demo|get a free demo|get a demo|request a demo|schedule a demo|watch demo|start free trial|free trial|restaurant software|restaurant platform|marketing platform|all-in-one platform|pos system|point of sale|software for|built for restaurants|for restaurant owners|run my free reality check)\b/i.test(
      searchableText
    );

  const detectedServiceAreaSignals =
    !(hasB2bSaasPlatformCues && !detectedLocationSignals) &&
    (hasExplicitTerritoryPhrase ||
      hasMultiLocationSignals ||
      (!isClientRenderedSpa &&
        hasStorefrontOrMultiLocationSignals &&
        Boolean(derivedCityState || visibleAddressSignals.length > 0 || hasMapEmbed)));

  const detectedLocalBusinessCues =
    !isClientRenderedSpa &&
    (hasTradeOrContractorCues || hasBrickAndMortarHospitalityOrClinicCues) &&
    !(hasB2bSaasPlatformCues && !detectedLocationSignals);

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
    detectedServiceAreaSignals,
    detectedLocationSignals,
    hasMultiLocationSignals,
    detectedLocalBusinessCues,
    searchableText,
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
