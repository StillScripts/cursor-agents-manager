import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server"
import { getAuthenticatedUser } from "./auth"

/**
 * Get conversation for an agent (authenticated user)
 */
export const getByAgentId = query({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthenticatedUser(ctx).catch(() => null)
    if (!authUser) {
      return null
    }

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_user_agent", (q) =>
        q.eq("userId", authUser.userId).eq("agentId", args.agentId)
      )
      .first()

    return conversation
  },
})

/**
 * Internal query to get conversation by agentId (used by actions)
 */
export const getByAgentIdInternal = internalQuery({
  args: {
    userId: v.string(),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_user_agent", (q) =>
        q.eq("userId", args.userId).eq("agentId", args.agentId)
      )
      .first()

    return conversation
  },
})

/**
 * Internal mutation to upsert conversation from AgentConversation type (used by actions)
 * This syncs conversation data from the Cursor API to Convex
 */
export const upsertConversation = internalMutation({
  args: {
    userId: v.string(),
    conversation: v.object({
      id: v.string(),
      messages: v.array(
        v.object({
          id: v.string(),
          type: v.union(
            v.literal("user_message"),
            v.literal("assistant_message"),
            v.literal("tool_call"),
            v.literal("tool_result")
          ),
          text: v.optional(v.string()),
          toolName: v.optional(v.string()),
          toolInput: v.optional(v.any()),
          toolResult: v.optional(v.string()),
        })
      ),
    }),
  },
  handler: async (ctx, args) => {
    const agentId = args.conversation.id
    const conversationId = args.conversation.id

    // Check if conversation already exists
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_user_agent", (q) =>
        q.eq("userId", args.userId).eq("agentId", agentId)
      )
      .first()

    const dbFormat = {
      agentId,
      userId: args.userId,
      conversationId,
      messages: args.conversation.messages.map((msg) => ({
        id: msg.id,
        type: msg.type,
        text: msg.text,
        toolName: msg.toolName,
        toolInput: msg.toolInput,
        toolResult: msg.toolResult,
      })),
      updatedAt: Date.now(),
    }

    if (existing) {
      // Update existing conversation
      await ctx.db.patch(existing._id, dbFormat)
      return { _id: existing._id, agentId, updated: true }
    } else {
      // Create new conversation
      const id = await ctx.db.insert("conversations", dbFormat)
      return { _id: id, agentId, updated: false }
    }
  },
})
