export type WebsiteAckTemplateKey =
  | 'GENERAL_INQUIRY'
  | 'BUSINESS_INQUIRY'
  | 'CONSUMER_INQUIRY'
  | 'EXISTING_CUSTOMER_INQUIRY'
  | 'OUTREACH_REPLY'
  | 'OUT_OF_SCOPE_HUMAN_REVIEW';

export type ResponseCommitmentDays = 1 | 2;

export const VERIFIED_BARATRUST_CALENDAR_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ3pyieVpWz4IMI9eQ1Po0Me9ONKS8LBn5go3Z79mGnzsDoSyBN9fz5Iqdxh20AWs5HF9gkQjBmU';

export const ONE_BUSINESS_DAY_COMMITMENT_TEXT =
  'A member of our team will personally review your inquiry and respond within one business day.';

export const TWO_BUSINESS_DAYS_COMMITMENT_TEXT =
  'A member of our team will personally review your inquiry and respond within two business days.';

/**
 * Resolves the configured response-time commitment (1 or 2 business days).
 * Defaults conservatively to 2 business days until the team explicitly sets
 * `CUSTOMER_RESPONSE_BUSINESS_DAYS="1"` after confirming 1-business-day coverage.
 */
export function resolveCommitmentConfig(overrideDays?: number | string | null): {
  businessDays: ResponseCommitmentDays;
  commitmentText: string;
} {
  const raw =
    overrideDays !== undefined && overrideDays !== null
      ? String(overrideDays).trim()
      : (process.env.CUSTOMER_RESPONSE_BUSINESS_DAYS || '2').trim();

  if (raw === '1') {
    return {
      businessDays: 1,
      commitmentText: ONE_BUSINESS_DAY_COMMITMENT_TEXT,
    };
  }
  return {
    businessDays: 2,
    commitmentText: TWO_BUSINESS_DAYS_COMMITMENT_TEXT,
  };
}

/**
 * Resolves the verified public BaraTrust Google Calendar appointment schedule URL.
 * Canonicalizes account-indexed `/calendar/u/0/appointments/schedules/...` paths and
 * rejects non-HTTPS or placeholder links.
 */
export function resolveVerifiedWebsiteBookingUrl(overrideUrl?: string | null): string | null {
  const raw =
    overrideUrl !== undefined
      ? (overrideUrl || '').trim()
      : (
          process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_BOOKING_URL || VERIFIED_BARATRUST_CALENDAR_URL
        ).trim();

  if (!raw || raw.toLowerCase() === 'none' || raw.toLowerCase() === 'disabled') {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.includes('example.com') ||
    /todo|placeholder|your-link|fictitious/i.test(raw)
  ) {
    return null;
  }

  if (host === 'calendar.google.com') {
    parsed.pathname = parsed.pathname.replace(
      /^\/calendar\/u\/\d+\/appointments\/schedules\//,
      '/calendar/appointments/schedules/'
    );
  }

  return parsed.toString();
}

/**
 * Computes a weekday-aware (Mon–Fri) follow-up deadline in Eastern time convention
 * (`America/Indiana/Indianapolis`, UTC-5 standard / UTC-4 EDT approximated safely at 22:00 UTC end-of-business):
 * - Inquiries arriving on Saturday, Sunday, or Friday after 22:00 UTC (5:00 PM EST)
 *   start their business-day clock on Monday morning so weekend/late-Friday inquiries
 *   are never marked overdue before the next business week begins.
 */
export function computeBusinessDayDeadline(
  receivedAt: Date | string,
  businessDays: ResponseCommitmentDays = 2
): Date {
  const baseMs = receivedAt instanceof Date ? receivedAt.getTime() : Date.parse(receivedAt);
  const dt = new Date(Number.isFinite(baseMs) ? baseMs : Date.now());
  const daysToAdd: number = businessDays === 1 ? 1 : 2;

  const startDow = dt.getUTCDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  const startHourUtc = dt.getUTCHours();

  if (startDow === 6) {
    // Saturday -> anchor start at Monday 14:00 UTC (9:00 AM EST), end of Day 1 = Monday 22:00 UTC
    dt.setUTCDate(dt.getUTCDate() + 2);
    dt.setUTCHours(22, 0, 0, 0);
    if (daysToAdd === 1) return dt;
    let extra = daysToAdd - 1;
    while (extra > 0) {
      dt.setUTCDate(dt.getUTCDate() + 1);
      const dow = dt.getUTCDay();
      if (dow !== 0 && dow !== 6) extra--;
    }
    return dt;
  }

  if (startDow === 0) {
    // Sunday -> anchor start at Monday, end of Day 1 = Monday 22:00 UTC
    dt.setUTCDate(dt.getUTCDate() + 1);
    dt.setUTCHours(22, 0, 0, 0);
    if (daysToAdd === 1) return dt;
    let extra = daysToAdd - 1;
    while (extra > 0) {
      dt.setUTCDate(dt.getUTCDate() + 1);
      const dow = dt.getUTCDay();
      if (dow !== 0 && dow !== 6) extra--;
    }
    return dt;
  }

  if (startDow === 5 && startHourUtc >= 22) {
    // Late Friday after 5:00 PM EST -> treat Monday as Business Day 1 (end of Day 1 = Monday 22:00 UTC)
    dt.setUTCDate(dt.getUTCDate() + 3);
    dt.setUTCHours(22, 0, 0, 0);
    if (daysToAdd === 1) return dt;
    let extra = daysToAdd - 1;
    while (extra > 0) {
      dt.setUTCDate(dt.getUTCDate() + 1);
      const dow = dt.getUTCDay();
      if (dow !== 0 && dow !== 6) extra--;
    }
    return dt;
  }

  let remaining = daysToAdd;
  while (remaining > 0) {
    dt.setUTCDate(dt.getUTCDate() + 1);
    const dow = dt.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      remaining--;
    }
  }
  return dt;
}

