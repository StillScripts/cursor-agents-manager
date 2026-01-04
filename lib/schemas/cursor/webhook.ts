import { z } from "zod"

/**
 * Webhook event types from Cursor
 */
export const webhookEventSchema = z.enum(["statusChange"])

export type WebhookEvent = z.infer<typeof webhookEventSchema>

/**
 * Webhook headers schema
 * These are the headers sent by Cursor with each webhook request
 */
export const webhookHeadersSchema = z.object({
  "x-webhook-signature": z.string(), // Format: sha256=<hex_digest>
  "x-webhook-id": z.string(), // Unique delivery ID
  "x-webhook-event": webhookEventSchema, // Event type
  "user-agent": z.string().optional(), // Should be "Cursor-Agent-Webhook/1.0"
})

export type WebhookHeaders = z.infer<typeof webhookHeadersSchema>

/**
 * Agent status from Cursor webhooks
 */
export const agentStatusSchema = z.enum([
  "CREATING",
  "RUNNING",
  "FINISHED",
  "ERROR",
  "EXPIRED",
])

export type AgentStatus = z.infer<typeof agentStatusSchema>

/**
 * Webhook payload schema for statusChange events
 * Based on Cursor's webhook documentation
 */
export const webhookPayloadSchema = z.object({
  // Required fields
  id: z.string(), // Agent ID
  status: agentStatusSchema, // New status

  // Optional fields (may be included depending on status/event)
  name: z.string().optional(),
  summary: z.string().optional(),
  target: z
    .object({
      url: z.string().optional(),
      branchName: z.string().optional(),
      prUrl: z.string().optional(),
      autoCreatePr: z.boolean().optional(),
    })
    .optional(),
  source: z
    .object({
      repository: z.string().optional(),
      ref: z.string().optional(),
    })
    .optional(),
  createdAt: z.string().optional(),
})

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>
