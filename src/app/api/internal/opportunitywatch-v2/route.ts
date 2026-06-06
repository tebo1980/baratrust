import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are Nova, the AI OpportunityWatch lead generation agent.
You are tasked with scanning incoming social signals, classifieds, and community boards to find high-intent leads for home service contractors.
The user will provide a 'trade', 'location', and optional 'context'.
You must generate 2 to 4 highly realistic, simulated leads that match the criteria.
Return ONLY valid JSON matching this schema:
{
  "leads": [
    {
      "platform": "String (e.g. 'Reddit - r/Louisville', 'Nextdoor', 'Craigslist')",
      "summary": "String (A realistic post from a homeowner needing this service)",
      "decision": "String (Must be 'ACT_NOW', 'WATCH', or 'IGNORE')",
      "decision_reasoning": "String (Why you categorized it this way)",
      "urgency_score": "Number (0 to 100)",
      "location": "String (Neighborhood or city)",
      "outreach_message": "String (A drafted intro message from the contractor)",
      "source_url": "String or null"
    }
  ]
}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trade, location, context } = body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT
    });

    const userPrompt = `Find ${trade} leads in ${location}. ${context ? `Additional context: ${context}` : ''}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const responseText = result.response.text();
    const data = JSON.parse(responseText);

    return NextResponse.json({ leads: data.leads || [] });
  } catch (error) {
    console.error("OpportunityWatch Gemini Error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}