interface ApprovedFaqDefinition {
  key: string;
  patterns: RegExp[];
  renderAnswer: (ctx: { commitmentText: string; verifiedBookingUrl: string | null }) => string;
}

export const APPROVED_WEBSITE_FAQ_ITEMS: ApprovedFaqDefinition[] = [
  {
    key: 'WHAT_IS_BARATRUST',
    patterns: [
      /\bwhat\s+is\s+baratrust\b/i,
      /\bwho\s+is\s+baratrust\b/i,
      /\bwhat\s+do(?:es)?\s+(?:you|baratrust)\s+do\b/i,
    ],
    renderAnswer: () =>
      'What BaraTrust does: BaraTrust is a human-led, AI-assisted research and intelligence service based in Southern Indiana serving the Louisville metro area and remote research clients ("BaraTrust watches your business so you don\'t have to").',
  },
  {
    key: 'SERVICES_OFFERED',
    patterns: [
      /\bwhat\s+services\s+do\s+you\s+offer\b/i,
      /\blist\s+of\s+services\b/i,
      /\bservices\s+you\s+provide\b/i,
    ],
    renderAnswer: () =>
      'Services offered: For businesses, we offer a free introductory Reality Check ($0), ongoing Business Pulse monitoring ($99/month across Protect, Improve, Grow, and Save), and custom-scoped business or cybersecurity readiness research. For individuals, Personal Intelligence research projects are scoped and quoted individually.',
  },
  {
    key: 'BUSINESS_PULSE_PRICE',
    patterns: [
      /\bhow\s+much\s+(?:is|does)\s+business\s+pulse\b/i,
      /\bbusiness\s+pulse\s+(?:price|pricing|cost|rate)\b/i,
      /\bhow\s+much\s+do\s+you\s+charge\b/i,
      /\bwhat\s+(?:is|are)\s+your\s+(?:price|prices|pricing|rates)\b/i,
    ],
    renderAnswer: () =>
      'Approved pricing: Business Pulse is $99/month, and our introductory business Reality Check is $0 (free). Custom business and personal research projects are quoted based on scope.',
  },
  {
    key: 'REALITY_CHECK_FREE',
    patterns: [
      /\bis\s+(?:the\s+)?reality\s+check\s+(?:really\s+)?free\b/i,
      /\breality\s+check\s+cost\b/i,
      /\bfree\s+reality\s+check\b/i,
    ],
    renderAnswer: () =>
      'Free Reality Check: Yes — our introductory business Reality Check is $0 (completely free with no obligation).',
  },
  {
    key: 'HOW_TO_SCHEDULE',
    patterns: [
      /\bhow\s+(?:do|can)\s+i\s+(?:schedule|book)\b/i,
      /\bschedule\s+a\s+(?:call|conversation|meeting|chat|time)\b/i,
      /\bbook\s+a\s+(?:call|conversation|meeting|time|15[- ]minute)\b/i,
      /\bcalendar\s+link\b/i,
    ],
    renderAnswer: ({ verifiedBookingUrl }) =>
      verifiedBookingUrl
        ? `Scheduling: You can choose a time directly on our free 15-minute introductory schedule at ${verifiedBookingUrl} (availability is confirmed directly on the booking page).`
        : 'Scheduling: Reply with a couple of general days or time windows that work for you and Todd or Noelah will coordinate a time directly.',
  },
  {
    key: 'CAN_YOU_RESEARCH_MY_QUESTION',
    patterns: [
      /\bcan\s+you\s+research\b/i,
      /\bwould\s+you\s+be\s+able\s+to\s+(?:research|find|locate|look\s+into|help\s+find)\b/i,
      /\bdo\s+you\s+take\s+custom\s+research\b/i,
    ],
    renderAnswer: () =>
      'Custom research requests: Todd or Noelah personally review each request first to confirm fit, appropriate public/authorized sources, and scope before quoting; no fixed price is set before scoping.',
  },
  {
    key: 'WHEN_HUMAN_RESPONSE',
    patterns: [
      /\bwhen\s+(?:can|will)\s+i\s+(?:expect|get|hear)\b/i,
      /\bhow\s+soon\s+will\s+(?:someone|you)\s+(?:respond|reply|get\s+back)\b/i,
      /\bresponse\s+time\b/i,
    ],
    renderAnswer: ({ commitmentText }) => `Response timeline: ${commitmentText}`,
  },
];

