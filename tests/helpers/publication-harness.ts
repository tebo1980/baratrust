import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInThisContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { getTableColumns, getTableName, eq, SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { renderToStaticMarkup } from 'react-dom/server';
import * as schema from '../../src/db/schema';
import type { OperatorUser } from '../../src/lib/auth/operator';
import type { sendRealityCheckDeliveryEmail } from '../../src/lib/email/delivery';

// Node 22.13+ includes SQLite. Keep these narrow types local because the app
// still uses @types/node 20. No native package, service, or disk database needed.
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => {
    exec(sql: string): void;
    prepare(sql: string): { all(...params: unknown[]): Record<string, unknown>[] };
    close(): void;
  };
};

/** Load the actual TS/TSX module with per-instance boundary replacements.
 * No global require-cache edits and no production dependency-injection hooks.
 * TypeScript and the Node runner are already repository dependencies/tooling.
 */
export function loadModule<T>(relativePath: string, boundaries: Record<string, unknown>): T {
  const filename = resolve(relativePath);
  const nativeRequire = createRequire(filename);
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = { exports: {} };
  const scopedRequire = (id: string) => {
    if (Object.hasOwn(boundaries, id)) return boundaries[id];
    // Never accidentally connect to the real application database.
    if (id === '@/db') throw new Error('Database boundary must be supplied');
    return nativeRequire(id.startsWith('@/') ? resolve('src', id.slice(2)) : id);
  };
  const evaluate = runInThisContext(`(function(require, module, exports, process) {\n${output}\n})`, { filename });
  evaluate(scopedRequire, mod, mod.exports, boundaries['node:process'] ?? process);
  return mod.exports as T;
}

type SaveRoute = typeof import('../../src/app/api/internal/reviews/[realityCheckId]/route');
type PublishRoute = typeof import('../../src/app/api/internal/reviews/[realityCheckId]/publish/route');
type ReportPage = typeof import('../../src/app/report/[shareToken]/page');

export async function publicationHarness() {
  const storage = new DatabaseSync(':memory:');
  const tables = [schema.realityChecks, schema.humanReviews, schema.scanFindings, schema.ownerResponses];
  for (const table of tables) {
    // Disposable test schema, derived from Drizzle columns; never runs migrations.
    storage.exec(`CREATE TABLE "${getTableName(table)}" (${Object.values(getTableColumns(table))
      .map(column => `"${column.name}" ${column.getSQLType() === 'integer' ? 'INTEGER' : 'TEXT'}`)
      .join(', ')})`);
  }
  const dialect = new PgDialect();
  let pendingReviewReads: (() => void)[] | null = null;
  let competingReads = 0;
  const db = drizzle(async (query, params) => {
    // Translate only PostgreSQL INSERT DEFAULT expressions and bind markers.
    // WHERE / AND / <> / IS NULL / RETURNING are executed by SQLite unchanged,
    // so a missing atomic predicate in the real route is observable in tests.
    let sql = query.replace(/\$\d+/g, '?');
    const insert = /^insert into "([^"]+)" \(([^)]+)\) values \(([^)]+)\)/.exec(sql);
    if (insert) {
      const table = tables.find(t => getTableName(t) === insert[1])!;
      const columns = Object.values(getTableColumns(table));
      const names = insert[2].split(', ').map(name => name.replaceAll('"', ''));
      const values = insert[3].split(', ').map((value, index) => {
        if (value !== 'default') return value;
        const column = columns.find(c => c.name === names[index])!;
        const fallback = column.default;
        if (fallback instanceof SQL) {
          const expression = dialect.sqlToQuery(fallback).sql;
          if (expression === 'gen_random_uuid()') return `'${randomUUID()}'`;
          if (expression === 'now()') return `'${new Date().toISOString()}'`;
          throw new Error(`Unsupported test default: ${expression}`);
        }
        if (fallback === undefined) return 'NULL';
        return `'${String(typeof fallback === 'object' ? JSON.stringify(fallback) : fallback).replaceAll("'", "''")}'`;
      });
      sql = sql.replace(insert[0], `insert into "${insert[1]}" (${insert[2]}) values (${values.join(', ')})`);
    }
    const rows = storage.prepare(sql).all(...params).map(row => Object.values(row));
    // Capture both stale reads before releasing either request to UPDATE.
    if (pendingReviewReads && query.startsWith('select ') && query.includes('from "human_reviews"')) {
      competingReads++;
      await new Promise<void>(resolveRead => {
        pendingReviewReads!.push(resolveRead);
        if (pendingReviewReads!.length === 2) {
          const readers = pendingReviewReads!;
          pendingReviewReads = null;
          readers.forEach(release => release());
        }
      });
    }
    return { rows };
  });
  const id = randomUUID();
  const shareToken = `publication-test-${id}`;
  await db.insert(schema.realityChecks).values({
    id, shareToken, businessName: 'Lifecycle Fixture', website: 'https://fixture.example',
    email: 'owner@example.test', ownerName: 'Fixture Owner', status: 'IN_REVIEW',
  });
  let operator: OperatorUser | null = {
    id: 'operator-test', email: 'todd@baratrust.com', name: 'Operator', isOperator: true,
  };
  const deliveries: Parameters<typeof sendRealityCheckDeliveryEmail>[0][] = [];
  const boundaries = {
    '@/db': { db },
    '@/lib/auth/operator': { getOperatorUser: async () => operator },
    '@/lib/email/delivery': {
      sendRealityCheckDeliveryEmail: async (input: Parameters<typeof sendRealityCheckDeliveryEmail>[0]) => {
        deliveries.push(structuredClone(input));
        return { success: true, status: 'ACCEPTED_BY_PROVIDER', deliveredAt: new Date().toISOString(), messageId: 'fixture-email' };
      },
    },
  };
  const saveRoute = loadModule<SaveRoute>('src/app/api/internal/reviews/[realityCheckId]/route.ts', boundaries);
  const publishRoute = loadModule<PublishRoute>('src/app/api/internal/reviews/[realityCheckId]/publish/route.ts', boundaries);
  const page = loadModule<ReportPage>('src/app/report/[shareToken]/page.tsx', boundaries);
  return {
    db, id, shareToken, deliveries,
    close: () => storage.close(),
    setOperator: (value: OperatorUser | null) => { operator = value; },
    raceNextReviewReads: () => { pendingReviewReads = []; },
    competingReads: () => competingReads,
    save: (body: unknown) => saveRoute.POST(new Request('https://fixture.test/save', {
      method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
    }), { params: { realityCheckId: id } }),
    publish: () => publishRoute.POST(new Request('https://fixture.test/publish', { method: 'POST' }), {
      params: { realityCheckId: id },
    }),
    render: async (preview = false) => renderToStaticMarkup(await page.default({
      params: { shareToken }, searchParams: preview ? { preview: 'true' } : {},
    })),
    review: async () => (await db.select().from(schema.humanReviews).where(eq(schema.humanReviews.realityCheckId, id)))[0],
    check: async () => (await db.select().from(schema.realityChecks).where(eq(schema.realityChecks.id, id)))[0],
  };
}
