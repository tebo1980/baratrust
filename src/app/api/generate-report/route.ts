import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are Todd Tebo, founder of BaraTrust, writing a monthly performance report for a local service business client. Your voice is warm, honest, plain spoken, and conversational. You never use marketing jargon. You explain things like you are talking to a contractor at his kitchen table, not a marketing executive in a boardroom. You are direct, encouraging, and always honest even when results are mixed.`;

interface ReportFormData {
  clientName: string;
  reportMonth: string;
  reportYear: string;
  tier: string;
  callsThisMonth: string;
  callsLastMonth: string;
  guaranteeCalls: string;
  daysRemaining: string;
  topCallSource: string;
  fbAdSpend: string;
  googleAdSpend: string | null;
  costPerCall: string;
  bestAd: string | null;
  scoreThisMonth: string;
  scoreLastMonth: string;
  weakestCategory: string;
  whatWorked: string;
  challenges: string | null;
  toddNotes: string | null;
}

function buildUserPrompt(d: ReportFormData): string {
  const callsThis = Number(d.callsThisMonth);
  const callsLast = Number(d.callsLastMonth);
  const diff = callsThis - callsLast;
  const pct = callsLast > 0 ? ((diff / callsLast) * 100).toFixed(1) : "N/A";

  let prompt = `Write a complete monthly performance report for ${d.clientName} covering ${d.reportMonth} ${d.reportYear}. They are on the BaraTrust ${d.tier} plan.

Here are their numbers this month:
Total calls: ${d.callsThisMonth}
Calls last month: ${d.callsLastMonth}
Change: ${diff >= 0 ? "+" : ""}${diff} calls (${pct}%)
Guarantee calls to date: ${d.guaranteeCalls} of 10
Days remaining in guarantee: ${d.daysRemaining}
Top call source: ${d.topCallSource}

Facebook ad spend: $${d.fbAdSpend}\n`;

  if (d.googleAdSpend) {
    prompt += `Google ad spend: $${d.googleAdSpend}\n`;
  }

  prompt += `Cost per call: $${d.costPerCall}\n`;

  if (d.bestAd) {
    prompt += `Best performing ad: ${d.bestAd}\n`;
  }

  prompt += `
Business Health Score this month: ${d.scoreThisMonth} out of 100
Business Health Score last month: ${d.scoreLastMonth} out of 100
Weakest category: ${d.weakestCategory}

Context from Todd:
What worked well: ${d.whatWorked}\n`;

  if (d.challenges) {
    prompt += `Challenges: ${d.challenges}\n`;
  }

  if (d.toddNotes) {
    prompt += `Additional notes: ${d.toddNotes}\n`;
  }

  prompt += `
Write the report in five sections:

Section one — The Month in Plain English. Two to three sentences summarizing what happened this month in simple terms a contractor would understand.

Section two — What Worked and Why. Two to three sentences about the wins this month and what drove them.

Section three — What We Are Adjusting. Two to three sentences about what is changing next month and the specific reason why.

Section four — Your Guarantee Status. One to two sentences being completely honest about where they stand against the 10 call guarantee. If they hit it celebrate it. If they are on track say so specifically. If they are behind acknowledge it directly and say what is being done about it.

Section five — Your Business Health Score. One to two sentences explaining the score change and naming the one category to focus on next month with a brief explanation of why.

Close with one warm personal sentence from Todd. Sign it Todd.

Keep the entire report under 450 words. Write in first person as Todd. Make it feel like a message from a partner who genuinely cares, not a corporate report.`;

  return prompt;
}

export async function POST(request: Request) {
  try {
    const body: ReportFormData = await request.json();

    // Use Gemini 1.5 Pro for reports to ensure maximum nuance and quality
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      systemInstruction: SYSTEM_PROMPT 
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildUserPrompt(body) }] }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      }
    });

    const report = result.response.text();

    return NextResponse.json({ report });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}