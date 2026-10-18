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
  isClientRenderedSpa: boolean;
  spaReason?: string;
  textSnippet: string;
}

/**
 * Extracts visible text content by removing scripts, styles, and tags.
 */
export function extractVisibleText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

/**
 * Robust, dependency-free HTML extraction for deterministic business checks.
 */
export function parseHtmlForBusinessSignals(html: string, targetCityState?: string | null): ParsedHtmlData {
  const visibleText = extractVisibleText(html);

  // 1. Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/\s+/g, ' ')) : null;

  // 2. Viewport (handles quotes, unquoted, mixed case, and attribute order)
  let viewportMeta: string | null = null;
  const viewportMatch = 
    html.match(/<meta\b[^>]*name\s*=\s*["']?viewport["']?[^>]*content\s*=\s*["']([^"']+)["']/i) ||
    html.match(/<meta\b[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']?viewport["']?/i);
  if (viewportMatch) {
    viewportMeta = viewportMatch[1].trim();
  }

  // 3. Meta description (handles quotes, unquoted, mixed case)
  let metaDescription: string | null = null;
  const descMatch = 
    html.match(/<meta\b[^>]*name\s*=\s*["']?description["']?[^>]*content\s*=\s*["']([^"']+)["']/i) ||
    html.match(/<meta\b[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']?description["']?/i);
  if (descMatch) {
    metaDescription = descMatch[1].trim();
  }

  // 4. Favicon
  let faviconUrl: string | null = null;
  const faviconMatch = 
    html.match(/<link\b[^>]*rel\s*=\s*["']?[^"'>]*icon[^"'>]*["']?[^>]*href\s*=\s*["']?([^"'\s>]+)["']?/i) ||
    html.match(/<link\b[^>]*href\s*=\s*["']?([^"'\s>]+)["']?[^>]*rel\s*=\s*["']?[^"'>]*icon[^"'>]*["']?/i);
  if (faviconMatch) {
    faviconUrl = faviconMatch[1].trim();
  }

  // 5. OpenGraph
  const ogTags: ParsedHtmlData['ogTags'] = {};
  const ogTitleMatch = html.match(/<meta\b[^>]*property\s*=\s*["']?og:title["']?[^>]*content\s*=\s*["']([^"']+)["']/i);
  if (ogTitleMatch) ogTags.title = decodeHtmlEntities(ogTitleMatch[1].trim());

  const ogSiteNameMatch = html.match(/<meta\b[^>]*property\s*=\s*["']?og:site_name["']?[^>]*content\s*=\s*["']([^"']+)["']/i);
  if (ogSiteNameMatch) ogTags.siteName = decodeHtmlEntities(ogSiteNameMatch[1].trim());

  const ogImgMatch = html.match(/<meta\b[^>]*property\s*=\s*["']?og:image["']?[^>]*content\s*=\s*["']([^"']+)["']/i);
  if (ogImgMatch) ogTags.image = ogImgMatch[1].trim();

  const ogDescMatch = html.match(/<meta\b[^>]*property\s*=\s*["']?og:description["']?[^>]*content\s*=\s*["']([^"']+)["']/i);
  if (ogDescMatch) ogTags.description = decodeHtmlEntities(ogDescMatch[1].trim());

  const ogTypeMatch = html.match(/<meta\b[^>]*property\s*=\s*["']?og:type["']?[^>]*content\s*=\s*["']([^"']+)["']/i);
  if (ogTypeMatch) ogTags.type = ogTypeMatch[1].trim();

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

  // 7. Links: tel:, mailto:, social, terms/privacy (supports unquoted or quoted hrefs)
  const telLinks: string[] = [];
  const mailtoLinks: string[] = [];
  const socialLinks: { platform: string; url: string }[] = [];
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

  // 10. Phone numbers in visible text
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?([2-9][0-8][0-9])\)?[-.\s]?([2-9][0-9]{2})[-.\s]?([0-9]{4})/g;
  const visiblePhoneNumbers: string[] = [];
  let phoneMatch: RegExpExecArray | null;
  while ((phoneMatch = phoneRegex.exec(visibleText)) !== null) {
    const full = phoneMatch[0].trim();
    if (!visiblePhoneNumbers.includes(full) && visiblePhoneNumbers.length < 5) {
      visiblePhoneNumbers.push(full);
    }
  }

  // 11. Address signals in text
  const addressRegex = /\b\d{1,5}\s+[A-Za-z0-9.\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Suite|Ste|Pkwy|Highway|Hwy)\b|\b\d{5}(?:-\d{4})?\b/gi;
  const visibleAddressSignals: string[] = [];
  let addrMatch: RegExpExecArray | null;
  while ((addrMatch = addressRegex.exec(visibleText)) !== null) {
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

  // 22. Reliable Business Name Derivation (do not invent names from weak evidence)
  const genericTitles = new Set([
    'home', 'welcome', 'index', 'untitled', 'website', 'official site', 'official website',
    'facebook', 'log into facebook', 'google', 'google maps', 'instagram', 'just a moment...',
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

  if (!derivedBusinessName) {
    const rawTitle = ogTags.title || title;
    if (rawTitle) {
      // Split on common title separators (" | ", " - ", " — ", " – ", " : ")
      const parts = rawTitle
        .split(/\s*(?:\||—|–|-|:)\s*/)
        .map(p => p.trim())
        .filter(Boolean);
      for (const part of parts) {
        const cleaned = cleanCandidateName(part);
        if (cleaned && cleaned.length <= 50) {
          derivedBusinessName = cleaned;
          break;
        }
      }
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
    isClientRenderedSpa,
    spaReason: isClientRenderedSpa 
      ? 'Page appears to be a client-rendered SPA shell with minimal static text content; in-page DOM features cannot be reliably evaluated without a headless browser.' 
      : undefined,
    textSnippet: visibleText.substring(0, 500),
  };
}
