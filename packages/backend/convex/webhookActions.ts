"use node"

import { v } from "convex/values"
import * as crypto from "crypto"
import { action } from "better-convex/server"

/**
 * Verify webhook signature using HMAC SHA256
 */
export const verifyWebhookSignature = action({
  args: {
    signatureHeader: v.string(),
    bodyText: v.string(),
    webhookSecret: v.string(),
  },
  handler: async (_ctx, args): Promise<{ valid: boolean; error?: string }> => {
    try {
      // Cursor sends signature as: sha256=<hex_digest>
      if (!args.signatureHeader.startsWith("sha256=")) {
        return { valid: false, error: "Invalid signature format" }
      }

      const receivedSignature = args.signatureHeader.substring(7) // Remove "sha256=" prefix

      // Compute expected signature using HMAC SHA256
      const expectedSignature = crypto
        .createHmac("sha256", args.webhookSecret)
        .update(args.bodyText)
        .digest("hex")

      // Compare signatures using constant-time comparison
      // Convert hex strings to buffers for timing-safe comparison
      const receivedBuffer = Buffer.from(receivedSignature, "hex")
      const expectedBuffer = Buffer.from(expectedSignature, "hex")

      // Ensure buffers are the same length (prevents timing attacks)
      if (
        receivedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
      ) {
        return { valid: false, error: "Invalid webhook signature" }
      }

      return { valid: true }
    } catch (error) {
      console.error("[Webhook] Error verifying signature:", error)
      return {
        valid: false,
        error:
          error instanceof Error ? error.message : "Unknown signature error",
      }
    }
  },
})
