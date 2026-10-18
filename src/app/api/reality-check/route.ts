import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '@/db';
import { realityChecks, scanFindings } from '@/db/schema';
import { executeDeterministicScan } from '@/lib/scanner';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const RealityCheckSubmissionSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(200),
  website: z.string().min(1, 'Website or social URL is required').max(500),
  cityState: z.string().min(1, 'City and state are required').max(100),
  ownerName: z.string().min(1, 'Owner name is required').max(100),
  email: z.string().email('Valid email address is required').max(200),
  phone: z.string().max(50).optional().nullable(),
  businessType: z.string().max(100).optional().nullable(),
  primaryHeadache: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const validation = RealityCheckSubmissionSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Validation failed';
      return NextResponse.json({ error: firstError, details: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;
    const shareToken = crypto.randomBytes(16).toString('hex');

    // 1. Create the persistent Reality Check record in Postgres
    // This guarantees the lead is preserved even if the scanner fails or times out
    const [record] = await db
      .insert(realityChecks)
      .values({
        businessName: data.businessName,
        website: data.website,
        cityState: data.cityState,
        ownerName: data.ownerName,
        email: data.email.toLowerCase().trim(),
        phone: data.phone || null,
        businessType: data.businessType || null,
        primaryHeadache: data.primaryHeadache || null,
        status: 'NEW',
        scanStatus: 'pending',
        shareToken,
      })
      .returning();

    // 2. Execute deterministic website scan
    let scanResult;
    try {
      scanResult = await executeDeterministicScan({
        websiteUrl: data.website,
        businessName: data.businessName,
        cityState: data.cityState,
      });
    } catch (scanErr: any) {
      console.error('[SCANNER ERROR]', scanErr);
      scanResult = {
        scanStatus: 'failed' as const,
        scanFailureReason: `Unexpected scanner error: ${scanErr.message || 'unknown'}`,
        overallScore: null,
        scoreBreakdown: null,
        findings: [],
        normalizedUrl: data.website,
        scannedAt: new Date().toISOString(),
      };
    }

    // 3. Persist scan findings in Postgres
    if (scanResult.findings && scanResult.findings.length > 0) {
      const findingRows = scanResult.findings.map((f) => ({
        realityCheckId: record.id,
        category: f.category,
        checkKey: f.checkKey,
        title: f.title,
        state: f.state,
        scoreContribution: f.scoreContribution,
        maxPoints: f.maxPoints,
        observedValue: f.observedValue,
        evidenceSource: f.evidenceSource,
        evidenceLabel: f.evidenceLabel,
        supportingDetail: f.supportingDetail,
      }));

      try {
        await db.insert(scanFindings).values(findingRows);
      } catch (insertErr) {
        console.error('[DB FINDINGS ERROR] Failed to save findings:', insertErr);
      }
    }

    // 4. Update the Reality Check record with scores and scan status
    try {
      const { eq } = await import('drizzle-orm');
      await db
        .update(realityChecks)
        .set({
          status: scanResult.scanStatus === 'completed' ? 'AUTO_SCAN_COMPLETE' : 'NEEDS_HUMAN_REVIEW',
          scanStatus: scanResult.scanStatus,
          scanFailureReason: scanResult.scanFailureReason || null,
          overallScore: scanResult.overallScore,
          scoreBreakdown: scanResult.scoreBreakdown,
          normalizedUrl: scanResult.normalizedUrl || data.website,
          updatedAt: new Date(),
        })
        .where(eq(realityChecks.id, record.id));
    } catch (updateErr) {
      console.error('[DB UPDATE ERROR] Failed to update reality check record:', updateErr);
    }

    // 5. Operator Notification (email to Todd & Noelah)
    // Non-blocking so notification service delays never block user response
    sendOperatorNotification({
      businessName: data.businessName,
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone || 'None provided',
      website: data.website,
      cityState: data.cityState,
      primaryHeadache: data.primaryHeadache || 'None noted',
      overallScore: scanResult.overallScore,
      scanStatus: scanResult.scanStatus,
      shareToken,
    }).catch((notifErr) => {
      console.warn('[OPERATOR NOTIFICATION WARNING]', notifErr.message);
    });

    return NextResponse.json({
      success: true,
      realityCheckId: record.id,
      shareToken,
      scanStatus: scanResult.scanStatus,
      overallScore: scanResult.overallScore,
      overallCoverage: scanResult.overallCoverage,
      confidence: scanResult.confidence,
      scoreBreakdown: scanResult.scoreBreakdown,
      findingsCount: scanResult.findings.length,
      message: 'Business Reality Check successfully initiated.',
    });
  } catch (err: any) {
    console.error('[REALITY CHECK SUBMISSION ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during submission.' },
      { status: 500 }
    );
  }
}

/**
 * Sends notification email to Todd and Noelah about the new submission.
 * Non-blocking, fails gracefully.
 */
async function sendOperatorNotification(info: {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  website: string;
  cityState: string;
  primaryHeadache: string;
  overallScore: number | null;
  scanStatus: string;
  shareToken: string;
}) {
  const subject = `[New Reality Check] ${info.businessName} (${info.cityState}) — Score: ${info.overallScore !== null ? info.overallScore : 'Pending Review'}`;
  const message = [
    `New Business Reality Check received:`,
    ``,
    `Business: ${info.businessName}`,
    `Location: ${info.cityState}`,
    `Owner: ${info.ownerName}`,
    `Email: ${info.email}`,
    `Phone: ${info.phone}`,
    `Website: ${info.website}`,
    `Scan Status: ${info.scanStatus}`,
    `Automated Score: ${info.overallScore !== null ? `${info.overallScore} / 100` : 'Scan Deferred (Human Review Required)'}`,
    `Primary Headache: ${info.primaryHeadache}`,
    ``,
    `Internal Review Token: ${info.shareToken}`,
  ].join('\n');

  // If Formspree notification webhook is available in env or fallback endpoint
  const endpoint = process.env.FORMSPREE_OPERATOR_ENDPOINT || 'https://formspree.io/f/xeaovlgo';
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: subject,
        name: info.ownerName,
        email: info.email,
        message,
      }),
    });
    console.log(`[OPERATOR NOTIFICATION SENT] ${subject}`);
  } catch (e: any) {
    console.log(`[OPERATOR NOTIFICATION LOGGED ONLY] ${subject}: ${e.message}`);
  }
}
