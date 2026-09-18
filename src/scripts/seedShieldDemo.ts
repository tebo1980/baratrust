import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

process.env.DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_DATABASE_URL;

import crypto from 'crypto';

async function run() {
  const { db } = await import('../db');
  const { shieldProjects, shieldStatutoryDeadlines, shieldArcPackets, shieldSiteTelemetryProofs } = await import('../db/schema');
  const { calculateStatutoryDeadlines } = await import('../utils/lienEngine');

  console.log('🌱 Seeding BaraTrust Shield Demo Data...');

  console.log('🧹 Cleaning existing records...');
  await db.delete(shieldSiteTelemetryProofs);
  await db.delete(shieldArcPackets);
  await db.delete(shieldStatutoryDeadlines);
  await db.delete(shieldProjects);

  // 1. Project 1: URGENT Pre-Lien Alert (Indiana, Existing Residential)
  const p1Furnished = new Date();
  p1Furnished.setDate(p1Furnished.getDate() - 24); // 24 days ago
  
  const [p1] = await db.insert(shieldProjects).values({
    clientDetails: '124 Maple St - Kitchen/Bath Remodel',
    contractorRole: 'Subcontractor',
    projectType: 'Existing Residential',
    contractAmount: 1450000, // $14,500.00
    firstFurnishedDate: p1Furnished,
  }).returning();

  const p1Deadlines = calculateStatutoryDeadlines('IN', 'Existing Residential', p1Furnished, new Date());
  for (const dl of p1Deadlines) {
    await db.insert(shieldStatutoryDeadlines).values({
      projectId: p1.id,
      statuteCode: dl.statuteCode,
      noticeType: dl.noticeType,
      dueDate: dl.dueDate,
    });
  }
  console.log('✅ Created Project 1: URGENT Pre-Lien Alert');

  // 2. Project 2: HOA ARC Packet Pending (Kentucky, Exterior Roof)
  const p2Furnished = new Date();
  p2Furnished.setDate(p2Furnished.getDate() - 10);
  
  const [p2] = await db.insert(shieldProjects).values({
    clientDetails: '900 Bluegrass Pkwy - Full Roof Replacement',
    contractorRole: 'GC',
    projectType: 'Existing Residential',
    contractAmount: 2200000, // $22,000.00
    firstFurnishedDate: p2Furnished,
  }).returning();

  const p2Deadlines = calculateStatutoryDeadlines('KY', 'Existing Residential', p2Furnished, new Date());
  for (const dl of p2Deadlines) {
    await db.insert(shieldStatutoryDeadlines).values({
      projectId: p2.id,
      statuteCode: dl.statuteCode,
      noticeType: dl.noticeType,
      dueDate: dl.dueDate,
    });
  }

  await db.insert(shieldArcPackets).values({
    projectId: p2.id,
    hoaName: 'Highlands Neighborhood HOA',
    tradeType: 'Roofing',
    specSheetJson: {
      material: 'Duration Architectural Shingles',
      color: 'Onyx Black',
      manufacturer: 'Owens Corning'
    },
    status: 'SUBMITTED',
  });
  console.log('✅ Created Project 2: HOA ARC Packet Pending');

  // 3. Project 3: Secured / First Furnishing Logged (Fence Build)
  const p3Furnished = new Date();
  p3Furnished.setDate(p3Furnished.getDate() - 2);
  
  const [p3] = await db.insert(shieldProjects).values({
    clientDetails: '445 Oakwood Dr - Cedar Privacy Fence',
    contractorRole: 'GC',
    projectType: 'Existing Residential',
    contractAmount: 850000, // $8,500.00
    firstFurnishedDate: p3Furnished,
  }).returning();

  const p3Deadlines = calculateStatutoryDeadlines('IN', 'Existing Residential', p3Furnished, new Date());
  for (const dl of p3Deadlines) {
    await db.insert(shieldStatutoryDeadlines).values({
      projectId: p3.id,
      statuteCode: dl.statuteCode,
      noticeType: dl.noticeType,
      dueDate: dl.dueDate,
    });
  }

  const hashPayload = `${p3.id}-38.2527--85.7585-${Date.now()}`;
  const mockHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

  await db.insert(shieldSiteTelemetryProofs).values({
    projectId: p3.id,
    gpsLat: '38.2527',
    gpsLng: '-85.7585',
    accuracyMeters: 4,
    photoVaultLink: 'https://example.com/mock-fence-photo.jpg',
    cryptographicTamperHash: mockHash,
  });
  console.log('✅ Created Project 3: Site Telemetry Logged');

  console.log('🎉 Seeding complete!');
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
});
