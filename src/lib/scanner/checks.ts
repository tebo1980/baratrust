import { RawPageData, EvaluatedFinding, CategoryKey, PlatformClassification } from './types';
import { ParsedHtmlData } from './parser';

export interface EvaluateInput {
  rawData: RawPageData;
  parsed: ParsedHtmlData;
  businessName?: string | null;
  cityState?: string | null;
  platform?: PlatformClassification;
}

/**
 * Helper to handle checks that depend on rendered page content.
 * If the page is a client-rendered SPA shell and the feature was not found in static HTML,
 * returns UNKNOWN rather than FAIL so the business is not falsely penalized.
 */
function evaluateContentCheck(options: {
  isSpa: boolean;
  found: boolean;
  passPoints: number;
  category: CategoryKey;
  checkKey: string;
  title: string;
  observedValue: Record<string, any>;
  passDetail: string;
  failDetail: string;
  isInformational?: boolean;
}): EvaluatedFinding {
  const {
    isSpa,
    found,
    passPoints,
    category,
    checkKey,
    title,
    observedValue,
    passDetail,
    failDetail,
    isInformational = false,
  } = options;

  if (found) {
    return {
      category,
      checkKey,
      title,
      state: 'PASS',
      scoreContribution: isInformational ? 0 : passPoints,
      maxPoints: isInformational ? 0 : passPoints,
      isInformational,
      observedValue,
      evidenceSource: 'HTML_PARSER',
      evidenceLabel: isInformational ? 'OPPORTUNITY_FOUND' : 'AUTO_DETECTED',
      supportingDetail: passDetail,
    };
  }

  // If absent and the page is an unrendered client SPA shell, we cannot deterministically confirm absence
  if (isSpa) {
    return {
      category,
      checkKey,
      title,
      state: 'UNKNOWN',
      scoreContribution: 0,
      maxPoints: isInformational ? 0 : passPoints,
      isInformational,
      observedValue: { ...observedValue, isClientRenderedSpa: true },
      evidenceSource: 'HTML_PARSER',
      evidenceLabel: 'AUTO_DETECTED',
      supportingDetail: `Client-rendered SPA shell detected; ${title.toLowerCase()} could not be reliably determined from static HTML. Deferred to human review.`,
    };
  }

  // Pure static HTML where absence is reliably confirmed
  return {
    category,
    checkKey,
    title,
    state: isInformational ? 'PASS' : 'FAIL', // Informational observations do not fail
    scoreContribution: 0,
    maxPoints: isInformational ? 0 : passPoints,
    isInformational,
    observedValue,
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: 'AUTO_DETECTED',
    supportingDetail: failDetail,
  };
}

function evaluateHostedProfileCheck(options: {
  found: boolean;
  passPoints: number;
  category: CategoryKey;
  checkKey: string;
  title: string;
  observedValue: Record<string, any>;
  passDetail: string;
  unknownDetail: string;
}): EvaluatedFinding {
  const { found, passPoints, category, checkKey, title, observedValue, passDetail, unknownDetail } =
    options;

  if (found) {
    return {
      category,
      checkKey,
      title,
      state: 'PASS',
      scoreContribution: passPoints,
      maxPoints: passPoints,
      observedValue,
      evidenceSource: 'HTML_PARSER',
      evidenceLabel: 'AUTO_DETECTED',
      supportingDetail: passDetail,
    };
  }

  return {
    category,
    checkKey,
    title,
    state: 'UNKNOWN',
    scoreContribution: 0,
    maxPoints: passPoints,
    observedValue,
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: 'AUTO_DETECTED',
    supportingDetail: unknownDetail,
  };
}

/**
 * Evaluates business-specific public signals on a third-party hosted profile
 * (e.g. Facebook business page, Google Business Profile, Instagram, Yelp)
 * without crediting or penalizing platform-owned technical infrastructure.
 */
