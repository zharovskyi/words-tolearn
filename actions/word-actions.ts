"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { enrichWord } from "@/lib/ai/enrich";
import { todayIn } from "@/lib/srs/dates";
import { normalizeKey, wordInputSchema } from "@/lib/text";

export type AddWordResult =
  | { ok: true; wordId: string; enrichment: "READY" | "FAILED"; error?: string }
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

  const result = await enrichWord(text);

  if (!result.ok) {
    await prisma.word.update({
      where: { id: wordId },
      data: { enrichment: "FAILED", enrichmentError: result.error },
    });
    revalidatePath("/");
    return { ok: true, wordId, enrichment: "FAILED", error: result.error };
  }

  await prisma.word.update({
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
  });
  revalidatePath("/");
  return { ok: true, wordId, enrichment: "READY" };
}
