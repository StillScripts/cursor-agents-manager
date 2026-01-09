import { httpRouter } from "convex/server"
import {
  webhookHeadersSchema,
  webhookPayloadSchema,
} from "validators/cursor/webhook"
import { api, internal } from "./_generated/api"
import { httpAction } from "./_generated/server"
import { authComponent, createAuth } from "./auth"

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

/**
 * Webhook endpoint for Cursor agent status updates
 * POST /webhooks/cursor
 *
 * Verifies webhook signature and updates agent status in the database
 */
http.route({
  path: "/webhooks/cursor",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
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

      // Verify webhook signature using Node.js action
      const signatureHeader = webhookHeaders["x-webhook-signature"]
      const signatureVerification = await ctx.runAction(
        api.webhookActions.verifyWebhookSignature,
        {
          signatureHeader,
          bodyText,
          webhookSecret,
        }
      )

      if (!signatureVerification.valid) {
        console.error(
          "[Webhook] Signature verification failed:",
          signatureVerification.error
        )
        const statusCode =
          signatureVerification.error === "Invalid signature format" ? 400 : 401
        return new Response(
          JSON.stringify({ error: signatureVerification.error }),
          {
            status: statusCode,
            headers: { "Content-Type": "application/json" },
          }
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
      const agent = await ctx.runQuery(internal.agents.getByAgentIdInternal, {
        agentId: payload.id,
      })

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
      const updateResult = await ctx.runMutation(internal.agents.updateFromWebhook, {
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

      console.log(
        `[Webhook] Updated agent ${payload.id} to status ${payload.status}`
      )

      // Send push notification if agent was updated successfully
      if (updateResult.success && updateResult.userId && updateResult.agentName) {
        try {
          await ctx.runAction(internal.pushNotifications.sendAgentUpdateNotification, {
            userId: updateResult.userId,
            agentId: payload.id,
            agentName: updateResult.agentName,
          })
        } catch (pushError) {
          // Log error but don't fail the webhook
          console.error("[Webhook] Error sending push notification:", pushError)
        }
      }

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
  }),
})

export default http
