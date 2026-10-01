import { addDays } from "./dates";

export const MAX_LEVEL = 4;

/** Days until the next review once a word has been promoted TO this level. */
export const INTERVAL_DAYS: Record<number, number> = { 1: 1, 2: 2, 3: 14, 4: 60 };

export type ReviewOutcome = "REMEMBERED" | "FORGOT";

export type Applied =
  | { kind: "scheduled"; level: number; dueDate: string }
  | { kind: "archived" };

export function applyReview(
  level: number,
  outcome: ReviewOutcome,
  today: string,
): Applied {
  if (outcome === "FORGOT") {
    return { kind: "scheduled", level: 0, dueDate: today };
  }
  if (level >= MAX_LEVEL) return { kind: "archived" };
  const next = level + 1;
  return {
    kind: "scheduled",
    level: next,
    dueDate: addDays(today, INTERVAL_DAYS[next]),
  };
}
