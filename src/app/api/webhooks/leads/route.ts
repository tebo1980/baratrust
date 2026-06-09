import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { leads } from "@/db/schema";

// 1. Zod schema for incoming lead payload
const leadPayloadSchema = z.object({
  title: z.string().optional(),
  price: z.string().optional(),
  summary: z.string().optional(),
  city: z.string().optional(),
  source: z.string().url().optional(),
  tradeSector: z.string(),
  prospectContact: z.string(),
  geographicMetadata: z.string(),
});

export async function POST(req: Request) {
  try {
    // 2. Token Guard
    const authHeader = req.headers.get("Authorization");
    const secretKey = process.env.WEBHOOK_SECRET_KEY;
    
    if (!secretKey || authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate payload
    const parsedData = leadPayloadSchema.parse(body);

    // 3. Database Commit (Neon Postgres via Drizzle)
    const [newLead] = await db.insert(leads).values({
      title: parsedData.title,
      price: parsedData.price,
      summary: parsedData.summary,
      city: parsedData.city,
      source: parsedData.source,
      tradeSector: parsedData.tradeSector,
      prospectContact: parsedData.prospectContact,
      geographicMetadata: parsedData.geographicMetadata,
      status: "Inbound Intercepts",
      originalText: JSON.stringify(body),
    }).returning();

    // 4. Concurrent Agent Dispatch (Fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${appUrl}/api/engage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Mocking the required payload for Brix/Della based on typical engage input
      body: JSON.stringify({ 
        leadId: newLead.id, 
        title: newLead.title || newLead.tradeSector, 
        description: newLead.summary || newLead.prospectContact, 
        region: newLead.geographicMetadata 
      })
    }).catch((err) => console.error("Concurrent dispatch failed:", err));

    // 5. Fast Acknowledgment
    return NextResponse.json({ success: true, leadId: newLead.id });

  } catch (error) {
    console.error("Webhook Ingestion Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload format", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
