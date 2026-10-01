import { describe, expect, it } from "vitest";
import { resolveDatabase } from "./db-config";

const TURSO = "libsql://db.turso.io?authToken=t";

describe("resolveDatabase", () => {
  it("uses Turso in production when configured", () => {
    expect(resolveDatabase({ NODE_ENV: "production", DATABASE_URL_LIBSQL: TURSO })).toEqual({
      kind: "turso",
      url: TURSO,
    });
  });

  it("throws a descriptive error in production without DATABASE_URL_LIBSQL", () => {
    const run = () => resolveDatabase({ NODE_ENV: "production", DATABASE_URL: "file:./dev.db" });
    expect(run).toThrow(/DATABASE_URL_LIBSQL is not set/);
    expect(run).toThrow(/refusing to fall back/);
  });

  it("does not throw during `next build`", () => {
    expect(
      resolveDatabase({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" }),
    ).toEqual({ kind: "file", url: "file:./dev.db" });
  });

  it("keeps the local file in development, even when a Turso URL is present", () => {
    expect(
      resolveDatabase({ NODE_ENV: "development", DATABASE_URL: "file:./dev.db", DATABASE_URL_LIBSQL: TURSO }),
    ).toEqual({ kind: "file", url: "file:./dev.db" });
  });

  it("uses Turso in development only with USE_TURSO=1", () => {
    expect(
      resolveDatabase({ NODE_ENV: "development", USE_TURSO: "1", DATABASE_URL_LIBSQL: TURSO }),
    ).toEqual({ kind: "turso", url: TURSO });
  });

  it("fails clearly when USE_TURSO=1 has no URL", () => {
    expect(() => resolveDatabase({ NODE_ENV: "development", USE_TURSO: "1" })).toThrow(/USE_TURSO=1/);
  });

  it("falls back to ./dev.db when DATABASE_URL is missing in development", () => {
    expect(resolveDatabase({ NODE_ENV: "development" })).toEqual({ kind: "file", url: "file:./dev.db" });
  });

  it("uses the file database under test", () => {
    expect(resolveDatabase({ NODE_ENV: "test", DATABASE_URL: "file:/tmp/x.db" })).toEqual({
      kind: "file",
      url: "file:/tmp/x.db",
    });
  });
});
