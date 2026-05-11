import { NextResponse } from "next/server";
import { db } from "@/db";
import { inbound_leads } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    // 1. Security Gate
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const expectedSecret = process.env.LEAD_PIONEER_SECRET;

    if (!expectedSecret || token !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Payload
    const payload = await req.json();

    // 3. Database Insert
    await db.insert(inbound_leads).values({
      source: payload.source,
      jobScope: payload.jobScope,
      estimatedPay: payload.estimatedPay,
      region: payload.region,
      sourceUrl: payload.sourceUrl,
      status: 'new'
    });

    // 4. Cache Refresh
    revalidatePath('/dashboard');

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Lead Pioneer Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
