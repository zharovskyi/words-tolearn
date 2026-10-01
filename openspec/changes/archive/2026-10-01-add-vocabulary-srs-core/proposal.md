# Proposal

## Why

The app is a fresh Next.js scaffold with no domain functionality. [docs/prd.md](../../../docs/prd.md) calls for a vocabulary trainer where adding a word automatically yields a Ukrainian translation and contextual examples, and the word is then drilled on a fixed spaced-repetition schedule until it is learned. This change defines the foundation for that product: persistence, the scheduling rules, and the AI enrichment pipeline.

## What Changes

- Add a SQLite database accessed through Prisma, with models for words, example sentences, and a review history log.
- Add a pure, unit-testable SRS module implementing the PRD's fixed intervals (Level 0 today, 1 → +1d, 2 → +2d, 3 → +14d, 4 → +60d) and the archive transition after the final level.
- Add an AI enrichment service (Vercel AI SDK, called only from server code) that returns a validated Ukrainian translation plus 2–3 example sentences for a word or phrase.
- Add Server Actions for: add word, retry enrichment, submit a review result, mark as learned, restore from archive, delete.
- Add three UI surfaces: add-word form with the word list, a daily review dashboard, and an archive view.
- Record explicit assumptions where the PRD is silent (see design.md → Assumptions): single user/no auth, review grading, failure handling, time zone, LLM provider.

## Capabilities

### New Capabilities
- `vocabulary-entries`: Adding, listing, de-duplicating and deleting words/phrases.
- `ai-word-enrichment`: Automatic Ukrainian translation and 2–3 contextual example sentences, including failure and retry behavior.
- `spaced-repetition`: Level/interval schedule, the daily due queue, review outcomes and review history.
- `word-archive`: Moving words out of the active loop on completion or manual "Learned", viewing and restoring them.

### Modified Capabilities
<!-- None: no existing specs. -->

## Impact

- New dependencies: `prisma`, `@prisma/client` (+ SQLite driver adapter as required by the installed Prisma major), `ai`, an AI SDK provider package, `zod`; dev: a test runner (Vitest).
- New files: `prisma/schema.prisma`, `prisma.config.ts` (if required by Prisma version), `lib/db.ts`, `lib/srs/*`, `lib/ai/*`, `app/actions.ts`, pages under `app/`, `.env.example`.
- New environment variables: `DATABASE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`, `AI_MODEL`, `APP_TIMEZONE`.
- Out of scope: authentication/multi-user, audio/pronunciation, importing/exporting, notifications/email reminders, mobile app, deployment target decisions (SQLite file storage requires a persistent disk; serverless hosts are not supported by this design).
