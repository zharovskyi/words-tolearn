# Trust Journal

A log of AI-assisted work stages and how much trust each result earned.

## Stage 1: Database & Prisma

- **Date:** 2026-10-01
- **Trust level:** High
- **Commit:** `09ca8c6`

**What was done**
- Prisma schema created (`prisma/schema.prisma`): `Word`, `Example`, `ReviewLog` models with enums and indexes, per the OpenSpec design.
- `prisma migrate dev --name init` executed; the migration is committed under `prisma/migrations/` and the SQLite tables and indexes were checked in the created database.
- Custom `npm run verify` script added (`prisma validate`, `prisma generate`, `tsc --noEmit`, `lint`, `build`); it exits with code 0.

**Why trust is high**
- The result was verified by running commands (schema validation, migration, SQLite inspection, full `verify`), not just read.

## Stage 2: Backend & AI Integration

- **Date:** 2026-10-01
- **Trust level:** High
- **Commit:** `806beee`

**What was done**
- Prisma client singleton created in `lib/db.ts` (global cache guard against multiple instances on hot reload).
- Server Action for adding words implemented in `actions/word-actions.ts`: validates input, rejects duplicates, saves the word at level 0 due today, then generates the Ukrainian translation and 2-3 context sentences with Gemini via `@ai-sdk/google`.
- `npm run verify` passed.

**Why trust is high**
- Validation, duplicate rejection, persistence and failure handling were checked against the real SQLite database, and a live Gemini call returned a valid translation and examples.

## Stage 3: Frontend UI & Main Page

- **Date:** 2026-10-01
- **Trust level:** High
- **Commit:** `0ee2969`

**What was done**
- Responsive main page `app/page.tsx` (Server Component) listing words with translation, example sentences and next review date.
- Interactive client component `components/AddWordForm.tsx` with loading and error handling while the AI generates content.
- `npm run verify` passed.

**Why trust is high**
- Verified by the full `verify` run and by rendering the page in the dev server. The form was not exercised end to end in a browser by the assistant.

## Stage 4: SRS Review Mode

- **Date:** 2026-10-01
- **Trust level:** High (logic), Medium (UI)
- **Commit:** `51bd843`

**What was done**
- Pure scheduling module `lib/srs/schedule.ts` (levels 0-4, intervals +1/+2/+14/+60 days, archive after level 4, Forgot resets to level 0 due today) with 12 Vitest unit tests; tests are part of `npm run verify`.
- Review service with a transactional optimistic-concurrency update and a `ReviewLog` entry per review; `/review` page with flashcard component and an "All caught up!" empty state.

**Why this trust level**
- Logic was verified against the real SQLite database: all level transitions, rejection of not-due words, a double submit advancing only one level, and archiving.
- The flashcard UI was not clicked through in a browser by the assistant.
- Incident: a test script ended with `deleteMany()` and deleted a word the user had added. Test scripts must delete only their own records.

## Stage 5: Navigation, How it works, Retry and Delete

- **Date:** 2026-10-01
- **Trust level:** High
- **Commits:** `ce7f64e`, `1ce51b7`

**What was done**
- Global header in `app/layout.tsx` with an active-link highlight (`NavLinks.tsx`), later extended with Archive and "How it works" entries.
- "Retry" for words whose AI enrichment failed and "Delete" with confirmation.
- "How it works" page describing the rules and the review schedule.

**Why trust is high**
- Active-link highlighting was checked in the rendered HTML of the dev server; Retry and Delete were checked on the real database with a test record.

## Stage 6: Archive

- **Date:** 2026-10-01
- **Trust level:** High
- **Commit:** `04cfecc`

**What was done**
- "Mark as learned", "Restore" and the `/archive` page; adding a word that is already archived offers to restore it.

**Why trust is high**
- Verified on the real database: archived words leave the review queue, restoring returns a word to level 0 due today, and a duplicate of an archived word is detected. Buttons were not clicked in a browser by the assistant.

## Stage 7: AI spelling correction

- **Date:** 2026-10-01
- **Trust level:** Medium-High
- **Commit:** `27320f9`

**What was done**
- The AI also returns a corrected spelling; it is applied only when the edit is small (edit-distance check with unit tests), and conflicts with existing words are reported.

**Why this trust level**
- Checked with live Gemini calls ("recieve" and "run out ofe" were corrected). The AI can still "correct" a rare word or slang that looks like a typo; the form shows what was changed.

## Pending

- **End-to-end browser check:** not done. All UI behavior so far was verified by scripts and rendered HTML, not by clicking through the app.
- **`openspec archive`:** not done. The OpenSpec change `add-vocabulary-srs-core` still has unchecked tasks, and its specs do not yet describe the spelling correction, Retry/Delete or the How it works page.
