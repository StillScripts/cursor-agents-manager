import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth"
import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { query } from "./_generated/server"
import authConfig from "./auth.config"

const siteUrl = process.env.SITE_URL!

export const authComponent = createClient<DataModel>(components.betterAuth)

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
  const authUser = await authComponent.getAuthUser(ctx)

  // Convex documents use _id, not userId
  const userId = authUser?._id
  if (!authUser || !userId) {
    throw new Error("Unauthorized")
  }

  return { userId }
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
