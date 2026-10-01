/** A PENDING word older than this is assumed to be abandoned (e.g. the request timed out). */
export const STALE_PENDING_MS = 2 * 60 * 1000;

export function canRetryEnrichment(
  word: { enrichment: string; updatedAt: Date },
  now: Date = new Date(),
): boolean {
  if (word.enrichment === "FAILED") return true;
  return (
    word.enrichment === "PENDING" &&
    now.getTime() - word.updatedAt.getTime() > STALE_PENDING_MS
  );
}
