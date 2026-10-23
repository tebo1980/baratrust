import { 
  RealityCheckReportContent, 
  HumanReviewOpportunity, 
  HumanReviewTopFix,
  HumanIntelligenceLayer,
  HumanEvidenceCitation,
  OwnerQuestionnaireAnswers 
} from "@/db/schema/realityCheck";

export const DEFAULT_GEMINI_REPORT_MODEL = "gemini-1.5-pro";

export const SUPPORTED_GEMINI_MODELS = [
  "gemini-1.5-pro",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-2.5-pro",
] as const;

/**
 * Returns the configured Gemini model for report synthesis.
 * Defaults to 'gemini-1.5-pro' unless explicitly overridden by REALITY_CHECK_GEMINI_MODEL or GEMINI_MODEL.
 */
export function getReportSynthesisModel(): string {
  const configured = process.env.REALITY_CHECK_GEMINI_MODEL || process.env.GEMINI_MODEL;
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }
  return DEFAULT_GEMINI_REPORT_MODEL;
}

export const GEMINI_REPORT_MODEL = getReportSynthesisModel();

export interface SynthesisEvidencePackage {
  business: {
    name: string;
    website: string;
    cityState: string;
    ownerName: string;
    businessType?: string | null;
    primaryHeadache?: string | null;
  };
  scanner: {
    overallScore: number | null;
    coverage?: number;
    confidence?: string;
    findings: Array<{
      category: string;
      checkKey: string;
      title: string;
      state: string;
      scoreContribution: number;
      maxPoints: number;
      supportingDetail?: string | null;
    }>;
  };
  ownerProvided?: OwnerQuestionnaireAnswers | null;
  humanReview: {
    findabilityTest?: string | null;
    reputationSummary?: string | null;
    socialPresenceReview?: string | null;
    competitorComparison?: string | null;
    lostOpportunityHunt?: string | null;
    opportunitiesFound: HumanReviewOpportunity[];
    topFixes: HumanReviewTopFix[];
    notSpendMoneyOn?: string | null;
    toddNotes?: string | null;
    humanIntelligence?: HumanIntelligenceLayer | null;
  };
}

function formatEvidenceCitation(ev?: HumanEvidenceCitation | null): string {
  if (!ev) return '';
  const parts: string[] = [];
  if (ev.source?.trim()) parts.push(`Source: ${ev.source.trim()}`);
  if (ev.sourceUrl?.trim()) parts.push(`URL: ${ev.sourceUrl.trim()}`);
  if (ev.note?.trim()) parts.push(`Note: ${ev.note.trim()}`);
  if (ev.observedAt?.trim()) parts.push(`Observed: ${ev.observedAt.trim()}`);
  return parts.length > 0 ? `\nEvidence [${parts.join(' | ')}]` : '';
}

export function normalizeAdPresenceState(raw?: string | null): 'OBSERVED' | 'NOT_OBSERVED' | 'UNKNOWN' {
  if (raw === 'OBSERVED' || raw === 'YES') return 'OBSERVED';
  if (raw === 'NOT_OBSERVED' || raw === 'NO') return 'NOT_OBSERVED';
  return 'UNKNOWN';
}

export function sanitizeExternalEvidenceUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function filterClientVisibleEvidence(
  ev?: HumanEvidenceCitation | null
): HumanEvidenceCitation | null {
  if (!ev || ev.clientVisible !== true) return null;
  const source = ev.source?.trim() || undefined;
  const sourceUrl = sanitizeExternalEvidenceUrl(ev.sourceUrl);
  const note = ev.note?.trim() || undefined;
  if (!source && !sourceUrl && !note) return null;
  return {
    source,
    sourceUrl,
    note,
    observedAt: ev.observedAt?.trim() || undefined,
    clientVisible: true,
  };
}

/**
 * Produces a deep-cloned, immutable published snapshot that preserves only
 * explicitly client-visible evidence citations (stripping internal operator
 * research URLs/notes from the public snapshot while keeping them intact on the
 * internal human_reviews row).
 */
