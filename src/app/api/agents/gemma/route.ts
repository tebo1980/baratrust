import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { partsOrders } from "@/db/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function queryLocalDistributors(materialsList: string[], geographicMetadata: string) {
    const suppliers = [
        { name: "Kentuckiana Parts Distributors", regionMatch: ["Louisville", "New Albany"], baseMultiplier: 4500 },
        { name: "Ohio Valley Supply House", regionMatch: ["Louisville", "Jeffersonville", "New Albany"], baseMultiplier: 4800 },
        { name: "National Supply Co.", regionMatch: [], baseMultiplier: 5200 } // Default
    ];

    // Filter suppliers by region match
    let validSuppliers = suppliers.filter(s => 
        s.regionMatch.length === 0 || 
        s.regionMatch.some(region => geographicMetadata.toLowerCase().includes(region.toLowerCase()))
    );

    // If no specific match, default to National
    if (validSuppliers.length === 0) validSuppliers = [suppliers[2]];

    // Simulate network delay for sourcing race
    console.log(`Gemma is sourcing parts across ${validSuppliers.length} distributors...`);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate a basic cost comparison / bidding race
    const bids = validSuppliers.map(supplier => {
        // Add random variance (-5% to +5%) to the base multiplier
        const variance = 1 + (Math.random() * 0.1 - 0.05); 
        const quotedPrice = Math.round(materialsList.length * supplier.baseMultiplier * variance);
        return { supplierName: supplier.name, quotedPrice };
    });

    // Select the lowest bid
    bids.sort((a, b) => a.quotedPrice - b.quotedPrice);
    const winningBid = bids[0];

    return winningBid;
}

export async function POST(req: Request) {
    try {
        const payload = await req.json();

        // 1. Establish the Keep-Alive Stream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const heartbeat = setInterval(() => controller.enqueue(encoder.encode(" ")), 3000);

                try {
                    // 2. Invoke Gemma (Gemini 1.5 Flash) to parse required materials
                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    
                    const prompt = `Extract required materials for a ${payload.tradeSector} job: ${payload.description}. Return raw JSON array of strings. Do not include formatting blocks, just the JSON array.`;
                    
                    const result = await model.generateContent(prompt);
                    const textResponse = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
                    const materialsList = JSON.parse(textResponse);

                    // 3. Trigger Live Inventory Query Sub-Routine (Supplier Race)
                    const { supplierName, quotedPrice } = await queryLocalDistributors(materialsList, payload.geographicMetadata);

                    // 4. Commit to Neon DB
                    const [newOrder] = await db.insert(partsOrders).values({
                        leadId: payload.leadId,
                        requiredMaterials: materialsList, // Drizzle handles array to JSON
                        supplierName,
                        quotedPrice,
                        status: 'Price Locked'
                    }).returning();

                    revalidatePath("/", "layout");

                    clearInterval(heartbeat);
                    controller.enqueue(encoder.encode(JSON.stringify({ success: true, order: newOrder })));
                    controller.close();
                } catch (error) {
                    console.error("Gemma Agent Error:", error);
                    clearInterval(heartbeat);
                    controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: "Failed to engage Gemma" })));
                    controller.close();
                }
            }
        });

        return new Response(stream, { headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" } });
    } catch (error) {
        console.error("Gemma Agent Setup Error:", error);
        return NextResponse.json({ success: false, error: "Failed to engage agent" }, { status: 500 });
    }
}