export function runHostedProfileChecks(input: EvaluateInput): EvaluatedFinding[] {
  const { parsed, platform } = input;
  const platformLabel = platform?.platformLabel || 'hosted business profile';
  const findings: EvaluatedFinding[] = [];

  // 1. DIGITAL PRESENCE (100 Points)
  findings.push(
    evaluateHostedProfileCheck({
      found: Boolean(parsed.derivedBusinessName),
      passPoints: 35,
      category: 'digital_presence',
      checkKey: 'profile_business_name',
      title: 'Public Business Name Identified',
      observedValue: {
        derivedBusinessName: parsed.derivedBusinessName,
        platformKey: platform?.platformKey ?? null,
      },
      passDetail: `Public business name identified on ${platformLabel}: "${parsed.derivedBusinessName}".`,
      unknownDetail: `Could not confirm the public business name from static HTML on this ${platformLabel}. Todd & Noelah will verify the profile directly.`,
    })
  );

  const hasCategoryOrServices = Boolean(
    parsed.detectedProfileCategory ||
      parsed.detectedProfileDescription ||
      parsed.detectedMenuOrServices
  );
  const categoryOrDescTitle = parsed.detectedProfileCategory
    ? 'Business Category'
    : hasCategoryOrServices
    ? 'Business Description / Offerings Signal'
    : 'Business Category / Offerings Signal';
  const categoryOrDescDetail = parsed.detectedProfileCategory
    ? `Business category detected on ${platformLabel}: "${parsed.detectedProfileCategory}".`
    : parsed.detectedProfileDescription
    ? `Public description or offerings signal detected on ${platformLabel}: "${parsed.detectedProfileDescription}"${
        parsed.detectedProfileDescription.endsWith('…') ? '' : '.'
      }`
    : `Service or menu language detected on ${platformLabel}.`;

  findings.push(
    evaluateHostedProfileCheck({
      found: hasCategoryOrServices,
      passPoints: 35,
      category: 'digital_presence',
      checkKey: 'profile_category_or_services',
      title: categoryOrDescTitle,
      observedValue: {
        detectedProfileCategory: parsed.detectedProfileCategory,
        detectedProfileDescription: parsed.detectedProfileDescription,
        detectedMenuOrServices: parsed.detectedMenuOrServices,
      },
      passDetail: categoryOrDescDetail,
      unknownDetail: `Business category and service details were not visible in static HTML on this ${platformLabel}. Deferred to Todd & Noelah for human review.`,
    })
  );

  const externalSite = parsed.externalWebsiteLinks[0] || null;
  findings.push(
    evaluateHostedProfileCheck({
      found: Boolean(externalSite),
      passPoints: 30,
      category: 'digital_presence',
      checkKey: 'profile_external_website',
      title: 'Standalone Website Link',
      observedValue: {
        externalWebsiteLinks: parsed.externalWebsiteLinks,
      },
      passDetail: `Standalone website link detected on ${platformLabel}: ${externalSite}.`,
      unknownDetail: `Could not confirm from static HTML whether this ${platformLabel} links to a separate business website. Todd & Noelah will check whether a standalone website is linked or needed.`,
    })
  );

  // 2. CUSTOMER JOURNEY (100 Points)
  const contactItems = [
    ...parsed.telLinks,
    ...parsed.visiblePhoneNumbers,
    ...parsed.mailtoLinks,
  ];
  findings.push(
    evaluateHostedProfileCheck({
      found: contactItems.length > 0,
      passPoints: 40,
      category: 'customer_journey',
      checkKey: 'profile_phone_or_contact',
      title: 'Direct Phone or Contact Information',
      observedValue: {
        telLinks: parsed.telLinks,
        visiblePhoneNumbers: parsed.visiblePhoneNumbers,
        mailtoLinks: parsed.mailtoLinks,
      },
      passDetail: `Direct business contact information detected on ${platformLabel} (${contactItems[0]}).`,
      unknownDetail: `Phone number and direct contact fields are not exposed in static HTML on this ${platformLabel}. Todd & Noelah will verify whether customers can easily call or reach you.`,
    })
  );

  const hasActionCta =
    parsed.detectedCtaKeywords.length > 0 || parsed.detectedBookingSignals;
  findings.push(
    evaluateHostedProfileCheck({
      found: hasActionCta,
      passPoints: 30,
      category: 'customer_journey',
      checkKey: 'profile_action_cta',
      title: 'Call, Message, Order, or Booking Action',
      observedValue: {
        detectedCtaKeywords: parsed.detectedCtaKeywords,
        detectedBookingSignals: parsed.detectedBookingSignals,
      },
      passDetail: `Customer action or ordering callout detected on ${platformLabel}.`,
      unknownDetail: `Action buttons (such as Call, Message, Menu, or Order) on this ${platformLabel} require interactive browser review. Deferred to Todd & Noelah.`,
    })
  );

  findings.push(
    evaluateHostedProfileCheck({
      found: parsed.detectedHoursSignals.length > 0,
      passPoints: 30,
      category: 'customer_journey',
      checkKey: 'profile_hours_visible',
      title: 'Business Hours Visibility',
      observedValue: {
        detectedHoursSignals: parsed.detectedHoursSignals,
      },
      passDetail: `Business hours signal detected on ${platformLabel} (${parsed.detectedHoursSignals[0]}).`,
      unknownDetail: `Operating hours could not be verified from static HTML on this ${platformLabel}. Todd & Noelah will check if your hours are listed clearly and accurately.`,
    })
  );

  // 3. TRUST & REPUTATION (100 Points)
  findings.push(
    evaluateHostedProfileCheck({
      found: Boolean(parsed.detectedProfileActivity),
      passPoints: 50,
      category: 'trust_reputation',
      checkKey: 'profile_activity_signals',
      title: 'Public Page Activity & Audience Presence',
      observedValue: {
        detectedProfileActivity: parsed.detectedProfileActivity,
      },
      passDetail: `Public profile activity detected on ${platformLabel}: ${parsed.detectedProfileActivity}.`,
      unknownDetail: `Follower count, check-ins, and recent post activity could not be verified from static HTML on this ${platformLabel}. Deferred to human review.`,
    })
  );

  const hasReviewSignal =
    parsed.detectedRatingSignals.length > 0 || parsed.detectedReviewOrTestimonialKeywords;
  findings.push(
    evaluateHostedProfileCheck({
      found: hasReviewSignal,
      passPoints: 50,
      category: 'trust_reputation',
      checkKey: 'profile_reviews_presence',
      title: 'Customer Reviews & Recommendations',
      observedValue: {
        detectedRatingSignals: parsed.detectedRatingSignals,
        detectedReviewOrTestimonialKeywords: parsed.detectedReviewOrTestimonialKeywords,
      },
      passDetail: parsed.detectedRatingSignals[0]
        ? `Public rating or review signal detected on ${platformLabel} (${parsed.detectedRatingSignals[0]}).`
        : `Customer review or recommendation signal detected on ${platformLabel}.`,
      unknownDetail: `Customer reviews and ratings on this ${platformLabel} are loaded dynamically and require human review by Todd & Noelah.`,
    })
  );

  // 4. LOCAL DISCOVERY (100 Points)
  const locationText = parsed.derivedCityState || parsed.visibleAddressSignals[0] || null;
  findings.push(
    evaluateHostedProfileCheck({
      found: Boolean(locationText),
      passPoints: 100,
      category: 'local_discovery',
      checkKey: 'profile_location_signals',
      title: 'Location & Service Area Signals',
      observedValue: {
        derivedCityState: parsed.derivedCityState,
        visibleAddressSignals: parsed.visibleAddressSignals,
      },
      passDetail: `Business location signal identified on ${platformLabel}: ${locationText}.`,
      unknownDetail: `Address, city, and map pin details could not be confirmed from static HTML on this ${platformLabel}. Todd & Noelah will verify your local discovery setup.`,
    })
  );

  // 5. OPPORTUNITY CAPTURE (100 Points)
  findings.push(
    evaluateHostedProfileCheck({
      found: Boolean(parsed.hasLeadCaptureForm || externalSite),
      passPoints: 50,
      category: 'opportunity_capture',
      checkKey: 'profile_direct_lead_capture',
      title: 'Lead Capture Beyond Social Messaging',
      observedValue: {
        hasLeadCaptureForm: parsed.hasLeadCaptureForm,
        externalWebsiteLinks: parsed.externalWebsiteLinks,
      },
      passDetail: `External website or direct lead capture path linked from ${platformLabel}.`,
      unknownDetail: `Relying solely on a ${platformLabel} can make it harder to capture quotes or follow up outside the platform. Todd & Noelah will review how inquiries are captured.`,
    })
  );

  findings.push(
    evaluateHostedProfileCheck({
      found: false,
      passPoints: 50,
      category: 'opportunity_capture',
      checkKey: 'profile_response_handling',
      title: 'Inquiry & After-Hours Follow-Up Path',
      observedValue: {
        platformKey: platform?.platformKey ?? null,
      },
      passDetail: '',
      unknownDetail: `How messages, comments, and missed calls from this ${platformLabel} are handled requires human review by Todd & Noelah.`,
    })
  );

  return findings;
}

