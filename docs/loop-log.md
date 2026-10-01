# Loop log: `npm run verify` as the loop

**The loop:** one command, `npm run verify`, runs `prisma validate`, `prisma generate`, `tsc --noEmit`, `eslint`, `vitest run` and `next build`, and stops at the first failure. The agent ran it after each change, read the failure, fixed the cause and ran it again until it exited with code 0. Nothing was committed before a green run.

**Honest limits:** this loop was started by the agent inside a single working session, not by an unattended harness or a hook. The human gave the tasks step by step; the loop only covers "make this change pass all checks". It did not decide what to build next.

## Recorded runs (from this project's history)

### Run A: adding the test runner, commit `51bd843` (3 iterations)

| # | Result | What failed | Fix |
|---|---|---|---|
| 1 | exit 1 | `verify` failed on type errors: `Cannot find module 'vitest'` (TS2307) and implicit `any` in the test file (TS7006). | Vitest had not installed. Retried the install. |
| 2 | install failed | `npm i -D vitest` stopped with a dependency conflict (ERESOLVE): Vitest 5 needs `@types/node` 22 or newer, the project had 20. | Raised `@types/node` to 22 (the machine runs Node 22). |
| 3 | exit 0 | `Test Files 1 passed`, `Tests 12 passed`, build compiled. | Committed. |

### Run B: adding Turso support, commit `ab48c41` (3 iterations)

| # | Result | What failed | Fix |
|---|---|---|---|
| 1 | exit 1 | `scripts/turso-migrate.ts(25,42): error TS2345: 'string \| undefined' is not assignable to 'string'`. | Passed the checked URL into `main(raw: string)` instead of casting. |
| 2 | exit 1 | ESLint `react-hooks/rules-of-hooks`: the function `useTurso` was treated as a React hook. | Renamed it to `shouldUseTurso`. |
| 3 | exit 0 | `Test Files 6 passed`, `Tests 79 passed`. | Committed. |

(Outside `verify`, running the new script failed once at runtime because top-level `await` is not allowed in the CommonJS output; the code was wrapped in an `async` function.)

### Run C: production fail-safe, commit `aaa415a` (2 iterations)

| # | Result | What failed | Fix |
|---|---|---|---|
| 1 | exit 1 | `lib/db-config.test.ts(16,62): error TS1501`: the regular expression flag `s` needs a newer compile target. | Split the assertion into two simpler checks. |
| 2 | exit 0 | `Test Files 7 passed`, `Tests 87 passed`. | Committed. |

### Runs that passed on the first try

The feature commits for navigation with Retry/Delete, the archive, the How it works page, spelling correction and the code-review fixes (`6fe7e52`: 95 tests) each passed on the first run; they are not listed because there was nothing to iterate on.

## A run captured at the end of the work

Command and output (trimmed to the lines that matter), exit code 0:

```text
$ npm run verify
> prisma validate && prisma generate && npm run typecheck && npm run lint && npm test && npm run build
The schema at prisma/schema.prisma is valid
Generated Prisma Client (7.10.0) to ./generated/prisma
> tsc --noEmit
> eslint
> vitest run
 Test Files  8 passed (8)
      Tests  95 passed (95)
> next build
Compiled successfully
Route (app): /  /_not-found  /archive  /how-it-works  /review
exit code: 0
```
