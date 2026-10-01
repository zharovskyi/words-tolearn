# Words to learn

Learn English words and phrases with spaced repetition. Add a word and AI (Google Gemini) adds the Ukrainian translation and 2-3 example sentences. The app then schedules reviews at fixed intervals until the word is learned.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Prisma and SQLite, and the Vercel AI SDK.

## How it works

- **Add Word** (`/`): add a word or phrase. AI fixes small spelling mistakes, translates it and writes examples. If AI fails, the word is kept and can be retried.
- **Review** (`/review`): words due today, one at a time. Answer *Remembered* (word moves up a level) or *Forgot* (back to level 0).
- **Archive** (`/archive`): learned words. They leave the review loop and can be restored.
- **How it works** (`/how-it-works`): the rules in the app.

| Level | Shown again |
|---|---|
| 0 | today |
| 1 | +1 day |
| 2 | +2 days |
| 3 | +14 days |
| 4 | +60 days, then archived |

## Setup

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env     # then fill in the values below
npx prisma migrate deploy
npm run dev              # http://localhost:3000
```

Environment variables (`.env`):

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite file, e.g. `file:./dev.db` (relative to the project root) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `AI_MODEL` | Gemini model id, default `gemini-3.5-flash-lite` |
| `APP_TIMEZONE` | Time zone that defines "today", default `Europe/Kyiv` |

## Scripts

- `npm run dev` - development server
- `npm test` - unit and integration tests (Vitest; integration tests use a temporary SQLite database and never touch `dev.db`)
- `npm run verify` - Prisma validate and generate, type check, lint, tests and production build

## Notes

- Single user, no authentication.
- The database is a SQLite file, so the app needs a host with a persistent disk. Serverless hosts that reset the file system will lose data.
- The AI key is only used on the server and never sent to the browser.