export function matchApprovedFaqKeys(text: string): string[] {
  const matched: string[] = [];
  for (const item of APPROVED_WEBSITE_FAQ_ITEMS) {
    if (item.patterns.some((rx) => rx.test(text))) {
      matched.push(item.key);
    }
  }
  return matched;
}

interface ApprovedTemplateSpec {
  subject: string;
  bodyTemplate: string;
  includeBooking: boolean;
  includeFaq: boolean;
}

export const PHASE_B_APPROVED_TEMPLATES: Record<WebsiteAckTemplateKey, ApprovedTemplateSpec> = {
  GENERAL_INQUIRY: {
    subject: 'We received your message — BaraTrust',
    bodyTemplate: [
      '{{greeting}}',
      '',
      'Thanks for reaching out to BaraTrust!',
      '',
      "We've received your inquiry. {{response_commitment}}",
      '',
      'We provide human-led, AI-assisted research and intelligence services for businesses and individuals.',
      '',
      "Our current Business Pulse service is $99/month, and our introductory business Reality Check is free ($0). Other research projects are quoted after we understand what you're looking for.",
      '{{faq_section}}',
      "If you'd like, you can reply with a brief description of your question or project.",
      '',
      "Please avoid sharing sensitive personal information until we've arranged an appropriate way to handle it.",
      '{{booking_section}}',
      'Thanks,',
      'Todd & Noelah',
      'BaraTrust',
      'www.baratrust.com',
      '',
      'This is an automatic acknowledgment. Your inquiry will be reviewed by a real person.',
    ].join('\n'),
    includeBooking: true,
    includeFaq: true,
  },
  BUSINESS_INQUIRY: {
    subject: 'We received your business inquiry — BaraTrust',
    bodyTemplate: [
      '{{greeting}}',
      '',
      'Thanks for reaching out to BaraTrust!',
      '',
      "We've received your business inquiry. {{response_commitment}}",
      '',
      'BaraTrust watches your business so you do not have to — combining AI-assisted research with human verification across Protect, Improve, Grow, and Save.',
      '',
      'Our introductory business Reality Check is free ($0), and ongoing Business Pulse monitoring is $99/month. Specialized business research, operational projects, and readiness reviews are quoted after we review your scope.',
      '{{faq_section}}',
      "Please avoid sending passwords, private customer records, or sensitive internal credentials by email until we've arranged an appropriate way to handle them.",
      '{{booking_section}}',
      'Thanks,',
      'Todd & Noelah',
      'BaraTrust',
      'www.baratrust.com',
      '',
      'This is an automatic acknowledgment. Your inquiry will be reviewed by a real person.',
    ].join('\n'),
    includeBooking: true,
    includeFaq: true,
  },
  CONSUMER_INQUIRY: {
    subject: 'We received your research request — BaraTrust',
    bodyTemplate: [
      '{{greeting}}',
      '',
      'Thanks for contacting BaraTrust!',
      '',
      "We've received your personal research inquiry. {{response_commitment}}",
      '',
      'Every Personal Intelligence project is reviewed by a real person first so we can confirm whether we can genuinely help, explain what sources are appropriate, and provide a clear quote after reviewing the scope.',
      '{{faq_section}}',
      "If helpful, you may reply with any public links or general context about what you are trying to find or decide. Please avoid sharing sensitive personal, financial, or identity information until we've arranged an appropriate way to handle it.",
      '{{booking_section}}',
      'Thanks,',
      'Todd & Noelah',
      'BaraTrust',
      'www.baratrust.com',
      '',
      'This is an automatic acknowledgment. Your inquiry will be reviewed by a real person.',
    ].join('\n'),
    includeBooking: true,
    includeFaq: true,
  },
  EXISTING_CUSTOMER_INQUIRY: {
    subject: 'We received your note — BaraTrust',
    bodyTemplate: [
      '{{greeting}}',
      '',
      'Thanks for sending this over to BaraTrust!',
      '',
      "We've logged your message for priority review. {{response_commitment}}",
      '',
      "Please avoid including passwords or sensitive personal records in email replies unless we've arranged a dedicated transfer.",
      '{{booking_section}}',
      'Thanks,',
      'Todd & Noelah',
      'BaraTrust',
      'www.baratrust.com',
      '',
      'This is an automatic acknowledgment. Your message will be reviewed personally by Todd or Noelah.',
    ].join('\n'),
    includeBooking: true,
    includeFaq: false,
  },
  OUTREACH_REPLY: {
    subject: 'Thanks for your reply — BaraTrust',
    bodyTemplate: [
      '{{greeting}}',
      '',
      'Thanks for replying to our note!',
      '',
      'Todd or Noelah has been notified so we can follow up with you personally. {{response_commitment}}',
      '{{faq_section}}',
      '{{booking_section}}',
      'Thanks,',
      'Todd & Noelah',
      'BaraTrust',
      'www.baratrust.com',
      '',
      'This is an automatic acknowledgment. All automated follow-ups on our end are paused while a real person reviews your reply.',
    ].join('\n'),
    includeBooking: true,
    includeFaq: true,
  },
  OUT_OF_SCOPE_HUMAN_REVIEW: {
    subject: 'We received your message — BaraTrust',
    bodyTemplate: [
      '{{greeting}}',
      '',
      'Thanks for reaching out to BaraTrust.',
      '',
      "We've received your message and routed it directly for human review rather than sending an automated answer. {{response_commitment}}",
      '',
      'For your protection, please do not send sensitive personal, financial, medical, legal, or account-access details until a member of our team has reviewed your request and confirmed whether and how we can assist.',
      '',
      'Thanks,',
      'Todd & Noelah',
      'BaraTrust',
      'www.baratrust.com',
      '',
      'This is an automatic acknowledgment. Your inquiry will be reviewed by a real person.',
    ].join('\n'),
    includeBooking: false,
    includeFaq: false,
  },
};

