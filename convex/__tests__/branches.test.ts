import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "../_generated/api"
import {
  createTestInstance,
  createTestUsers,
  createTestWithUser,
} from "./test-helpers"

const defaultBranches = [
  { name: "main" },
  { name: "develop" },
  { name: "feature/new-feature" },
]

describe("branches", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getBranches", () => {
    it("returns empty array when not authenticated", async () => {
      const t = createTestInstance()
      const branches = await t.query(api.branches.getBranches)
      expect(branches).toEqual([])
    })

    it("returns empty array when authenticated but no branches exist", async () => {
      const asUser = createTestWithUser()
      const branches = await asUser.query(api.branches.getBranches)
      expect(branches).toEqual([])
    })

    it("returns branches for authenticated user after saving", async () => {
      const asUser = createTestWithUser()

      await asUser.mutation(api.branches.saveBranches, {
        branches: defaultBranches,
      })

      const branches = await asUser.query(api.branches.getBranches)
      expect(branches).toHaveLength(defaultBranches.length)
      expect(branches).toMatchObject(defaultBranches)
    })
  })

  describe("saveBranches", () => {
    it("saves branches for authenticated user", async () => {
      const asUser = createTestWithUser()

      const savedBranches = await asUser.mutation(api.branches.saveBranches, {
        branches: defaultBranches,
      })

      expect(savedBranches).toHaveLength(3)
      expect(savedBranches).toMatchObject(defaultBranches)
    })

    it("replaces existing branches when called multiple times", async () => {
      const asUser = createTestWithUser()

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

    it("removes all branches when called with empty array", async () => {
      const asUser = createTestWithUser()

      // Save some branches
      await asUser.mutation(api.branches.saveBranches, {
        branches: defaultBranches,
      })

      // Replace with empty array
      await asUser.mutation(api.branches.saveBranches, {
        branches: [],
      })

      const branches = await asUser.query(api.branches.getBranches)
      expect(branches).toEqual([])
    })

    it("returns validation error for invalid payload", async () => {
      const asUser = createTestWithUser()

      await expect(
        asUser.mutation(api.branches.saveBranches, {
          branches: [{ name: 123 }],
        } as any)
      ).rejects.toThrow()
    })
  })

  describe("multi-user isolation", () => {
    it("isolates branches per user", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

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
  })
})
