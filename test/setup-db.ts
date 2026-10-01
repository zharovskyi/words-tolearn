import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach } from "vitest";

// Each test file gets its own throwaway SQLite database with the real migrations applied.
const dir = mkdtempSync(path.join(tmpdir(), "wtl-test-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
process.env.APP_TIMEZONE = "Europe/Kyiv";

execSync("npx prisma migrate deploy", {
  env: process.env,
  stdio: "pipe",
});

const { prisma } = await import("@/lib/db");

beforeEach(async () => {
  await prisma.reviewLog.deleteMany();
  await prisma.example.deleteMany();
  await prisma.word.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});
