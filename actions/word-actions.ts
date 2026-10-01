"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { enrichWord } from "@/lib/ai/enrich";
import { todayIn } from "@/lib/srs/dates";
import { canRetryEnrichment } from "@/lib/words";
import { isPlausibleCorrection, normalizeKey, wordInputSchema } from "@/lib/text";

export type AddWordResult =
  | ({ ok: true; wordId: string; correctedFrom?: string; text: string } & (
      | { enrichment: "READY" }
      | { enrichment: "FAILED"; error: string }
    ))
  | { ok: false; error: string; archivedId?: string };

export async function addWord(input: string): Promise<AddWordResult> {
  const parsed = wordInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const text = parsed.data;

  // Persist first so the word is never lost if the AI call fails.
  let wordId: string;
  try {
    const word = await prisma.word.create({
      data: {
        text,
        textKey: normalizeKey(text),
        level: 0,
        dueDate: todayIn(),
      },
    });
    wordId = word.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await prisma.word.findUnique({
        where: { textKey: normalizeKey(text) },
        select: { id: true, status: true },
      });
      if (existing?.status === "ARCHIVED") {
        return {
          ok: false,
          error: "This word is in your archive",
          archivedId: existing.id,
        };
      }
      return { ok: false, error: "This word already exists" };
    }
    throw e;
  }

  const outcome = await enrichAndSave(wordId, text, true);
  if (outcome.enrichment === "CONFLICT") {
    // The corrected spelling is already in the list: drop the misspelled duplicate.
    await prisma.word.delete({ where: { id: wordId } });
    revalidatePath("/");
    return {
      ok: false,
      error: `Did you mean "${outcome.existing.text}"? It ${
        outcome.existing.status === "ARCHIVED" ? "is in your archive" : "already exists"
      }.`,
      archivedId: outcome.existing.status === "ARCHIVED" ? outcome.existing.id : undefined,
    };
  }
  revalidatePath("/");
  const { correctedTo, ...rest } = outcome as EnrichOutcome & { correctedTo?: string };
  return {
    ok: true,
    wordId,
    text: correctedTo ?? text,
    correctedFrom: correctedTo ? text : undefined,
    ...rest,
  } as AddWordResult;
}

type EnrichOutcome =
  | { enrichment: "READY"; correctedTo?: string }
  | { enrichment: "FAILED"; error: string }
  | { enrichment: "CONFLICT"; existing: { id: string; text: string; status: string } };

/** Never leaves a word stuck in PENDING: unexpected errors mark it FAILED so it can be retried. */
async function enrichAndSave(
  wordId: string,
  text: string,
  mayConflict = false,
): Promise<EnrichOutcome> {
  try {
    return await enrichAndSaveUnsafe(wordId, text, mayConflict);
  } catch {
    const error = "Could not save the result";
    await prisma.word
      .update({ where: { id: wordId }, data: { enrichment: "FAILED", enrichmentError: error } })
      .catch(() => undefined);
    return { enrichment: "FAILED", error };
  }
}

async function enrichAndSaveUnsafe(
  wordId: string,
  text: string,
  mayConflict: boolean,
): Promise<EnrichOutcome> {
  const result = await enrichWord(text);

  if (!result.ok) {
    await prisma.word.update({
      where: { id: wordId },
      data: { enrichment: "FAILED", enrichmentError: result.error },
    });
    return { enrichment: "FAILED", error: result.error };
  }

  let correctedTo: string | undefined;
  const suggested = result.data.correctedText;
  if (isPlausibleCorrection(text, suggested)) {
    const existing = await prisma.word.findUnique({
      where: { textKey: normalizeKey(suggested) },
      select: { id: true, text: true, status: true },
    });
    if (existing && existing.id !== wordId) {
      if (mayConflict) return { enrichment: "CONFLICT", existing };
    } else {
      correctedTo = suggested;
    }
  }

  const save = (newText?: string) =>
    prisma.$transaction([
      prisma.example.deleteMany({ where: { wordId } }),
      prisma.word.update({
        where: { id: wordId },
        data: {
          ...(newText ? { text: newText, textKey: normalizeKey(newText) } : {}),
          translation: result.data.translation,
          enrichment: "READY",
          enrichmentError: null,
          examples: {
            create: result.data.examples.map((sentence, position) => ({
              sentence,
              position,
            })),
          },
        },
      }),
    ]);

  try {
    await save(correctedTo);
  } catch (e) {
    // Another word took the corrected spelling between the check and the write.
    if (correctedTo && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      correctedTo = undefined;
      await save();
    } else {
      throw e;
    }
  }
  return { enrichment: "READY", correctedTo };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Retry AI enrichment for a word whose previous attempt failed. Level and due date are untouched. */
export async function retryEnrichment(id: string): Promise<ActionResult> {
  const word = await prisma.word.findUnique({ where: { id } });
  if (!word || !canRetryEnrichment(word)) {
    return { ok: false, error: "Nothing to retry" };
  }
  const outcome = await enrichAndSave(word.id, word.text);
  revalidatePath("/");
  return outcome.enrichment === "READY"
    ? { ok: true }
    : { ok: false, error: outcome.enrichment === "FAILED" ? outcome.error : "Could not retry" };
}

export async function deleteWord(id: string): Promise<ActionResult> {
  const { count } = await prisma.word.deleteMany({ where: { id } });
  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath("/archive");
  return count > 0 ? { ok: true } : { ok: false, error: "Word not found" };
}

/** Archive an active word immediately as manually learned. */
export async function markLearned(id: string): Promise<ActionResult> {
  const { count } = await prisma.word.updateMany({
    where: { id, status: "ACTIVE" },
    data: {
      status: "ARCHIVED",
      archiveReason: "MANUAL",
      archivedAt: new Date(),
      dueDate: null,
    },
  });
  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath("/archive");
  return count > 0 ? { ok: true } : { ok: false, error: "Word not found" };
}

/** Bring an archived word back into the learning loop at level 0, due today. */
export async function restoreWord(id: string): Promise<ActionResult> {
  const { count } = await prisma.word.updateMany({
    where: { id, status: "ARCHIVED" },
    data: {
      status: "ACTIVE",
      level: 0,
      dueDate: todayIn(),
      archivedAt: null,
      archiveReason: null,
    },
  });
  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath("/archive");
  return count > 0 ? { ok: true } : { ok: false, error: "Word not found" };
}