export function buildClientSafeFrozenSnapshot(input: {
  topFixes: HumanReviewTopFix[];
  opportunitiesFound: HumanReviewOpportunity[];
  humanIntelligence?: HumanIntelligenceLayer | null;
}): {
  frozenTopFixes: HumanReviewTopFix[];
  frozenOpportunities: HumanReviewOpportunity[];
  frozenHumanIntelligence: HumanIntelligenceLayer | null;
} {
  const clonedFixes: HumanReviewTopFix[] = JSON.parse(JSON.stringify(input.topFixes || []));
  const frozenTopFixes = clonedFixes.map((fix) => ({
    ...fix,
    evidence: filterClientVisibleEvidence(fix.evidence),
  }));

  const clonedOpps: HumanReviewOpportunity[] = JSON.parse(
    JSON.stringify(input.opportunitiesFound || [])
  );
  const frozenOpportunities = clonedOpps.map((opp) => ({
    ...opp,
    evidence: filterClientVisibleEvidence(opp.evidence),
  }));

  if (!input.humanIntelligence) {
    return {
      frozenTopFixes,
      frozenOpportunities,
      frozenHumanIntelligence: null,
    };
  }

  const clonedHi: HumanIntelligenceLayer = JSON.parse(
    JSON.stringify(input.humanIntelligence)
  );

  const frozenHumanIntelligence: HumanIntelligenceLayer = {
    brandReality: clonedHi.brandReality
      ? {
          ...clonedHi.brandReality,
          evidence: filterClientVisibleEvidence(clonedHi.brandReality.evidence),
        }
      : null,
    customerVoice: clonedHi.customerVoice
      ? {
          ...clonedHi.customerVoice,
          evidence: filterClientVisibleEvidence(clonedHi.customerVoice.evidence),
        }
      : null,
    advertisingFunnel: clonedHi.advertisingFunnel
      ? {
          ...clonedHi.advertisingFunnel,
          adPresence: normalizeAdPresenceState(clonedHi.advertisingFunnel.adPresence),
          evidence: filterClientVisibleEvidence(clonedHi.advertisingFunnel.evidence),
        }
      : null,
    ghostFootprint: (clonedHi.ghostFootprint || []).map((g) => {
      const isVisible = g.clientVisible === true;
      return {
        id: g.id,
        assetType: g.assetType,
        summary: g.summary,
        customerImpact: g.customerImpact,
        recommendedFix: g.recommendedFix,
        evidenceLabel: g.evidenceLabel || 'BARATRUST_REVIEW',
        ...(isVisible
          ? {
              source: g.source?.trim() || undefined,
              sourceUrl: sanitizeExternalEvidenceUrl(g.sourceUrl),
              evidenceNote: g.evidenceNote?.trim() || undefined,
              observedAt: g.observedAt?.trim() || undefined,
              clientVisible: true,
            }
          : {
              clientVisible: false,
            }),
      };
    }),
  };

  return {
    frozenTopFixes,
    frozenOpportunities,
    frozenHumanIntelligence,
  };
}

const SYSTEM_INSTRUCTION = `You are Todd and Noelah from BaraTrust, experienced small-business operations partners.
You are drafting a "BaraTrust Reality Check" report for a small business owner.

VOICE AND TONE:
- Warm, direct, plain-spoken, useful, candid, non-corporate, and respectful.
- You sound like an experienced operator sitting across the kitchen table or job trailer explaining what you found.
- You do NOT sound like an SEO agency pitch deck, an automated security audit, or generic corporate AI text.
- Never use buzzwords or hollow marketing jargon.
- Explain technical findings in practical business language (e.g. explain lack of LocalBusiness schema as "your website doesn't give Google and search engines a clean structured description of your business and hours").

STRICT EVIDENCE DISCIPLINE & ANTI-HALLUCINATION RULES:
1. Synthesize ONLY from the provided evidence.
2. Never invent numbers, revenue impact, profit margins, conversion rates, customer acquisition costs (CAC), exact lost revenue, competitor performance, or search rankings.
3. Never invent unsupported percentages or comparative claims (avoid statements like "Your website is better than 95% of local restaurants" unless real evidence in the dossier explicitly establishes that).
4. Never invent competitor facts, reviews, star ratings, or customer complaints not present in the human review notes.
5. Never convert an observation or UNKNOWN into an unverified fact. UNKNOWN must remain UNKNOWN.
6. If evidence is missing, limited, or unknown, state that candidly.
7. The Top 3 Fixes and "What We Would NOT Spend Money On" MUST faithfully reflect Todd and Noelah's human review notes.
8. Never equate 'NOT_OBSERVED' advertising presence with proof that the business never runs ads. Always frame 'NOT_OBSERVED' in evidence-safe terms (e.g., we did not observe active paid ads in the public ad libraries/channels checked during our review, which does not rule out private, seasonal, or offline campaigns). Also, no visible ads does NOT mean the business needs ads; a legitimate BaraTrust recommendation may be not to spend more on advertising until the customer journey is fixed.
9. For optional Human Intelligence report fields ("brandRealitySummary", "customerVoiceSummary", "advertisingFunnelSummary", "ghostFootprintSummary"), ONLY populate a field if meaningful evidence was recorded for that area in the dossier; otherwise return "" (empty string) rather than filler boilerplate.

OUTPUT FORMAT:
Return pure, valid JSON matching this schema:
{
  "executiveSummary": "2-3 plain-English paragraphs summarizing where the business stands and the biggest takeaway",
  "whatsWorking": ["3-5 specific strengths backed by evidence"],
  "whatsGettingInTheWay": ["3-5 clear friction points or leaks backed by evidence"],
  "topFixesSummary": "Plain-English introduction and synthesis of the top 3 priorities",
  "notWorthSpendingOnSummary": "Candid, prominent advice on what NOT to spend money on right now and why",
  "findabilitySummary": "Plain-English synthesis of the findability investigation",
  "reputationSummary": "Observations on public reviews and customer trust",
  "socialSummary": "Observations on social media activity and engagement",
  "competitorSummary": "Observations on key rivals and client advantages",
  "lostOpportunitySummary": "Analysis of missed calls, buried inquiries, or conversion leakage",
  "opportunitiesSummary": "Overview of the concrete growth opportunities identified",
  "brandRealitySummary": "Plain-English synthesis of brand reality, customer-vs-website alignment, and mystery-shop impression (or empty string if not recorded)",
  "customerVoiceSummary": "Plain-English synthesis of what customers love, recurring friction, and unpromoted strengths (or empty string if not recorded)",
  "advertisingFunnelSummary": "Plain-English synthesis of advertising presence, funnel quality, and honest ad recommendation (or empty string if not recorded)",
  "ghostFootprintSummary": "Plain-English synthesis of stale/legacy public assets competing with or confusing the current funnel (or empty string if not recorded)",
  "closingNote": "Warm, encouraging 2-3 sentence personal sign-off from Todd & Noelah"
}`;

