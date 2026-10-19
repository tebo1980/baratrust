import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { realityChecks, scanFindings, ownerResponses } from '@/db/schema';
import { executeDeterministicScan, classifySubmittedUrl } from '@/lib/scanner';
import {
  RealityCheckSubmissionSchema,
  RequestHumanReviewSchema,
  resolveInitialRealityCheckStatus,
  evaluateHumanReviewClaim,
} from '@/lib/reality-check/funnel';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const PLATFORM_INFRASTRUCTURE_CHECK_KEYS = new Set([
  'https_enabled',
  'page_responds',
  'mobile_viewport',
  'has_favicon',
  'opengraph_presence',
  'local_business_schema',
  'terms_privacy',
]);

function formatPublicFinding(f: {
  category: string;
  checkKey: string;
  title: string;
  state: string;
  scoreContribution: number;
  maxPoints: number;
  supportingDetail: string | null;
}) {
  return {
    category: f.category,
    checkKey: f.checkKey,
    title: f.title,
    state: f.state as 'PASS' | 'FAIL' | 'UNKNOWN',
    scoreContribution: f.scoreContribution,
    maxPoints: f.maxPoints,
    supportingDetail: f.supportingDetail || '',
  };
}

/**
 * GET /api/reality-check?shareToken=...
 * Safely retrieves the public automated scan snapshot for a Reality Check so browser refresh
 * or back/forward navigation restores state without re-running the scan or leaking PII.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shareToken = searchParams.get('shareToken')?.trim();

    if (!shareToken || shareToken.length < 16) {
      return NextResponse.json({ error: 'Valid share token is required' }, { status: 400 });
    }

    const [check] = await db
      .select()
      .from(realityChecks)
      .where(eq(realityChecks.shareToken, shareToken))
      .limit(1);

    if (!check) {
      return NextResponse.json({ error: 'Reality Check not found' }, { status: 404 });
    }

    const findings = await db
      .select()
      .from(scanFindings)
      .where(eq(scanFindings.realityCheckId, check.id));

    const [ownerResp] = await db
      .select()
      .from(ownerResponses)
      .where(eq(ownerResponses.realityCheckId, check.id))
      .limit(1);

    const platform = classifySubmittedUrl(check.website, check.normalizedUrl || undefined);
    const isUnclaimedLegacyHostedScan =
      platform.isHostedProfile &&
      !check.scoreBreakdown?.sourceType &&
      !check.email &&
      !ownerResp &&
      (check.status === 'AUTO_SCAN_COMPLETE' || check.status === 'NEW');

    if (isUnclaimedLegacyHostedScan) {
      try {
        const refreshed = await executeDeterministicScan({
          websiteUrl: check.website,
          businessName: check.businessName,
          cityState: check.cityState,
        });

        await db.delete(scanFindings).where(eq(scanFindings.realityCheckId, check.id));
        if (refreshed.findings.length > 0) {
          await db.insert(scanFindings).values(
            refreshed.findings.map((f) => ({
              realityCheckId: check.id,
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
            }))
          );
        }

        const effectiveBusinessName = check.businessName || refreshed.derivedBusinessName || null;
        const effectiveCityState = check.cityState || refreshed.derivedCityState || null;

        await db
          .update(realityChecks)
          .set({
            businessName: effectiveBusinessName,
            cityState: effectiveCityState,
            scanStatus: refreshed.scanStatus,
            scanFailureReason: refreshed.scanFailureReason || null,
            overallScore: refreshed.overallScore,
            scoreBreakdown: refreshed.scoreBreakdown,
            normalizedUrl: refreshed.normalizedUrl || check.website,
            updatedAt: new Date(),
          })
          .where(eq(realityChecks.id, check.id));

        return NextResponse.json({
          success: true,
          shareToken: check.shareToken,
          website: check.website,
          normalizedUrl: refreshed.normalizedUrl || check.website,
          businessName: effectiveBusinessName,
          cityState: effectiveCityState,
          sourceType: refreshed.sourceType || platform.sourceType,
          platformKey: refreshed.platformKey ?? platform.platformKey,
          platformLabel: refreshed.platformLabel ?? platform.platformLabel,
          status: check.status,
          scanStatus: refreshed.scanStatus,
          scanFailureReason: refreshed.scanFailureReason || null,
          overallScore: null,
          overallCoverage: refreshed.overallCoverage,
          confidence: refreshed.confidence,
          scoreBreakdown: refreshed.scoreBreakdown,
          findingsCount: refreshed.findings.length,
          findings: refreshed.findings.map(formatPublicFinding),
          humanReviewRequested: false,
          questionnaireCompleted: false,
        });
      } catch (refreshErr) {
        console.warn('[HOSTED PROFILE SNAPSHOT REFRESH WARNING]', refreshErr);
      }
    }

    const sourceType = check.scoreBreakdown?.sourceType || platform.sourceType;
    const platformKey = check.scoreBreakdown?.platformKey ?? platform.platformKey;
    const platformLabel = check.scoreBreakdown?.platformLabel ?? platform.platformLabel;
    const isHostedProfile = sourceType === 'hosted_profile' || platform.isHostedProfile;

    const filteredFindings = isHostedProfile
      ? findings.filter((f) => !PLATFORM_INFRASTRUCTURE_CHECK_KEYS.has(f.checkKey))
      : findings;

    const coverage = check.scoreBreakdown?.coverage;

    return NextResponse.json({
      success: true,
      shareToken: check.shareToken,
      website: check.website,
      normalizedUrl: check.normalizedUrl || check.website,
      businessName: check.businessName || null,
      cityState: check.cityState || null,
      sourceType,
      platformKey,
      platformLabel,
      status: check.status,
      scanStatus: check.scanStatus,
      scanFailureReason: check.scanFailureReason || null,
      overallScore: isHostedProfile ? null : check.overallScore,
      overallCoverage: coverage?.overall ?? 0,
      confidence: coverage?.confidence ?? 'INSUFFICIENT',
      scoreBreakdown: check.scoreBreakdown || null,
      findingsCount: filteredFindings.length,
      findings: filteredFindings.map(formatPublicFinding),
      humanReviewRequested: Boolean(check.email),
      questionnaireCompleted: Boolean(ownerResp),
    });
  } catch (err: any) {
    console.error('[REALITY CHECK GET ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to load Reality Check snapshot.' },
      { status: 500 }
    );
  }
}

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
    const cleanEmail = data.email ? data.email.toLowerCase().trim() : null;
    const cleanBusinessName = data.businessName ? data.businessName.trim() : null;
    const cleanCityState = data.cityState ? data.cityState.trim() : null;
    const cleanOwnerName = data.ownerName ? data.ownerName.trim() : null;
    const shareToken = crypto.randomBytes(16).toString('hex');

    // 1. Create the persistent Reality Check record in Postgres
    // Real NULLs are used for unprovided fields — never fake placeholders.
    const [record] = await db
      .insert(realityChecks)
      .values({
        businessName: cleanBusinessName,
        website: data.website.trim(),
        cityState: cleanCityState,
        ownerName: cleanOwnerName,
        email: cleanEmail,
        phone: data.phone ? data.phone.trim() : null,
        businessType: data.businessType ? data.businessType.trim() : null,
        primaryHeadache: data.primaryHeadache ? data.primaryHeadache.trim() : null,
        status: 'NEW',
        scanStatus: 'pending',
        shareToken,
      })
      .returning();

    // 2. Execute deterministic website scan
    let scanResult;
    try {
      scanResult = await executeDeterministicScan({
        websiteUrl: data.website.trim(),
        businessName: cleanBusinessName,
        cityState: cleanCityState,
      });
    } catch (scanErr: any) {
      console.error('[SCANNER ERROR]', scanErr);
      scanResult = {
        scanStatus: 'failed' as const,
        scanFailureReason: `Unexpected scanner error: ${scanErr.message || 'unknown'}`,
        overallScore: null,
        overallCoverage: 0,
        confidence: 'INSUFFICIENT' as const,
        scoreBreakdown: null,
        categoryScores: [],
        findings: [],
        normalizedUrl: data.website.trim(),
        derivedBusinessName: null,
        derivedCityState: null,
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

    // 4. Determine provisional business name / cityState if reliably derived by scanner
    const effectiveBusinessName = cleanBusinessName || scanResult.derivedBusinessName || null;
    const effectiveCityState = cleanCityState || scanResult.derivedCityState || null;

    const nextStatus = resolveInitialRealityCheckStatus(cleanEmail);

    // 5. Update the Reality Check record with scores, scan status, and derived metadata
    try {
      await db
        .update(realityChecks)
        .set({
          businessName: effectiveBusinessName,
          cityState: effectiveCityState,
          status: nextStatus,
          scanStatus: scanResult.scanStatus,
          scanFailureReason: scanResult.scanFailureReason || null,
          overallScore: scanResult.overallScore,
          scoreBreakdown: scanResult.scoreBreakdown,
          normalizedUrl: scanResult.normalizedUrl || data.website.trim(),
          updatedAt: new Date(),
        })
        .where(eq(realityChecks.id, record.id));
    } catch (updateErr) {
      console.error('[DB UPDATE ERROR] Failed to update reality check record:', updateErr);
    }

    // 6. Operator Notification (only when human review is requested with an email)
    if (cleanEmail) {
      sendOperatorNotification({
        businessName: effectiveBusinessName || data.website.trim(),
        ownerName: cleanOwnerName || 'Not provided',
        email: cleanEmail,
        phone: data.phone || 'None provided',
        website: data.website.trim(),
        cityState: effectiveCityState || 'Not specified',
        primaryHeadache: data.primaryHeadache || 'None noted',
        overallScore: scanResult.overallScore,
        scanStatus: scanResult.scanStatus,
        shareToken,
      }).catch((notifErr) => {
        console.warn('[OPERATOR NOTIFICATION WARNING]', notifErr.message);
      });
    }

    const fallbackPlatform = classifySubmittedUrl(
      data.website.trim(),
      scanResult.normalizedUrl || undefined
    );

    return NextResponse.json({
      success: true,
      shareToken,
      website: data.website.trim(),
      normalizedUrl: scanResult.normalizedUrl || data.website.trim(),
      businessName: effectiveBusinessName,
      cityState: effectiveCityState,
      sourceType: scanResult.sourceType || fallbackPlatform.sourceType,
      platformKey: scanResult.platformKey ?? fallbackPlatform.platformKey,
      platformLabel: scanResult.platformLabel ?? fallbackPlatform.platformLabel,
      status: nextStatus,
      scanStatus: scanResult.scanStatus,
      scanFailureReason: scanResult.scanFailureReason || null,
      overallScore: scanResult.overallScore,
      overallCoverage: scanResult.overallCoverage,
      confidence: scanResult.confidence,
      scoreBreakdown: scanResult.scoreBreakdown,
      categoryScores: scanResult.categoryScores || [],
      findingsCount: scanResult.findings.length,
      findings: scanResult.findings.map(formatPublicFinding),
      humanReviewRequested: Boolean(cleanEmail),
      message: 'Business Reality Check scan completed.',
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
 * PATCH /api/reality-check
 * Step 3: Attaches the visitor's email (and optional businessName/ownerName/cityState) to the existing
 * Reality Check record identified by its unguessable shareToken, and transitions status to NEEDS_HUMAN_REVIEW.
 * Safe against double-clicks, retries, and token tampering.
 */
