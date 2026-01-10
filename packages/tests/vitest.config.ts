import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: [
      "../validators/test/**/*.test.ts",
      "../helpers/test/**/*.test.ts",
      "../backend/convex/_tests/**/*.test.ts",
    ],
    environment: "node",
    server: { deps: { inline: ["convex-test"] } },
    setupFiles: ["./vitest.setup.ts"],
    maxWorkers: 1,
  },
})
