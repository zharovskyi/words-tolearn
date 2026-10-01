import { z } from "zod";

export const wordInputSchema = z
  .string()
  .trim()
  .min(1, "Enter a word or phrase")
  .max(100, "Keep it under 100 characters");

export function normalizeKey(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}
