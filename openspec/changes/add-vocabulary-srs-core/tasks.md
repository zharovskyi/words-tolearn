# Tasks

## 1. Project setup

- [ ] 1.1 Read the Next.js docs listed in design.md Context, then install `prisma`, `@prisma/client` (+ required SQLite adapter), `ai`, `@ai-sdk/google`, `zod`, `server-only`; verify with `npm ls` and that `npm run build` still passes
- [ ] 1.2 Add Vitest (`npm test` script, `vitest.config.ts` with `@` alias) and verify a trivial test runs green
- [ ] 1.3 Add `.env.example` (`DATABASE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`, `AI_MODEL`, `APP_TIMEZONE`), git-ignore `.env*`/`*.db`, and verify `git status` shows no secrets or db files

## 2. Database

- [ ] 2.1 Write `prisma/schema.prisma` (+ `prisma.config.ts` if required by the installed major) per design D1 and verify `npx prisma validate` passes
- [ ] 2.2 Run `prisma migrate dev --name init`, commit the migration, and verify the SQLite file contains `Word`, `Example`, `ReviewLog` tables and the three indexes
- [ ] 2.3 Add `lib/db.ts` singleton and verify via a test that two imports return the same client and a Word round-trips (create/read)
- [ ] 2.4 Add `lib/text.ts` (`normalizeKey`, input Zod schema 1–100 chars) with unit tests for whitespace/case/length cases

## 3. SRS logic

- [ ] 3.1 Implement `lib/srs` (`INTERVAL_DAYS`, `addDays`, `todayIn`, `applyReview`) and verify unit tests cover every spec scenario (levels 0–4, FORGOT reset, final-level archive, 2026-10-17 → 2026-12-16, leap day, year rollover, DST-transition dates)
- [ ] 3.2 Implement server-only `reviewWord` service with transactional optimistic-concurrency update and `ReviewLog` insert; verify integration tests for not-due rejection, archived/failed rejection, double-submit advancing once, and history rows
- [ ] 3.3 Implement queue query helper; verify test ordering (most overdue first), exclusion of archived, FAILED/PENDING enrichment and future-dated words, and `nextDueDate` for the empty state

## 4. AI enrichment

- [ ] 4.1 Add `lib/ai/schema.ts` and `lib/ai/model.ts`; verify schema unit tests reject 1 example, 4 examples, duplicates, empty and >200-char strings, and accept 2 and 3 examples
- [ ] 4.2 Implement `lib/ai/enrich.ts` (server-only, 30 s timeout, 1 retry, delimited-data prompt, never throws); verify with the AI SDK mock model for valid output, invalid output, thrown error and missing API key
- [ ] 4.3 Implement the enrichment persistence step (save translation + examples + READY in a transaction, or FAILED + sanitized error); verify integration tests, and that no raw provider error text is stored
- [ ] 4.4 Verify the key stays server-side: `grep -r GOOGLE_GENERATIVE_AI_API_KEY` over `.next/static` after `npm run build` returns nothing

## 5. Vocabulary management

- [ ] 5.1 Implement `addWord` (validate → persist PENDING → enrich) with duplicate detection via the unique `textKey`; verify tests for valid add, empty, too long, duplicate of active, duplicate of archived, and provider failure leaving a FAILED row
- [ ] 5.2 Implement `retryEnrichment`, `deleteWord`; verify retry only affects FAILED rows without changing level/due, and delete cascades examples and reviews
- [ ] 5.3 Build home page: add form with pending state and error messages, active list showing translation/examples/level/next review, Retry and Delete (with confirm); verify manually in `npm run dev` and with `next build`
- [ ] 5.4 Document setup (env vars, `prisma migrate`, persistent-disk requirement) in README.md and verify the documented commands work from a clean clone

## 6. Review and archive

- [ ] 6.1 Build `/review`: show word, reveal translation + examples, Remembered/Forgot buttons calling `reviewWord`, remaining count, empty state with next review date; verify manually through a full level 0→4→archived run using test dates
- [ ] 6.2 Implement `markLearned` and `restoreWord` actions; verify tests for archive reason MANUAL, null due date, restore to level 0 due today with cleared archive fields
- [ ] 6.3 Build `/archive` with restore, navigation links between Home/Review/Archive, and the duplicate-of-archived "Restore" offer; verify manually and via `npm run lint` + `npm run build`

## 7. Integration

- [ ] 7.1 Run an end-to-end smoke test against a real API key (add word → enrich → review through all levels by faking dates → archive → restore) and record the result in the PR description
- [ ] 7.2 Run `openspec validate add-vocabulary-srs-core --strict`, `npm test`, `npm run lint`, `npm run build` and verify all pass
