import actionCache from "@convex-dev/action-cache/convex.config"
import agent from "@convex-dev/agent/convex.config"
import betterAuth from "@convex-dev/better-auth/convex.config"
import rateLimiter from "@convex-dev/rate-limiter/convex.config"
import { defineApp } from "convex/server"

const app = defineApp()
app.use(agent)
app.use(betterAuth)
app.use(actionCache)
app.use(rateLimiter)

export default app
