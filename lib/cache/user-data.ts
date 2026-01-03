import { eq } from "drizzle-orm"
import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"
import { branches, repositories } from "@/lib/schema/user-schema"

/**
 * Cache duration: 1 day in seconds
 */
const ONE_DAY_IN_SECONDS = 60 * 60 * 24

/**
 * Cache tag generators for user-specific data
 * These tags are used to invalidate cached data when the user updates their settings
 */
export const cacheKeys = {
  userRepositories: (userId: string) => `user-repositories-${userId}`,
  userBranches: (userId: string) => `user-branches-${userId}`,
}

/**
 * Fetch user repositories from database (uncached - used by the cached wrapper)
 */
async function fetchUserRepositoriesFromDb(userId: string) {
  return db
    .select()
    .from(repositories)
    .where(eq(repositories.userId, userId))
    .orderBy(repositories.createdAt)
}

/**
 * Fetch user branches from database (uncached - used by the cached wrapper)
 */
async function fetchUserBranchesFromDb(userId: string) {
  return db
    .select()
    .from(branches)
    .where(eq(branches.userId, userId))
    .orderBy(branches.createdAt)
}

/**
 * Get cached user repositories
 *
 * Uses Next.js unstable_cache (stable since Next.js 15) for server-side caching.
 * - Cache lasts for 1 day (revalidate: 86400)
 * - Tagged with user-specific key for targeted invalidation
 * - Call revalidateTag(cacheKeys.userRepositories(userId)) to invalidate
 *
 * @param userId - The user's ID
 * @returns Cached repositories array
 */
export function getCachedUserRepositories(userId: string) {
  const cachedFn = unstable_cache(
    async () => fetchUserRepositoriesFromDb(userId),
    [cacheKeys.userRepositories(userId)],
    {
      revalidate: ONE_DAY_IN_SECONDS,
      tags: [cacheKeys.userRepositories(userId)],
    }
  )
  return cachedFn()
}

/**
 * Get cached user branches
 *
 * Uses Next.js unstable_cache (stable since Next.js 15) for server-side caching.
 * - Cache lasts for 1 day (revalidate: 86400)
 * - Tagged with user-specific key for targeted invalidation
 * - Call revalidateTag(cacheKeys.userBranches(userId)) to invalidate
 *
 * @param userId - The user's ID
 * @returns Cached branches array
 */
export function getCachedUserBranches(userId: string) {
  const cachedFn = unstable_cache(
    async () => fetchUserBranchesFromDb(userId),
    [cacheKeys.userBranches(userId)],
    {
      revalidate: ONE_DAY_IN_SECONDS,
      tags: [cacheKeys.userBranches(userId)],
    }
  )
  return cachedFn()
}
