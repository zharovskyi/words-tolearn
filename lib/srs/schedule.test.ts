import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { applyReview } from "./schedule";

describe("applyReview", () => {
  it.each([
    [0, "2026-10-01", 1, "2026-10-02"],
    [1, "2026-10-02", 2, "2026-10-04"],
    [2, "2026-10-03", 3, "2026-10-17"],
    [3, "2026-10-17", 4, "2026-12-16"],
  ])("level %i remembered on %s -> level %i due %s", (lvl, today, nl, due) => {
    expect(applyReview(lvl, "REMEMBERED", today)).toEqual({
      kind: "scheduled",
      level: nl,
      dueDate: due,
    });
  });

  it("archives after passing level 4", () => {
    expect(applyReview(4, "REMEMBERED", "2026-10-01")).toEqual({ kind: "archived" });
  });

  it.each([0, 1, 2, 3, 4])("forgot at level %i resets to level 0 due today", (lvl) => {
    expect(applyReview(lvl, "FORGOT", "2026-10-01")).toEqual({
      kind: "scheduled",
      level: 0,
      dueDate: "2026-10-01",
    });
  });

  it("counts from the review date when overdue", () => {
    expect(applyReview(1, "REMEMBERED", "2026-10-09")).toMatchObject({
      dueDate: "2026-10-11",
    });
  });
});

describe("addDays", () => {
  it("handles month, year and leap-day boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
  });
});
