import { NextResponse } from 'next/server';
import { db } from '@/db';
import { shieldSiteTelemetryProofs } from '@/db/schema';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, lat, lng, photoUrl } = body;

    if (!projectId || !lat || !lng || !photoUrl) {
      return NextResponse.json({ error: 'Missing required telemetry fields' }, { status: 400 });
    }

    const timestamp = Date.now().toString();
    const hashPayload = `${projectId}-${lat}-${lng}-${timestamp}`;
    const cryptographicTamperHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    await db.insert(shieldSiteTelemetryProofs).values({
      projectId: parseInt(projectId),
      gpsLat: lat.toString(),
      gpsLng: lng.toString(),
      photoVaultLink: photoUrl,
      cryptographicTamperHash,
    });

    // ⚡ Automatic Statutory Clock Anchor: Set first_furnished_date if not set
    const { eq } = require('drizzle-orm');
    const { shieldProjects } = require('@/db/schema');
    const project = await db.select().from(shieldProjects).where(eq(shieldProjects.id, parseInt(projectId))).limit(1);
    if (project.length > 0 && !project[0].firstFurnishedDate) {
      await db.update(shieldProjects)
        .set({ firstFurnishedDate: new Date() })
        .where(eq(shieldProjects.id, parseInt(projectId)));
    }

    console.log(`[SHIELD] 📸 Telemetry Proof ingested. Hash: ${cryptographicTamperHash}`);
    return NextResponse.json({ success: true, hash: cryptographicTamperHash }, { status: 201 });
  } catch (error: any) {
    console.error('[SHIELD] Telemetry ingestion error:', error);
    return NextResponse.json({ error: 'Failed to persist site telemetry' }, { status: 500 });
  }
}
