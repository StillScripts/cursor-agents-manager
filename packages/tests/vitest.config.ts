import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["./validators/**/*.test.ts", "../db/convex/_tests/**/*.test.ts"],
    environment: "node",
    server: { deps: { inline: ["convex-test"] } },
    setupFiles: ["./vitest.setup.ts"],
    maxWorkers: 1,
  },
})
