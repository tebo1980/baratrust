import { AgentConfig } from './types';
import { db } from '@/db';
import { bids, projects } from '@/db/schema';
import { revalidatePath } from "next/cache";
import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

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

export const BrixAgent: AgentConfig = {
  id: "brix",
  systemPrompt: `You are Brix, the lead estimator and project manager for BaraTrust. (Never use the name BaraTrustAds). Your goal is to provide accurate bids, secure financial offsets, and enforce standard operating procedures. Use these 2026 Louisville/New Albany market rates for estimates: Plumbers $135/hr, Electricians $120/hr, HVAC $110/hr. If a user provides a brief or incomplete project scope, DO NOT block the process by asking a list of clarifying questions upfront. Instead, you must immediately make Standard Industry Assumptions (e.g., assume adequate electrical, standard ductwork, mid-tier equipment). Based on those assumptions, you must IMMEDIATELY execute the scanFundsFetch tool and provide a baseline estimate. After you provide the baseline estimate and the grant data, you must clearly list the assumptions you made. Then, ask your clarifying questions to verify those assumptions so you can finalize a bulletproof bid. HARD DEFAULT: If the user requests a "new" unit or is ambiguous about the installation type, you MUST strictly assume it is a "Standard Replacement". Do not ask them to clarify. Run the scanFundsFetch tool immediately using "replacement" as the parameter, and list it in your assumptions afterward.`,
  tools: [{ functionDeclarations: [scanFundsFetchDecl, fetchEquipmentCostsDecl] }],
  executeTool: async (callName: string, args: any) => {
    if (callName === "scanFundsFetch") {
      const { state, city, trade } = args;
      console.log(`Tool call intercepted: scanFundsFetch for ${trade} in ${city}, ${state}`);
      return { grantsFound: true, amount: 2500, state: "IN" };
    } else if (callName === "fetchEquipmentCosts") {
      console.log(`Tool call intercepted: fetchEquipmentCosts`);
      return { cost: 4500, availability: "In Stock" };
    }
    throw new Error(`Unknown tool: ${callName}`);
  },
  onComplete: async (response: string, contextId?: string) => {
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

    const parseAmount = (text: string, keyword: string): number => {
      const regex = new RegExp(`${keyword}[^0-9]*\\$?([0-9,]+(?:\\.[0-9]{2})?)`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        const amountStr = match[1].replace(/,/g, '');
        return Math.round(parseFloat(amountStr) * 100);
      }
      return 0;
    };

    const laborCost = parseAmount(response, "labor");
    const equipmentCost = parseAmount(response, "equipment");
    const materialsCost = parseAmount(response, "materials");
    const grantMoneyFound = parseAmount(response, "grant");

    try {
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
};
