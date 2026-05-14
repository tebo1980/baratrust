import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are a capital markets advisor specializing in small local service businesses in Kentucky and Indiana.

A business owner has been assessed and is looking for funding. Based on their profile, identify the most realistic and appropriate funding sources available to them right now.

Organize recommendations into these categories:

DEBT FUNDING (no equity given up):
- SBA 7(a) loans: up to $5M. Point them to their local SBA district office (Louisville KY district: louisville.sba.gov; Indiana district: indiana.sba.gov).
- SBA 504 loans: for real estate and major equipment. Requires a Certified Development Company partner.
- USDA Business and Industry loans: for rural businesses.
- Community Development Financial Institutions (CDFIs): mission-driven lenders. In KY: Kentucky Highlands Investment Corporation, Community Ventures Corporation. In IN: Bankable, Regional Development Company.
- Local bank SBA preferred lenders: list 2-3 known SBA preferred lenders in Louisville/New Albany area (e.g., Stock Yards Bank, WesBanco, First Harrison Bank).

EQUITY FUNDING (giving up ownership):
Only recommend if they indicated they are open to equity and their score is 60+.
- Louisville angel networks: Venture Connectors, Kentucky Angel Investors Network (KAIN).
- Indiana angel networks: Elevate Ventures, Indiana Angel Network.
- Small business private equity: firms that acquire or invest in established home service platforms.

ALTERNATIVE FUNDING:
- Revenue-based financing: Clearco, Pipe, or similar.
- Equipment financing: Often easier to qualify for than general loans.
- Business credit lines.

For each relevant source provide: name/type, realistic amount, eligibility, contact info, and an honest fit assessment. End with a clear "Start Here" recommendation. Keep under 400 words. Be specific to KY and IN.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      systemInstruction: SYSTEM_PROMPT 
    });

    const userPrompt = `Find funding sources for this BaraTrust client:

Business Name: ${body.businessName}
Investor Readiness Score: ${body.investorScore}/100
Funding Goal Amount: ${body.fundingGoal}
Purpose: ${body.purpose}
State: ${body.state}
Open to Giving Up Equity: ${body.openToEquity ? 'Yes' : 'No'}
Timeline to Funding: ${body.timeline}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.5, // Slightly lower temp for financial/factual accuracy
      }
    });

    const responseText = result.response.text();

    return NextResponse.json({ result: responseText });
  } catch {
    // Catch block cleaned to avoid unused variable warnings
    return NextResponse.json(
      { error: "Failed to find funding sources" },
      { status: 500 }
    );
  }
}