/**
 * Builds the strict, labeled prompt containing the complete evidence package.
 */
export function buildEvidencePrompt(pkg: SynthesisEvidencePackage): string {
  const { business, scanner, ownerProvided, humanReview } = pkg;
  const hi = humanReview.humanIntelligence;

  const autoDetectedSummary = scanner.findings.map(f => {
    const isInformational = (f.maxPoints ?? 1) === 0;
    const isInfoObserved =
      isInformational &&
      f.state === 'PASS' &&
      !/^no\s/i.test((f.supportingDetail || '').trim());
    const stateLabel = isInformational
      ? isInfoObserved
        ? 'INFO_OBSERVED'
        : 'INFO_NOT_OBSERVED'
      : f.state;
    return `- [${stateLabel}] ${f.title} (${f.category}): ${f.supportingDetail || 'No detail'}`;
  }).join('\n');

  const ownerProvidedSection = ownerProvided ? `
- Where new customers come from: ${ownerProvided.customerAcquisition || 'Not stated'}
- Biggest problem: ${ownerProvided.biggestProblem || business.primaryHeadache || 'Not stated'}
- Missed inquiries / calls: ${ownerProvided.missedInquiries || 'Not stated'}
- Follow-up process: ${ownerProvided.followUpProcess || 'Not stated'}
- Current marketing spend: ${ownerProvided.currentMarketingSpend || 'Not stated'}
- Repetitive admin waste: ${ownerProvided.repetitiveAdminWaste || 'Not stated'}
- Target growth opportunity: ${ownerProvided.growthOpportunity || 'Not stated'}
- Free employee role: ${ownerProvided.freeEmployeeRole || 'Not stated'}
- Additional notes: ${ownerProvided.additionalNotes || 'None'}
` : 'Owner did not complete the optional questionnaire.';

  const opportunitiesSection = humanReview.opportunitiesFound.length > 0 
    ? humanReview.opportunitiesFound.map((o, i) => 
        `Opportunity ${i + 1} (${o.type}): ${o.title}\nDescription: ${o.description}\nSuggested Action: ${o.suggestedAction || 'N/A'}\nPotential Impact: ${o.potentialImpact || 'N/A'}${formatEvidenceCitation(o.evidence)}`
      ).join('\n\n')
    : 'No explicit opportunities logged yet.';

  const topFixesSection = humanReview.topFixes.map(f => 
    `Priority ${f.priority}: ${f.title}\nWhy It Matters: ${f.whyItMatters}\nSuggested Action: ${f.suggestedAction}${formatEvidenceCitation(f.evidence)}`
  ).join('\n\n');

  const br = hi?.brandReality;
  const hasBrandReality = Boolean(
    br &&
      (br.apparentBrandMessage?.trim() ||
        (br.messageClarity && br.messageClarity !== 'UNKNOWN') ||
        br.consistencyNotes?.trim() ||
        br.brandCustomerMismatch?.trim() ||
        br.strongestBrandOpportunity?.trim() ||
        br.mysteryShopImpression?.trim())
  );
  const brandRealitySection = hasBrandReality && br
    ? [
        br.apparentBrandMessage?.trim() ? `- Apparent Brand / Message: ${br.apparentBrandMessage.trim()}` : '',
        br.messageClarity ? `- Is Message Immediately Obvious?: ${br.messageClarity}` : '',
        br.consistencyNotes?.trim() ? `- Cross-Channel Consistency: ${br.consistencyNotes.trim()}` : '',
        br.brandCustomerMismatch?.trim() ? `- Brand vs. Customer Mismatch: ${br.brandCustomerMismatch.trim()}` : '',
        br.strongestBrandOpportunity?.trim() ? `- Strongest Brand Opportunity: ${br.strongestBrandOpportunity.trim()}` : '',
        br.mysteryShopImpression?.trim() ? `- Mystery-Shop Customer Judgment: ${br.mysteryShopImpression.trim()}` : '',
        formatEvidenceCitation(br.evidence).trim(),
      ]
        .filter(Boolean)
        .join('\n')
    : 'Not recorded.';

  const cv = hi?.customerVoice;
  const loves = (cv?.topLoves || []).map(s => s.trim()).filter(Boolean);
  const complaints = (cv?.topComplaints || []).map(s => s.trim()).filter(Boolean);
  const hasCustomerVoice = Boolean(
    cv &&
      (loves.length > 0 ||
        complaints.length > 0 ||
        cv.recurringThemes?.trim() ||
        cv.unmarketedStrengths?.trim())
  );
  const customerVoiceSection = hasCustomerVoice && cv
    ? [
        loves.length > 0 ? `- Top Things Customers Love: ${loves.join('; ')}` : '',
        complaints.length > 0 ? `- Recurring Complaints / Friction: ${complaints.join('; ')}` : '',
        cv.recurringThemes?.trim() ? `- Recurring Customer Themes: ${cv.recurringThemes.trim()}` : '',
        cv.unmarketedStrengths?.trim() ? `- Praised Strengths Barely Marketed: ${cv.unmarketedStrengths.trim()}` : '',
        formatEvidenceCitation(cv.evidence).trim(),
      ]
        .filter(Boolean)
        .join('\n')
    : 'Not recorded.';

  const af = hi?.advertisingFunnel;
  const normalizedAdPresence = normalizeAdPresenceState(af?.adPresence);
  const hasAdFunnel = Boolean(
    af &&
      (normalizedAdPresence !== 'UNKNOWN' ||
        af.platformsObserved?.trim() ||
        af.offerSummary?.trim() ||
        af.landingPageQuality?.trim() ||
        af.adToFunnelMismatch?.trim() ||
        (af.recommendation && af.recommendation !== 'UNKNOWN') ||
        af.recommendationNote?.trim())
  );
  const adPresencePromptLine =
    normalizedAdPresence === 'OBSERVED'
      ? '- Public Ad Evidence State: OBSERVED (Active paid ads observed in checked public channels)'
      : normalizedAdPresence === 'NOT_OBSERVED'
      ? '- Public Ad Evidence State: NOT_OBSERVED (No active paid ads were observed in the public channels/ad libraries checked during this review; do NOT claim the business never advertises anywhere)'
      : '- Public Ad Evidence State: UNKNOWN';
  const adFunnelSection = hasAdFunnel && af
    ? [
        adPresencePromptLine,
        af.platformsObserved?.trim() ? `- Channels / Platforms Checked or Observed: ${af.platformsObserved.trim()}` : '',
        af.offerSummary?.trim() ? `- Ad / Offer Summary: ${af.offerSummary.trim()}` : '',
        af.landingPageQuality?.trim() ? `- Landing Page / Destination Quality: ${af.landingPageQuality.trim()}` : '',
        af.adToFunnelMismatch?.trim() ? `- Ad-to-Funnel Mismatch: ${af.adToFunnelMismatch.trim()}` : '',
        af.recommendation ? `- Ad Recommendation: ${af.recommendation}` : '',
        af.recommendationNote?.trim() ? `- Recommendation Detail: ${af.recommendationNote.trim()}` : '',
        formatEvidenceCitation(af.evidence).trim(),
      ]
        .filter(Boolean)
        .join('\n')
    : 'Not recorded (Ad Presence: UNKNOWN).';

  const ghostItems = (hi?.ghostFootprint || []).filter(
    g => g.summary?.trim() || g.sourceUrl?.trim() || g.evidenceNote?.trim()
  );
  const ghostFootprintSection = ghostItems.length > 0
    ? ghostItems
        .map((g, i) => {
          const lines = [
            `Legacy Asset ${i + 1} (${g.assetType || 'Legacy Asset'}): ${g.summary || 'Stale public asset'}`,
          ];
          if (g.source?.trim()) lines.push(`  Source/Platform: ${g.source.trim()}`);
          if (g.sourceUrl?.trim()) lines.push(`  URL: ${g.sourceUrl.trim()}`);
          if (g.evidenceNote?.trim()) lines.push(`  Evidence Note: ${g.evidenceNote.trim()}`);
          if (g.customerImpact?.trim()) lines.push(`  Customer Impact: ${g.customerImpact.trim()}`);
          if (g.recommendedFix?.trim()) lines.push(`  Recommended Fix: ${g.recommendedFix.trim()}`);
          if (g.observedAt?.trim()) lines.push(`  Observed Date: ${g.observedAt.trim()}`);
          return lines.join('\n');
        })
        .join('\n\n')
    : 'No stale or legacy public assets logged.';

  return `
EVIDENCE DOSSIER FOR: ${business.name}
Location: ${business.cityState}
Website: ${business.website}
Owner: ${business.ownerName}
Business Type: ${business.businessType || 'Small Business'}

--- [EVIDENCE SOURCE: AUTO_DETECTED] ---
Overall Automated Score: ${
  scanner.overallScore !== null
    ? scanner.coverage !== null && scanner.coverage !== undefined && scanner.coverage < 100
      ? `${scanner.overallScore}/100 on evaluated static signals (${scanner.coverage}% observable coverage)`
      : `${scanner.overallScore}/100`
    : 'Withheld / Deferred for manual review'
}
Coverage: ${scanner.coverage ?? 'N/A'}% (${scanner.confidence || 'PROVISIONAL'})
Technical Findings:
${autoDetectedSummary || 'No automated findings available.'}

--- [EVIDENCE SOURCE: OWNER_PROVIDED] ---
${ownerProvidedSection}

--- [EVIDENCE SOURCE: BARATRUST_REVIEW (TODD & NOELAH JUDGMENT)] ---
Findability Test:
${humanReview.findabilityTest || 'Not yet recorded.'}

Reputation Summary:
${humanReview.reputationSummary || 'Not yet recorded.'}

Social Presence Review:
${humanReview.socialPresenceReview || 'Not yet recorded.'}

Competitor Comparison:
${humanReview.competitorComparison || 'Not yet recorded.'}

Lost Opportunity Hunt (Friction & Leakage):
${humanReview.lostOpportunityHunt || 'Not yet recorded.'}

Brand Reality & Mystery-Shop Judgment:
${brandRealitySection}

Customer Voice / Review Intelligence:
${customerVoiceSection}

Advertising Presence & Funnel:
${adFunnelSection}

Ghost Footprint / Legacy Assets:
${ghostFootprintSection}

Top 3 Things We Would Fix First:
${topFixesSection || 'Not yet recorded.'}

What We Would NOT Spend Money On (Candid Advice):
${humanReview.notSpendMoneyOn || 'Not yet recorded.'}

Final Human Notes:
${humanReview.toddNotes || 'Not yet recorded.'}

--- [EVIDENCE SOURCE: OPPORTUNITY_FOUND] ---
${opportunitiesSection}

INSTRUCTIONS FOR GEMINI:
Draft a complete, structured Reality Check report strictly matching the JSON schema.
ANTI-HALLUCINATION RULES: Never invent numbers, revenue impact, profit margins, conversion rates, customer acquisition costs, exact lost revenue, competitor performance, unsupported percentages, or search rankings. Never invent competitor facts, reviews, star ratings, or customer complaints not present in the dossier. Say when evidence is incomplete, and keep UNKNOWN as UNKNOWN.
Remember the voice of Todd & Noelah: clear, honest, practical, candid, and grounded solely in this evidence.
`;
}

