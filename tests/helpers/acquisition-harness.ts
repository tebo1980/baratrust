import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getTableColumns, getTableName, SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pg-proxy';
import * as schema from '../../src/db/schema';
import {
  evaluateClerkOperatorIdentity,
  type ClerkLikeUser,
  type OperatorUser,
} from '../../src/lib/auth/operator';
import * as realScanner from '../../src/lib/scanner';
import { loadModule } from './publication-harness';

const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => {
    exec(sql: string): void;
    prepare(sql: string): { all(...params: unknown[]): Record<string, unknown>[] };
    close(): void;
  };
};

type RealityCheckRoute = typeof import('../../src/app/api/reality-check/route');
type QuestionnaireRoute = typeof import('../../src/app/api/reality-check/questionnaire/route');
type ConversionEventRoute = typeof import('../../src/app/api/conversion-event/route');
type AcquisitionCollectionRoute = typeof import('../../src/app/api/internal/acquisition/route');
type AcquisitionDetailRoute = typeof import('../../src/app/api/internal/acquisition/[prospectId]/route');
type AcquisitionAssistRoute = typeof import('../../src/app/api/internal/acquisition/[prospectId]/assist/route');
type CustomerInquiriesRoute = typeof import('../../src/app/api/customer-inquiries/route');
type CustomerInquiriesSyncRoute = typeof import('../../src/app/api/customer-inquiries/sync/route');

