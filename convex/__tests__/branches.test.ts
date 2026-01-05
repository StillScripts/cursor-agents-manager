import { convexTest } from "convex-test"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { api } from "../_generated/api"
import * as authModule from "../auth"
import schema from "../schema"

// Manually import modules for Bun compatibility
// Include _generated files so convex-test can find the modules root
// Paths should match what import.meta.glob would produce from the convex directory
const modules = {
  "./_generated/api.ts": () => import("../_generated/api"),
  "./_generated/server.ts": () => import("../_generated/server"),
  "./branches.ts": () => import("../branches"),
  "./auth.ts": () => import("../auth"),
}

// Helper to create a test instance with getAuthenticatedUser mocked
function createTest() {
  const t = convexTest(schema, modules)

  // Mock getAuthenticatedUser using vi.spyOn
  vi.spyOn(authModule, "getAuthenticatedUser").mockImplementation(
    async (ctx) => {
      const identity = await ctx.auth.getUserIdentity()
      if (!identity?.subject) {
        throw new Error("Unauthorized")
      }
      return { userId: identity.subject }
    }
  )

  return t
}

describe("branches", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("getBranches returns empty array when not authenticated", async () => {
    const t = createTest()
    const branches = await t.query(api.branches.getBranches)
    expect(branches).toEqual([])
  })

  test("getBranches returns empty array when authenticated but no branches exist", async () => {
    const t = createTest()
    const asUser = t.withIdentity({ name: "Test User" })
    const branches = await asUser.query(api.branches.getBranches)
    expect(branches).toEqual([])
  })

  test("saveBranches saves branches for authenticated user", async () => {
    const t = createTest()
    const asUser = t.withIdentity({ name: "Test User" })

    const savedBranches = await asUser.mutation(api.branches.saveBranches, {
      branches: [
        { name: "main" },
        { name: "develop" },
        { name: "feature/new-feature" },
      ],
    })

    expect(savedBranches).toHaveLength(3)
    expect(savedBranches).toMatchObject([
      { name: "main" },
      { name: "develop" },
      { name: "feature/new-feature" },
    ])
  })

  test("getBranches returns saved branches after saving", async () => {
    const t = createTest()
    const asUser = t.withIdentity({ name: "Test User" })

    await asUser.mutation(api.branches.saveBranches, {
      branches: [{ name: "main" }, { name: "develop" }],
    })

    const branches = await asUser.query(api.branches.getBranches)
    expect(branches).toHaveLength(2)
    expect(branches).toMatchObject([{ name: "main" }, { name: "develop" }])
  })

  test("saveBranches replaces existing branches", async () => {
    const t = createTest()
    const asUser = t.withIdentity({ name: "Test User" })

    // Save initial branches
    await asUser.mutation(api.branches.saveBranches, {
      branches: [{ name: "main" }, { name: "develop" }],
    })

    // Replace with new branches
    await asUser.mutation(api.branches.saveBranches, {
      branches: [{ name: "production" }, { name: "staging" }, { name: "qa" }],
    })

    const branches = await asUser.query(api.branches.getBranches)
    expect(branches).toHaveLength(3)
    expect(branches).toMatchObject([
      { name: "production" },
      { name: "staging" },
      { name: "qa" },
    ])
  })

  test("branches are isolated per user", async () => {
    const t = createTest()
    const asUser1 = t.withIdentity({ name: "User 1" })
    const asUser2 = t.withIdentity({ name: "User 2" })

    // User 1 saves branches
    await asUser1.mutation(api.branches.saveBranches, {
      branches: [{ name: "user1-branch" }],
    })

    // User 2 saves different branches
    await asUser2.mutation(api.branches.saveBranches, {
      branches: [{ name: "user2-branch" }],
    })

    // Each user only sees their own branches
    const user1Branches = await asUser1.query(api.branches.getBranches)
    const user2Branches = await asUser2.query(api.branches.getBranches)

    expect(user1Branches).toMatchObject([{ name: "user1-branch" }])
    expect(user2Branches).toMatchObject([{ name: "user2-branch" }])
  })

  test("saveBranches with empty array removes all branches", async () => {
    const t = createTest()
    const asUser = t.withIdentity({ name: "Test User" })

    // Save some branches
    await asUser.mutation(api.branches.saveBranches, {
      branches: [{ name: "main" }, { name: "develop" }],
    })

    // Replace with empty array
    await asUser.mutation(api.branches.saveBranches, {
      branches: [],
    })

    const branches = await asUser.query(api.branches.getBranches)
    expect(branches).toEqual([])
  })
})
