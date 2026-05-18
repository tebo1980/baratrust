import { NextResponse } from 'next/server';
import { db } from '@/db';
import { leads } from '@/db/schema';

export async function POST(req: Request) {
    try {
        // 1. Unpack the data payload sent from the Ghost
        const body = await req.json();
        const { originalPost, draftMessage, source } = body;

        console.log(`\n🛸 [MOTHERSHIP] INCOMING LEAD FROM ${source.toUpperCase()}:`);
        console.log(`POST: ${originalPost.substring(0, 50)}...`);

        // 2. Here is where you wire up your Neon Database!
        await db.insert(leads).values({
          source: source,
          originalText: originalPost,
          draftReply: draftMessage,
          status: 'pending_review'
        });

        // 3. Send a confirmation signal back to the Ghost
        return NextResponse.json({ success: true, message: "Lead secured in database." }, { status: 201 });

    } catch (error) {
        console.error("Transmission failed:", error);
        return NextResponse.json({ success: false, error: "Failed to process lead." }, { status: 500 });
    }
}