import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a small business investor and M&A advisor with 20 years of experience evaluating local service businesses for acquisition, angel investment, and expansion funding.

A BaraTrust client has been profiled. Generate an honest Investor Readiness Score and report.

Score the business from 0-100 across five dimensions:

1. Revenue Quality (0-20 points)
- Recurring vs one-time revenue
- Revenue growth trajectory
- Revenue concentration risk (too dependent on a few clients)

2. Operational Maturity (0-20 points)
- Owner dependency (the biggest killer of small business valuations)
- Documented processes and SOPs
- Team structure

3. Financial Health (0-20 points)
- Profit margin quality
- Debt load
- Revenue size relative to funding goal

4. Market Position (0-20 points)
- Years in business (longevity signals)
- Client count and retention
- Industry growth trajectory

5. Growth Potential (0-20 points)
- Scalability of the model
- Franchise or multi-location potential
- Size of local market opportunity

Total score interpretation:
0-40: Pre-investment. Focus on operational fundamentals first.
41-60: Approaching fundable. Specific gaps to close before seeking capital.
61-75: Fundable for SBA loans and some angel interest. Ready for certain conversations.
76-90: Strong candidate for angel investment, acquisition conversations, or franchise development.
91-100: Exceptional. M&A conversations are appropriate.

For each dimension give the score and a one-sentence honest explanation.

IMPORTANT: Format your response as JSON with this exact structure:
{
  "totalScore": <number>,
  "dimensions": [
    {"name": "Revenue Quality", "score": <number>, "maxScore": 20, "explanation": "<string>"},
    {"name": "Operational Maturity", "score": <number>, "maxScore": 20, "explanation": "<string>"},
    {"name": "Financial Health", "score": <number>, "maxScore": 20, "explanation": "<string>"},
    {"name": "Market Position", "score": <number>, "maxScore": 20, "explanation": "<string>"},
    {"name": "Growth Potential", "score": <number>, "maxScore": 20, "explanation": "<string>"}
  ],
  "interpretation": "<string - one sentence interpreting the total score>",
  "biggestDrag": "<string - the single biggest thing dragging the score down>",
  "biggestStrength": "<string - the single biggest thing making this business attractive>",
  "recommendedFunding": "<string - recommended funding type>",
  "acquisitionNote": "<string or null - only if acquisition was mentioned as goal>",
  "summary": "<string - 2-3 sentence overall assessment>"
}

Be honest. A score of 45 is a 45. Don't inflate to make the client feel good.`;

export async function POST(request: Request) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const body = await request.json();

    const userPrompt = `Profile this BaraTrust client for investor readiness:

Business Name: ${body.businessName}
Trade/Industry: ${body.industry}
Years in Business: ${body.yearsInBusiness}
Annual Revenue: ${body.annualRevenue}
Monthly Recurring Clients: ${body.recurringClients}
Revenue Growth Last 12 Months: ${body.revenueGrowth}
Has Documented Processes/SOPs: ${body.hasSOPs ? 'Yes' : 'No'}
Has Second Location or Franchise Potential: ${body.franchisePotential ? 'Yes' : 'No'}
Owner Dependency: ${body.ownerDependency}
Monthly Profit Margin Estimate: ${body.profitMargin}
Has Existing Business Debt: ${body.hasDebt ? 'Yes' : 'No'}
Reason for Seeking Funding: ${body.fundingReason}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const text = textBlock?.text || "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ result: parsed });
      }
    } catch {
      // If JSON parsing fails, return raw text
    }

    return NextResponse.json({ result: text });
  } catch (error) {
    console.error("Investor score failed:", error);
    return NextResponse.json({ error: "Failed to generate investor score" }, { status: 500 });
  }
}
