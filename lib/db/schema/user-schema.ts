import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { user } from "./auth-schema"

export const repositories = sqliteTable("repositories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

export const branches = sqliteTable("branches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const timeLogs = sqliteTable("time_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  taskId: text("task_id").notNull(), // Agent ID from Cursor
  activityType: text("activity_type").notNull(), // "task_creation" or "conversation_review"
  startTime: integer("start_time", { mode: "timestamp" }).notNull(),
  endTime: integer("end_time", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

export const agents = sqliteTable("agents", {
  // Primary identification
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["cursor", "claude-code"] }).notNull(),

  // Agent metadata
  name: text("name").notNull(),
  status: text("status", {
    enum: ["CREATING", "RUNNING", "FINISHED", "ERROR", "EXPIRED"],
  }).notNull(),

  // Source information
  sourceRepository: text("source_repository").notNull(),
  sourceRef: text("source_ref"),

  // Target information
  targetBranchName: text("target_branch_name"),
  targetUrl: text("target_url"),
  targetPrUrl: text("target_pr_url"),
  targetAutoCreatePr: integer("target_auto_create_pr", {
    mode: "boolean",
  }).default(false),

  // Model & configuration
  model: text("model"),

  // Content & summary
  summary: text("summary"),

  // Provider-specific data (JSON)
  providerData: text("provider_data", { mode: "json" }).$type<
    Record<string, unknown>
  >(),

  // Timestamps (using integer timestamps for consistency with existing schema)
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  cachedAt: integer("cached_at", { mode: "timestamp" }).notNull(),

  // Sync control
  syncStatus: text("sync_status", {
    enum: ["synced", "stale", "error"],
  }).default("synced"),
  syncError: text("sync_error"),

  // Soft delete
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
})

export const agentsUserIdIdx = index("idx_agents_user_id").on(agents.userId)
export const agentsProviderIdx = index("idx_agents_provider").on(
  agents.provider
)
export const agentsStatusIdx = index("idx_agents_status").on(agents.status)
export const agentsUserStatusIdx = index("idx_agents_user_status").on(
  agents.userId,
  agents.status
)
export const agentsUpdatedAtIdx = index("idx_agents_updated_at").on(
  agents.updatedAt
)
export const agentsDeletedAtIdx = index("idx_agents_deleted_at").on(
  agents.deletedAt
)

export type Agent = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert
