import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth"
import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "better-convex/server"
import { internalQuery, query } from "better-convex/server"
import authConfig from "./auth.config"

const siteUrl = process.env.SITE_URL!

export const authComponent = createClient<DataModel>(components.betterAuth)

/**
 * Non-throwing helper to get an authenticated user.
 * Returns null if the user is not authenticated.
 * @param ctx - The Convex query or mutation context
 * @returns An authenticated user object with userId, or null if not authenticated
 */
export async function getAuthenticatedUserOrNull(
  ctx: QueryCtx | MutationCtx
): Promise<{ userId: string } | null> {
  try {
    const authUser = await authComponent.getAuthUser(ctx)

    // Convex documents use _id, not userId
    const userId = authUser?._id
    if (!authUser || !userId) {
      return null
    }

    return { userId }
  } catch {
    // getAuthUser throws ConvexError when unauthenticated
    return null
  }
}

/**
 * Type-safe helper to get an authenticated user with a guaranteed userId.
 * Throws an error if the user is not authenticated or userId is missing.
 * @param ctx - The Convex query or mutation context
 * @returns An authenticated user object with userId guaranteed to be a string
 * @throws Error if the user is not authenticated
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx
): Promise<{ userId: string }> {
  const result = await getAuthenticatedUserOrNull(ctx)
  if (!result) {
    throw new Error("Unauthorized")
  }
  return result
}

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    user: {
      additionalFields: {
        name: {
          type: "string",
          required: false,
        },
      },
      deleteUser: {
        enabled: true,
      },
    },
    plugins: [convex({ authConfig })],
  })
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx)
  },
})

/**
 * Internal query to get authenticated user from actions.
 * Actions cannot directly use getAuthenticatedUser since it requires QueryCtx | MutationCtx.
 * Throws if not authenticated.
 */
export const getAuthenticatedUserInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return getAuthenticatedUser(ctx)
  },
})

/**
 * Internal query to get authenticated user from actions (non-throwing).
 * Returns null if not authenticated - useful for "check status" type actions.
 */
export const getAuthenticatedUserInternalOrNull = internalQuery({
  args: {},
  handler: async (ctx) => {
    return getAuthenticatedUserOrNull(ctx)
  },
})
