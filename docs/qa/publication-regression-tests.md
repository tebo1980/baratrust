# Reality Check publication regression tests

Run `npm test` from the repository root using Node **22.13+** (verified on Node 24.14).
The existing command uses `tsx` and Node's test runner. `tsx` is resolved by the
existing `npx` command; an uncached installation requires npm registry access.
No new test framework, browser installation, database service, or credentials are required.

## Architecture

`tests/publication-lifecycle.test.ts` executes the actual save and publish POST
handlers, actual synthesis functions, and the actual report page rendered with
React's `renderToStaticMarkup`. It is integration coverage, not a browser test.

`tests/helpers/publication-harness.ts` transpiles those modules with the existing
TypeScript dependency and supplies per-instance database, operator identity, and
email boundaries. The Gemini response test supplies an SDK response and an isolated
environment to exercise the normally bypassed model-response branch. These replacements
exist only in tests; application authentication and production configuration are unchanged.

The real Drizzle query builder and result mapping use `drizzle-orm/pg-proxy`, with
Node's built-in in-memory SQLite evaluating SQL. The adapter translates bind markers
and INSERT defaults only. Actual predicates and RETURNING clauses run unchanged;
it does not reimplement save/publish decisions. Tables derive their columns from
the application schema. This disposable schema does not validate PostgreSQL types,
constraints, migrations, or transactions, and never opens the application database.
Node currently emits an experimental SQLite warning.

## Coverage

| Risk | Automated protection |
| --- | --- |
| Save accidentally publishes | Real insert and update routes, normal drafts, ready saves, and callers submitting `published` / `PUBLISHED`; assert statuses, null snapshot/timestamp, zero email calls |
| Freeze incomplete or wrong data | Real publish validates and persists draft, Top 3, opportunities, Human Intelligence, publication timestamp and delivery recipient |
| Internal citations leak | Fixtures include distinctive URLs, source labels and notes with false, omitted and true visibility across fixes, opportunities, Human Intelligence and legacy assets; check frozen JSON, preview HTML and public HTML, including fallback-generated prose |
| Repeated publish changes data or sends again | Compare snapshot, rendered HTML, timestamp and delivery count before/after retries and real post-publication operator saves |
| Concurrent publish sends twice | Hold two real route reads before either update; execute conditional SQL updates and assert one winner, one delivery, identical timestamps and stable snapshot on retry |
| Access or prerequisites bypassed | Missing/non-operator identities get 403 and restricted preview; missing fixes/core prose cannot publish |
| Advertising overclaims | Real save normalizes all three states plus YES/NO; freeze and render each state; NOT_OBSERVED retains qualified observation language |
| Empty Human Intelligence appears | Empty preview/public sections remain absent, including after later research; simulated Gemini response cannot create unsupported optional sections; supported and partially supported sections remain usable |

Four tests in `milestone4_5.test.ts` that copied publication logic or manually cloned
objects were replaced by these integrations. Existing useful tests remain:

- `Human Intelligence Layer — frozenHumanIntelligence & Evidence Visibility...`
  covers the snapshot helper's filtering and deep-copy behavior directly.
- `Human Intelligence Layer — Advertising evidence semantics...` covers normalizer,
  prompt instructions and deterministic fallback wording.
- `Human Intelligence Layer — returns empty strings...` covers empty fallback summaries.
- Existing operator allowlist, email result/content, scanner and funnel tests remain.

## Narrow defects exposed and corrected

- Report rendering treated a frozen `null` Human Intelligence value as missing and
  displayed later research. Explicit null now remains empty; legacy snapshots lacking
  the field retain their existing fallback.
- Gemini response processing accepted invented optional sections without supporting
  Human Intelligence. Optional sections now require a corresponding evidence-backed
  fallback summary before model text is accepted.
- Deterministic legacy-footprint summaries copied internal citation source/notes into
  client prose. Those citation details now require explicit client visibility.

No save/publish route, authentication, migration, or stored snapshot format changed.
Previously published snapshots are not rewritten.

## Limits

- SQLite and an interleaving barrier test the application's SQL guard, not PostgreSQL
  row locks, isolation, network failures, or recovery after a process crash between
  the publication claim and email delivery. Those require a disposable PostgreSQL
  environment and failure injection.
- There is no browser click/hydration coverage or live Clerk session. These tests
  exercise handler authorization branches and rendered HTML; existing allowlist tests
  cover authorization policy.
- Email calls and Gemini responses are controlled fixtures. Provider delivery and
  arbitrary live model behavior are not verified. The tests protect structured
  citations and deterministic fallback prose, not arbitrary internal text an operator
  or model might place in an otherwise client-facing free-text draft field. Publication
  intentionally freezes the reviewed draft without rewriting it.

Required release checks remain `npm test`, `npx tsc --noEmit`, `npm run lint`, and
`npm run build`. Nothing in this suite deploys, delivers real email, or runs migrations.

## Verification — 2026-10-21

- `npm test`: 77 passed, 0 failed, 0 skipped (74 original tests minus four simulations plus seven integrations).
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed, no warnings or errors.
- `npm run build`: passed, including type/lint checks and 67 generated static pages.
- `git diff --check`: passed.

Non-failing diagnostics: Node's experimental SQLite warning and the build's outdated
Browserslist data warning. No dependency upgrade was made. No separate browser/E2E
command was added.
