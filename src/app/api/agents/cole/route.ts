import { NextResponse } from "next/server";
import { db } from "@/db";
import { cogsLedger, bids, partsOrders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { leadId, projectId } = payload;
        
        // 1. Fetch Brix's Revenue Data (Bids)
        // If projectId is not available in the payload, try to resolve it from the DB or fail safely
        if (!projectId || !leadId) {
             return NextResponse.json({ success: false, error: "Missing leadId or projectId for Cole." }, { status: 400 });
        }

        const projectBids = await db.select().from(bids).where(eq(bids.projectId, projectId)).limit(1);
        const activeBid = projectBids.length > 0 ? projectBids[0] : null;

        // 2. Fetch Gemma's Material Cost Data (Parts Orders)
        const jobParts = await db.select().from(partsOrders).where(eq(partsOrders.leadId, leadId)).limit(1);
        const activeParts = jobParts.length > 0 ? jobParts[0] : null;

        if (!activeBid || !activeParts) {
             return NextResponse.json({ success: false, error: "Incomplete financial data for Cole's analysis." }, { status: 400 });
        }

        // 3. Cole's Analytics Engine
        const totalRevenue = activeBid.laborCost + activeBid.equipmentCost + activeBid.materialsCost;
        const laborCost = activeBid.laborCost || 0;
        const materialCost = activeParts.quotedPrice || activeBid.materialsCost || 0;
        
        // Secure the Math Fallbacks
        if (totalRevenue <= 0) {
            console.log(`[COLE] ⚠️ Revenue is zero or missing. Short-circuiting margin calculation to avoid division by zero.`);
            const [newLedger] = await db.insert(cogsLedger).values({
                leadId: leadId,
                totalRevenue: 0,
                materialCost: materialCost,
                laborCost: laborCost,
                netProfitMargin: "0.00%",
                marginAlert: true // Alert immediately if revenue is zero
            }).returning();
            return NextResponse.json({ success: true, ledger: newLedger });
        }

        const totalCogs = laborCost + materialCost;
        const grossProfit = totalRevenue - totalCogs;
        
        const netProfitMarginDec = grossProfit / totalRevenue;
        const netProfitMarginPct = (netProfitMarginDec * 100).toFixed(2) + "%";

        let marginAlert = false;
        if (netProfitMarginDec < 0.35) {
             marginAlert = true;
             console.warn(`[COLE] ⚠️ [MARGIN ALERT: INSIGHT REQUIRED]. Target margin 35% breached. Actual: ${netProfitMarginPct}`);
        }

        // 4. Database Ledger Commit
        const [newLedger] = await db.insert(cogsLedger).values({
            leadId: leadId,
            totalRevenue: totalRevenue,
            materialCost: materialCost,
            laborCost: laborCost,
            netProfitMargin: netProfitMarginPct,
            marginAlert: marginAlert
        }).returning();

        console.log(`[COLE] Financial analysis complete. Margin: ${netProfitMarginPct}. Ledger ID: ${newLedger.id}`);
        return NextResponse.json({ success: true, ledger: newLedger });

    } catch (error) {
        console.error("Cole Agent Error:", error);
        return NextResponse.json({ success: false, error: "Cole execution failed" }, { status: 500 });
    }
}
