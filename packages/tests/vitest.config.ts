import { dirname, resolve } from "path"
import { fileURLToPath } from "url"
import { configDefaults, defineConfig } from "vitest/config"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  // Set root to this package directory to ensure paths resolve correctly
  root: __dirname,
  test: {
    include: [
      "../validators/test/**/*.test.ts",
      "../helpers/test/**/*.test.ts",
      "../backend/convex/_tests/**/*.test.ts",
    ],
    exclude: [
      // Start with Vitest's default exclusions
      ...configDefaults.exclude,
      // Explicitly exclude e2e directory at root level (relative from packages/tests/)
      "../../__e2e__/**",
      // Exclude Playwright test files by pattern (these are in __e2e__ directory)
      "**/*.spec.ts",
      "**/*.e2e.ts",
      // Absolute path exclusion as fallback
      resolve(__dirname, "../../__e2e__/**"),
    ],
    environment: "node",
    server: { deps: { inline: ["convex-test"] } },
    setupFiles: ["./vitest.setup.ts"],
    maxWorkers: 1,
  },
})
