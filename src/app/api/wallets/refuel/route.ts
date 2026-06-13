import { NextResponse } from "next/server";
import { db } from "@/db";
import { walletBalances, walletTransactions } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const { amountCents } = payload;

        if (!amountCents || typeof amountCents !== 'number' || amountCents <= 0) {
            return NextResponse.json({ success: false, error: "Invalid refuel amount" }, { status: 400 });
        }

        console.log(`[WALLETS] Initiating LLM credit refuel sequence: +$${(amountCents / 100).toFixed(2)}`);

        // 1. Atomically Increment the Master Balance Ledger using raw SQL fragments
        let currentWallet = null;

        // Try updating first (assuming 1 global wallet row)
        const updatedWallets = await db.update(walletBalances)
            .set({ 
                balanceCents: sql`${walletBalances.balanceCents} + ${amountCents}`,
                updatedAt: new Date(),
                status: 'Active'
            })
            .returning();

        // 2. Fallback: If no wallet exists yet, initialize it
        if (updatedWallets.length === 0) {
            console.log(`[WALLETS] No global wallet found. Initializing primary funding ledger...`);
            const [newWallet] = await db.insert(walletBalances).values({
                balanceCents: amountCents,
                status: 'Active'
            }).returning();
            currentWallet = newWallet;
        } else {
            currentWallet = updatedWallets[0];
        }

        // 3. Append the Immutable Transaction Ledger
        const [newTransaction] = await db.insert(walletTransactions).values({
            amountCents: amountCents,
            type: 'Credit',
            description: `Automated Dashboard Refuel (+${(amountCents / 100).toFixed(2)})`
        }).returning();

        console.log(`[WALLETS] Refuel Complete! New Global Balance: $${(currentWallet.balanceCents / 100).toFixed(2)}`);

        return NextResponse.json({ 
            success: true, 
            balance: currentWallet, 
            transaction: newTransaction 
        });

    } catch (error) {
        console.error("[WALLETS] Refuel Engine Error:", error);
        return NextResponse.json({ success: false, error: "Refuel injection failed" }, { status: 500 });
    }
}
