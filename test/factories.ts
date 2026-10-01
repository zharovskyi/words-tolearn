import { prisma } from "@/lib/db";
import { normalizeKey } from "@/lib/text";

type Overrides = Partial<{
  text: string;
  translation: string | null;
  enrichment: "PENDING" | "READY" | "FAILED";
  status: "ACTIVE" | "ARCHIVED";
  level: number;
  dueDate: string | null;
  examples: string[];
  updatedAt: Date;
}>;

export async function makeWord(o: Overrides = {}) {
  const text = o.text ?? `word-${Math.random().toString(36).slice(2, 8)}`;
  return prisma.word.create({
    data: {
      text,
      textKey: normalizeKey(text),
      translation: o.translation === undefined ? "переклад" : o.translation,
      enrichment: o.enrichment ?? "READY",
      status: o.status ?? "ACTIVE",
      level: o.level ?? 0,
      dueDate: o.dueDate === undefined ? "2026-10-01" : o.dueDate,
      ...(o.updatedAt ? { updatedAt: o.updatedAt } : {}),
      examples: {
        create: (o.examples ?? ["Example one.", "Example two."]).map(
          (sentence, position) => ({ sentence, position }),
        ),
      },
    },
  });
}
