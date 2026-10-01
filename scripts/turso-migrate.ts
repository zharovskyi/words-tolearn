/**
 * Apply the Prisma migrations in prisma/migrations to the Turso database in
 * DATABASE_URL_LIBSQL. The Prisma CLI cannot connect to libsql:// URLs, so the
 * migration SQL is run through the libSQL client. Applied migrations are
 * recorded in the `_applied_migrations` table, so re-running is safe.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { parseLibsqlUrl } from "../lib/libsql-url";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional when the variable is already set
}

const raw = process.env.DATABASE_URL_LIBSQL;
if (!raw) {
  console.error("DATABASE_URL_LIBSQL is not set");
  process.exit(1);
}

async function main(raw: string) {
  const db = createClient(parseLibsqlUrl(raw));
  const dir = path.join("prisma", "migrations");

  await db.execute(
    "CREATE TABLE IF NOT EXISTS _applied_migrations (name TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)",
  );
  const applied = new Set(
    (await db.execute("SELECT name FROM _applied_migrations")).rows.map((r) => String(r.name)),
  );

  const names = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let count = 0;
  for (const name of names) {
    if (applied.has(name)) continue;
    const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");
    await db.executeMultiple(sql);
    await db.execute({
      sql: "INSERT INTO _applied_migrations (name, appliedAt) VALUES (?, ?)",
      args: [name, new Date().toISOString()],
    });
    console.log(`Applied ${name}`);
    count++;
  }
  console.log(count ? `Done: ${count} migration(s) applied.` : "Turso is already up to date.");
}

main(raw).catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
