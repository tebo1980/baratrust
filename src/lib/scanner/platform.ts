import { PlatformClassification, HostedPlatformKey } from './types';

interface PlatformRule {
  key: HostedPlatformKey;
  label: string;
  matches: (hostname: string, pathname: string) => boolean;
  ownedHostPatterns: RegExp[];
}

const HOSTED_PLATFORM_RULES: PlatformRule[] = [
  {
    key: 'facebook',
    label: 'Facebook business page',
    matches: (host) =>
      host === 'facebook.com' ||
      host.endsWith('.facebook.com') ||
      host === 'fb.com' ||
      host.endsWith('.fb.com') ||
      host === 'fb.me' ||
      host.endsWith('.fb.me'),
    ownedHostPatterns: [
      /(^|\.)facebook\.com$/i,
      /(^|\.)fb\.com$/i,
      /(^|\.)fb\.me$/i,
      /(^|\.)fbcdn\.net$/i,
      /(^|\.)fbsbx\.com$/i,
      /(^|\.)messenger\.com$/i,
      /(^|\.)instagram\.com$/i,
      /(^|\.)meta\.com$/i,
      /(^|\.)whatsapp\.com$/i,
    ],
  },
  {
    key: 'google_business',
    label: 'Google Business Profile',
    matches: (host, path) =>
      host === 'maps.google.com' ||
      host === 'business.google.com' ||
      host === 'g.page' ||
      host.endsWith('.g.page') ||
      host === 'maps.app.goo.gl' ||
      ((host === 'goo.gl' || host.endsWith('.goo.gl')) && path.startsWith('/maps')) ||
      ((host === 'google.com' || host.endsWith('.google.com')) &&
        (path.startsWith('/maps') || path.startsWith('/local') || path.startsWith('/search'))),
    ownedHostPatterns: [
      /(^|\.)google\.com$/i,
      /(^|\.)goo\.gl$/i,
      /(^|\.)g\.page$/i,
      /(^|\.)gstatic\.com$/i,
      /(^|\.)googleapis\.com$/i,
      /(^|\.)googleusercontent\.com$/i,
      /(^|\.)youtube\.com$/i,
    ],
  },
  {
    key: 'instagram',
    label: 'Instagram profile',
    matches: (host) =>
      host === 'instagram.com' ||
      host.endsWith('.instagram.com') ||
      host === 'instagr.am' ||
      host.endsWith('.instagr.am'),
    ownedHostPatterns: [
      /(^|\.)instagram\.com$/i,
      /(^|\.)instagr\.am$/i,
      /(^|\.)cdninstagram\.com$/i,
      /(^|\.)facebook\.com$/i,
      /(^|\.)meta\.com$/i,
      /(^|\.)threads\.net$/i,
    ],
  },
  {
    key: 'yelp',
    label: 'Yelp business page',
    matches: (host) => host === 'yelp.com' || host.endsWith('.yelp.com'),
    ownedHostPatterns: [/(^|\.)yelp\.com$/i, /(^|\.)yelpcdn\.com$/i],
  },
  {
    key: 'linkedin',
    label: 'LinkedIn page',
    matches: (host) => host === 'linkedin.com' || host.endsWith('.linkedin.com'),
    ownedHostPatterns: [/(^|\.)linkedin\.com$/i, /(^|\.)licdn\.com$/i],
  },
  {
    key: 'tiktok',
    label: 'TikTok profile',
    matches: (host) => host === 'tiktok.com' || host.endsWith('.tiktok.com'),
    ownedHostPatterns: [/(^|\.)tiktok\.com$/i, /(^|\.)tiktokcdn\.com$/i],
  },
  {
    key: 'nextdoor',
    label: 'Nextdoor business page',
    matches: (host) => host === 'nextdoor.com' || host.endsWith('.nextdoor.com'),
    ownedHostPatterns: [/(^|\.)nextdoor\.com$/i],
  },
  {
    key: 'thumbtack',
    label: 'Thumbtack profile',
    matches: (host) => host === 'thumbtack.com' || host.endsWith('.thumbtack.com'),
    ownedHostPatterns: [/(^|\.)thumbtack\.com$/i],
  },
  {
    key: 'angi',
    label: 'Angi business profile',
    matches: (host) =>
      host === 'angi.com' ||
      host.endsWith('.angi.com') ||
      host === 'homeadvisor.com' ||
      host.endsWith('.homeadvisor.com'),
    ownedHostPatterns: [/(^|\.)angi\.com$/i, /(^|\.)homeadvisor\.com$/i],
  },
  {
    key: 'bbb',
    label: 'BBB business profile',
    matches: (host) => host === 'bbb.org' || host.endsWith('.bbb.org'),
    ownedHostPatterns: [/(^|\.)bbb\.org$/i],
  },
];

function parseSafeUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

function classifySingleUrl(rawUrl: string): PlatformClassification | null {
  const parsed = parseSafeUrl(rawUrl);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = parsed.pathname.toLowerCase();

  for (const rule of HOSTED_PLATFORM_RULES) {
    if (rule.matches(host, pathname)) {
      return {
        sourceType: 'hosted_profile',
        isHostedProfile: true,
        platformKey: rule.key,
        platformLabel: rule.label,
      };
    }
  }
  return null;
}

/**
 * Centrally classifies whether a submitted URL (or its resolved final URL)
 * is a standalone business website or a third-party hosted profile/directory page.
 */
export function classifySubmittedUrl(
  requestedUrl: string,
  finalUrl?: string
): PlatformClassification {
  if (finalUrl) {
    const finalMatch = classifySingleUrl(finalUrl);
    if (finalMatch) return finalMatch;
  }
  const requestedMatch = classifySingleUrl(requestedUrl);
  if (requestedMatch) return requestedMatch;

  return {
    sourceType: 'standalone_website',
    isHostedProfile: false,
    platformKey: null,
    platformLabel: null,
  };
}

/**
 * Determines whether a discovered href on a hosted profile page points to an
 * external standalone website rather than internal platform navigation/legal links.
 */
export function isExternalBusinessWebsiteLink(
  href: string,
  platformKey: HostedPlatformKey | null
): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('sms:') ||
    trimmed.startsWith('javascript:')
  ) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  // Unwrap Facebook external link shim (e.g. https://l.facebook.com/l.php?u=https%3A%2F%2F...)
  const host = parsed.hostname.toLowerCase();
  if ((host === 'l.facebook.com' || host === 'lm.facebook.com') && parsed.searchParams.get('u')) {
    const unwrapped = parsed.searchParams.get('u');
    if (unwrapped) {
      return isExternalBusinessWebsiteLink(unwrapped, platformKey);
    }
  }

  const rule = platformKey
    ? HOSTED_PLATFORM_RULES.find((r) => r.key === platformKey)
    : null;

  if (rule) {
    for (const pattern of rule.ownedHostPatterns) {
      if (pattern.test(host)) {
        return null;
      }
    }
  }

  // Also exclude other known social/platform hosts if we are looking for an external standalone website
  for (const r of HOSTED_PLATFORM_RULES) {
    if (r.matches(host.replace(/^www\./, ''), parsed.pathname.toLowerCase())) {
      return null;
    }
  }

  return parsed.toString();
}