/**
 * Runs all deterministic checks against parsed HTML and raw page data.
 * Pure function: deterministic and repeatable.
 */
export function runDeterministicChecks(input: EvaluateInput): EvaluatedFinding[] {
  if (input.platform?.isHostedProfile) {
    return runHostedProfileChecks(input);
  }

  const { rawData, parsed, cityState } = input;
  const isSpa = parsed.isClientRenderedSpa;
  const findings: EvaluatedFinding[] = [];

  // ==========================================
  // 1. DIGITAL PRESENCE (20% Weight) - 100 Scored Points
  // ==========================================

  // Check 1: HTTPS (20 pts)
  const isHttps = rawData.isHttps;
  findings.push({
    category: 'digital_presence',
    checkKey: 'https_enabled',
    title: 'HTTPS / SSL Encryption',
    state: isHttps ? 'PASS' : 'FAIL',
    scoreContribution: isHttps ? 20 : 0,
    maxPoints: 20,
    observedValue: { isHttps, url: rawData.finalUrl },
    evidenceSource: 'HTTP_PROBE',
    evidenceLabel: 'AUTO_DETECTED',
    supportingDetail: isHttps 
      ? 'Website is securely delivered over HTTPS with active SSL encryption.' 
      : 'Website is delivered over unencrypted HTTP, triggering browser security warnings.',
  });

  // Check 2: Page Response (20 pts)
  const respondsOk = rawData.httpStatus >= 200 && rawData.httpStatus < 400;
  findings.push({
    category: 'digital_presence',
    checkKey: 'page_responds',
    title: 'Server Response & Accessibility',
    state: respondsOk ? 'PASS' : 'FAIL',
    scoreContribution: respondsOk ? 20 : 0,
    maxPoints: 20,
    observedValue: { status: rawData.httpStatus, responseTimeMs: rawData.responseTimeMs },
    evidenceSource: 'HTTP_PROBE',
    evidenceLabel: 'AUTO_DETECTED',
    supportingDetail: respondsOk
      ? `Server responded with HTTP ${rawData.httpStatus} in ${rawData.responseTimeMs}ms.`
      : `Server returned non-standard status code HTTP ${rawData.httpStatus}.`,
  });

  // Check 3: Mobile Viewport (20 pts)
  const hasViewport = Boolean(parsed.viewportMeta && parsed.viewportMeta.toLowerCase().includes('width=device-width'));
  findings.push({
    category: 'digital_presence',
    checkKey: 'mobile_viewport',
    title: 'Mobile Viewport Configuration',
    state: hasViewport ? 'PASS' : 'FAIL',
    scoreContribution: hasViewport ? 20 : 0,
    maxPoints: 20,
    observedValue: { viewportMeta: parsed.viewportMeta },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: 'AUTO_DETECTED',
    supportingDetail: hasViewport
      ? 'Responsive mobile viewport meta tag is properly configured.'
      : 'Missing mobile viewport meta tag; page may not scale naturally on mobile devices.',
  });

  // Check 4: Page Title (10 pts)
  const hasTitle = Boolean(parsed.title && parsed.title.trim().length > 3);
  findings.push({
    category: 'digital_presence',
    checkKey: 'has_title',
    title: 'Search Title Tag',
    state: hasTitle ? 'PASS' : 'FAIL',
    scoreContribution: hasTitle ? 10 : 0,
    maxPoints: 10,
    observedValue: { title: parsed.title },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: 'AUTO_DETECTED',
    supportingDetail: hasTitle
      ? `Search title detected: "${parsed.title}".`
      : 'Page is missing a descriptive HTML title tag.',
  });

  // Check 5: Meta Description (10 pts)
  const hasDesc = Boolean(parsed.metaDescription && parsed.metaDescription.trim().length > 10);
  findings.push({
    category: 'digital_presence',
    checkKey: 'meta_description',
    title: 'Meta Description',
    state: hasDesc ? 'PASS' : 'FAIL',
    scoreContribution: hasDesc ? 10 : 0,
    maxPoints: 10,
    observedValue: { metaDescription: parsed.metaDescription },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: 'AUTO_DETECTED',
    supportingDetail: hasDesc
      ? `Meta description detected (${parsed.metaDescription?.length} characters).`
      : 'Missing meta description for search engine result snippets.',
  });

  // Check 6: Favicon (10 pts)
  const hasFavicon = Boolean(parsed.faviconUrl);
  findings.push({
    category: 'digital_presence',
    checkKey: 'has_favicon',
    title: 'Browser Tab Icon (Favicon)',
    state: hasFavicon ? 'PASS' : 'FAIL',
    scoreContribution: hasFavicon ? 10 : 0,
    maxPoints: 10,
    observedValue: { faviconUrl: parsed.faviconUrl },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: 'AUTO_DETECTED',
    supportingDetail: hasFavicon
      ? `Favicon link detected (${parsed.faviconUrl}).`
      : 'No favicon tag detected in HTML header.',
  });

  // Check 7: OpenGraph Metadata (10 pts)
  const hasOg = Boolean(parsed.ogTags.title || parsed.ogTags.image);
  findings.push({
    category: 'digital_presence',
    checkKey: 'opengraph_presence',
    title: 'Social Share Preview (OpenGraph)',
    state: hasOg ? 'PASS' : 'FAIL',
    scoreContribution: hasOg ? 10 : 0,
    maxPoints: 10,
    observedValue: parsed.ogTags,
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: 'AUTO_DETECTED',
    supportingDetail: hasOg
      ? 'OpenGraph social preview metadata is configured for link sharing.'
      : 'Missing OpenGraph tags; links shared in text messages or social media will lack custom previews.',
  });

  // Check 8: Social Links (Informational - 0 pts)
  const hasSocial = parsed.socialLinks.length > 0;
  findings.push({
    category: 'digital_presence',
    checkKey: 'social_links',
    title: 'Active Social Profiles',
    state: 'PASS',
    scoreContribution: 0,
    maxPoints: 0,
    isInformational: true,
    observedValue: { platforms: parsed.socialLinks.map(s => s.platform) },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: hasSocial ? 'OPPORTUNITY_FOUND' : 'AUTO_DETECTED',
    supportingDetail: hasSocial
      ? `Connected social profiles found: ${parsed.socialLinks.map(s => s.platform).join(', ')}.`
      : 'No outbound links to business social profiles found on page (informational: social presence is optional).',
  });

  // ==========================================
  // 2. CUSTOMER JOURNEY (25% Weight) - 100 Scored Points
  // ==========================================

  // Check 1: Tap-to-Call Link (30 pts)
  const hasTel = parsed.telLinks.length > 0;
  findings.push(evaluateContentCheck({
    isSpa,
    found: hasTel,
    passPoints: 30,
    category: 'customer_journey',
    checkKey: 'has_tel_link',
    title: 'Mobile Tap-to-Call Link',
    observedValue: { telLinks: parsed.telLinks },
    passDetail: `Click-to-call link active (${parsed.telLinks[0]}); mobile users can dial with a single tap.`,
    failDetail: 'No click-to-call (tel:) links found; mobile users must copy-paste or manually dial.',
  }));

  // Check 2: Direct Inquiry or Contact Path (30 pts)
  const hasInquiryPath = parsed.hasLeadCaptureForm || parsed.hasForms || parsed.mailtoLinks.length > 0;
  findings.push(evaluateContentCheck({
    isSpa,
    found: hasInquiryPath,
    passPoints: 30,
    category: 'customer_journey',
    checkKey: 'inquiry_or_contact_path',
    title: 'Online Inquiry / Contact Path',
    observedValue: { hasForms: parsed.hasForms, hasLeadCaptureForm: parsed.hasLeadCaptureForm, mailtoLinks: parsed.mailtoLinks },
    passDetail: 'Direct inquiry path active (interactive contact form or direct mailto link).',
    failDetail: 'No online contact form or direct inquiry link detected on page.',
  }));

  // Check 3: Clear Action Callouts (CTAs) (20 pts)
  const hasCtas = parsed.detectedCtaKeywords.length > 0;
  findings.push(evaluateContentCheck({
    isSpa,
    found: hasCtas,
    passPoints: 20,
    category: 'customer_journey',
    checkKey: 'cta_keywords_found',
    title: 'Clear Action Callouts (CTAs)',
    observedValue: { ctaKeywords: parsed.detectedCtaKeywords },
    passDetail: `Action keywords detected: ${parsed.detectedCtaKeywords.slice(0, 4).join(', ')}.`,
    failDetail: 'No obvious conversion call-to-actions ("Call Now", "Get a Quote", "Book", "Contact") detected.',
  }));

  // Check 4: Service Offerings / Menu Visibility (20 pts)
  const hasMenuOrServices = parsed.detectedMenuOrServices;
  findings.push(evaluateContentCheck({
    isSpa,
    found: hasMenuOrServices,
    passPoints: 20,
    category: 'customer_journey',
    checkKey: 'menu_or_services',
    title: 'Service Offerings / Capabilities Breakdown',
    observedValue: { detectedMenuOrServices: hasMenuOrServices },
    passDetail: 'Visible services or capabilities breakdown found for prospective customers.',
    failDetail: 'No clear service list or capabilities headings identified on page.',
  }));

  // Check 5: Public Pricing (Informational - 0 pts)
  findings.push({
    category: 'customer_journey',
    checkKey: 'public_pricing_observed',
    title: 'Public Pricing Display',
    state: 'PASS',
    scoreContribution: 0,
    maxPoints: 0,
    isInformational: true,
    observedValue: { detectedPricingSignals: parsed.detectedPricingSignals },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: parsed.detectedPricingSignals ? 'OPPORTUNITY_FOUND' : 'AUTO_DETECTED',
    supportingDetail: parsed.detectedPricingSignals
      ? 'Public pricing or dollar rate signals detected on page.'
      : 'No public pricing detected (informational: pricing display is business-model dependent).',
  });

  // Check 6: Online Booking (Informational - 0 pts)
  findings.push({
    category: 'customer_journey',
    checkKey: 'online_booking_observed',
    title: 'Direct Online Scheduling / Booking Tool',
    state: 'PASS',
    scoreContribution: 0,
    maxPoints: 0,
    isInformational: true,
    observedValue: { detectedBookingSignals: parsed.detectedBookingSignals },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: parsed.detectedBookingSignals ? 'OPPORTUNITY_FOUND' : 'AUTO_DETECTED',
    supportingDetail: parsed.detectedBookingSignals
      ? 'Direct online scheduling or appointment tool detected (Calendly, Acuity, Square, or booking keywords).'
      : 'No automated online booking tool detected (informational: direct phone/form inquiry is standard).',
  });

  // ==========================================
  // 3. TRUST & REPUTATION (20% Weight) - 100 Scored Points
  // ==========================================

  // Check 1: Visible Business Phone Number (35 pts)
  const hasPhoneText = parsed.visiblePhoneNumbers.length > 0;
  findings.push(evaluateContentCheck({
    isSpa,
    found: hasPhoneText,
    passPoints: 35,
    category: 'trust_reputation',
    checkKey: 'phone_number_visible',
    title: 'Visible Business Phone Number',
    observedValue: { visiblePhoneNumbers: parsed.visiblePhoneNumbers },
    passDetail: `Readable phone number found in body text: ${parsed.visiblePhoneNumbers[0]}.`,
    failDetail: 'No standard 10-digit phone number found in page text.',
  }));

  // Check 2: Physical Address & Location Signals (35 pts)
  const hasAddress = parsed.visibleAddressSignals.length > 0;
  findings.push(evaluateContentCheck({
    isSpa,
    found: hasAddress,
    passPoints: 35,
    category: 'trust_reputation',
    checkKey: 'address_signals',
    title: 'Physical Address & Location Signals',
    observedValue: { visibleAddressSignals: parsed.visibleAddressSignals },
    passDetail: `Physical location signals detected: "${parsed.visibleAddressSignals[0]}".`,
    failDetail: 'No street address or postal location signals identified in text.',
  }));

  // Check 3: About Us & Ownership Background (15 pts)
  const hasAbout = parsed.detectedAboutOrTeamKeywords;
  findings.push(evaluateContentCheck({
    isSpa,
    found: hasAbout,
    passPoints: 15,
    category: 'trust_reputation',
    checkKey: 'about_team_signals',
    title: 'About Us & Ownership Background',
    observedValue: { detectedAboutOrTeamKeywords: hasAbout },
    passDetail: 'Owner, founder, or company story background detected.',
    failDetail: 'Missing personal story or team background establishing local credibility.',
  }));

  // Check 4: Privacy Policy & Terms Links (15 pts)
  const hasLegal = parsed.hasPrivacyOrTermsLink;
  findings.push(evaluateContentCheck({
    isSpa,
    found: hasLegal,
    passPoints: 15,
    category: 'trust_reputation',
    checkKey: 'terms_privacy',
    title: 'Privacy Policy & Terms of Service',
    observedValue: { hasPrivacyOrTermsLink: hasLegal },
    passDetail: 'Privacy policy or terms of service link present in navigation/footer.',
    failDetail: 'No privacy policy or terms link found; critical for compliance and digital ad channels.',
  }));

  // Check 5: Customer Reviews & Testimonials (Informational - 0 pts)
  const hasReviews = parsed.detectedReviewOrTestimonialKeywords;
  findings.push({
    category: 'trust_reputation',
    checkKey: 'reviews_testimonials',
    title: 'Customer Reviews & Testimonials',
    state: 'PASS',
    scoreContribution: 0,
    maxPoints: 0,
    isInformational: true,
    observedValue: { detectedReviewOrTestimonialKeywords: hasReviews },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: hasReviews ? 'OPPORTUNITY_FOUND' : 'AUTO_DETECTED',
    supportingDetail: hasReviews
      ? 'Customer reviews, ratings, or testimonial sections detected on site.'
      : 'No on-page customer reviews or testimonials detected (informational: many businesses host reviews primarily on Google or Yelp; deferred to operator review).',
  });

  // ==========================================
  // 4. LOCAL DISCOVERY (20% Weight) - 100 Scored Points
  // ==========================================

  // Check 1: Target City / Regional Mentions (40 pts)
  const effectiveCityState = (cityState || parsed.derivedCityState || '').trim();
  const targetCity = effectiveCityState.split(',')[0].trim().toLowerCase();
  const textLower = parsed.textSnippet.toLowerCase();
  const titleLower = (parsed.title || '').toLowerCase();

  if (targetCity.length <= 2) {
    findings.push({
      category: 'local_discovery',
      checkKey: 'city_state_match',
      title: 'Target City / Regional Mentions',
      state: 'UNKNOWN',
      scoreContribution: 0,
      maxPoints: 40,
      observedValue: { targetCity: null, matched: false, reason: 'CITY_NOT_SPECIFIED' },
      evidenceSource: 'HTML_PARSER',
      evidenceLabel: 'AUTO_DETECTED',
      supportingDetail: 'Target city not specified in URL-only scan; regional keyword check deferred to Todd & Noelah review.',
    });
  } else {
    const hasCityMatch = textLower.includes(targetCity) || titleLower.includes(targetCity);
    findings.push(evaluateContentCheck({
      isSpa,
      found: hasCityMatch,
      passPoints: 40,
      category: 'local_discovery',
      checkKey: 'city_state_match',
      title: 'Target City / Regional Mentions',
      observedValue: { targetCity, matched: hasCityMatch },
      passDetail: `Target city "${effectiveCityState}" mentioned prominently in page content or search title.`,
      failDetail: `Target city "${effectiveCityState}" not clearly identified in headline text or title tag.`,
    }));
  }

  // Check 2: Service Area Coverage Language (30 pts)
  const hasServiceArea = 
    textLower.includes('service area') ||
    textLower.includes('serving') ||
    textLower.includes('county') ||
    textLower.includes('counties') ||
    textLower.includes('surrounding areas');
  findings.push(evaluateContentCheck({
    isSpa,
    found: hasServiceArea,
    passPoints: 30,
    category: 'local_discovery',
    checkKey: 'service_area_language',
    title: 'Service Area Coverage Language',
    observedValue: { detectedServiceArea: hasServiceArea },
    passDetail: 'Clear service area / geographic territory coverage language found.',
    failDetail: 'No explicit service area coverage language found (e.g. "Serving [County/Area]").',
  }));

  // Check 3: Schema.org LocalBusiness Markup (30 pts)
  const hasLbSchema = parsed.hasLocalBusinessSchema;
  findings.push({
    category: 'local_discovery',
    checkKey: 'local_business_schema',
    title: 'Schema.org LocalBusiness Markup',
    state: hasLbSchema ? 'PASS' : 'FAIL',
    scoreContribution: hasLbSchema ? 30 : 0,
    maxPoints: 30,
    observedValue: { hasLocalBusinessSchema: hasLbSchema },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: 'AUTO_DETECTED',
    supportingDetail: hasLbSchema
      ? 'Schema.org LocalBusiness structured data present; search engines and AI can machine-read location.'
      : 'Missing LocalBusiness structured data; AI search engines must guess business category and location.',
  });

  // Check 4: Map Embed / Direction Links (Informational - 0 pts)
  const hasMap = parsed.hasMapEmbed;
  findings.push({
    category: 'local_discovery',
    checkKey: 'map_embed_present',
    title: 'Interactive Map / Directions Link',
    state: 'PASS',
    scoreContribution: 0,
    maxPoints: 0,
    isInformational: true,
    observedValue: { hasMapEmbed: hasMap },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: hasMap ? 'OPPORTUNITY_FOUND' : 'AUTO_DETECTED',
    supportingDetail: hasMap
      ? 'Google Maps embed or direct mapping link active.'
      : 'No interactive Google Maps embed detected (informational: service-area businesses often omit map embeds).',
  });

  // ==========================================
  // 5. OPPORTUNITY CAPTURE (15% Weight) - 100 Scored Points
  // ==========================================

  // Check 1: Direct Lead Capture Mechanism (50 pts)
  const hasLeadForm = parsed.hasLeadCaptureForm || parsed.hasForms;
  findings.push(evaluateContentCheck({
    isSpa,
    found: hasLeadForm,
    passPoints: 50,
    category: 'opportunity_capture',
    checkKey: 'lead_capture_form',
    title: 'Direct Lead Capture Mechanism',
    observedValue: { hasLeadCaptureForm: parsed.hasLeadCaptureForm, hasForms: parsed.hasForms },
    passDetail: 'Interactive form detected allowing 24/7 lead intake.',
    failDetail: 'Missing direct lead capture form; prospects cannot submit contact details online.',
  }));

  // Check 2: Quote, Estimate, or High-Ticket Path (50 pts)
  const hasQuotePath = parsed.detectedQuoteOrCateringKeywords || hasCtas;
  findings.push(evaluateContentCheck({
    isSpa,
    found: hasQuotePath,
    passPoints: 50,
    category: 'opportunity_capture',
    checkKey: 'quote_or_action_path',
    title: 'Quote, Estimate, or Action Path',
    observedValue: { detectedQuoteOrCateringKeywords: parsed.detectedQuoteOrCateringKeywords },
    passDetail: 'Dedicated quote, estimate, consultation, or commercial inquiry path identified.',
    failDetail: 'No dedicated path found for quote or high-ticket estimate requests.',
  }));

  // Check 3: Customer List & Email / Newsletter Signup (Informational - 0 pts)
  findings.push({
    category: 'opportunity_capture',
    checkKey: 'email_list_capture',
    title: 'Customer List & Email Signup',
    state: 'PASS',
    scoreContribution: 0,
    maxPoints: 0,
    isInformational: true,
    observedValue: { hasEmailNewsletterForm: parsed.hasEmailNewsletterForm },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: parsed.hasEmailNewsletterForm ? 'OPPORTUNITY_FOUND' : 'AUTO_DETECTED',
    supportingDetail: parsed.hasEmailNewsletterForm
      ? 'Dedicated email / VIP customer list capture mechanism detected.'
      : 'No newsletter/email list signup detected (informational: email list capture is optional and business-model dependent).',
  });

  // Check 4: Lead Magnet / Downloadable Resource (Informational - 0 pts)
  findings.push({
    category: 'opportunity_capture',
    checkKey: 'lead_magnet_observed',
    title: 'Lead Magnet / Downloadable Guide',
    state: 'PASS',
    scoreContribution: 0,
    maxPoints: 0,
    isInformational: true,
    observedValue: { detectedLeadMagnetSignals: parsed.detectedLeadMagnetSignals },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: parsed.detectedLeadMagnetSignals ? 'OPPORTUNITY_FOUND' : 'AUTO_DETECTED',
    supportingDetail: parsed.detectedLeadMagnetSignals
      ? 'Lead magnet, guide, or downloadable asset detected on page.'
      : 'No downloadable lead magnet detected (informational: optional marketing asset).',
  });

  // Check 5: After-Hours Messaging Safeguard (Informational - 0 pts)
  const hasAfterHours = parsed.detectedAfterHoursSignals;
  findings.push({
    category: 'opportunity_capture',
    checkKey: 'after_hours_messaging',
    title: 'After-Hours Messaging / Text Safeguard',
    state: 'PASS',
    scoreContribution: 0,
    maxPoints: 0,
    isInformational: true,
    observedValue: { detectedAfterHoursSignals: hasAfterHours },
    evidenceSource: 'HTML_PARSER',
    evidenceLabel: hasAfterHours ? 'OPPORTUNITY_FOUND' : 'AUTO_DETECTED',
    supportingDetail: hasAfterHours
      ? 'Text message (SMS), live chat, or 24/7 inquiry path detected.'
      : 'No after-hours messaging or instant text-back path observed (informational: potential growth opportunity for operator review).',
  });

  return findings;
}

