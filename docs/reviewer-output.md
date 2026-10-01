# Second review pass: reviewer agent (maker != checker)

Second checker pass, after the `/code-review` pass described in [code-review.md](code-review.md) and its fixes (`6fe7e52`).

## Setup

- **Agent definition:** [`.claude/agents/reviewer.md`](../.claude/agents/reviewer.md): read-only reviewer, may run `npm test` and read-only git commands, must not edit files, must not read `.env`, must say plainly when it finds nothing.
- **How it was run:** the session that created the file had not loaded the new agent definition (`Agent type 'reviewer' not found`), so the same instructions were passed word for word as the prompt to a general-purpose subagent. The reviewer therefore ran in a fresh context with the same rules, but not through the named `reviewer` agent type.
- **Scope:** the whole project at commit `d359b3d` plus the files of this change, checked against `AGENTS.md`, `docs/prd.md` and the five specs in `openspec/specs/`.
- **Limits:** the reviewer is the same model family as the maker. It read all code and ran `npm test` (95 passing); it did not use the database or the AI provider.

## Reviewer output (verbatim)

> Review of /Users/olehzharovskyi/Projects/words-to-learn: I found nothing important. `npm test` passes (8 files, 95 tests). I read all code in `actions/`, `app/`, `components/`, `lib/` and `scripts/`, and checked it against `AGENTS.md`, `docs/prd.md` and all five specs in `openspec/specs/`. The level schedule, archive/restore, queue filtering and ordering, double-submit guard, duplicate and spelling-correction rules, retry, and the `connection()`/`APP_TIMEZONE` handling all match the specs. I could not find an unhandled path that leaves a word stuck.
>
> Only minor issues remain. None breaks a spec scenario.
>
> 1. **Low: archive dates use the server time zone, not `APP_TIMEZONE`.**
>    - Where: `app/archive/page.tsx`, `formatDate(date: Date)` (about line 5). It formats `archivedAt` with no `timeZone`, while the rest of the app uses `APP_TIMEZONE` (default Europe/Kyiv) through `todayIn`.
>    - Failing scenario: the server runs in UTC (typical on hosting). A word is archived at 23:30 Kyiv time on 2026-10-01, which is 20:30 UTC, so the date is still 1 Oct. A word archived at 01:00 Kyiv time on 2 Oct is 22:00 UTC on 1 Oct and shows "1 Oct". The archive date is one day off for part of every day.
>    - Spec impact: `word-archive` requires showing the archive date, but does not name a time zone. This is a consistency bug.
>    - Confirmed by reading code only.
>
> 2. **Low: the double-submit guard does not protect a repeated "Forgot" on a level-0 word.**
>    - Where: `lib/srs/review.ts`, the `updateMany` guard (`where: { id, status: "ACTIVE", level: word.level, dueDate: word.dueDate }`).
>    - Failing scenario: a level-0 word is due today. Forgot resets it to level 0, due today, which is the same state the guard checks. Two concurrent Forgot submissions (two tabs, or a stale tab) both pass the guard and write two `ReviewLog` rows.
>    - Spec impact: `spaced-repetition` says "apply each submission at most once", but its double-submit scenario covers only a pass, and that case is guarded and tested. The UI also disables the buttons while a submission is pending. Harmless in practice (the word state is identical either way), but it is a gap against the wording.
>    - Confirmed by reading code only.
>
> 3. **Low: Retry on a stale PENDING word can race the original request.**
>    - Where: `lib/words.ts` (`canRetryEnrichment`, 2-minute stale rule) and `actions/word-actions.ts` (`retryEnrichment`).
>    - Failing scenario: an add is slow but still running at 2 minutes 5 seconds. The user presses Retry, and two enrichments run for one word. The last writer wins on translation and examples, and the examples are replaced atomically in a transaction. The data stays consistent, but the result is not deterministic. The normal 30-second AI timeout makes this very unlikely.
>    - Confirmed by reading code only.
>
> Verdict: no spec violations or correctness bugs of note; the three items above are minor and optional to fix.

## What the maker did with it

| # | Verified | Decision |
|---|---|---|
| 1 | Yes, read `app/archive/page.tsx`: `formatDate` has no `timeZone`. | Fixed: the date now uses `APP_TIMEZONE` (default `Europe/Kyiv`), like the rest of the app. No automated test; it is a formatting option. |
| 2 | Yes, the scenario is real. | Not fixed, accepted. A second "Forgot" submission arriving after the first one finished is indistinguishable from a legitimate second answer, so a database guard cannot tell them apart; fixing it would need a per-card submission token. The UI disables the buttons while a request is pending, and the only effect is an extra history row. |
| 3 | Yes, by reading `canRetryEnrichment`. | Not fixed, accepted. The AI call times out after 30 seconds and the stale threshold is 2 minutes, so the window is very small, and the data stays consistent either way. |

Result: the reviewer found no important problem this time. The earlier pass (`code-review.md`) found 4 real bugs, which were fixed before this pass, so a clean second pass is the expected outcome, not proof that the code has no bugs.
