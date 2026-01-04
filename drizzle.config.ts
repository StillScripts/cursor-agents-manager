import type { Config } from "drizzle-kit"

/**
 * Drizzle Studio Configuration
 *
 * This config points to the master/auth database only.
 *
 * Architecture:
 * - Master DB: Shared auth database (user accounts, sessions, user_agents mapping)
 *   - Tables: account, session, user, verification, user_databases, user_api_keys, user_agents
 *   - Schema: auth-schema.ts
 * - User DBs: Per-user isolated databases (one per user, created via Turso API)
 *   - Tables: agents, branches, repositories, time_logs, user_settings
 *   - Schema: user-schema.ts (initialized via TursoManager.initializeUserSchema)
 *
 * Why only auth-schema.ts?
 * - User databases are isolated per-user and managed at runtime
 * - All user data queries happen via getUserDatabase(userId)
 * - Drizzle Studio is for development/admin purposes on the master DB only
 */
export default {
  schema: ["./lib/schema/auth-schema.ts"],
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_AUTH_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
} satisfies Config
