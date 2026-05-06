import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are a grant research specialist focused on funding opportunities for small trade businesses and contractors in Kentucky and Indiana.

A BaraTrust client has been profiled. Find every legitimate funding source they actually qualify for. Be brutally honest — most small businesses do not qualify for most grants. Never suggest programs they clearly don't qualify for.

PROGRAMS TO CHECK IN ORDER OF LIKELIHOOD:
1. USDA REAP (Energy projects in rural areas)
2. Local Municipal Matching Grants (Façade/Revitalization)
3. FHLBank Indianapolis Elevate Grant (Indiana only, via bank)
4. Indiana INTAP (Indiana professional services)
5. Kentucky Small Business Credit Initiative (KY collateral support)
6. SBA Programs (Clarify that SBA grants for typical expansion do not exist)
7. Local workforce development grants (Training costs)

For each qualifying program provide: Name, why they qualify, realistic award amount, honest difficulty assessment, and recommended next step.

End with a "Bottom Line" summary. Keep total response under 500 words. Be honest. Protect the BaraTrust brand by never overselling grant availability.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      systemInstruction: SYSTEM_PROMPT 
    });

    const userPrompt = `Profile this BaraTrust client for grant and funding opportunities:

Business Name: ${body.businessName}
Trade/Industry: ${body.industry}
Location: ${body.cityState}
Area Type: ${body.areaType}
Years in Business: ${body.yearsInBusiness}
Annual Revenue Range: ${body.revenueRange}
Owner Demographics: ${body.demographics?.length ? body.demographics.join(', ') : 'None specified'}
Energy Efficiency Projects Planned: ${body.energyEfficiency ? 'Yes' : 'No'}
Located in Downtown Corridor or Historic District: ${body.downtownCorridor ? 'Yes' : 'No'}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 1200,
        temperature: 0.4, // Lower temperature for "brutally honest" factual checking
      }
    });

    const resultText = result.response.text();

    return NextResponse.json({ result: resultText });
  } catch {
    // Catch block cleaned to prevent unused variable errors in build
    return NextResponse.json({ error: "Failed to generate grant match" }, { status: 500 });
  }
}