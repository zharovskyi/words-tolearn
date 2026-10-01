# AI Agent Guidelines

## Tech Stack
- Next.js (App Router) with React 18+.
- TypeScript for strictly typed code.
- Tailwind CSS for styling.
- SQLite with Prisma (or Drizzle) for local database management.
- `shadcn/ui` or Lucide React icons can be used for UI components if needed.

## Next.js App Router Best Practices
1. **Routing:** Strictly use the `app/` directory (App Router). Do not use the `pages/` directory.
2. **Special Files:** Use standard Next.js conventions for UI states: `loading.tsx` for Suspense fallbacks, `error.tsx` for error boundaries, and `layout.tsx` for shared layouts.
3. **Server Actions:** Extract complex Server Actions into a separate `actions/` or `lib/actions/` folder using the `"use server"` directive at the top of the file, rather than inline within components.
4. **State Management:** Prefer URL search parameters (`?query=...`) over `useState` for simple filtering, pagination, or tab states to keep components server-renderable and linkable.
5. **Data Fetching:** Fetch data directly in Server Components using `async/await`. Avoid client-side `useEffect` for initial data fetching.

## Coding Standards
1. **TypeScript First:** Ensure strictly typed interfaces. NO `any` types. Fix all TypeScript errors before moving to the next task.
2. **Server & Client Components:** Use React Server Components by default. Add `"use client"` only when hooks (`useState`, `useEffect`) or browser APIs are strictly required.
3. **Data Fetching:** Use Next.js Server Actions for database mutations (adding words, updating review dates) and fetching data from the AI API.
4. **Build Checks:** Run `npm run build` or `npm run lint` periodically to ensure no breaking changes are introduced.
5. **Simplicity:** Keep the UI clean, minimalist, and responsive.

## Task Execution
- Always read `docs/prd.md` before generating new schemas or features.
- When creating the database schema, ensure there are fields for `nextReviewDate` (DateTime), `intervalLevel` (Int), `translation` (String), and `contextSentences` (JSON/Array of strings).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
