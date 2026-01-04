import { Hono } from "hono"
import { verifyWebhookSignature } from "@/lib/hono/middleware/webhook-verification"
import { webhookPayloadSchema } from "@/lib/schemas/cursor/webhook"
import { updateAgentByIdOnly } from "@/lib/server/agents-cache"

const app = new Hono()

/**
 * POST /cursor
 * Handle incoming webhook from Cursor for agent status changes
 *
 * This endpoint:
 * 1. Verifies the webhook signature (via middleware)
 * 2. Validates the payload
 * 3. Updates the agent status in the database
 * 4. Returns appropriate status codes
 *
 * Note: Does NOT require authentication (webhooks come from external service)
 */
app.post("/cursor", verifyWebhookSignature, async (c) => {
  const webhookId = c.get("webhookId")
  const rawBody = c.get("webhookBody")

  console.log(`[Webhook ${webhookId}] Received webhook`)

  // Validate payload schema
  const parseResult = webhookPayloadSchema.safeParse(rawBody)

  if (!parseResult.success) {
    console.error(
      `[Webhook ${webhookId}] Invalid payload format:`,
      parseResult.error.errors
    )
    return c.json(
      {
        error: "Invalid payload format",
        details: parseResult.error.errors,
      },
      400
    )
  }

  const payload = parseResult.data

  console.log(
    `[Webhook ${webhookId}] Processing status change for agent ${payload.id}`,
    {
      status: payload.status,
      hasSummary: !!payload.summary,
      hasPrUrl: !!payload.target?.prUrl,
    }
  )

  try {
    // Prepare updates based on webhook payload
    const updates: Record<string, any> = {
      status: payload.status,
      syncStatus: "synced" as const,
      syncError: null,
      cachedAt: new Date(),
    }

    // Update optional fields if provided
    if (payload.name !== undefined) {
      updates.name = payload.name
    }

    if (payload.summary !== undefined) {
      updates.summary = payload.summary
    }

    if (payload.target?.prUrl !== undefined) {
      updates.targetPrUrl = payload.target.prUrl
    }

    if (payload.target?.branchName !== undefined) {
      updates.targetBranchName = payload.target.branchName
    }

    if (payload.target?.url !== undefined) {
      updates.targetUrl = payload.target.url
    }

    if (payload.source?.ref !== undefined) {
      updates.sourceRef = payload.source.ref
    }

    // Update agent in database
    const updatedAgent = await updateAgentByIdOnly(payload.id, updates)

    if (!updatedAgent) {
      console.warn(
        `[Webhook ${webhookId}] Agent ${payload.id} not found in database`,
        {
          status: payload.status,
          note: "Agent may not be cached yet, or was deleted",
        }
      )
      return c.json(
        {
          error: "Agent not found",
          message:
            "Agent not found in database - may not be cached yet or was deleted",
        },
        404
      )
    }

    console.log(
      `[Webhook ${webhookId}] Successfully updated agent ${payload.id}`,
      {
        newStatus: updatedAgent.status,
        hasPrUrl: !!updatedAgent.targetPrUrl,
        hasSummary: !!updatedAgent.summary,
      }
    )

    return c.json(
      {
        success: true,
        agentId: payload.id,
        status: updatedAgent.status,
      },
      200
    )
  } catch (error) {
    console.error(
      `[Webhook ${webhookId}] Error processing webhook for agent ${payload.id}:`,
      error
    )
    return c.json(
      {
        error: "Internal server error",
        message: "Failed to process webhook",
      },
      500
    )
  }
})

export const webhooksApp = app