function formatSafeCustomerGreeting(customerName?: string | null): string {
  if (!customerName || !customerName.trim()) return 'Hi,';
  const firstToken = customerName.trim().split(/\s+/)[0] || '';
  const safeName = firstToken.replace(/[^a-zA-Z'-]/g, '').slice(0, 24);
  if (safeName.length < 2) return 'Hi,';
  return `Hi ${safeName},`;
}

export function renderPreapprovedWebsiteAck(params: {
  templateKey: WebsiteAckTemplateKey;
  customerName?: string | null;
  faqMatchedKeys?: string[];
  commitmentDays?: ResponseCommitmentDays;
  bookingUrlOverride?: string | null;
}): {
  subject: string;
  body: string;
  commitmentBusinessDays: ResponseCommitmentDays;
  commitmentText: string;
  includedBookingUrl: string | null;
} {
  const tpl = PHASE_B_APPROVED_TEMPLATES[params.templateKey];
  const { businessDays, commitmentText } = resolveCommitmentConfig(params.commitmentDays);
  const verifiedBookingUrl = tpl.includeBooking
    ? resolveVerifiedWebsiteBookingUrl(params.bookingUrlOverride)
    : null;

  let faqBlock = '';
  if (tpl.includeFaq && params.faqMatchedKeys && params.faqMatchedKeys.length > 0) {
    const matched = APPROVED_WEBSITE_FAQ_ITEMS.filter((item) =>
      params.faqMatchedKeys!.includes(item.key)
    ).slice(0, 3);
    if (matched.length > 0) {
      const lines = matched.map(
        (item) => `- ${item.renderAnswer({ commitmentText, verifiedBookingUrl })}`
      );
      faqBlock = `\nQuick answers to common questions:\n${lines.join('\n')}\n`;
    }
  }

  let bookingBlock = '\n';
  if (tpl.includeBooking) {
    if (verifiedBookingUrl) {
      bookingBlock = `\nYou can also schedule a free introductory conversation using our booking link:\n${verifiedBookingUrl}\n`;
    } else {
      bookingBlock =
        "\nIf you'd like to schedule an introductory conversation, simply reply with a couple of general time windows that work for you and we will coordinate personally.\n";
    }
  }

  const body = tpl.bodyTemplate
    .replace(/\{\{greeting\}\}/g, formatSafeCustomerGreeting(params.customerName))
    .replace(/\{\{response_commitment\}\}/g, commitmentText)
    .replace(/\{\{faq_section\}\}/g, faqBlock)
    .replace(/\{\{booking_section\}\}/g, bookingBlock)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    subject: tpl.subject,
    body,
    commitmentBusinessDays: businessDays,
    commitmentText,
    includedBookingUrl: verifiedBookingUrl,
  };
}
