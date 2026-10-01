import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { makeWord } from "@/test/factories";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/ai/enrich", () => ({ enrichWord: vi.fn() }));

import { revalidatePath } from "next/cache";
import { enrichWord } from "@/lib/ai/enrich";
import {
  addWord,
  deleteWord,
  markLearned,
  restoreWord,
  retryEnrichment,
} from "./word-actions";

const enrich = vi.mocked(enrichWord);

function aiReturns(over: Partial<{ correctedText: string; translation: string; examples: string[] }> = {}, text = "word") {
  enrich.mockResolvedValueOnce({
    ok: true,
    data: {
      correctedText: over.correctedText ?? text,
      translation: over.translation ?? "слово",
      examples: over.examples ?? ["First example.", "Second example."],
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-01T09:00:00Z"));
  enrich.mockReset();
  vi.mocked(revalidatePath).mockClear();
});

describe("addWord", () => {
  it("stores the word at level 0 due today with translation and examples", async () => {
    aiReturns({ translation: "відмовний", examples: ["A.", "B.", "C."] }, "reluctant");
    const result = await addWord("  reluctant ");

    expect(result).toMatchObject({ ok: true, enrichment: "READY", text: "reluctant" });
    const word = await prisma.word.findUniqueOrThrow({
      where: { textKey: "reluctant" },
      include: { examples: { orderBy: { position: "asc" } } },
    });
    expect(word).toMatchObject({
      text: "reluctant",
      translation: "відмовний",
      enrichment: "READY",
      status: "ACTIVE",
      level: 0,
      dueDate: "2026-10-01",
    });
    expect(word.examples.map((e) => e.sentence)).toEqual(["A.", "B.", "C."]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("sends the trimmed text to the AI step", async () => {
    aiReturns({}, "run out of");
    await addWord("  run out of  ");
    expect(enrich).toHaveBeenCalledWith("run out of");
  });

  it.each([["  "], [""], ["x".repeat(101)]])("rejects invalid input %j without calling AI", async (input) => {
    const result = await addWord(input);
    expect(result.ok).toBe(false);
    expect(enrich).not.toHaveBeenCalled();
    expect(await prisma.word.count()).toBe(0);
  });

  it("accepts exactly 100 characters", async () => {
    const text = "a".repeat(100);
    aiReturns({}, text);
    expect((await addWord(text)).ok).toBe(true);
  });

  it("rejects a duplicate, ignoring case and extra spaces", async () => {
    await makeWord({ text: "Ambiguous" });
    const result = await addWord("  ambiguous ");

    expect(result).toEqual({ ok: false, error: "This word already exists" });
    expect(enrich).not.toHaveBeenCalled();
    expect(await prisma.word.count()).toBe(1);
  });

  it("offers to restore when the duplicate is archived", async () => {
    const archived = await makeWord({ text: "ambiguous", status: "ARCHIVED", dueDate: null });
    const result = await addWord("ambiguous");

    expect(result).toMatchObject({ ok: false, archivedId: archived.id });
    expect(await prisma.word.count()).toBe(1);
  });

  it("keeps the word as FAILED when the AI step fails", async () => {
    enrich.mockResolvedValueOnce({ ok: false, error: "AI request failed" });
    const result = await addWord("persevere");

    expect(result).toMatchObject({ ok: true, enrichment: "FAILED", error: "AI request failed" });
    const word = await prisma.word.findUniqueOrThrow({
      where: { textKey: "persevere" },
      include: { examples: true },
    });
    expect(word).toMatchObject({
      enrichment: "FAILED",
      enrichmentError: "AI request failed",
      translation: null,
      level: 0,
      dueDate: "2026-10-01",
    });
    expect(word.examples).toHaveLength(0);
  });

  it("applies a small spelling correction", async () => {
    aiReturns({ correctedText: "apple", translation: "яблуко" }, "aple");
    const result = await addWord("aple");

    expect(result).toMatchObject({ ok: true, text: "apple", correctedFrom: "aple" });
    expect(await prisma.word.findUnique({ where: { textKey: "aple" } })).toBeNull();
    expect(await prisma.word.findUnique({ where: { textKey: "apple" } })).toMatchObject({
      text: "apple",
      translation: "яблуко",
    });
  });

  it("ignores a correction that replaces the word with a different one", async () => {
    aiReturns({ correctedText: "elephant" }, "cat");
    const result = await addWord("cat");

    expect(result).toMatchObject({ ok: true, text: "cat" });
    expect((result as { correctedFrom?: string }).correctedFrom).toBeUndefined();
    expect(await prisma.word.findUnique({ where: { textKey: "cat" } })).not.toBeNull();
    expect(await prisma.word.findUnique({ where: { textKey: "elephant" } })).toBeNull();
  });

  it("does not change a correctly spelled word", async () => {
    aiReturns({ correctedText: "Apple" }, "apple");
    const result = await addWord("apple");
    expect((result as { correctedFrom?: string }).correctedFrom).toBeUndefined();
    expect((await prisma.word.findUniqueOrThrow({ where: { textKey: "apple" } })).text).toBe("apple");
  });

  it("drops the misspelled entry when the corrected word already exists", async () => {
    const existing = await makeWord({ text: "apple" });
    aiReturns({ correctedText: "apple" }, "aple");
    const result = await addWord("aple");

    expect(result).toMatchObject({ ok: false });
    expect((result as { error: string }).error).toContain("apple");
    expect(await prisma.word.count()).toBe(1);
    expect((await prisma.word.findFirstOrThrow()).id).toBe(existing.id);
  });

  it("offers restore when the corrected word is archived", async () => {
    const archived = await makeWord({ text: "apple", status: "ARCHIVED", dueDate: null });
    aiReturns({ correctedText: "apple" }, "aple");
    const result = await addWord("aple");

    expect(result).toMatchObject({ ok: false, archivedId: archived.id });
    expect(await prisma.word.count()).toBe(1);
  });
});

describe("retryEnrichment", () => {
  it("fills in a failed word without touching its level or due date", async () => {
    const w = await makeWord({
      text: "persevere",
      enrichment: "FAILED",
      translation: null,
      level: 2,
      dueDate: "2026-10-15",
      examples: [],
    });
    aiReturns({ translation: "наполегливо продовжувати" }, "persevere");

    expect(await retryEnrichment(w.id)).toEqual({ ok: true });
    const after = await prisma.word.findUniqueOrThrow({
      where: { id: w.id },
      include: { examples: true },
    });
    expect(after).toMatchObject({
      enrichment: "READY",
      enrichmentError: null,
      translation: "наполегливо продовжувати",
      level: 2,
      dueDate: "2026-10-15",
    });
    expect(after.examples).toHaveLength(2);
  });

  it("reports the failure and keeps the word FAILED when AI fails again", async () => {
    const w = await makeWord({ enrichment: "FAILED", translation: null, examples: [] });
    enrich.mockResolvedValueOnce({ ok: false, error: "AI request failed" });

    expect(await retryEnrichment(w.id)).toEqual({ ok: false, error: "AI request failed" });
    expect((await prisma.word.findUniqueOrThrow({ where: { id: w.id } })).enrichment).toBe("FAILED");
  });

  it("does nothing for a word that is already READY", async () => {
    const w = await makeWord();
    expect(await retryEnrichment(w.id)).toEqual({ ok: false, error: "Nothing to retry" });
    expect(enrich).not.toHaveBeenCalled();
  });

  it("does not duplicate examples when retried", async () => {
    const w = await makeWord({ enrichment: "FAILED", translation: null, examples: ["Old."] });
    aiReturns({ examples: ["New one.", "New two."] });
    await retryEnrichment(w.id);

    const examples = await prisma.example.findMany({ where: { wordId: w.id }, orderBy: { position: "asc" } });
    expect(examples.map((e) => e.sentence)).toEqual(["New one.", "New two."]);
  });

  it("does not rename a word when the corrected spelling belongs to another word", async () => {
    await makeWord({ text: "apple" });
    const w = await makeWord({ text: "aple", enrichment: "FAILED", translation: null, examples: [] });
    aiReturns({ correctedText: "apple" }, "aple");

    expect(await retryEnrichment(w.id)).toEqual({ ok: true });
    expect((await prisma.word.findUniqueOrThrow({ where: { id: w.id } })).text).toBe("aple");
  });
});

describe("deleteWord", () => {
  it("removes the word with its examples and review history", async () => {
    const w = await makeWord();
    await prisma.reviewLog.create({
      data: { wordId: w.id, outcome: "REMEMBERED", fromLevel: 0, toLevel: 1, nextDue: "2026-10-02" },
    });

    expect(await deleteWord(w.id)).toEqual({ ok: true });
    expect(await prisma.word.count()).toBe(0);
    expect(await prisma.example.count()).toBe(0);
    expect(await prisma.reviewLog.count()).toBe(0);
  });

  it("reports an unknown word", async () => {
    expect(await deleteWord("nope")).toEqual({ ok: false, error: "Word not found" });
  });

  it("only deletes the requested word", async () => {
    const keep = await makeWord({ text: "keep" });
    const drop = await makeWord({ text: "drop" });
    await deleteWord(drop.id);
    expect((await prisma.word.findMany()).map((w) => w.id)).toEqual([keep.id]);
  });
});

describe("markLearned", () => {
  it("archives an active word as MANUAL and clears its due date", async () => {
    const w = await makeWord({ level: 1, dueDate: "2026-10-02" });
    expect(await markLearned(w.id)).toEqual({ ok: true });

    const after = await prisma.word.findUniqueOrThrow({ where: { id: w.id } });
    expect(after).toMatchObject({ status: "ARCHIVED", archiveReason: "MANUAL", dueDate: null });
    expect(after.archivedAt).toBeInstanceOf(Date);
  });

  it("does nothing for a word that is already archived", async () => {
    const w = await makeWord({ status: "ARCHIVED", dueDate: null });
    expect(await markLearned(w.id)).toEqual({ ok: false, error: "Word not found" });
  });
});

describe("restoreWord", () => {
  it("returns an archived word to level 0 due today and clears archive fields", async () => {
    const w = await makeWord({ level: 4, dueDate: null, status: "ARCHIVED" });
    await prisma.word.update({
      where: { id: w.id },
      data: { archiveReason: "COMPLETED", archivedAt: new Date() },
    });

    expect(await restoreWord(w.id)).toEqual({ ok: true });
    const after = await prisma.word.findUniqueOrThrow({ where: { id: w.id } });
    expect(after).toMatchObject({
      status: "ACTIVE",
      level: 0,
      dueDate: "2026-10-01",
      archiveReason: null,
      archivedAt: null,
    });
  });

  it("does nothing for an active word", async () => {
    const w = await makeWord({ level: 3, dueDate: "2026-10-15" });
    expect(await restoreWord(w.id)).toEqual({ ok: false, error: "Word not found" });
    expect(await prisma.word.findUniqueOrThrow({ where: { id: w.id } })).toMatchObject({
      level: 3,
      dueDate: "2026-10-15",
    });
  });
});
