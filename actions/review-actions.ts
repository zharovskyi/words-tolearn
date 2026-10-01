"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { applyWordReview, type ReviewResult } from "@/lib/srs/review";

const inputSchema = z.object({
  id: z.string().min(1).max(64),
  outcome: z.enum(["REMEMBERED", "FORGOT"]),
});

export async function reviewWord(
  id: string,
  outcome: "REMEMBERED" | "FORGOT",
): Promise<ReviewResult> {
  const parsed = inputSchema.safeParse({ id, outcome });
  if (!parsed.success) return { ok: false, error: "Invalid review" };

  const result = await applyWordReview(parsed.data.id, parsed.data.outcome);
  revalidatePath("/review");
  revalidatePath("/");
  return result;
}
