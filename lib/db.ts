import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import { resolveDatabase } from "./db-config";
import { parseLibsqlUrl } from "./libsql-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const target = resolveDatabase(process.env);
  const adapter =
    target.kind === "turso"
      ? new PrismaLibSql(parseLibsqlUrl(target.url))
      : new PrismaBetterSqlite3({ url: target.url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
