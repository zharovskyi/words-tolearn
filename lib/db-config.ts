export type DatabaseTarget =
  | { kind: "turso"; url: string }
  | { kind: "file"; url: string };

type Env = Partial<Record<string, string | undefined>>;

/**
 * Turso (libSQL) is used in production, and in development only with USE_TURSO=1.
 * In production a missing DATABASE_URL_LIBSQL is an error: silently falling back
 * to a local file would lose data on hosts with an ephemeral file system.
 */
export function resolveDatabase(env: Env): DatabaseTarget {
  const libsql = env.DATABASE_URL_LIBSQL;
  const production = env.NODE_ENV === "production";
  // `next build` evaluates modules without querying the database.
  const building = env.NEXT_PHASE === "phase-production-build";

  if (libsql && (production || env.USE_TURSO === "1")) {
    return { kind: "turso", url: libsql };
  }

  if (production && !building) {
    throw new Error(
      "DATABASE_URL_LIBSQL is not set. In production the app requires a Turso database; " +
        "refusing to fall back to the local SQLite file. Set DATABASE_URL_LIBSQL " +
        "(libsql://<db>.turso.io?authToken=<token>) in the environment.",
    );
  }

  if (env.USE_TURSO === "1" && !libsql) {
    throw new Error("USE_TURSO=1 is set but DATABASE_URL_LIBSQL is missing.");
  }

  return { kind: "file", url: env.DATABASE_URL ?? "file:./dev.db" };
}
