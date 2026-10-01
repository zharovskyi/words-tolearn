import { describe, expect, it } from "vitest";
import { isPlausibleCorrection, normalizeKey } from "./text";

describe("isPlausibleCorrection", () => {
  it("accepts small typo fixes", () => {
    expect(isPlausibleCorrection("aple", "apple")).toBe(true);
    expect(isPlausibleCorrection("recieve", "receive")).toBe(true);
    expect(isPlausibleCorrection("run out ofe", "run out of")).toBe(true);
  });

  it("rejects replacing the word with a different one", () => {
    expect(isPlausibleCorrection("cat", "elephant")).toBe(false);
    expect(isPlausibleCorrection("go", "return")).toBe(false);
  });

  it("ignores case and spacing only differences", () => {
    expect(isPlausibleCorrection("Apple ", "apple")).toBe(false);
  });
});

describe("normalizeKey", () => {
  it("lower-cases and collapses whitespace", () => {
    expect(normalizeKey("  Run   OUT of ")).toBe("run out of");
  });
});
