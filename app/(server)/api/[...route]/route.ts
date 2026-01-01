/**
 * Server-side functionality is fully powered by Hono routes
 */

import { handle } from "hono/vercel"
import app from "@/lib/hono"

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
