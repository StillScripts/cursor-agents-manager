import { Hono } from "hono"
import { logger } from "hono/logger"
import { errorHandler } from "./middleware/error-handler"
import { agentsApp } from "./routes/agents"
import { modelsApp } from "./routes/models"
import { userApp } from "./routes/user"

const app = new Hono().basePath("/api")

// Global middleware
app.use("*", logger())
app.use("*", errorHandler)

// Mount sub-apps
app.route("/agents", agentsApp)
app.route("/user", userApp)
app.route("/models", modelsApp)

// Health check endpoint
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
)

export default app
export type AppType = typeof app
