import { eq } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"
import { db } from "@/lib/db"
import { branches, repositories } from "@/lib/schema/user-schema"

/**
 * Cache tag generators for user-specific data
 * These tags are used to invalidate cached data when the user updates their settings
 */
export const cacheKeys = {
  userRepositories: (userId: string) => `user-repositories-${userId}`,
  userBranches: (userId: string) => `user-branches-${userId}`,
}

/**
 * Get cached user repositories
 *
 * Uses Next.js 15+ "use cache" directive for server-side caching.
 * - Cache lasts for 1 day (86400 seconds)
 * - Tagged with user-specific key for targeted invalidation
 * - Call revalidateTag(cacheKeys.userRepositories(userId)) to invalidate
 *
 * @param userId - The user's ID
 * @returns Cached repositories array
 */
export async function getCachedUserRepositories(userId: string) {
  "use cache"
  cacheLife("days")
  cacheTag(cacheKeys.userRepositories(userId))

  return db
    .select()
    .from(repositories)
    .where(eq(repositories.userId, userId))
    .orderBy(repositories.createdAt)
}

/**
 * Get cached user branches
 *
 * Uses Next.js 15+ "use cache" directive for server-side caching.
 * - Cache lasts for 1 day (86400 seconds)
 * - Tagged with user-specific key for targeted invalidation
 * - Call revalidateTag(cacheKeys.userBranches(userId)) to invalidate
 *
 * @param userId - The user's ID
 * @returns Cached branches array
 */
export async function getCachedUserBranches(userId: string) {
  "use cache"
  cacheLife("days")
  cacheTag(cacheKeys.userBranches(userId))

  return db
    .select()
    .from(branches)
    .where(eq(branches.userId, userId))
    .orderBy(branches.createdAt)
}
