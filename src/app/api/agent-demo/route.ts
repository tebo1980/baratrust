import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, FunctionDeclaration, Tool } from "@google/generative-ai";
import { db } from "@/db";
import { bids, projects } from "@/db/schema";
import { revalidatePath } from "next/cache";

export const maxDuration = 60;

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
  brix: `You are Brix, the lead estimator and project manager for BaraTrust. (Never use the name BaraTrustAds). Your goal is to provide accurate bids, secure financial offsets, and enforce standard operating procedures. Use these 2026 Louisville/New Albany market rates for estimates: Plumbers $135/hr, Electricians $120/hr, HVAC $110/hr. If a user provides a brief or incomplete project scope, DO NOT block the process by asking a list of clarifying questions upfront. Instead, you must immediately make Standard Industry Assumptions (e.g., assume adequate electrical, standard ductwork, mid-tier equipment). Based on those assumptions, you must IMMEDIATELY execute the scanFundsFetch tool and provide a baseline estimate. After you provide the baseline estimate and the grant data, you must clearly list the assumptions you made. Then, ask your clarifying questions to verify those assumptions so you can finalize a bulletproof bid. HARD DEFAULT: If the user requests a "new" unit or is ambiguous about the installation type, you MUST strictly assume it is a "Standard Replacement". Do not ask them to clarify. Run the scanFundsFetch tool immediately using "replacement" as the parameter, and list it in your assumptions afterward.`,
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

    const scanFundsFetchDecl: FunctionDeclaration = {
      name: "scanFundsFetch",
      description: "Scans for local grants, rebates, or SBA loans based on location and trade. If user is ambiguous, assume the default area and trade to execute IMMEDIATELY.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          businessName: { type: SchemaType.STRING, description: "Name of the business. If unknown, default to 'BaraTrust Client'." },
          state: { type: SchemaType.STRING, description: "State where the business operates. If unknown, strictly default to 'KY' and execute." },
          city: { type: SchemaType.STRING, description: "City where the business operates. If unknown, strictly default to 'Louisville' and execute." },
          trade: { type: SchemaType.STRING, description: "The specific trade (e.g. HVAC, Plumber). If ambiguous, default to the most likely trade based on context and execute." },
        },
        required: [] as string[],
      },
    };

    const fetchEquipmentCostsDecl: FunctionDeclaration = {
      name: "fetchEquipmentCosts",
      description: "Fetches current market equipment costs.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          equipmentType: { type: SchemaType.STRING, description: "The type of equipment to fetch costs for." },
        },
        required: ["equipmentType"],
      },
    };

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const modelName = "gemini-2.5-flash";
    console.log("API Key present:", !!process.env.GEMINI_API_KEY);
    console.log("Using model:", modelName);
    const tools: Tool[] | undefined = agentKey === "brix" ? ([{ functionDeclarations: [scanFundsFetchDecl, fetchEquipmentCostsDecl] }] as Tool[]) : undefined;

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      tools: tools
    });

    const chat = model.startChat({
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
      }
    });

    let result = await chat.sendMessage([{ text: input }]);
    let finalResponse = "";
    let stepCount = 0;

    while (stepCount < 5) {
      try {
        const chunkText = result.response.text();
        if (chunkText) {
          finalResponse += chunkText + "\n";
        }
      } catch (e) {
        // No text in this chunk
      }

      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) {
        break;
      }

      stepCount++;
      const call = calls[0];

      if (call.name === "scanFundsFetch") {
        try {
          const { state, city, trade } = call.args as any;
          console.log(`Tool call intercepted: scanFundsFetch for ${trade} in ${city}, ${state}`);

          // Return exactly what the prompt requested
          const mockResponse = { grantsFound: true, amount: 2500, state: "IN" };

          result = await chat.sendMessage([{
            functionResponse: {
              name: call.name,
              response: mockResponse
            }
          }]);
        } catch (toolErr: any) {
          console.error("Function execution failed:", toolErr);
          break;
        }
      } else if (call.name === "fetchEquipmentCosts") {
        try {
          console.log(`Tool call intercepted: fetchEquipmentCosts`);

          const mockResponse = { cost: 4500, availability: "In Stock" };

          result = await chat.sendMessage([{
            functionResponse: {
              name: call.name,
              response: mockResponse
            }
          }]);
        } catch (toolErr: any) {
          console.error("Function execution failed:", toolErr);
          break;
        }
      } else {
        break;
      }
    }

    if (!finalResponse.trim()) {
      finalResponse = "FundsFetch logic executed successfully, but no final summary was generated.";
    }

    if (agentKey === "brix") {
      try {
        // Fallback projectId since it's not dynamically passed yet
        const fallbackProjectId = "00000000-0000-0000-0000-000000000000";

        try {
            await db.insert(projects).values({
                id: fallbackProjectId,
                businessId: "system",
                name: "Fallback Project (Agent API)",
                address: "System Generated"
            }).onConflictDoNothing();
        } catch (e) {
            console.log("Fallback project already exists or error creating it", e);
        }

        // Extract values from the final response text
        // Using a simple regex to find amounts associated with keywords
        const parseAmount = (text: string, keyword: string): number => {
          const regex = new RegExp(`${keyword}[^0-9]*\\$?([0-9,]+(?:\\.[0-9]{2})?)`, 'i');
          const match = text.match(regex);
          if (match && match[1]) {
            const amountStr = match[1].replace(/,/g, '');
            return Math.round(parseFloat(amountStr) * 100); // Convert to integer cents
          }
          return 0; // Default if not found
        };

        const laborCost = parseAmount(finalResponse, "labor");
        const equipmentCost = parseAmount(finalResponse, "equipment");
        const materialsCost = parseAmount(finalResponse, "materials");
        const grantMoneyFound = parseAmount(finalResponse, "grant");

        // If all are 0, we might have missed them or they weren't generated clearly. 
        // We insert them anyway per instructions to save the finalized quote.
        await db.insert(bids).values({
          projectId: fallbackProjectId,
          laborCost: laborCost,
          equipmentCost: equipmentCost,
          materialsCost: materialsCost,
          grantMoneyFound: grantMoneyFound,
          status: 'presented',
        });

        revalidatePath('/dashboard');
        console.log(`Brix quote saved to database (Labor: ${laborCost}, Equip: ${equipmentCost}, Mat: ${materialsCost}, Grant: ${grantMoneyFound})`);
      } catch (dbErr) {
        console.error("Failed to save Brix quote to database:", dbErr);
      }
    }

    return NextResponse.json({ response: finalResponse.trim() });

  } catch (err: any) {
    console.error("Agent live error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}