import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AcquisitionPillar, ProspectSourceUrl } from '@/db/schema/acquisition';
import { sanitizePlainText } from '@/lib/security/public-guard';

export interface ProspectAiAssistInput {
  businessName: string;
  location: string;
  industry: string;
  websiteUrl?: string | null;
  sourceUrls?: ProspectSourceUrl[];
  researchNotes?: string | null;
  evidenceObservation?: string | null;
  decisionMakerName?: string | null;
}

export interface ProspectAiAssistOutput {
  organizedNotes: string;
  fitScore: number;
  fitExplanation: string;
  primaryPillar: AcquisitionPillar;
  evidenceObservation: string;
  outreachSubject: string;
  outreachDraft: string;
  assessmentStatus: 'UNVERIFIED_AI';
  draftStatus: 'AI_DRAFTED';
  modelUsed: string;
}

/**
 * Deterministic, honest fallback organizer/drafter used in tests or if Gemini is unavailable.
 * Never fabricates claims beyond what the operator provided in `input`.
 */
export function buildDeterministicProspectAssist(
  input: ProspectAiAssistInput
): ProspectAiAssistOutput {
  const business = sanitizePlainText(input.businessName, { maxLength: 160 }) || 'this business';
  const loc = sanitizePlainText(input.location, { maxLength: 120 }) || 'Southern Indiana / Louisville';
  const ind = sanitizePlainText(input.industry, { maxLength: 100 }) || 'Independent Business';
  const notes = sanitizePlainText(input.researchNotes, { maxLength: 2500, multiline: true }) || '';
  const obs =
    sanitizePlainText(input.evidenceObservation, { maxLength: 1000, multiline: true }) ||
    (notes
      ? notes.split(/\n+/)[0].slice(0, 280)
      : `Public presence reviewed for ${business} (${ind}, ${loc}); operator verification needed to confirm top Protect, Improve, Grow, or Save angle.`);

  const isLocal = /louisville|new albany|jeffersonville|clarksville|floyd|clark|indiana|kentucky|\bky\b|\bin\b/i.test(
    loc
  );
  const hasSources = Boolean((input.sourceUrls && input.sourceUrls.length > 0) || input.websiteUrl);
  const hasNotes = notes.length >= 25 || Boolean(input.evidenceObservation?.trim());

  let fitScore = 58;
  if (isLocal) fitScore += 14;
  if (hasSources) fitScore += 10;
  if (hasNotes) fitScore += 8;
  fitScore = Math.min(92, Math.max(35, fitScore));

  let primaryPillar: AcquisitionPillar = 'GROW';
  const combinedText = `${notes} ${obs}`.toLowerCase();
  if (/review|broken|outdated|mismatch|hours|risk|trust|complaint/.test(combinedText)) {
    primaryPillar = 'PROTECT';
  } else if (/supplier|vendor|cost|overpay|software|fee|expense/.test(combinedText)) {
    primaryPillar = 'SAVE';
  } else if (/mobile|checkout|booking|inquiry|conversion|follow-up|menu|page/.test(combinedText)) {
    primaryPillar = 'IMPROVE';
  }

  const greetingName = sanitizePlainText(input.decisionMakerName, { maxLength: 80 });
  const greeting = greetingName ? `Hi ${greetingName.split(' ')[0]},` : `Hi there,`;

  const sourceList = [
    ...(input.websiteUrl ? [`Website: ${input.websiteUrl}`] : []),
    ...(input.sourceUrls || []).map((s) => `${s.label}: ${s.url}`),
  ];

  const organizedNotes = [
    `Business: ${business} (${ind} — ${loc})`,
    sourceList.length > 0 ? `Public Sources Checked:\n- ${sourceList.join('\n- ')}` : 'Public Sources Checked: None attached yet',
    notes ? `Operator Notes:\n${notes}` : 'Operator Notes: Add specific public observations before approving outreach.',
  ].join('\n\n');

  const fitExplanation = `[UNVERIFIED AI ASSESSMENT] Estimated ${fitScore}/100 fit based on ${
    isLocal ? 'local Southern Indiana / Greater Louisville alignment' : 'independent small-business profile'
  }, ${hasSources ? 'documented public sources' : 'limited public source links'}, and ${primaryPillar} relevance. Requires Todd or Noelah's human verification before outreach.`;

  const outreachSubject = `Quick local note for ${business}`;
  const outreachDraft = `${greeting}

I'm reaching out from BaraTrust here in the Southern Indiana / Louisville area. While looking at ${business} from the outside in, one specific thing stood out: ${obs}

We run a straightforward ongoing watch service for independent businesses across Protect, Improve, Grow, and Save — and we're always happy to share what we spotted with zero pressure (or run a free public Reality Check first).

Would it be alright if I sent over the quick note on what we noticed, or set up a brief 15-minute intro chat?

Best,
Todd & Noelah
BaraTrust (baratrust.com)`;

  return {
    organizedNotes,
    fitScore,
    fitExplanation,
    primaryPillar,
    evidenceObservation: obs,
    outreachSubject,
    outreachDraft,
    assessmentStatus: 'UNVERIFIED_AI',
    draftStatus: 'AI_DRAFTED',
    modelUsed: 'deterministic-fallback',
  };
}

