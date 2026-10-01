import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      "server-only": path.resolve(import.meta.dirname, "test/empty.ts"),
    },
  },
  test: {
    include: ["lib/**/*.test.ts", "actions/**/*.test.ts"],
    setupFiles: ["test/setup-db.ts"],
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
