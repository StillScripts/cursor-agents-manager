import type { Context, Next } from "hono"
import { HTTPException } from "hono/http-exception"

/**
 * Global error handler middleware.
 * Catches all errors and returns a consistent JSON response.
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next()
  } catch (err) {
    console.error("API Error:", err)

    if (err instanceof HTTPException) {
      return err.getResponse()
    }

    const message = err instanceof Error ? err.message : "Internal server error"

    return c.json({ error: message }, 500)
  }
}