/**
 * Uses Gemini (when GEMINI_API_KEY is configured and not in test mode) to organize operator
 * research, assess fit with an explicit explanation, and draft a calm 1-to-1 outreach note.
 * All outputs remain explicitly marked `UNVERIFIED_AI` and `AI_DRAFTED` until human approval.
 */
export async function generateProspectAiAssist(
  input: ProspectAiAssistInput
): Promise<ProspectAiAssistOutput> {
  const isTest = process.env.NODE_ENV === 'test' || process.env.TEST_ENV === 'true';
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (isTest || !apiKey) {
    return buildDeterministicProspectAssist(input);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: `You assist Todd and Noelah at BaraTrust ("BaraTrust watches your business so you don't have to" — Protect, Improve, Grow, Save; based in Southern Indiana & Greater Louisville).
Rules:
1. NEVER invent facts, metrics, reviews, competitors, or observations not present in the provided input.
2. Healthy businesses can still be strong fits (especially for Grow and Save).
3. Draft a calm, plain-English, respectful 1-to-1 introductory email. No hype, no fake urgency, no consultant jargon, no manufactured problems.
4. Return ONLY valid JSON with keys:
{
  "organizedNotes": "string",
  "fitScore": number (0 to 100),
  "fitExplanation": "string (plain English why this score makes sense and what still needs human verification)",
  "primaryPillar": "PROTECT" | "IMPROVE" | "GROW" | "SAVE",
  "evidenceObservation": "string (specific observation grounded strictly in the provided notes/URLs)",
  "outreachSubject": "string",
  "outreachDraft": "string"
}`,
    });

    const promptPayload = JSON.stringify(
      {
        businessName: input.businessName,
        location: input.location,
        industry: input.industry,
        websiteUrl: input.websiteUrl || null,
        sourceUrls: input.sourceUrls || [],
        researchNotes: input.researchNotes || null,
        evidenceObservation: input.evidenceObservation || null,
        decisionMakerName: input.decisionMakerName || null,
      },
      null,
      2
    );

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptPayload }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(result.response.text());
    const fallback = buildDeterministicProspectAssist(input);

    const rawScore = Number(parsed.fitScore);
    const fitScore = Number.isFinite(rawScore)
      ? Math.min(100, Math.max(0, Math.round(rawScore)))
      : fallback.fitScore;

    const pillar: AcquisitionPillar = ['PROTECT', 'IMPROVE', 'GROW', 'SAVE'].includes(
      parsed.primaryPillar
    )
      ? parsed.primaryPillar
      : fallback.primaryPillar;

    const rawExplanation =
      sanitizePlainText(parsed.fitExplanation, { maxLength: 1800, multiline: true }) ||
      fallback.fitExplanation;

    return {
      organizedNotes:
        sanitizePlainText(parsed.organizedNotes, { maxLength: 4500, multiline: true }) ||
        fallback.organizedNotes,
      fitScore,
      fitExplanation: rawExplanation.startsWith('[UNVERIFIED AI')
        ? rawExplanation
        : `[UNVERIFIED AI ASSESSMENT] ${rawExplanation}`,
      primaryPillar: pillar,
      evidenceObservation:
        sanitizePlainText(parsed.evidenceObservation, { maxLength: 1800, multiline: true }) ||
        fallback.evidenceObservation,
      outreachSubject:
        sanitizePlainText(parsed.outreachSubject, { maxLength: 200 }) ||
        fallback.outreachSubject,
      outreachDraft:
        sanitizePlainText(parsed.outreachDraft, { maxLength: 3800, multiline: true }) ||
        fallback.outreachDraft,
      assessmentStatus: 'UNVERIFIED_AI',
      draftStatus: 'AI_DRAFTED',
      modelUsed: modelName,
    };
  } catch (err) {
    console.warn('[ACQUISITION_AI_ASSIST_FALLBACK]', err);
    return buildDeterministicProspectAssist(input);
  }
}
