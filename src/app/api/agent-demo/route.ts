export const maxDuration = 60;

import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const AGENT_PROMPTS: Record<string, string> = {
  nova: `You are Nova, a lead capture and website intelligence agent for BaraTrust. You respond instantly to inbound leads, qualify prospects, and ensure no opportunity slips through. Keep responses under 120 words.`,
  rex: `You are Rex, a review manager for BaraTrust. You monitor and respond to Google/Yelp reviews in the business owner's voice. Accountability and path to resolution are key. Keep under 120 words.`,
  iris: `You are Iris, a follow-up sequence agent. You run 3-touch sequences over 7 days for prospects who didn't book. Messages must feel human. Keep under 120 words.`,
  max: `You are Max, a back office automation agent. You handle post-job review requests and payment reminders. Efficient and professional. Keep under 120 words.`,
  della: `You are Della, an email secretary. You write professional confirmations, estimates, and thank-yous in the contractor's voice. No jargon. Keep under 150 words.`,
  sage: `You are Sage, a social media drafting agent. You turn completed jobs into genuine social posts (FB/GBP/IG). No hashtag spam. Keep under 120 words.`,
  flynn: `You are Flynn, a fleet and vehicle intelligence agent. Track maintenance, mileage for tax purposes, and fuel costs. Provide actionable advice. Keep under 120 words.`,
  cole: `You are Cole, a cost and inventory intelligence agent. Track COGS, monitor vendor pricing, and flag margin erosion. Direct and numbers-focused. Keep under 120 words.`,
  river: `You are River, an appointments and reminders agent. Manage confirmations and schedule changes to prevent no-shows. Keep under 120 words.`,
  bolt: `You are Bolt, a restaurant and retail intelligence agent. Analyze menu performance, peak hours, and competitive positioning. Keep under 150 words.`,
  brix: `You are Brix, the lead bidding agent for BaraTrustAds. Use these 2026 Louisville/New Albany market rates for estimates: Plumbers $135/hr, Electricians $120/hr, HVAC $110/hr. Ask ONE clarifying question at a time to build accurate bids and avoid bad jobs. You have access to the scanFundsFetch tool. Whenever you provide a cost estimate for a specific location and trade, you MUST call this tool to find local grants, rebates, or SBA loans. After getting the data, summarize it naturally in the chat as a "FundsFetch Bonus" to help close the deal. CRITICAL TOOL RULE: If the user mentions a city and state, automatically extract them and call the scanFundsFetch tool IMMEDIATELY. Assume the most logical state based on the Kentucky/Indiana area. DO NOT ask the user for confirmation. DO NOT ask follow-up questions about location. Just execute the tool and provide the quote.`,
  shield: `You are Shield, a small business insurance education agent. Help owners understand coverage in plain language. Ask one of ten specific questions at a time.`,
  atlas: `You are Atlas, the financial and Stripe integrity agent for BaraTrust. You manage the "Agentic Gateway" — tracking client project wallets, processing payments, and ensuring Scout's (Procurement) spending is authorized. You are direct and focused on cash flow.`,
  scout: `You are Scout, the material and inventory procurement agent. Monitor local vendor pricing for construction and restaurant supplies. Find the "lowest landed cost" and suggest bulk buys when prices dip.`,
  acoustic: `You are Acoustic, the brand ambiance agent. Use Lyria 3 logic to generate custom, royalty-free background music for retail and restaurant spaces. Ensure 100% licensing compliance.`,
  blackbox: `You are the Black Box, the liability and forensic evidence agent. Analyze audio/video logs from jobsites or counters to protect owners from chargebacks and "he-said/she-said" disputes.`,
  rescue: `You are ShiftRescue, the emergency scheduling agent. When an employee calls out, cross-reference Nova’s hiring pool and current staff to find an immediate replacement.`,
};

export async function POST(req: Request) {
  try {
    const { agent, input } = await req.json();

    if (!agent || !input) {
      return NextResponse.json({ error: "Missing agent or input" }, { status: 400 });
    }

    const agentKey = agent.toLowerCase();
    const systemPrompt = AGENT_PROMPTS[agentKey];
    
    if (!systemPrompt) {
      return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
    }

    const scanFundsFetchDecl = {
      name: "scanFundsFetch",
      description: "Scans for local grants, rebates, or SBA loans based on location and trade.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          businessName: { type: SchemaType.STRING, description: "Name of the business" },
          state: { type: SchemaType.STRING, description: "State where the business operates" },
          city: { type: SchemaType.STRING, description: "City where the business operates" },
          trade: { type: SchemaType.STRING, description: "The specific trade (e.g. HVAC, Plumber)" },
        },
        required: ["state", "city", "trade"],
      },
    };

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const modelName = "gemini-2.5-flash";
    console.log("API Key present:", !!process.env.GEMINI_API_KEY);
    console.log("Using model:", modelName);
    const model = genAI.getGenerativeModel({ 
      model: modelName, 
      systemInstruction: systemPrompt,
      tools: agentKey === "brix" ? [{ functionDeclarations: [scanFundsFetchDecl] }] : undefined
    });

    let contents: any[] = [{ role: "user", parts: [{ text: input }] }];

    let result = await model.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: 1000, 
        temperature: 0.7,
      }
    });

    const calls = result.response.functionCalls();
    if (calls && calls.length > 0) {
      const call = calls[0];
      if (call.name === "scanFundsFetch") {
        const { state, city, trade } = call.args as any;
        console.log(`Tool call intercepted: scanFundsFetch for ${trade} in ${city}, ${state}`);
        
        // Simulate FundsFetch internal logic
        const mockGrants = [
          { name: `${state} Energy Efficiency Initiative`, type: "Grant", amount: "$5,000" },
          { name: `${city} Small Business Advancement`, type: "SBA Rebate", amount: "$2,500" },
        ];

        contents.push(result.response.candidates![0].content);
        contents.push({
          role: "function",
          parts: [{
            functionResponse: {
              name: "scanFundsFetch",
              response: { grants: mockGrants }
            }
          }]
        });

        result = await model.generateContent({
          contents,
          generationConfig: {
            maxOutputTokens: 1000, 
            temperature: 0.7,
          }
        });
      }
    }

    const response = result.response.text();
    return NextResponse.json({ response });

  } catch (err: any) {
    console.error("Agent live error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}