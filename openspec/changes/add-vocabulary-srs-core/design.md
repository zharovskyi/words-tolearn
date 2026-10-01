# Design

## Context

Greenfield Next.js 16.3 App Router project (React 19, Tailwind 4, TypeScript) with only the create-next-app scaffold. [AGENTS.md](../../../AGENTS.md) warns this Next.js version has breaking changes, so implementers MUST consult `node_modules/next/dist/docs/` (Server Actions: `01-app/01-getting-started/07-mutating-data.md` and `02-guides/server-actions.md`; data security: `02-guides/data-security.md`; env vars: `02-guides/environment-variables.md`) before writing code. Server Functions are publicly reachable POST endpoints, so every action validates its own input.

Requirements live in the specs: `vocabulary-entries`, `ai-word-enrichment`, `spaced-repetition`, `word-archive`. This document covers how they are built.

## Goals / Non-Goals

**Goals:**
- A schema that makes the due-queue query a single indexed lookup.
- SRS rules isolated in a pure module with no I/O, fully unit-testable.
- AI output that is structurally validated before it touches the database.
- Words are never lost because an LLM call failed.

**Non-Goals:**
- Auth and multi-user support; adaptive algorithms (SM-2/FSRS); offline mode; deployment to serverless hosts (SQLite file needs persistent disk).

## Assumptions (PRD is silent; confirm or override)

