import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["./test/**/*.test.ts"],
    environment: "node",
    server: { deps: { inline: ["convex-test"] } },
    setupFiles: ["./vitest.setup.ts"],
    maxWorkers: 1,
  },
})
