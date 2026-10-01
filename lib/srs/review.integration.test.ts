import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { makeWord } from "@/test/factories";
import { applyWordReview, dueQueue, nextDueDate } from "./review";

const TODAY = "2026-10-01";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-01T09:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("dueQueue", () => {
  it("returns only active, enriched words due today or earlier, most overdue first", async () => {
    const today = await makeWord({ text: "today", dueDate: TODAY });
    const overdue = await makeWord({ text: "overdue", dueDate: "2026-09-25" });
    await makeWord({ text: "future", dueDate: "2026-10-02" });
    await makeWord({ text: "archived", status: "ARCHIVED", dueDate: null });
    await makeWord({ text: "failed", enrichment: "FAILED", translation: null });
    await makeWord({ text: "pending", enrichment: "PENDING", translation: null });

    const queue = await dueQueue();
    expect(queue.map((w) => w.id)).toEqual([overdue.id, today.id]);
  });

  it("includes ordered examples", async () => {
    await makeWord({ examples: ["First.", "Second.", "Third."] });
    const [word] = await dueQueue();
    expect(word.examples.map((e) => e.sentence)).toEqual(["First.", "Second.", "Third."]);
  });

  it("puts a forgotten word after the others due the same day", async () => {
    const first = await makeWord({ text: "a", dueDate: TODAY, updatedAt: new Date("2026-10-01T06:00:00Z") });
    const second = await makeWord({ text: "b", dueDate: TODAY, updatedAt: new Date("2026-10-01T07:00:00Z") });
    const third = await makeWord({ text: "c", dueDate: TODAY, updatedAt: new Date("2026-10-01T08:00:00Z") });

    expect((await applyWordReview(first.id, "FORGOT")).ok).toBe(true);
    expect((await dueQueue()).map((w) => w.id)).toEqual([second.id, third.id, first.id]);
  });

  it("is empty when nothing is due", async () => {
    await makeWord({ dueDate: "2026-10-05" });
    expect(await dueQueue()).toEqual([]);
  });
});

describe("nextDueDate", () => {
  it("returns the earliest future due date of an active enriched word", async () => {
    await makeWord({ dueDate: "2026-10-09" });
    await makeWord({ dueDate: "2026-10-03" });
    await makeWord({ dueDate: "2026-10-02", status: "ARCHIVED" });
    await makeWord({ dueDate: "2026-10-02", enrichment: "FAILED" });
    expect(await nextDueDate()).toBe("2026-10-03");
  });

  it("is null when there is nothing scheduled", async () => {
    expect(await nextDueDate()).toBeNull();
  });
});

describe("applyWordReview", () => {
  it.each([
    [0, 1, "2026-10-02"],
    [1, 2, "2026-10-03"],
    [2, 3, "2026-10-15"],
    [3, 4, "2026-11-30"],
  ])("Remembered at level %i moves to level %i due %s", async (level, next, due) => {
    const w = await makeWord({ level });
    expect(await applyWordReview(w.id, "REMEMBERED")).toEqual({ ok: true });

    const after = await prisma.word.findUniqueOrThrow({ where: { id: w.id } });
    expect(after).toMatchObject({ status: "ACTIVE", level: next, dueDate: due });
  });

  it("archives a word that passes level 4", async () => {
    const w = await makeWord({ level: 4 });
    expect(await applyWordReview(w.id, "REMEMBERED")).toEqual({ ok: true });

    const after = await prisma.word.findUniqueOrThrow({ where: { id: w.id } });
    expect(after).toMatchObject({
      status: "ARCHIVED",
      archiveReason: "COMPLETED",
      dueDate: null,
    });
    expect(after.archivedAt).toBeInstanceOf(Date);
    expect(await dueQueue()).toEqual([]);
  });

  it("resets to level 0 due today on Forgot", async () => {
    const w = await makeWord({ level: 3, dueDate: "2026-09-28" });
    expect(await applyWordReview(w.id, "FORGOT")).toEqual({ ok: true });

    const after = await prisma.word.findUniqueOrThrow({ where: { id: w.id } });
    expect(after).toMatchObject({ level: 0, dueDate: TODAY, status: "ACTIVE" });
  });

  it("counts the next interval from the review date, not the original due date", async () => {
    const w = await makeWord({ level: 1, dueDate: "2026-09-24" });
    await applyWordReview(w.id, "REMEMBERED");
    const after = await prisma.word.findUniqueOrThrow({ where: { id: w.id } });
    expect(after.dueDate).toBe("2026-10-03");
  });

  it("writes a review log entry for each applied review", async () => {
    const w = await makeWord({ level: 2 });
    await applyWordReview(w.id, "REMEMBERED");
    await prisma.word.update({ where: { id: w.id }, data: { dueDate: TODAY } });
    await applyWordReview(w.id, "FORGOT");

    const logs = await prisma.reviewLog.findMany({
      where: { wordId: w.id },
      orderBy: { reviewedAt: "asc" },
    });
    expect(logs).toMatchObject([
      { outcome: "REMEMBERED", fromLevel: 2, toLevel: 3, nextDue: "2026-10-15" },
      { outcome: "FORGOT", fromLevel: 3, toLevel: 0, nextDue: TODAY },
    ]);
  });

  it("logs a null level and due date when the word is archived", async () => {
    const w = await makeWord({ level: 4 });
    await applyWordReview(w.id, "REMEMBERED");
    const [log] = await prisma.reviewLog.findMany({ where: { wordId: w.id } });
    expect(log).toMatchObject({ fromLevel: 4, toLevel: null, nextDue: null });
  });

  it("rejects a word that is not due yet and leaves it unchanged", async () => {
    const w = await makeWord({ level: 1, dueDate: "2026-10-02" });
    const result = await applyWordReview(w.id, "REMEMBERED");

    expect(result).toEqual({ ok: false, error: "This word is not due for review" });
    const after = await prisma.word.findUniqueOrThrow({ where: { id: w.id } });
    expect(after).toMatchObject({ level: 1, dueDate: "2026-10-02" });
    expect(await prisma.reviewLog.count()).toBe(0);
  });

  it.each([
    ["archived", { status: "ARCHIVED", dueDate: null }],
    ["failed enrichment", { enrichment: "FAILED", translation: null }],
    ["pending enrichment", { enrichment: "PENDING", translation: null }],
  ] as const)("rejects a %s word", async (_name, overrides) => {
    const w = await makeWord(overrides);
    const result = await applyWordReview(w.id, "REMEMBERED");
    expect(result.ok).toBe(false);
    expect(await prisma.reviewLog.count()).toBe(0);
  });

  it("rejects an unknown id", async () => {
    expect((await applyWordReview("does-not-exist", "FORGOT")).ok).toBe(false);
  });

  it("applies a double submit only once", async () => {
    const w = await makeWord({ level: 0 });
    const results = await Promise.all([
      applyWordReview(w.id, "REMEMBERED"),
      applyWordReview(w.id, "REMEMBERED"),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const after = await prisma.word.findUniqueOrThrow({ where: { id: w.id } });
    expect(after.level).toBe(1);
    expect(await prisma.reviewLog.count({ where: { wordId: w.id } })).toBe(1);
  });
});
