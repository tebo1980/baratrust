import { NextResponse } from 'next/server';
import { db } from '@/db';
import { leads } from '@/db/schema';
import {
  requireOperatorApiAuth,
  requireOperatorOrWebhookSecretAuth,
} from '@/lib/auth/operator';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const auth = await requireOperatorOrWebhookSecretAuth(req);
    if (!auth.ok) {
        return auth.response;
    }

    try {
        // 1. Unpack the data payload sent from the Ghost
        let body: Record<string, unknown>;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ success: false, error: 'Malformed JSON payload.' }, { status: 400 });
        }

        const originalPost = typeof body?.originalPost === 'string' ? body.originalPost.trim() : '';
        const draftMessage = typeof body?.draftMessage === 'string' ? body.draftMessage.trim() : null;
        const source = typeof body?.source === 'string' ? body.source.trim() : '';

        if (!source || !originalPost || originalPost.length > 20000 || source.length > 2048) {
            return NextResponse.json(
                { success: false, error: 'Valid source and originalPost are required.' },
                { status: 400 }
            );
        }

        console.log(`\n🛸 [MOTHERSHIP] INCOMING LEAD FROM ${source.toUpperCase()}:`);

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

export async function GET() {
    const auth = await requireOperatorApiAuth();
    if (!auth.ok) {
        return auth.response;
    }

    try {
        const { desc } = await import('drizzle-orm');
        const rawLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
        return NextResponse.json({ success: true, data: rawLeads }, { status: 200 });
    } catch (error) {
        console.error("Lead fetch failed:", error);
        // Strict fallback framework: return empty dataset instead of a UI alert
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }
}
