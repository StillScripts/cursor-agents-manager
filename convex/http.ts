import { httpRouter } from "convex/server"
import * as crypto from "crypto"
import { authComponent, createAuth } from "./auth"
import { internal } from "./_generated/api"
import {
  webhookPayloadSchema,
  webhookHeadersSchema,
} from "../lib/schemas/cursor/webhook"

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

/**
 * Webhook endpoint for Cursor agent status updates
 * POST /webhooks/cursor
 * 
 * Verifies webhook signature and updates agent status in the database
 */
http.post("/webhooks/cursor", async (request, ctx) => {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.CURSOR_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("[Webhook] CURSOR_WEBHOOK_SECRET not configured")
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // Get headers
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    // Validate headers
    const headerValidation = webhookHeadersSchema.safeParse(headers)
    if (!headerValidation.success) {
      console.error("[Webhook] Invalid headers:", headerValidation.error)
      return new Response(
        JSON.stringify({ error: "Invalid webhook headers" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const webhookHeaders = headerValidation.data

    // Verify event type is statusChange
    if (webhookHeaders["x-webhook-event"] !== "statusChange") {
      console.warn(
        `[Webhook] Unhandled event type: ${webhookHeaders["x-webhook-event"]}`
      )
      return new Response(
        JSON.stringify({ message: "Event type not handled" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Get raw body for signature verification
    const bodyText = await request.text()
    const body = JSON.parse(bodyText)

    // Verify webhook signature
    // Cursor sends signature as: sha256=<hex_digest>
    const signatureHeader = webhookHeaders["x-webhook-signature"]
    if (!signatureHeader.startsWith("sha256=")) {
      console.error("[Webhook] Invalid signature format")
      return new Response(
        JSON.stringify({ error: "Invalid signature format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const receivedSignature = signatureHeader.substring(7) // Remove "sha256=" prefix

    // Compute expected signature using HMAC SHA256
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyText)
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
      console.error("[Webhook] Signature verification failed", {
        received: receivedSignature.substring(0, 8) + "...",
        expected: expectedSignature.substring(0, 8) + "...",
      })
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    // Validate payload
    const payloadValidation = webhookPayloadSchema.safeParse(body)
    if (!payloadValidation.success) {
      console.error("[Webhook] Invalid payload:", payloadValidation.error)
      return new Response(
        JSON.stringify({ error: "Invalid webhook payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const payload = payloadValidation.data

    // Find agent by agentId
    const agent = await ctx.runQuery(
      internal.agents.getByAgentIdInternal,
      { agentId: payload.id }
    )

    if (!agent) {
      console.warn(`[Webhook] Agent not found: ${payload.id}`)
      // Return 200 to acknowledge receipt even if agent not found
      // (prevents Cursor from retrying)
      return new Response(
        JSON.stringify({ message: "Agent not found, but webhook received" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Update agent from webhook payload
    await ctx.runMutation(internal.agents.updateFromWebhook, {
      agentId: payload.id,
      status: payload.status,
      name: payload.name,
      summary: payload.summary,
      targetUrl: payload.target?.url,
      targetBranchName: payload.target?.branchName,
      targetPrUrl: payload.target?.prUrl,
      targetAutoCreatePr: payload.target?.autoCreatePr,
      sourceRepository: payload.source?.repository,
      sourceRef: payload.source?.ref,
    })

    console.log(`[Webhook] Updated agent ${payload.id} to status ${payload.status}`)

    return new Response(
      JSON.stringify({ success: true, agentId: payload.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})

export default http
