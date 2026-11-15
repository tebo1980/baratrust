import { NextResponse } from 'next/server';
import { db } from '@/db';
import { discoveredLeads } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { requireOperatorOrWebhookSecretAuth } from '@/lib/auth/operator';

// Increase max duration to prevent Vercel from timing out during heavy batch inserts
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_BATCH_LEADS = 250;

export async function POST(req: Request) {
  const auth = await requireOperatorOrWebhookSecretAuth(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    // 1. Strict Payload Extraction with Fallback Wrappers
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    const incomingLeads = body?.leads ?? [];

    if (!Array.isArray(incomingLeads) || incomingLeads.length === 0) {
      console.warn(`[FLYWHEEL] Empty or invalid payload stream received.`);
      return NextResponse.json({ error: "No leads found in payload" }, { status: 400 });
    }

    if (incomingLeads.length > MAX_BATCH_LEADS) {
      return NextResponse.json(
        { error: `Batch exceeds maximum of ${MAX_BATCH_LEADS} leads per request.` },
        { status: 400 }
      );
    }

    console.log(`\n🛸 [FLYWHEEL] INGESTING ${incomingLeads.length} RAW LEADS FROM RADAR SWEEP...`);

    // 2. The Negative Filter Validation Layer
    // We only stage businesses that lack an online footprint for high-value outreach.
    const validProspects = incomingLeads.filter((lead) => {
      // If the website is falsy, empty, or literally "null", they pass the negative filter.
      const hasWebsite =
        typeof lead?.website === 'string' &&
        lead.website.trim().length > 0 &&
        lead.website !== "null";
      const hasPlaceId = typeof lead?.googlePlaceId === 'string' && lead.googlePlaceId.trim().length > 0; // Core requirement for unique constraint

      return !hasWebsite && hasPlaceId;
    });

    console.log(`[FLYWHEEL] NEGATIVE FILTER APPLIED: ${validProspects.length} high-value targets acquired.`);

    if (validProspects.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "Payload processed, but no leads passed the negative footprint filter." 
      }, { status: 200 });
    }

    // 3. The Drizzle ORM Ingestion Query (Batch Upsert)
    // We utilize onConflictDoUpdate to elegantly handle overlapping sweeps without blowing up the DB.
    const insertionPayload = validProspects.map((prospect) => ({
      googlePlaceId: String(prospect.googlePlaceId).trim(),
      businessName: typeof prospect.businessName === 'string' && prospect.businessName.trim()
        ? prospect.businessName.trim()
        : "Unknown Trade Business",
      website: null, // Guaranteed to be null by our negative filter
      formattedAddress: typeof prospect.formattedAddress === 'string' ? prospect.formattedAddress : null,
      phoneNumber: typeof prospect.phoneNumber === 'string' ? prospect.phoneNumber : null,
      rating: String(prospect.rating || "0"),
      userRatingsTotal: Number(prospect.userRatingsTotal || 0),
      status: 'queued_for_outreach',
    }));

    await db.insert(discoveredLeads)
      .values(insertionPayload)
      .onConflictDoUpdate({
        target: discoveredLeads.googlePlaceId,
        set: {
          businessName: sql`EXCLUDED.business_name`,
          formattedAddress: sql`EXCLUDED.formatted_address`,
          phoneNumber: sql`EXCLUDED.phone_number`,
          rating: sql`EXCLUDED.rating`,
          userRatingsTotal: sql`EXCLUDED.user_ratings_total`,
        }
      });

    console.log(`[FLYWHEEL] INGESTION COMPLETE. Database locked.`);

    // 4. Return Clean Telemetry
    return NextResponse.json({ 
      success: true, 
      ingestedCount: validProspects.length,
      message: "Lead flywheel ingestion successful." 
    }, { status: 201 });

  } catch (error: unknown) {
    console.error(`[FLYWHEEL] FATAL INGESTION ERROR:`, error);
    // Graceful fallback to prevent serverless container freezing
    return NextResponse.json({ 
      success: false, 
      error: "Flywheel ingestion pipeline failed." 
    }, { status: 500 });
  }
}