export async function createAcquisitionTestHarness() {
  const storage = new DatabaseSync(':memory:');
  const tables = [
    schema.businesses,
    schema.realityChecks,
    schema.scanFindings,
    schema.ownerResponses,
    schema.humanReviews,
    schema.acquisitionProspects,
    schema.acquisitionContactLogs,
    schema.publicConversionEvents,
    schema.publicRateLimits,
    schema.websiteCustomerInquiries,
  ];

  for (const table of tables) {
    const cols = Object.values(getTableColumns(table)).map((col) => {
      const sqlType = col.getSQLType();
      if (sqlType === 'serial') {
        return `"${col.name}" INTEGER PRIMARY KEY AUTOINCREMENT`;
      }
      if (sqlType === 'integer' || sqlType === 'boolean') {
        return col.primary ? `"${col.name}" INTEGER PRIMARY KEY` : `"${col.name}" INTEGER`;
      }
      if (col.primary) return `"${col.name}" TEXT PRIMARY KEY`;
      if (col.isUnique) return `"${col.name}" TEXT UNIQUE`;
      return `"${col.name}" TEXT`;
    });
    storage.exec(`CREATE TABLE "${getTableName(table)}" (${cols.join(', ')})`);
  }

  const dialect = new PgDialect();
  let dbFailureMode: 'none' | 'rate_limit_only' | 'all' = 'none';
  let scanExecutionCount = 0;

  const db = drizzle(async (query, rawParams) => {
    if (dbFailureMode === 'all') {
      throw new Error('SIMULATED_NEON_OUTAGE_SECRET_HOST_DETAIL');
    }
    if (dbFailureMode === 'rate_limit_only' && /public_rate_limits/i.test(query)) {
      throw new Error('SIMULATED_RATE_LIMIT_TABLE_FAILURE_SECRET_DETAIL');
    }

    let sql = query.replace(/\$\d+/g, '?');
    const headerMatch = /^insert into "([^"]+)" \(([^)]+)\) values /i.exec(sql);

    if (headerMatch && /\bdefault\b/i.test(sql)) {
      const tableName = headerMatch[1];
      const table = tables.find((t) => getTableName(t) === tableName);
      if (table) {
        const columns = Object.values(getTableColumns(table));
        const colNames = headerMatch[2].split(', ').map((n) => n.replaceAll('"', '').trim());

        const returningIdx = sql.toLowerCase().lastIndexOf(' returning ');
        const valuesSlice =
          returningIdx >= 0
            ? sql.slice(headerMatch[0].length, returningIdx)
            : sql.slice(headerMatch[0].length);
        const suffix = returningIdx >= 0 ? sql.slice(returningIdx) : '';

        const resolvedValuesSlice = valuesSlice.replace(/\(([^()]+)\)/g, (_tuple, inner: string) => {
          const tokens = inner.split(', ').map((token, idx) => {
            if (token.trim() !== 'default') return token;
            const col = columns.find((c) => c.name === colNames[idx]);
            if (!col) return 'NULL';
            const fallback = col.default;
            if (fallback instanceof SQL) {
              const expr = dialect.sqlToQuery(fallback).sql;
              if (expr === 'gen_random_uuid()') return `'${randomUUID()}'`;
              if (expr === 'now()') return `'${new Date().toISOString()}'`;
              throw new Error(`Unsupported SQL default in harness: ${expr}`);
            }
            if (fallback === undefined) return 'NULL';
            if (typeof fallback === 'boolean') return fallback ? '1' : '0';
            if (typeof fallback === 'number') return String(fallback);
            const str = typeof fallback === 'object' ? JSON.stringify(fallback) : String(fallback);
            return `'${str.replaceAll("'", "''")}'`;
          });
          return `(${tokens.join(', ')})`;
        });

        sql = `${headerMatch[0]}${resolvedValuesSlice}${suffix}`;
      }
    }

    const boundParams = rawParams.map((p) => {
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p instanceof Date) return p.toISOString();
      if (p !== null && typeof p === 'object') return JSON.stringify(p);
      return p;
    });

    const rawRows = storage.prepare(sql).all(...boundParams);

    // Determine selected/returned columns if needed so SQLite 0/1 booleans map cleanly for Drizzle pg-proxy
    const rows = rawRows.map((row) =>
      Object.entries(row).map(([colKey, val]) => {
        if (
          (colKey === 'opt_out' || colKey === 'is_active' || colKey === 'privacy_notice_accepted') &&
          (val === 0 || val === 1)
        ) {
          return val === 1;
        }
        return val;
      })
    );

    return { rows };
  });

  // Default authenticated operator: Todd (verified Clerk email)
  let currentClerkUser: ClerkLikeUser | null = {
    id: 'user_todd_verified',
    firstName: 'Todd',
    lastName: 'Operator',
    primaryEmailAddress: {
      emailAddress: 'todd@baratrust.com',
      verification: { status: 'verified' },
    },
    emailAddresses: [
      {
        emailAddress: 'todd@baratrust.com',
        verification: { status: 'verified' },
      },
    ],
  };

  const getOperatorUserMock = async (): Promise<OperatorUser | null> => {
    if (!currentClerkUser) return null;
    return evaluateClerkOperatorIdentity(currentClerkUser);
  };

  const requireOperatorApiAuthMock = async () => {
    const operator = await getOperatorUserMock();
    if (!operator) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
      };
    }
    if (!operator.isOperator) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: 'Operator authorization required.' }, { status: 403 }),
      };
    }
    return { ok: true as const, operator };
  };

  const boundaries: Record<string, unknown> = {
    '@/db': { db },
    '@/lib/auth/operator': {
      ...require('../../src/lib/auth/operator'),
      getOperatorUser: getOperatorUserMock,
      requireOperatorApiAuth: requireOperatorApiAuthMock,
    },
    '@/lib/acquisition/schema-bootstrap': {
      ensureAcquisitionSchema: async () => {},
    },
    '@/lib/scanner': {
      ...realScanner,
      executeDeterministicScan: async (input: { websiteUrl: string; businessName?: string | null; cityState?: string | null }) => {
        scanExecutionCount += 1;
        return {
        scanStatus: 'completed' as const,
        scanFailureReason: null,
        overallScore: 78,
        overallCoverage: 92,
        confidence: 'HIGH' as const,
        sourceType: 'standalone_website' as const,
        platformKey: null,
        platformLabel: null,
        normalizedUrl: input.websiteUrl.startsWith('http')
          ? input.websiteUrl
          : `https://${input.websiteUrl}`,
        derivedBusinessName: input.businessName || 'New Albany Hardware & Supply',
        derivedCityState: input.cityState || 'New Albany, IN',
        scannedAt: new Date().toISOString(),
        scoreBreakdown: {
          digitalPresence: 85,
          customerJourney: 72,
          trustReputation: 80,
          localDiscovery: 75,
          opportunityCapture: 76,
          sourceType: 'standalone_website' as const,
          coverage: {
            overall: 92,
            confidence: 'HIGH' as const,
            digitalPresence: 100,
            customerJourney: 90,
            trustReputation: 90,
            localDiscovery: 90,
            opportunityCapture: 90,
          },
          browserEvidence: null,
        },
        categoryScores: [],
        findings: [
          {
            category: 'digital_presence',
            checkKey: 'https_enabled',
            title: 'HTTPS Security',
            state: 'PASS' as const,
            scoreContribution: 10,
            maxPoints: 10,
            observedValue: { https: true },
            evidenceSource: 'url_scheme',
            evidenceLabel: 'AUTO_DETECTED' as const,
            supportingDetail: 'Site resolves securely over HTTPS.',
          },
          {
            category: 'customer_journey',
            checkKey: 'tap_to_call',
            title: 'Tap-to-Call Phone Link',
            state: 'FAIL' as const,
            scoreContribution: 0,
            maxPoints: 10,
            observedValue: { telLinks: 0 },
            evidenceSource: 'static_html',
            evidenceLabel: 'AUTO_DETECTED' as const,
            supportingDetail: 'Phone number appears as plain text without a tap-to-call link on mobile.',
          },
        ],
        };
      },
    },
  };

  const realityCheckRoute = loadModule<RealityCheckRoute>(
    'src/app/api/reality-check/route.ts',
    boundaries
  );
  const questionnaireRoute = loadModule<QuestionnaireRoute>(
    'src/app/api/reality-check/questionnaire/route.ts',
    boundaries
  );
  const conversionEventRoute = loadModule<ConversionEventRoute>(
    'src/app/api/conversion-event/route.ts',
    boundaries
  );
  const acquisitionCollectionRoute = loadModule<AcquisitionCollectionRoute>(
    'src/app/api/internal/acquisition/route.ts',
    boundaries
  );
  const acquisitionDetailRoute = loadModule<AcquisitionDetailRoute>(
    'src/app/api/internal/acquisition/[prospectId]/route.ts',
    boundaries
  );
  const acquisitionAssistRoute = loadModule<AcquisitionAssistRoute>(
    'src/app/api/internal/acquisition/[prospectId]/assist/route.ts',
    boundaries
  );
  const customerInquiriesRoute = loadModule<CustomerInquiriesRoute>(
    'src/app/api/customer-inquiries/route.ts',
    boundaries
  );
  const customerInquiriesSyncRoute = loadModule<CustomerInquiriesSyncRoute>(
    'src/app/api/customer-inquiries/sync/route.ts',
    boundaries
  );

  return {
    db,
    rawQuery: (sqlQuery: string) => storage.prepare(sqlQuery).all(),
    setDbFailureMode: (mode: 'none' | 'rate_limit_only' | 'all') => {
      dbFailureMode = mode;
    },
    getScanExecutionCount: () => scanExecutionCount,
    close: () => storage.close(),
    setClerkUser: (user: ClerkLikeUser | null) => {
      currentClerkUser = user;
    },
    routes: {
      realityCheck: realityCheckRoute,
      questionnaire: questionnaireRoute,
      conversionEvent: conversionEventRoute,
      acquisition: acquisitionCollectionRoute,
      acquisitionDetail: acquisitionDetailRoute,
      acquisitionAssist: acquisitionAssistRoute,
      customerInquiries: customerInquiriesRoute,
      customerInquiriesSync: customerInquiriesSyncRoute,
    },
  };
}