| # | Assumption |
|---|-----------|
| A1 | Single user, no authentication. Schema has no `userId`; adding one later is a migration. |
| A2 | Review is binary: *Remembered* / *Forgot*. Forgot resets to level 0, due today. |
| A3 | Level 3 interval is a fixed 14 days (low end of the PRD's 14–21 range), held in one constant. |
| A4 | Intervals count from the review date, not from the original due date. |
| A5 | LLM provider is Google Gemini through the AI SDK (`@ai-sdk/google`, default model `gemini-3.5-flash-lite`, overridable via `AI_MODEL`; confirm the exact model id is served by the Gemini API before implementing); swapping providers touches only `lib/ai/model.ts`. |
| A6 | Time zone for "today" is `APP_TIMEZONE` (default `Europe/Kyiv`). |
| A7 | Prisma is chosen over Drizzle (PRD allows either). |

## Decisions

### D1. Database schema (Prisma + SQLite)

`prisma/schema.prisma` (shape; verify generator/adapter syntax against the installed Prisma major, since Prisma 7 requires `prisma.config.ts`, the `prisma-client` generator with an explicit `output`, and a driver adapter such as `@prisma/adapter-better-sqlite3`):

```prisma
datasource db { provider = "sqlite" }

enum WordStatus       { ACTIVE ARCHIVED }
enum EnrichmentStatus { PENDING READY FAILED }
enum ArchiveReason    { COMPLETED MANUAL }
enum ReviewOutcome    { REMEMBERED FORGOT }

model Word {
  id               String           @id @default(cuid())
  text             String                       // as typed, trimmed
  textKey          String           @unique     // normalized: lower-case, collapsed whitespace
  translation      String?                      // Ukrainian; null until enriched
  enrichment       EnrichmentStatus @default(PENDING)
  enrichmentError  String?
  status           WordStatus       @default(ACTIVE)
  level            Int              @default(0) // 0..4 while ACTIVE
  dueDate          String?                      // "YYYY-MM-DD" in APP_TIMEZONE; null when ARCHIVED
  archivedAt       DateTime?
  archiveReason    ArchiveReason?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  examples         Example[]
  reviews          ReviewLog[]

  @@index([status, enrichment, dueDate])        // daily queue
  @@index([status, archivedAt])                 // archive view
}

model Example {
  id       String @id @default(cuid())
  wordId   String
  position Int                                  // 0..2, display order
  sentence String
  word     Word   @relation(fields: [wordId], references: [id], onDelete: Cascade)
  @@unique([wordId, position])
}

model ReviewLog {
  id         String        @id @default(cuid())
  wordId     String
  reviewedAt DateTime      @default(now())
  outcome    ReviewOutcome
  fromLevel  Int
  toLevel    Int?                               // null when archived
  nextDue    String?                            // null when archived
  word       Word          @relation(fields: [wordId], references: [id], onDelete: Cascade)
  @@index([wordId, reviewedAt])
}
```

Rationale:
- **`dueDate` is a date string, not a timestamp.** The PRD schedules in whole days ("today", "+1 day"). A `YYYY-MM-DD` string compares lexicographically (`dueDate <= today`), is immune to UTC/DST drift, and SQLite has no native date type anyway. The "today" string is computed once per request with `Intl.DateTimeFormat('en-CA', { timeZone })`.
- **`textKey` unique** enforces the duplicate rule at the DB level (race-safe) across active and archived words.
- **Examples in a child table** (not a JSON column) so the 2–3 bound is checked in code but ordering and cascade deletion are relational; SQLite lacks array types.
- **Enums**: Prisma supports enums on SQLite (stored as text) in current majors; if the installed version does not, fall back to `String` plus Zod validation.
- **`ReviewLog`** is append-only audit data enabling later stats or an algorithm change without data loss.
- Alternative considered: a single `reviewCount` instead of `level` + log. Rejected: level is the PRD's core concept and the log gives history for free.

Prisma client is a singleton in `lib/db.ts` (global cache guard to survive Next dev hot reload). `DATABASE_URL="file:./dev.db"`; `prisma/*.db` is git-ignored.

### D2. SRS module (`lib/srs/`)

Pure functions, no Prisma/Next imports:

```ts
export const INTERVAL_DAYS = { 1: 1, 2: 2, 3: 14, 4: 60 } as const  // days until review AT that level
export const MAX_LEVEL = 4

type Applied =
  | { kind: 'scheduled'; level: 1|2|3|4|0; dueDate: string }
  | { kind: 'archived' }

export function applyReview(level: number, outcome: 'REMEMBERED'|'FORGOT', today: string): Applied
export function addDays(isoDate: string, days: number): string   // calendar math in UTC on the date string
export function todayIn(timeZone: string, now = new Date()): string
```

Logic:
- `FORGOT` → `{ scheduled, level: 0, dueDate: today }`.
- `REMEMBERED` at level `< 4` → `level + 1`, `dueDate = addDays(today, INTERVAL_DAYS[level + 1])`.
- `REMEMBERED` at level `4` → `{ archived }`.

`addDays` parses the date string as UTC midnight, adds days, and formats back; because only the calendar date matters, DST cannot shift results.

The persistence step lives in a server-only `reviewWord(id, outcome)` service that runs in one `prisma.$transaction`: load word → verify `status = ACTIVE`, `enrichment = READY`, `dueDate <= today` → compute `applyReview` → conditional `updateMany` guarded by `where: { id, level: <loaded level>, dueDate: <loaded dueDate> }` (optimistic concurrency; if `count = 0` the submission is a stale duplicate and is rejected) → insert `ReviewLog`. This provides the "applied at most once" guarantee without locks.

Queue query: `findMany({ where: { status: 'ACTIVE', enrichment: 'READY', dueDate: { lte: today } }, orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }], include: { examples: { orderBy: { position: 'asc' } } } })`.

Alternative considered: SM-2 ease factors. Rejected: the PRD mandates a fixed schedule.

### D3. AI enrichment (`lib/ai/`)

- `lib/ai/schema.ts`: Zod schema `{ translation: string.min(1).max(200), examples: array(string.min(1).max(200)).min(2).max(3) }` plus a refinement for case-insensitive uniqueness of examples.
- `lib/ai/enrich.ts` (`import 'server-only'`): calls the AI SDK's structured-output API (`generateObject`/`Output.object` depending on the installed `ai` major; check its docs/types at implementation time) with the model from `lib/ai/model.ts`, `abortSignal: AbortSignal.timeout(30_000)`, `maxRetries: 1`. Returns a discriminated result `{ ok: true, data } | { ok: false, error }`; it never throws to the caller.
- Prompt: system message fixes the task (Ukrainian translation of the English word/phrase, 2–3 natural, distinct, B1–B2 level sentences using the exact word/phrase, preferring the most common sense). The user text is passed as a clearly delimited data field (`<word>…</word>`) and the system prompt states it is data, not instructions. Structured output plus Zod bounds the blast radius of prompt injection to the text of a translation/examples.
- Flow in `addWord` Server Action: validate (Zod, 1–100 chars) → compute `textKey` → insert `Word` with `enrichment = PENDING` (unique violation → duplicate error, per spec) → `enrich()` → on success write translation + `Example` rows + `READY` in one transaction; on failure set `FAILED` + short `enrichmentError` (never raw provider text/keys) → `revalidatePath('/')`.
- `retryEnrichment(id)` repeats the enrich step for `FAILED` rows only.
- The API key is read only in `lib/ai/model.ts` from `process.env`; `server-only` import makes a client import a build error.
- Alternative considered: enrich in a background job. Rejected for v1: a single synchronous call (~1–3 s) with `useActionState` pending UI is simpler, and the persist-first rule already covers failures.

### D4. App structure and Server Actions

```
app/page.tsx            add form + active list (Server Component)
app/review/page.tsx     due queue + review client component
app/archive/page.tsx    archive list
app/actions.ts          'use server': addWord, retryEnrichment, reviewWord, markLearned, restoreWord, deleteWord
lib/db.ts  lib/srs/  lib/ai/  lib/words.ts (query helpers)
```

Each action: parse `FormData`/args with Zod → call service → `revalidatePath`. Actions return `{ ok, error? }` rather than throwing for expected failures. Pages that read the DB opt out of static rendering as required by the installed Next version's caching model (check `01-getting-started/08-caching.md`; `cacheComponents` is not enabled in `next.config.ts`, so reading `connection()`/dynamic APIs or `export const dynamic` per the current docs).

### D5. Testing

Vitest. Unit: `applyReview` (all levels, both outcomes, month/year/leap boundaries, DST dates), `addDays`, `todayIn`, Zod schema. Integration: services against a temp SQLite file created via `prisma migrate deploy` (duplicate race, double-submit, queue ordering/filtering, archive/restore, cascade delete). AI: `enrich` tested with the AI SDK's mock model for valid, invalid and failing output; no live API calls in CI.

## Risks / Trade-offs

- [LLM returns poor/incorrect translation] → Show the output to the user; allow retry; manual editing is deferred (see Open Questions).
- [Prisma 7 / AI SDK APIs differ from memory] → Tasks start with a version check and read installed docs/types; snippets here are shape-level.
- [Synchronous LLM call slows add] → 30 s timeout, pending UI, persist-first so nothing is lost.
- [SQLite on serverless loses data] → Documented non-goal; README states a persistent-disk host is required.
- [Fixed 14-day level 3 vs PRD's 14–21] → Single constant; trivially changeable.
- [Prompt injection via word text] → Delimited data, structured output, length caps, output length bounds; no tool access.
- [Enum support on SQLite varies by Prisma version] → Documented fallback to validated strings.

## Migration Plan

Greenfield: `prisma migrate dev --name init` creates the first migration; commit `prisma/migrations`. Rollback is deleting the dev database file. Later schema changes ship as additive migrations.

## Open Questions

- Should users be able to edit the AI translation/examples manually? (Does not affect current specs or tasks; additive later.)
- Should level 3 jitter within 14–21 days to spread load? (Constant-only change.)
