import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: [
      "../validators/test/**/*.test.ts",
      "../helpers/test/**/*.test.ts",
      "../backend/convex/_tests/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/__e2e__/**",
      "**/*.spec.ts",
      "**/*.e2e.ts",
    ],
    environment: "node",
    server: { deps: { inline: ["convex-test"] } },
    setupFiles: ["./vitest.setup.ts"],
    maxWorkers: 1,
  },
})