/**
 * Synthesizes concise, non-boilerplate Human Intelligence section summaries when evidence exists.
 */
export function buildHumanIntelligenceFallbackSummaries(
  hi?: HumanIntelligenceLayer | null
): {
  brandRealitySummary: string;
  customerVoiceSummary: string;
  advertisingFunnelSummary: string;
  ghostFootprintSummary: string;
} {
  if (!hi) {
    return {
      brandRealitySummary: '',
      customerVoiceSummary: '',
      advertisingFunnelSummary: '',
      ghostFootprintSummary: '',
    };
  }

  // 1. Brand Reality
  const br = hi.brandReality;
  const brParts: string[] = [];
  if (br?.apparentBrandMessage?.trim()) {
    const clarityNote =
      br.messageClarity === 'OBVIOUS'
        ? 'which comes across clearly at first glance'
        : br.messageClarity === 'SOMEWHAT_CLEAR'
        ? 'though a first-time visitor has to look around to piece it together'
        : br.messageClarity === 'UNCLEAR'
        ? 'but that message is not immediately obvious to a first-time visitor'
        : '';
    brParts.push(
      `First impression: ${br.apparentBrandMessage.trim()}${clarityNote ? ` (${clarityNote})` : ''}.`
    );
  }
  if (br?.brandCustomerMismatch?.trim()) {
    brParts.push(br.brandCustomerMismatch.trim());
  }
  if (br?.consistencyNotes?.trim()) {
    brParts.push(br.consistencyNotes.trim());
  }
  if (br?.mysteryShopImpression?.trim()) {
    brParts.push(br.mysteryShopImpression.trim());
  }
  if (br?.strongestBrandOpportunity?.trim()) {
    brParts.push(`Strongest brand opportunity: ${br.strongestBrandOpportunity.trim()}`);
  }

  // 2. Customer Voice
  const cv = hi.customerVoice;
  const cvParts: string[] = [];
  const loves = (cv?.topLoves || []).map(s => s.trim()).filter(Boolean);
  const complaints = (cv?.topComplaints || []).map(s => s.trim()).filter(Boolean);
  if (loves.length > 0) {
    cvParts.push(`What customers consistently praise: ${loves.join('; ')}.`);
  }
  if (complaints.length > 0) {
    cvParts.push(`Where customers run into friction: ${complaints.join('; ')}.`);
  }
  if (cv?.recurringThemes?.trim()) {
    cvParts.push(cv.recurringThemes.trim());
  }
  if (cv?.unmarketedStrengths?.trim()) {
    cvParts.push(`Hidden strength customers love that is barely marketed: ${cv.unmarketedStrengths.trim()}`);
  }

  // 3. Advertising Presence & Funnel
  const af = hi.advertisingFunnel;
  const normalizedAdPresence = normalizeAdPresenceState(af?.adPresence);
  const afParts: string[] = [];
  const hasMeaningfulAdEvidence = Boolean(
    af &&
      (normalizedAdPresence !== 'UNKNOWN' ||
        af.platformsObserved?.trim() ||
        af.offerSummary?.trim() ||
        af.landingPageQuality?.trim() ||
        af.adToFunnelMismatch?.trim() ||
        (af.recommendation && af.recommendation !== 'UNKNOWN') ||
        af.recommendationNote?.trim())
  );
  if (hasMeaningfulAdEvidence && af) {
    if (normalizedAdPresence === 'OBSERVED') {
      afParts.push(
        `Active advertising was observed${af.platformsObserved?.trim() ? ` on ${af.platformsObserved.trim()}` : ''}${
          af.offerSummary?.trim() ? ` (${af.offerSummary.trim()})` : ''
        }.`
      );
    } else if (normalizedAdPresence === 'NOT_OBSERVED') {
      afParts.push(
        `We did not observe active paid ads in the public channels${
          af.platformsObserved?.trim() ? ` (${af.platformsObserved.trim()})` : ''
        } checked during our review.`
      );
    }
    if (af.landingPageQuality?.trim()) {
      afParts.push(af.landingPageQuality.trim());
    }
    if (af.adToFunnelMismatch?.trim()) {
      afParts.push(`Funnel mismatch: ${af.adToFunnelMismatch.trim()}`);
    }
    if (af.recommendationNote?.trim()) {
      afParts.push(af.recommendationNote.trim());
    } else if (af.recommendation === 'IMPROVE_FUNNEL_FIRST') {
      afParts.push('Recommendation: Improve the customer journey and inquiry capture before spending on ads.');
    } else if (af.recommendation === 'DEPRIORITIZE_ADS') {
      afParts.push('Recommendation: Deprioritize paid ads right now and focus on organic conversion and follow-up.');
    } else if (af.recommendation === 'CONTINUE') {
      afParts.push('Recommendation: Current ad path aligns well with the landing experience.');
    }
  }

  // 4. Ghost Footprint / Legacy Assets
  const ghostItems = (hi.ghostFootprint || []).filter(
    g => g.summary?.trim() || g.sourceUrl?.trim() || g.evidenceNote?.trim()
  );
  const ghostParts: string[] = [];
  if (ghostItems.length > 0) {
    ghostItems.forEach((g) => {
      const sourceLabel = g.clientVisible === true && g.source?.trim() ? ` (found via ${g.source.trim()})` : '';
      const detail = g.clientVisible === true && g.evidenceNote?.trim() ? ` — ${g.evidenceNote.trim()}` : '';
      const prefix = g.assetType && g.summary?.trim() ? `${g.assetType}: ` : '';
      ghostParts.push(`${prefix}${g.summary?.trim() || g.assetType}${sourceLabel}${detail}`);
    });
  }

  return {
    brandRealitySummary: brParts.join(' '),
    customerVoiceSummary: cvParts.join(' '),
    advertisingFunnelSummary: afParts.join(' '),
    ghostFootprintSummary: ghostParts.join(' '),
  };
}

