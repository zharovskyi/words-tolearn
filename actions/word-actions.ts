"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { enrichWord } from "@/lib/ai/enrich";
import { todayIn } from "@/lib/srs/dates";
import { normalizeKey, wordInputSchema } from "@/lib/text";

export type AddWordResult =
  | ({ ok: true; wordId: string } & ({ enrichment: "READY" } | { enrichment: "FAILED"; error: string }))
  | { ok: false; error: string };

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
      return { ok: false, error: "This word already exists" };
    }
    throw e;
  }

  const outcome = await enrichAndSave(wordId, text);
  revalidatePath("/");
  return { ok: true, wordId, ...outcome };
}

type EnrichOutcome = { enrichment: "READY" } | { enrichment: "FAILED"; error: string };

async function enrichAndSave(wordId: string, text: string): Promise<EnrichOutcome> {
  const result = await enrichWord(text);

  if (!result.ok) {
    await prisma.word.update({
      where: { id: wordId },
      data: { enrichment: "FAILED", enrichmentError: result.error },
    });
    return { enrichment: "FAILED", error: result.error };
  }

  await prisma.$transaction([
    prisma.example.deleteMany({ where: { wordId } }),
    prisma.word.update({
      where: { id: wordId },
      data: {
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
  return { enrichment: "READY" };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Retry AI enrichment for a word whose previous attempt failed. Level and due date are untouched. */
export async function retryEnrichment(id: string): Promise<ActionResult> {
  const word = await prisma.word.findUnique({ where: { id } });
  if (!word || word.enrichment !== "FAILED") {
    return { ok: false, error: "Nothing to retry" };
  }
  const outcome = await enrichAndSave(word.id, word.text);
  revalidatePath("/");
  return outcome.enrichment === "READY"
    ? { ok: true }
    : { ok: false, error: outcome.error };
}

export async function deleteWord(id: string): Promise<ActionResult> {
  const { count } = await prisma.word.deleteMany({ where: { id } });
  revalidatePath("/");
  revalidatePath("/review");
  return count > 0 ? { ok: true } : { ok: false, error: "Word not found" };
}
