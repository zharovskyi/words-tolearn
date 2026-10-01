import "server-only";
import { prisma } from "@/lib/db";
import { todayIn } from "./dates";
import { applyReview, type ReviewOutcome } from "./schedule";

export type ReviewResult = { ok: true } | { ok: false; error: string };

export async function dueQueue() {
  return prisma.word.findMany({
    where: {
      status: "ACTIVE",
      enrichment: "READY",
      dueDate: { lte: todayIn() },
    },
    // Forgotten words get a fresh updatedAt, so they go to the end of the day's queue.
    orderBy: [{ dueDate: "asc" }, { updatedAt: "asc" }],
    include: { examples: { orderBy: { position: "asc" } } },
  });
}

export async function nextDueDate(): Promise<string | null> {
  const next = await prisma.word.findFirst({
    where: { status: "ACTIVE", enrichment: "READY", dueDate: { gt: todayIn() } },
    orderBy: { dueDate: "asc" },
    select: { dueDate: true },
  });
  return next?.dueDate ?? null;
}

export async function applyWordReview(
  id: string,
  outcome: ReviewOutcome,
): Promise<ReviewResult> {
  const today = todayIn();
  return prisma.$transaction(async (tx) => {
    const word = await tx.word.findUnique({ where: { id } });
    if (
      !word ||
      word.status !== "ACTIVE" ||
      word.enrichment !== "READY" ||
      !word.dueDate ||
      word.dueDate > today
    ) {
      return { ok: false, error: "This word is not due for review" } as const;
    }

    const applied = applyReview(word.level, outcome, today);
    // Optimistic guard: only succeeds if nobody changed the word since we read it.
    const changed = await tx.word.updateMany({
      where: { id, status: "ACTIVE", level: word.level, dueDate: word.dueDate },
      data:
        applied.kind === "archived"
          ? {
              status: "ARCHIVED",
              archiveReason: "COMPLETED",
              archivedAt: new Date(),
              dueDate: null,
            }
          : { level: applied.level, dueDate: applied.dueDate },
    });
    if (changed.count === 0) {
      return { ok: false, error: "This review was already recorded" } as const;
    }

    await tx.reviewLog.create({
      data: {
        wordId: id,
        outcome,
        fromLevel: word.level,
        toLevel: applied.kind === "archived" ? null : applied.level,
        nextDue: applied.kind === "archived" ? null : applied.dueDate,
      },
    });
    return { ok: true } as const;
  });
}