/**
 * Deterministic fallback synthesis when API key is missing, or in test environments.
 */
export function generateDeterministicFallbackReport(pkg: SynthesisEvidencePackage): RealityCheckReportContent {
  const { business, scanner, humanReview } = pkg;
  const hi = humanReview.humanIntelligence;

  const scoreText = scanner.overallScore !== null 
    ? (scanner.coverage !== null && scanner.coverage !== undefined && scanner.coverage < 100
        ? `an automated technical score of ${scanner.overallScore}/100 on evaluated static signals (${scanner.coverage}% observable coverage)`
        : `an automated technical score of ${scanner.overallScore}/100`)
    : `a manual technical assessment (with automated scores deferred for coverage)`;

  const strengths: string[] = [];
  const passingChecks = scanner.findings.filter(
    f =>
      f.state === 'PASS' &&
      ((f.maxPoints ?? 1) > 0 || !/^no\s/i.test((f.supportingDetail || '').trim()))
  );
  if (passingChecks.length > 0) {
    passingChecks.slice(0, 3).forEach(c => strengths.push(c.title));
  }
  const loves = (hi?.customerVoice?.topLoves || []).map(s => s.trim()).filter(Boolean);
  if (loves.length > 0) {
    strengths.push(`Customer favorite: ${loves[0]}`);
  }
  if (humanReview.reputationSummary && humanReview.reputationSummary.trim().length > 0) {
    strengths.push("Established local customer reputation and direct business trust");
  }
  if (strengths.length === 0) {
    strengths.push("Core operating business with active customer demand");
  }

  const friction: string[] = [];
  const failingChecks = scanner.findings.filter(f => f.state === 'FAIL');
  if (failingChecks.length > 0) {
    failingChecks.slice(0, 3).forEach(c => friction.push(c.title));
  }
  const ghostItems = (hi?.ghostFootprint || []).filter(g => g.summary?.trim());
  if (ghostItems.length > 0) {
    friction.push(`Legacy asset confusion: ${ghostItems[0].summary.trim()}`);
  }
  if (hi?.brandReality?.brandCustomerMismatch?.trim()) {
    friction.push(hi.brandReality.brandCustomerMismatch.trim());
  }
  if (humanReview.lostOpportunityHunt && humanReview.lostOpportunityHunt.trim().length > 0) {
    friction.push("Friction in inquiry handling and customer follow-up");
  }
  if (friction.length === 0) {
    friction.push("Opportunities to clarify customer contact paths and discovery");
  }

  const hiSummaries = buildHumanIntelligenceFallbackSummaries(hi);

  return {
    executiveSummary: `We ran our Business Reality Check for ${business.name} in ${business.cityState}, looking at both your website health (${scoreText}) and how easily local customers can actually find and hire you. Overall, you have a solid foundation, but there are a few practical friction points that are making it harder than necessary for new customers to reach you and for you to capture every inquiry.`,
    whatsWorking: strengths,
    whatsGettingInTheWay: friction,
    topFixesSummary: `Based on our hands-on review, we identified three immediate priorities. If you only tackle three things over the next thirty days, these are the ones that will have the biggest direct impact on your customer flow:`,
    notWorthSpendingOnSummary: humanReview.notSpendMoneyOn || `Right now, we would not recommend spending money on a full website redesign or high-cost ad campaigns until your baseline customer response and local listings are dialed in.`,
    findabilitySummary: humanReview.findabilityTest || `When local customers search for your services in ${business.cityState}, there are clear opportunities to improve your ranking against local competitors.`,
    reputationSummary: humanReview.reputationSummary || `Your existing customer base speaks well of your work. Active management and responding to reviews will protect this advantage.`,
    socialSummary: humanReview.socialPresenceReview || `Your social channels provide an opportunity to show real-world completed work and stay top-of-mind locally.`,
    competitorSummary: humanReview.competitorComparison || `Local rivals are active in search, but your direct personal service and reputation give you a strong authentic edge.`,
    lostOpportunitySummary: humanReview.lostOpportunityHunt || `Inquiry leakage often happens when calls go unanswered or quote forms are hard to complete on mobile devices.`,
    opportunitiesSummary: humanReview.opportunitiesFound.length > 0
      ? `We identified ${humanReview.opportunitiesFound.length} specific growth opportunities that could bring in high-margin or recurring revenue without requiring extra overhead.`
      : `We identified clear opportunities to expand customer volume and streamline operations.`,
    brandRealitySummary: hiSummaries.brandRealitySummary,
    customerVoiceSummary: hiSummaries.customerVoiceSummary,
    advertisingFunnelSummary: hiSummaries.advertisingFunnelSummary,
    ghostFootprintSummary: hiSummaries.ghostFootprintSummary,
    closingNote: `We hope this Reality Check gives you a clear, objective look at your business from the outside in. If you want a hand knocking any of these items out, let us know. If you prefer to handle them yourself, the plan is entirely yours. — Todd & Noelah`,
  };
}

