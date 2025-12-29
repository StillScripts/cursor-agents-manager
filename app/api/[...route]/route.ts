import { handle } from "hono/vercel"
import app from "@/app/api/_lib"

// Export handlers for all HTTP methods
// Hono will route requests to the appropriate sub-app
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
