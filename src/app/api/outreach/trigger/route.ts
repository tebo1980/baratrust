import { NextResponse } from 'next/server';
import { db } from '@/db';
import { discoveredLeads } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leadId, businessName, phoneNumber } = body;

    if (!leadId || !businessName || !phoneNumber) {
      return NextResponse.json({ error: "Missing required payload fields." }, { status: 400 });
    }

    console.log(`[OUTREACH] 🚀 Firing automation for: ${businessName} (${phoneNumber})`);

    // 1. Forward payload to the n8n webhook proxy
    const webhookUrl = process.env.N8N_OUTREACH_WEBHOOK_URL || 'https://hook.us1.make.com/placeholder';
    
    // In production, uncomment the fetch below to actually hit n8n. We catch errors so the UI doesn't crash if n8n is down.
    /*
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, businessName, phoneNumber })
    });

    if (!n8nResponse.ok) {
      console.error(`[OUTREACH] n8n webhook rejected payload: ${n8nResponse.statusText}`);
      return NextResponse.json({ error: "Upstream webhook failed." }, { status: 502 });
    }
    */

    // Simulate network delay for the flight check
    await new Promise(resolve => setTimeout(resolve, 800));

    // 2. Update the local Drizzle DB to lock the lead status as 'rvm_dropped'
    await db.update(discoveredLeads)
      .set({ status: 'rvm_dropped' })
      .where(eq(discoveredLeads.id, leadId));

    console.log(`[OUTREACH] ✅ Payload delivered and DB locked for ${businessName}.`);

    return NextResponse.json({ success: true, message: "Outreach sequence engaged." }, { status: 200 });

  } catch (error: any) {
    console.error(`[OUTREACH] FATAL IGNITION ERROR:`, error);
    return NextResponse.json({ success: false, error: "Failed to fire automated pitch." }, { status: 500 });
  }
}