/**
 * Synthesizes the Reality Check report using Gemini, with full validation and fallback.
 */
export async function synthesizeReportWithGemini(
  pkg: SynthesisEvidencePackage
): Promise<{
  report: RealityCheckReportContent;
  modelUsed: string;
  generatedAt: string;
}> {
  const generatedAt = new Date().toISOString();
  const activeModel = getReportSynthesisModel();

  // In test environment or when GEMINI_API_KEY is not set, use deterministic fallback
  if (
    process.env.NODE_ENV === "test" ||
    process.env.TEST_ENV === "true" ||
    !process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY.includes("dummy")
  ) {
    return {
      report: generateDeterministicFallbackReport(pkg),
      modelUsed: `${activeModel} (deterministic-fallback)`,
      generatedAt,
    };
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const prompt = buildEvidencePrompt(pkg);

  try {
    const model = genAI.getGenerativeModel({
      model: activeModel,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as RealityCheckReportContent;

    // Validate that required fields are present
    if (!parsed.executiveSummary || !parsed.topFixesSummary || !parsed.notWorthSpendingOnSummary) {
      throw new Error("Gemini output missing core required sections");
    }

    const hiFallbacks = buildHumanIntelligenceFallbackSummaries(pkg.humanReview.humanIntelligence);

    return {
      report: {
        executiveSummary: parsed.executiveSummary || "",
        whatsWorking: Array.isArray(parsed.whatsWorking) ? parsed.whatsWorking : [parsed.whatsWorking].filter(Boolean),
        whatsGettingInTheWay: Array.isArray(parsed.whatsGettingInTheWay) ? parsed.whatsGettingInTheWay : [parsed.whatsGettingInTheWay].filter(Boolean),
        topFixesSummary: parsed.topFixesSummary || "",
        notWorthSpendingOnSummary: parsed.notWorthSpendingOnSummary || "",
        findabilitySummary: parsed.findabilitySummary || "",
        reputationSummary: parsed.reputationSummary || "",
        socialSummary: parsed.socialSummary || "",
        competitorSummary: parsed.competitorSummary || "",
        lostOpportunitySummary: parsed.lostOpportunitySummary || "",
        opportunitiesSummary: parsed.opportunitiesSummary || "",
        // A model response cannot introduce an optional section without recorded evidence.
        brandRealitySummary: hiFallbacks.brandRealitySummary ? parsed.brandRealitySummary || hiFallbacks.brandRealitySummary : "",
        customerVoiceSummary: hiFallbacks.customerVoiceSummary ? parsed.customerVoiceSummary || hiFallbacks.customerVoiceSummary : "",
        advertisingFunnelSummary: hiFallbacks.advertisingFunnelSummary ? parsed.advertisingFunnelSummary || hiFallbacks.advertisingFunnelSummary : "",
        ghostFootprintSummary: hiFallbacks.ghostFootprintSummary ? parsed.ghostFootprintSummary || hiFallbacks.ghostFootprintSummary : "",
        closingNote: parsed.closingNote || "",
      },
      modelUsed: activeModel,
      generatedAt,
    };
  } catch (err: any) {
    console.warn(`[GEMINI SYNTHESIS WARNING] Fallback used due to: ${err.message}`);
    return {
      report: generateDeterministicFallbackReport(pkg),
      modelUsed: `${activeModel} (fallback: ${err.message})`,
      generatedAt,
    };
  }
}
