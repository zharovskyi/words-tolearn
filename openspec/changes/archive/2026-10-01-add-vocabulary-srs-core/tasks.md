# Tasks

## 1. Project setup

- [x] 1.1 Read the Next.js docs, install Prisma 7.10, the SQLite adapter, `ai`, `@ai-sdk/google`, `zod`, `server-only`; `npm run build` passes
- [x] 1.2 Add Vitest with a `npm test` script; tests run green
- [x] 1.3 Add `.env.example`, git-ignore `.env*` (except the example) and `*.db`; `git status` shows no secrets or database files

## 2. Database

- [x] 2.1 Write `prisma/schema.prisma` and `prisma.config.ts`; `npx prisma validate` passes
- [x] 2.2 Run `prisma migrate dev --name init` and commit the migration; the SQLite file has the three tables and indexes
- [x] 2.3 Add the `lib/db.ts` singleton; verified by running the actions against the database
- [x] 2.4 Add `lib/text.ts` (`normalizeKey`, input schema, spelling-correction guard) with unit tests

## 3. SRS logic

- [x] 3.1 Implement `lib/srs` (`INTERVAL_DAYS`, `addDays`, `todayIn`, `applyReview`); unit tests cover levels 0-4, Forgot, final-level archive, 2026-10-17 to 2026-12-16, overdue reviews and month/year/leap-day boundaries
- [x] 3.2 Implement `applyWordReview` with the transactional optimistic update and `ReviewLog`; verified by script: not-due rejection, double submit advancing once, history rows
- [x] 3.3 Implement the queue and next-due queries; verified by script: ordering, and exclusion of archived, failed and future words

## 4. AI enrichment

- [x] 4.1 Add `lib/ai/schema.ts` and `lib/ai/model.ts` (schema enforces 2-3 distinct examples and length limits)
- [x] 4.2 Implement `lib/ai/enrich.ts` (server-only, 30 s timeout, 1 retry, delimited-data prompt, never throws); verified with live Gemini calls and with an invalid key
- [x] 4.3 Persist enrichment results or the FAILED state with a sanitized error; verified on the database
- [x] 4.4 Verify the key stays server-side: no key or `GOOGLE_GENERATIVE_AI_API_KEY` string in `.next/static` after `npm run build`
- [x] 4.5 Add AI spelling correction with the plausibility guard and conflict handling; unit tests for the guard, live Gemini check ("recieve", "run out ofe")

## 5. Vocabulary management

- [x] 5.1 Implement `addWord` (validate, persist PENDING, enrich) with duplicate detection; verified: valid add, empty, duplicate, archived duplicate, provider failure leaving FAILED
- [x] 5.2 Implement `retryEnrichment` and `deleteWord`; verified: retry only for FAILED words and keeps level and due date, delete cascades
- [x] 5.3 Build the home page with the add form (loading and error states), word list, Retry and Delete
- [x] 5.4 Document setup and rules in README.md

## 6. Review, archive and navigation

- [x] 6.1 Build `/review` with the flashcard component and "All caught up!" state
- [x] 6.2 Implement `markLearned` and `restoreWord`; verified on the database
- [x] 6.3 Build `/archive` with restore, and the restore offer for archived duplicates
- [x] 6.4 Add the global navigation header with an active-link highlight and the `/how-it-works` page

## 7. Integration

- [x] 7.1 End-to-end manual check in the browser by the user: adding words, AI generation, review buttons, navigation and archive
- [x] 7.2 `npm run verify` passes (Prisma validate and generate, type check, lint, tests, build)

## Not done (deferred, not part of this change)

- Automated integration tests for the database services and the AI step (mock model); these were verified by ad-hoc scripts only.
- Restoring and marking as learned have no automated tests.
