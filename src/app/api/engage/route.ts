import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bids, leads, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { sendTechnicianDispatchSMS } from "@/lib/notifications";

// Initialize the Gemini Brain for Brix
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const lead = await req.json();

        // 1. WAKE UP BRIX AND STREAM TO PREVENT EDGE TIMEOUT
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const heartbeat = setInterval(() => {
                    controller.enqueue(encoder.encode(" "));
                }, 3000);

                try {
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                    console.log(`[DELLA] Evaluating geographic metadata: ${lead.region}`);
                    const isKentuckiana = /louisville|new albany|indiana|kentucky|kentuckiana/i.test(lead.region);
                    if (!isKentuckiana) {
                        console.log(`[DELLA] Rejecting lead outside service radius.`);
                        clearInterval(heartbeat);
                        controller.enqueue(encoder.encode(JSON.stringify({ success: false, reason: "Outside service radius" })));
                        controller.close();
                        return;
                    }
                    console.log(`[DELLA] Lead verified within Kentuckiana service radius.`);

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

                    console.log(`[BRIX] Calculating mock target quote value...`);
                    let estimate;
                    try {
                        const result = await model.generateContent(prompt);
                        const textResponse = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
                        estimate = JSON.parse(textResponse);
                    } catch (e) {
                        console.log(`[BRIX] Gemini API failed, using mock estimate...`);
                        estimate = {
                            laborCost: 15000,
                            equipmentCost: 200000,
                            materialsCost: 50000,
                            grantMoneyFound: 0,
                            notes: "Mocked assessment: Immediate compressor replacement required."
                        };
                    }

                    // Insert mock project to satisfy bids foreign key
                    const [newProject] = await db.insert(projects).values({ name: lead.title || "Emergency Job", address: lead.region || "Local" }).returning();

                    // 2. INSERT INTO YOUR DATABASE
                    const [newBid] = await db.insert(bids).values({
                        projectId: newProject.id,
                        status: "presented",
                        laborCost: estimate.laborCost,
                        equipmentCost: estimate.equipmentCost,
                        materialsCost: estimate.materialsCost,
                        grantMoneyFound: estimate.grantMoneyFound || 0,
                    }).returning();
                    
                    console.log(`[BRIX] Bid logged to database.`);

                    // 3. TRIGGER GEMMA
                    console.log(`[ORCHESTRATOR] Handoff to Gemma for parts procurement...`);
                    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
                    
                    // We trigger Gemma and await it in this orchestration loop to complete the cascade
                    const gemmaResponse = await fetch(`${appUrl}/api/agents/gemma`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            leadId: lead.leadId,
                            tradeSector: lead.title, // Title holds trade sector in our mock
                            description: lead.description,
                            geographicMetadata: lead.region
                        })
                    });
                    
                    const gemmaData = await gemmaResponse.json(); // Wait for Gemma stream to finish

                    // 4. UPDATE LEAD STATUS TO Scheduled Work
                    await db.update(leads).set({ status: 'Scheduled Work' }).where(eq(leads.id, lead.leadId));
                    console.log(`[ORCHESTRATOR] Cascade complete. Lead status upgraded to 'Scheduled Work'.`);

                    // 5. FIRE LIVE NOTIFICATION GATEWAY (Asynchronous Dispatch)
                    const supplier = gemmaData.order?.supplierName || "Local Distributor";

                    sendTechnicianDispatchSMS({
                        toPhone: process.env.TECHNICIAN_PHONE_NUMBER || "+15550000000",
                        tradeSector: lead.tradeSector || lead.title,
                        urgency: "CRITICAL",
                        location: lead.region,
                        scopeSummary: estimate.notes,
                        supplierName: supplier
                    }).catch(err => console.error("[ORCHESTRATOR] SMS Dispatch Failed:", err));

                    // 6. FIRE FLYNN (FLEET LOGISTICS & MILEAGE TRACKER)
                    fetch(`${appUrl}/api/agents/flynn`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            leadId: lead.leadId,
                            geographicMetadata: lead.region,
                            tradeSector: lead.tradeSector || lead.title
                        })
                    }).catch(err => console.error("[ORCHESTRATOR] Flynn Dispatch Failed:", err));

                    // 7. FIRE COLE (COGS & INVENTORY ANALYST)
                    fetch(`${appUrl}/api/agents/cole`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            leadId: lead.leadId,
                            projectId: newProject.id
                        })
                    }).catch(err => console.error("[ORCHESTRATOR] Cole Analysis Failed:", err));

                    // 8. PURGE THE SERVER CACHE
                    revalidatePath("/", "layout");

                    clearInterval(heartbeat);
                    controller.enqueue(encoder.encode(JSON.stringify({ success: true, bid: newBid, agentNotes: estimate.notes })));
                    controller.close();
                } catch (error: any) {
                    console.error("Brix Agent Error:", error);
                    clearInterval(heartbeat);
                    controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: "Failed to engage agent" })));
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" }
        });

    } catch (error) {
        console.error("Brix Agent Error:", error);
        return NextResponse.json({ success: false, error: "Failed to engage agent" }, { status: 500 });
    }
}