import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `You are a Capital Strategist for a local trade business. 
    Business: ${body.businessName}
    Industry: ${body.industry}
    Current Revenue: ${body.revenue}
    Goal: ${body.fundingGoal} (e.g., New Equipment, Hiring, Expansion)
    
    Provide a 3-step capital strategy including:
    1. Immediate Funding Options (Grants/SBA/Lines of Credit)
    2. Operational Adjustments (How to increase cash flow now)
    3. Long-term Value Building (Preparing for a future exit or large loan)
    
    Keep the tone professional, encouraging, and highly practical.`;

    const result = await model.generateContent(prompt);
    return NextResponse.json({ strategy: result.response.text() });
  } catch (error) {
    console.error("Gemini Strategy Error:", error);
    return NextResponse.json({ error: "Failed to generate strategy" }, { status: 500 });
  }
}