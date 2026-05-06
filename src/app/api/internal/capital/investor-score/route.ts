import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    totalScore: { type: SchemaType.NUMBER },
    dimensions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          score: { type: SchemaType.NUMBER },
          maxScore: { type: SchemaType.NUMBER },
          explanation: { type: SchemaType.STRING }
        },
        required: ["name", "score", "maxScore", "explanation"]
      }
    },
    interpretation: { type: SchemaType.STRING },
    biggestDrag: { type: SchemaType.STRING },
    biggestStrength: { type: SchemaType.STRING },
    recommendedFunding: { type: SchemaType.STRING },
    acquisitionNote: { type: SchemaType.STRING }, // Removed nullable for better compatibility
    summary: { type: SchemaType.STRING }
  },
  required: ["totalScore", "dimensions", "interpretation", "biggestDrag", "biggestStrength", "recommendedFunding", "summary"]
};

const SYSTEM_PROMPT = `You are a small business investor and M&A advisor with 20 years of experience evaluation local service businesses. Generate an honest Investor Readiness Score (0-100) as JSON.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        // 👇 The "Mushy Brain" Fix: Casting to any kills the TS error instantly
        responseSchema: schema as any, 
      }
    });

    const userPrompt = `Profile this BaraTrust client for investor readiness:
    Business: ${body.businessName}
    Industry: ${body.industry}
    Revenue: ${body.annualRevenue}
    SOPs: ${body.hasSOPs ? 'Yes' : 'No'}
    Dependency: ${body.ownerDependency}`;

    const result = await model.generateContent(userPrompt);
    const parsed = JSON.parse(result.response.text());

    return NextResponse.json({ result: parsed });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate investor score" }, 
      { status: 500 }
    );
  }
}