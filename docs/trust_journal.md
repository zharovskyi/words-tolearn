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
