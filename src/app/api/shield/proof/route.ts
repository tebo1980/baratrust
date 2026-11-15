import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '@/db';
import { shieldProjects, shieldSiteTelemetryProofs } from '@/db/schema';
import { requireOperatorApiAuth } from '@/lib/auth/operator';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireOperatorApiAuth();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { projectId, lat, lng, photoUrl } = body;

    const parsedProjectId = Number.parseInt(String(projectId), 10);
    if (
      !Number.isInteger(parsedProjectId) ||
      parsedProjectId <= 0 ||
      lat === undefined ||
      lng === undefined ||
      !photoUrl ||
      typeof photoUrl !== 'string'
    ) {
      return NextResponse.json({ error: 'Missing required telemetry fields' }, { status: 400 });
    }

    const timestamp = Date.now().toString();
    const hashPayload = `${parsedProjectId}-${lat}-${lng}-${timestamp}`;
    const cryptographicTamperHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    await db.insert(shieldSiteTelemetryProofs).values({
      projectId: parsedProjectId,
      gpsLat: lat.toString(),
      gpsLng: lng.toString(),
      photoVaultLink: photoUrl,
      cryptographicTamperHash,
    });

    // ⚡ Automatic Statutory Clock Anchor: Set first_furnished_date if not set
    const project = await db.select().from(shieldProjects).where(eq(shieldProjects.id, parsedProjectId)).limit(1);
    if (project.length > 0 && !project[0].firstFurnishedDate) {
      await db.update(shieldProjects)
        .set({ firstFurnishedDate: new Date() })
        .where(eq(shieldProjects.id, parsedProjectId));
    }

    console.log(`[SHIELD] 📸 Telemetry Proof ingested. Hash: ${cryptographicTamperHash}`);
    return NextResponse.json({ success: true, hash: cryptographicTamperHash }, { status: 201 });
  } catch (error: unknown) {
    console.error('[SHIELD] Telemetry ingestion error:', error);
    return NextResponse.json({ error: 'Failed to persist site telemetry' }, { status: 500 });
  }
}
