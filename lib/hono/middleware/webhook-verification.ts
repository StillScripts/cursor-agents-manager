import { createMiddleware } from "hono/factory"

/**
 * Verify webhook signature from Cursor
 * Uses HMAC-SHA256 to verify the request is from Cursor and hasn't been tampered with
 */
export const verifyWebhookSignature = createMiddleware(async (c, next) => {
  const webhookSecret = process.env.CURSOR_WEBHOOK_SECRET

  // If no webhook secret is configured, reject all webhook requests
  if (!webhookSecret) {
    console.error("[Webhook] CURSOR_WEBHOOK_SECRET not configured")
    return c.json({ error: "Webhook not configured" }, 500)
  }

  // Get signature from header
  const signature = c.req.header("x-webhook-signature")
  const webhookId = c.req.header("x-webhook-id")

  if (!signature) {
    console.warn(`[Webhook ${webhookId}] Missing X-Webhook-Signature header`)
    return c.json({ error: "Missing webhook signature" }, 401)
  }

  try {
    // Get raw request body for signature verification
    // IMPORTANT: Must use raw body before any parsing
    const rawBody = await c.req.text()

    // Compute HMAC-SHA256 signature
    const encoder = new TextEncoder()
    const keyData = encoder.encode(webhookSecret)
    const messageData = encoder.encode(rawBody)

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      messageData
    )

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(signatureBuffer))
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    const computedSignature = `sha256=${hashHex}`

    // Compare signatures (constant-time comparison to prevent timing attacks)
    if (!timingSafeEqual(computedSignature, signature)) {
      console.warn(`[Webhook ${webhookId}] Signature verification failed`, {
        expected: `${computedSignature.substring(0, 16)}...`,
        received: `${signature.substring(0, 16)}...`,
      })
      return c.json({ error: "Invalid webhook signature" }, 401)
    }

    // Signature verified successfully
    // Parse and attach body to context for handler to use
    try {
      const body = JSON.parse(rawBody)
      c.set("webhookBody", body)
      c.set("webhookId", webhookId || "unknown")
    } catch {
      console.error(`[Webhook ${webhookId}] Invalid JSON payload`)
      return c.json({ error: "Invalid JSON payload" }, 400)
    }

    await next()
  } catch (error) {
    console.error(`[Webhook ${webhookId}] Verification error:`, error)
    return c.json({ error: "Signature verification failed" }, 500)
  }
})

/**
 * Timing-safe string comparison
 * Prevents timing attacks by comparing strings in constant time
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Type augmentation for Hono context with webhook data
 */
declare module "hono" {
  interface ContextVariableMap {
    webhookBody: unknown
    webhookId: string
  }
}