/**
 * Builds graceful UNKNOWN findings when a target website cannot be fetched
 * (due to timeout, blocking, or bot protection).
 */
export function buildUnknownFindings(
  reason: string,
  platform?: PlatformClassification
): EvaluatedFinding[] {
  if (platform?.isHostedProfile) {
    const hostedChecks: {
      category: CategoryKey;
      checks: { key: string; title: string; maxPoints: number }[];
    }[] = [
      {
        category: 'digital_presence',
        checks: [
          { key: 'profile_business_name', title: 'Public Business Name Identified', maxPoints: 35 },
          { key: 'profile_category_or_services', title: 'Business Category / Offerings Signal', maxPoints: 35 },
          { key: 'profile_external_website', title: 'Standalone Website Link', maxPoints: 30 },
        ],
      },
      {
        category: 'customer_journey',
        checks: [
          { key: 'profile_phone_or_contact', title: 'Direct Phone or Contact Information', maxPoints: 40 },
          { key: 'profile_action_cta', title: 'Call, Message, Order, or Booking Action', maxPoints: 30 },
          { key: 'profile_hours_visible', title: 'Business Hours Visibility', maxPoints: 30 },
        ],
      },
      {
        category: 'trust_reputation',
        checks: [
          { key: 'profile_activity_signals', title: 'Public Page Activity & Audience Presence', maxPoints: 50 },
          { key: 'profile_reviews_presence', title: 'Customer Reviews & Recommendations', maxPoints: 50 },
        ],
      },
      {
        category: 'local_discovery',
        checks: [
          { key: 'profile_location_signals', title: 'Location & Service Area Signals', maxPoints: 100 },
        ],
      },
      {
        category: 'opportunity_capture',
        checks: [
          { key: 'profile_direct_lead_capture', title: 'Lead Capture Beyond Social Messaging', maxPoints: 50 },
          { key: 'profile_response_handling', title: 'Inquiry & After-Hours Follow-Up Path', maxPoints: 50 },
        ],
      },
    ];

    const results: EvaluatedFinding[] = [];
    for (const cat of hostedChecks) {
      for (const c of cat.checks) {
        results.push({
          category: cat.category,
          checkKey: c.key,
          title: c.title,
          state: 'UNKNOWN',
          scoreContribution: 0,
          maxPoints: c.maxPoints,
          observedValue: { status: 'SCAN_DEFERRED', reason, platformKey: platform.platformKey },
          evidenceSource: 'SYSTEM',
          evidenceLabel: 'AUTO_DETECTED',
          supportingDetail: `Check deferred to Todd & Noelah review: ${reason}`,
        });
      }
    }
    return results;
  }

  const categories: { 
    category: CategoryKey; 
    title: string; 
    checks: { key: string; title: string; maxPoints: number; isInformational?: boolean }[] 
  }[] = [
    {
      category: 'digital_presence',
      title: 'Digital Presence',
      checks: [
        { key: 'https_enabled', title: 'HTTPS / SSL Encryption', maxPoints: 20 },
        { key: 'page_responds', title: 'Server Response & Accessibility', maxPoints: 20 },
        { key: 'mobile_viewport', title: 'Mobile Viewport Configuration', maxPoints: 20 },
        { key: 'has_title', title: 'Search Title Tag', maxPoints: 10 },
        { key: 'meta_description', title: 'Meta Description', maxPoints: 10 },
        { key: 'has_favicon', title: 'Browser Tab Icon (Favicon)', maxPoints: 10 },
        { key: 'opengraph_presence', title: 'Social Share Preview (OpenGraph)', maxPoints: 10 },
        { key: 'social_links', title: 'Active Social Profiles', maxPoints: 0, isInformational: true },
      ]
    },
    {
      category: 'customer_journey',
      title: 'Customer Journey',
      checks: [
        { key: 'has_tel_link', title: 'Mobile Tap-to-Call Link', maxPoints: 30 },
        { key: 'inquiry_or_contact_path', title: 'Online Inquiry / Contact Path', maxPoints: 30 },
        { key: 'cta_keywords_found', title: 'Clear Action Callouts (CTAs)', maxPoints: 20 },
        { key: 'menu_or_services', title: 'Service Offerings / Capabilities Breakdown', maxPoints: 20 },
        { key: 'public_pricing_observed', title: 'Public Pricing Display', maxPoints: 0, isInformational: true },
        { key: 'online_booking_observed', title: 'Direct Online Scheduling / Booking Tool', maxPoints: 0, isInformational: true },
      ]
    },
    {
      category: 'trust_reputation',
      title: 'Trust & Reputation',
      checks: [
        { key: 'phone_number_visible', title: 'Visible Business Phone Number', maxPoints: 35 },
        { key: 'address_signals', title: 'Physical Address & Location Signals', maxPoints: 35 },
        { key: 'about_team_signals', title: 'About Us & Ownership Background', maxPoints: 15 },
        { key: 'terms_privacy', title: 'Privacy Policy & Terms of Service', maxPoints: 15 },
        { key: 'reviews_testimonials', title: 'Customer Reviews & Testimonials', maxPoints: 0, isInformational: true },
      ]
    },
    {
      category: 'local_discovery',
      title: 'Local Discovery',
      checks: [
        { key: 'city_state_match', title: 'Target City / Regional Mentions', maxPoints: 40 },
        { key: 'service_area_language', title: 'Service Area Coverage Language', maxPoints: 30 },
        { key: 'local_business_schema', title: 'Schema.org LocalBusiness Markup', maxPoints: 30 },
        { key: 'map_embed_present', title: 'Interactive Map / Directions Link', maxPoints: 0, isInformational: true },
      ]
    },
    {
      category: 'opportunity_capture',
      title: 'Opportunity Capture',
      checks: [
        { key: 'lead_capture_form', title: 'Direct Lead Capture Mechanism', maxPoints: 50 },
        { key: 'quote_or_action_path', title: 'Quote, Estimate, or Action Path', maxPoints: 50 },
        { key: 'email_list_capture', title: 'Customer List & Email Signup', maxPoints: 0, isInformational: true },
        { key: 'lead_magnet_observed', title: 'Lead Magnet / Downloadable Guide', maxPoints: 0, isInformational: true },
        { key: 'after_hours_messaging', title: 'After-Hours Messaging / Text Safeguard', maxPoints: 0, isInformational: true },
      ]
    }
  ];

  const results: EvaluatedFinding[] = [];

  for (const cat of categories) {
    for (const c of cat.checks) {
      results.push({
        category: cat.category,
        checkKey: c.key,
        title: c.title,
        state: 'UNKNOWN',
        scoreContribution: 0,
        maxPoints: c.maxPoints,
        isInformational: c.isInformational,
        observedValue: { status: 'SCAN_DEFERRED', reason },
        evidenceSource: 'SYSTEM',
        evidenceLabel: 'AUTO_DETECTED',
        supportingDetail: `Check deferred to Todd & Noelah review: ${reason}`,
      });
    }
  }

  return results;
}
