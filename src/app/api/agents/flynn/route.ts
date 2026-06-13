import { NextResponse } from "next/server";
import { db } from "@/db";
import { fleetVehicles, mileageLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        
        // Payload expects: { leadId, geographicMetadata, tradeSector }
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // 1. Assign Available Fleet Vehicle (Mock selection for initial integration)
        const availableVehicles = await db.select().from(fleetVehicles).where(eq(fleetVehicles.status, 'Available')).limit(1);
        const assignedVehicle = availableVehicles.length > 0 ? availableVehicles[0] : null;

        if (!assignedVehicle) {
             return NextResponse.json({ success: false, error: "No available fleet vehicles." }, { status: 400 });
        }

        // 2. Flynn (AI) Distance Calculation
        const prompt = `You are Flynn, an expert fleet logistics AI. Calculate a highly realistic estimated round-trip mileage (as a raw integer) for a service dispatch starting from 'Central Louisville HQ' to '${payload.geographicMetadata}'. Return ONLY the integer.`;
        
        let estimatedMiles = 15; // fallback
        try {
            const result = await model.generateContent(prompt);
            const rawResponse = result.response.text().trim();
            // User execution guideline: Harden the Integer Parsing
            const match = rawResponse.match(/\d+/);
            if (match) {
                estimatedMiles = parseInt(match[0], 10);
            }
        } catch (e) {
            console.log(`[FLYNN] AI Estimation Failed. Using fallback mileage.`);
        }

        // 3. Database Log Commit
        const [newLog] = await db.insert(mileageLogs).values({
            vehicleId: assignedVehicle.id,
            leadId: payload.leadId,
            tripRoute: `Central HQ -> ${payload.geographicMetadata}`,
            estimatedMileage: estimatedMiles,
        }).returning();

        // 4. Update Vehicle Status
        await db.update(fleetVehicles).set({ status: 'Dispatched' }).where(eq(fleetVehicles.id, assignedVehicle.id));

        console.log(`[FLYNN] Mileage tracked and vehicle dispatched. Estimated Route: ${estimatedMiles} miles. Log ID: ${newLog.id}`);
        return NextResponse.json({ success: true, log: newLog });

    } catch (error) {
        console.error("Flynn Agent Error:", error);
        return NextResponse.json({ success: false, error: "Flynn execution failed" }, { status: 500 });
    }
}
