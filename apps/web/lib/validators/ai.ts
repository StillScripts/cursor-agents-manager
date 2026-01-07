import { z } from "zod"

export const summarizeSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
})

export const speakSchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(4096, "Text too long (max 4096 characters)"),
  voice: z
    .enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"])
    .optional()
    .default("alloy"),
})
