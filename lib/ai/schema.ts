import { z } from "zod";

export const enrichmentSchema = z.object({
  correctedText: z.string().trim().min(1).max(100),
  translation: z.string().trim().min(1).max(200),
  examples: z
    .array(z.string().trim().min(1).max(200))
    .min(2)
    .max(3)
    .refine(
      (xs) => new Set(xs.map((x) => x.toLowerCase())).size === xs.length,
      "Examples must be distinct",
    ),
});

export type Enrichment = z.infer<typeof enrichmentSchema>;
