import { NextResponse } from "next/server";
import { db } from "@/db";
import { warehouseInventory } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { leadId, requestedParts } = payload; 
        
        if (!requestedParts || requestedParts.length === 0) {
            return NextResponse.json({ success: true, internalCost: 0, externalSourcingRequired: [] });
        }

        // Fetch current inventory matching the requested parts
        const inventory = await db.select().from(warehouseInventory)
            .where(inArray(warehouseInventory.partName, requestedParts));

        let internalCost = 0;
        const externalSourcingRequired: string[] = [];

        // Harden Multi-Quantity Deductions: Track mutations in memory across the loop
        const stockTracker: Record<string, { id: string, quantity: number, unitCost: number, reorderThreshold: number, deducted: number }> = {};
        
        for (const item of inventory) {
            stockTracker[item.partName] = {
                id: item.id,
                quantity: item.stockQuantity,
                unitCost: item.unitCost,
                reorderThreshold: item.reorderThreshold,
                deducted: 0
            };
        }

        for (const partName of requestedParts) {
            const stockItem = stockTracker[partName];

            if (stockItem && stockItem.quantity > 0) {
                // Scenario A: In Stock -> Deduct safely from memory
                stockItem.quantity -= 1;
                stockItem.deducted += 1;
                internalCost += stockItem.unitCost;
            } else {
                // Scenario B: Out of Stock -> Flag for Gemma
                externalSourcingRequired.push(partName);
            }
        }

        // Commit all memory deductions securely
        for (const partName in stockTracker) {
            const stockItem = stockTracker[partName];
            if (stockItem.deducted > 0) {
                await db.update(warehouseInventory)
                        .set({ stockQuantity: stockItem.quantity })
                        .where(eq(warehouseInventory.id, stockItem.id));
                        
                console.log(`[COLE INVENTORY] Internally sourced: ${partName} (Qty: ${stockItem.deducted}). Remaining Stock: ${stockItem.quantity}`);
                
                if (stockItem.quantity <= stockItem.reorderThreshold) {
                    console.warn(`[COLE INVENTORY] ⚠️ LOW STOCK ALERT: ${partName} has breached reorder threshold (${stockItem.reorderThreshold}).`);
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            internalCost, 
            externalSourcingRequired 
        });

    } catch (error) {
        console.error("Cole Inventory Agent Error:", error);
        return NextResponse.json({ success: false, error: "Inventory check failed" }, { status: 500 });
    }
}
