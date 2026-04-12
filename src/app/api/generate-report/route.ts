import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { resolve } from "path";

function getApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("ANTHROPIC_API_KEY=")) {
        const val = trimmed.substring("ANTHROPIC_API_KEY=".length).trim();
        process.env.ANTHROPIC_API_KEY = val;
        return val;
      }
    }
  } catch {}
  return "";
}

const SYSTEM_PROMPT = `You are Todd Tebo, founder of BaraTrust, writing a monthly performance report for a local service business client. Your voice is warm, honest, plain spoken, and conversational. You never use marketing jargon. You explain things like you are talking to a contractor at his kitchen table not a marketing executive in a boardroom. You are direct, encouraging, and always honest even when results are mixed.`;

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

Facebook ad spend: $${d.fbAdSpend}
`;

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
What worked well: ${d.whatWorked}
`;

  if (d.challenges) {
    prompt += `Challenges: ${d.challenges}\n`;
  }

  if (d.toddNotes) {
    prompt += `Additional notes: ${d.toddNotes}\n`;
  }

  prompt += `
Write the report in four sections:

Section one — The Month in Plain English. Two to three sentences summarizing what happened this month in simple terms a contractor would understand.

Section two — What Worked and Why. Two to three sentences about the wins this month and what drove them.

Section three — What We Are Adjusting. Two to three sentences about what is changing next month and the specific reason why.

Section four — Your Guarantee Status. One to two sentences being completely honest about where they stand against the 10 call guarantee. If they hit it celebrate it. If they are on track say so specifically. If they are behind acknowledge it directly and say what is being done about it.

Section five — Your Business Health Score. One to two sentences explaining the score change and naming the one category to focus on next month with a brief explanation of why.

Close with one warm personal sentence from Todd. Sign it Todd.

Keep the entire report under 450 words. Write in first person as Todd. Make it feel like a message from a partner who genuinely cares not a corporate report.`;

  return prompt;
}

export async function POST(request: Request) {
  try {
    const key = getApiKey();
    console.log("API key loaded:", key ? key.substring(0, 12) + "..." : "MISSING");

    const anthropic = new Anthropic({
      apiKey: key,
    });

    const body: ReportFormData = await request.json();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(body),
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const report = textBlock ? textBlock.text : "";

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Report generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
