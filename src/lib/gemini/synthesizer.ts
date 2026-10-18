import { 
  RealityCheckReportContent, 
  HumanReviewOpportunity, 
  HumanReviewTopFix,
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
2. Never invent numbers, revenue impact, profit margins, conversion rates, customer acquisition costs (CAC), or search rankings.
3. Never invent competitor facts, reviews, star ratings, or customer complaints not present in the human review notes.
4. Never convert an observation into an unverified fact.
5. If evidence is missing, limited, or unknown, state that candidly.
6. The Top 3 Fixes and "What We Would NOT Spend Money On" MUST faithfully reflect Todd and Noelah's human review notes.

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
  "closingNote": "Warm, encouraging 2-3 sentence personal sign-off from Todd & Noelah"
}`;

/**
 * Builds the strict, labeled prompt containing the complete evidence package.
 */
export function buildEvidencePrompt(pkg: SynthesisEvidencePackage): string {
  const { business, scanner, ownerProvided, humanReview } = pkg;

  const autoDetectedSummary = scanner.findings.map(f => 
    `- [${f.state}] ${f.title} (${f.category}): ${f.supportingDetail || 'No detail'}`
  ).join('\n');

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
        `Opportunity ${i + 1} (${o.type}): ${o.title}\nDescription: ${o.description}\nSuggested Action: ${o.suggestedAction || 'N/A'}\nPotential Impact: ${o.potentialImpact || 'N/A'}`
      ).join('\n\n')
    : 'No explicit opportunities logged yet.';

  const topFixesSection = humanReview.topFixes.map(f => 
    `Priority ${f.priority}: ${f.title}\nWhy It Matters: ${f.whyItMatters}\nSuggested Action: ${f.suggestedAction}`
  ).join('\n\n');

  return `
EVIDENCE DOSSIER FOR: ${business.name}
Location: ${business.cityState}
Website: ${business.website}
Owner: ${business.ownerName}
Business Type: ${business.businessType || 'Small Business'}

--- [EVIDENCE SOURCE: AUTO_DETECTED] ---
Overall Automated Score: ${scanner.overallScore !== null ? `${scanner.overallScore}/100` : 'Withheld / Deferred for manual review'}
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
ANTI-HALLUCINATION RULES: Never invent numbers, revenue impact, profit margins, conversion rates, customer acquisition costs, or search rankings. Never invent competitor facts, reviews, star ratings, or customer complaints not present in the dossier. Say when evidence is incomplete.
Remember the voice of Todd & Noelah: clear, honest, practical, candid, and grounded solely in this evidence.
`;
}

/**
 * Deterministic fallback synthesis when API key is missing, or in test environments.
 */
export function generateDeterministicFallbackReport(pkg: SynthesisEvidencePackage): RealityCheckReportContent {
  const { business, scanner, ownerProvided, humanReview } = pkg;

  const scoreText = scanner.overallScore !== null 
    ? `an automated technical score of ${scanner.overallScore}/100` 
    : `a manual technical assessment (with automated scores deferred for coverage)`;

  const strengths: string[] = [];
  const passingChecks = scanner.findings.filter(f => f.state === 'PASS');
  if (passingChecks.length > 0) {
    passingChecks.slice(0, 3).forEach(c => strengths.push(c.title));
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
  if (humanReview.lostOpportunityHunt && humanReview.lostOpportunityHunt.trim().length > 0) {
    friction.push("Friction in inquiry handling and customer follow-up");
  }
  if (friction.length === 0) {
    friction.push("Opportunities to clarify customer contact paths and discovery");
  }

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
