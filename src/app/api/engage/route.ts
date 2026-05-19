import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bids } from "@/db/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini Brain for Brix
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const lead = await req.json();

        // 1. WAKE UP BRIX
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      You are Brix, an expert HVAC and Electrical estimating AI.
      Analyze this job lead and provide a JSON response with estimated costs in CENTS (multiply dollars by 100).
      Do not use formatting blocks, just raw JSON.
      
      Job Title: ${lead.title}
      Description: ${lead.description}
      Region: ${lead.region}
      
      Output exactly this JSON structure:
      {
        "laborCost": number,
        "equipmentCost": number,
        "materialsCost": number,
        "grantMoneyFound": number,
        "notes": "Brief 1-sentence assessment"
      }
    `;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const estimate = JSON.parse(textResponse);

        // 2. INSERT INTO YOUR DATABASE
        const [newBid] = await db.insert(bids).values({
            projectId: lead.leadId, // FIXED: Now explicitly maps to your Drizzle schema
            status: "presented",
            laborCost: estimate.laborCost,
            equipmentCost: estimate.equipmentCost,
            materialsCost: estimate.materialsCost,
            grantMoneyFound: estimate.grantMoneyFound || 0,
        }).returning();


        // 3. PURGE THE SERVER CACHE
        revalidatePath("/", "layout");

        return NextResponse.json({ success: true, bid: newBid, agentNotes: estimate.notes });
    } catch (error) {
        console.error("Brix Agent Error:", error);
        return NextResponse.json({ success: false, error: "Failed to engage agent" }, { status: 500 });
    }
}