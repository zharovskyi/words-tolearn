# Code review (checker pass)

Evidence for the **maker ≠ checker** practice. Claude Code wrote the code (maker). A separate review pass then read the finished code and reported problems (checker). The maker verified each finding against the code and fixed the confirmed ones.

## Setup

- **Reviewer:** the `/code-review` skill at `high` effort. It ran as a forked execution: a separate context that did not see the conversation in which the code was written. It is the same underlying model, so it is an independent pass, not an independent model.
- **Scope:** `actions/`, `lib/`, `app/`, `components/`, `scripts/` at commit `06255bd` (clean working tree, 87 tests passing).
- **Method:** the reviewer only read the code; it ran no tests. Findings were then checked by the maker.

## Findings and outcome

| # | Location | Finding | Verified? | Outcome |
|---|---|---|---|---|
| 1 | `components/ReviewCard.tsx` | After "Forgot" the same word comes back (level 0, due today). When it is the only word due, its `id` is unchanged, so the card is not remounted and the answer is already revealed. | Confirmed. This is the "same word again" behavior noticed earlier during manual testing. | Fixed: the card `key` now includes `updatedAt`, so a rescheduled word always starts hidden. |
| 2 | `actions/word-actions.ts` | If saving the AI result throws (database error) after the word was created, the word stays `PENDING` forever: retry accepted only `FAILED`, review needs `READY`. A timed-out request had the same effect. | Confirmed. | Fixed: unexpected errors mark the word `FAILED` ("Could not save the result"). A `PENDING` word older than 2 minutes can also be retried (`lib/words.ts`, Retry button on the home page). Regression tests added. |
| 3 | `actions/word-actions.ts` | The spelling-correction update can hit the unique constraint on `textKey` when another word takes the corrected spelling between the existence check and the write. | Partly confirmed. The race is real, but the reviewer's claim that Retry skips the conflict check is wrong: Retry ignores a colliding correction. | Fixed: on a unique-constraint error the word is saved with the typed text instead of failing. Regression test simulates the race. |
| 4 | `scripts/turso-migrate.ts` | The migration ran without a transaction, so a failure halfway left a half-migrated database and a re-run failed with "table already exists". | Confirmed. | Fixed: each migration runs in one write transaction with rollback. Checked on a temporary libSQL database: a failing migration leaves no tables behind. |

## Verification of the fixes

- The 3 new regression tests for findings 2 and 3 fail on the previous code (`3 failed | 27 passed`) and pass after the fix.
- `lib/words.test.ts` covers the stale-`PENDING` rule.
- Finding 1 (UI) has no automated test; the project has no component test setup. It is a one-line change in the page.
- `npm run verify` passes: 8 test files, 95 tests.
- Fix commit: `6fe7e52`.

## Limits

- The reviewer is the same model family as the maker, run in a fresh context.
- A read-only review can miss runtime problems; the reviewer ran nothing.
- The review was done once, at the end. It was not part of every change.
