import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are Todd Tebo, founder of BaraTrust. You are writing a monthly performance report for a local contractor (HVAC, Plumbing, etc.). 
Your voice is warm, honest, and plain-spoken. Talk like you're sitting at their kitchen table, not in a boardroom. 
No marketing jargon. Be direct and encouraging.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Calculate the change from last month for the AI context
    const callsThis = Number(body.callsThisMonth);
    const callsLast = Number(body.callsLastMonth);
    const diff = callsThis - callsLast;

    const userPrompt = `Write a monthly report for ${body.clientName} (${body.reportMonth} ${body.reportYear}).
    Tier: ${body.tier}
    Calls This Month: ${body.callsThisMonth} (Change: ${diff >= 0 ? "+" : ""}${diff})
    Guarantee Status: ${body.guaranteeCalls} of 10 leads found.
    Business Health Score: ${body.scoreThisMonth}/100
    Todd's Notes: ${body.whatWorked}
    
    Structure the report in these 5 sections:
    1. The Month in Plain English (Summary)
    2. What Worked and Why (The wins)
    3. What We Are Adjusting (Future plans)
    4. Your Guarantee Status (Honest look at the 10-call promise)
    5. Your Business Health Score (Explanation of the score)
    
    Close with a warm sentence and sign it 'Todd'. Keep it under 450 words.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: SYSTEM_PROMPT,
    });

    return NextResponse.json({ report: result.response.text() });
  } catch (error) {
    console.error("Monthly Report Gemini Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}