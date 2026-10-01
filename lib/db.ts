import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import { parseLibsqlUrl } from "./libsql-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Turso (libSQL) is used in production when DATABASE_URL_LIBSQL is set, and in
 * development only when USE_TURSO=1. Otherwise a local SQLite file is used.
 */
function shouldUseTurso() {
  return (
    !!process.env.DATABASE_URL_LIBSQL &&
    (process.env.NODE_ENV === "production" || process.env.USE_TURSO === "1")
  );
}

function createClient() {
  const adapter = shouldUseTurso()
    ? new PrismaLibSql(parseLibsqlUrl(process.env.DATABASE_URL_LIBSQL!))
    : new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
