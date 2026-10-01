import { describe, expect, it } from "vitest";
import { STALE_PENDING_MS, canRetryEnrichment } from "./words";

const now = new Date("2026-10-01T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

describe("canRetryEnrichment", () => {
  it("allows retry for FAILED words", () => {
    expect(canRetryEnrichment({ enrichment: "FAILED", updatedAt: now }, now)).toBe(true);
  });

  it("does not allow retry for READY words", () => {
    expect(canRetryEnrichment({ enrichment: "READY", updatedAt: ago(1e9) }, now)).toBe(false);
  });

  it("does not allow retry while a PENDING word is still in flight", () => {
    expect(canRetryEnrichment({ enrichment: "PENDING", updatedAt: ago(5_000) }, now)).toBe(false);
  });

  it("allows retry for a PENDING word that has been abandoned", () => {
    expect(
      canRetryEnrichment({ enrichment: "PENDING", updatedAt: ago(STALE_PENDING_MS + 1) }, now),
    ).toBe(true);
  });
});