export async function PATCH(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const validation = RequestHumanReviewSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Validation failed';
      return NextResponse.json({ error: firstError, details: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;

    const [existing] = await db
      .select()
      .from(realityChecks)
      .where(eq(realityChecks.shareToken, data.shareToken))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Could not find a matching Reality Check for this token.' },
        { status: 404 }
      );
    }

    const claim = evaluateHumanReviewClaim(existing, data);
    if (!claim.allowed) {
      return NextResponse.json(
        { error: claim.error, code: claim.reason },
        { status: claim.httpStatus }
      );
    }

    let wonInitialClaim = false;
    let finalBusinessName = claim.businessName;
    let finalOwnerName = claim.ownerName;
    let finalCityState = claim.cityState;
    let finalStatus = claim.nextStatus;

    if (claim.isInitialClaim) {
      // Atomic conditional claim: only succeeds if email is still NULL
      const [claimedRow] = await db
        .update(realityChecks)
        .set({
          email: claim.email,
          businessName: claim.businessName,
          ownerName: claim.ownerName,
          cityState: claim.cityState,
          status: claim.nextStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(realityChecks.id, existing.id), isNull(realityChecks.email)))
        .returning();

      if (claimedRow) {
        wonInitialClaim = true;
      } else {
        // Concurrent request claimed this scan first — verify whether it was the same email or a conflicting email
        const [latest] = await db
          .select()
          .from(realityChecks)
          .where(eq(realityChecks.id, existing.id))
          .limit(1);

        if (!latest) {
          return NextResponse.json(
            { error: 'Could not find a matching Reality Check for this token.' },
            { status: 404 }
          );
        }

        const raceEval = evaluateHumanReviewClaim(latest, data);
        if (!raceEval.allowed) {
          return NextResponse.json(
            { error: raceEval.error, code: raceEval.reason },
            { status: raceEval.httpStatus }
          );
        }

        finalBusinessName = raceEval.businessName;
        finalOwnerName = raceEval.ownerName;
        finalCityState = raceEval.cityState;
        finalStatus = raceEval.nextStatus;
      }
    } else {
      // Idempotent retry by the same normalized email: only backfill previously-null optional fields
      await db
        .update(realityChecks)
        .set({
          businessName: claim.businessName,
          ownerName: claim.ownerName,
          cityState: claim.cityState,
          status: claim.nextStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(realityChecks.id, existing.id), eq(realityChecks.email, existing.email!)));
    }

    // Strictly dispatch operator notification once on the winning initial transition
    if (wonInitialClaim) {
      sendOperatorNotification({
        businessName: finalBusinessName || existing.website,
        ownerName: finalOwnerName || 'Not provided',
        email: claim.email,
        phone: existing.phone || 'None provided',
        website: existing.website,
        cityState: finalCityState || 'Not specified',
        primaryHeadache: existing.primaryHeadache || 'None noted',
        overallScore: existing.overallScore,
        scanStatus: existing.scanStatus,
        shareToken: existing.shareToken,
      }).catch((notifErr) => {
        console.warn('[OPERATOR NOTIFICATION WARNING]', notifErr.message);
      });
    }

    return NextResponse.json({
      success: true,
      shareToken: existing.shareToken,
      businessName: finalBusinessName,
      cityState: finalCityState,
      status: finalStatus,
      humanReviewRequested: true,
      alreadyRequested: !wonInitialClaim,
      message: 'Human review requested. Todd & Noelah will review your business and email your finished report.',
    });
  } catch (err: any) {
    console.error('[REALITY CHECK PATCH ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save human review request.' },
      { status: 500 }
    );
  }
}

/**
 * Sends notification email to Todd and Noelah about the new human-review request.
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
    `New Business Reality Check human review requested:`,
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
