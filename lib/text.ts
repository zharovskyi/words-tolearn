import { z } from "zod";

export const wordInputSchema = z
  .string()
  .trim()
  .min(1, "Enter a word or phrase")
  .max(100, "Keep it under 100 characters");

export function normalizeKey(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return prev[b.length];
}

/** A spelling fix is plausible if it changes only a few characters (typo, not a different word). */
export function isPlausibleCorrection(original: string, corrected: string): boolean {
  const a = normalizeKey(original);
  const b = normalizeKey(corrected);
  if (a === b) return false;
  return editDistance(a, b) <= Math.max(2, Math.floor(a.length * 0.3));
}
