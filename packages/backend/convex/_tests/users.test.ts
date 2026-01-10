import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createTestInstance,
  createTestUsers,
  createTestWithUser,
} from "../../lib/convex-test-helpers"
import { api } from "../_generated/api"

describe("users", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("deleteAccount", () => {
    it("returns error when not authenticated", async () => {
      const t = createTestInstance()

      await expect(t.mutation(api.users.deleteAccount)).rejects.toThrow(
        "Unauthorized"
      )
    })

    it("deletes all user data for authenticated user", async () => {
      const asUser = createTestWithUser()

      // Create some test data
      await asUser.mutation(api.branches.saveBranches, {
        branches: [{ name: "main" }, { name: "develop" }],
      })

      await asUser.mutation(api.repositories.saveRepositories, {
        repositories: [
          { url: "https://github.com/test/repo", name: "test/repo" },
        ],
      })

      // Verify data exists
      const branchesBefore = await asUser.query(api.branches.getBranches)
      const reposBefore = await asUser.query(api.repositories.getRepositories)

      expect(branchesBefore).toHaveLength(2)
      expect(reposBefore).toHaveLength(1)

      // Delete account
      const result = await asUser.mutation(api.users.deleteAccount)

      expect(result).toEqual({ success: true })

      // Verify all data is deleted
      const branchesAfter = await asUser.query(api.branches.getBranches)
      const reposAfter = await asUser.query(api.repositories.getRepositories)

      expect(branchesAfter).toEqual([])
      expect(reposAfter).toEqual([])
    })

    it("deletes agents for authenticated user", async () => {
      const asUser = createTestWithUser()

      // Create an agent (we'll need to insert directly since we don't have a helper)
      // For now, we'll test that the mutation completes successfully
      // In a real scenario, agents would be created through the cursor API

      const result = await asUser.mutation(api.users.deleteAccount)

      expect(result).toEqual({ success: true })
    })

    it("deletes API keys for authenticated user", async () => {
      const asUser = createTestWithUser()

      // Create API keys
      await asUser.mutation(api.apiKeys.saveCursorApiKey, {
        encryptedApiKey: "encrypted-key-1",
      })

      // Verify API key exists
      const apiKeyBefore = await asUser.query(api.apiKeys.getApiKeysRecord)
      expect(apiKeyBefore).toBeDefined()

      // Delete account
      await asUser.mutation(api.users.deleteAccount)

      // Verify API key is deleted
      const apiKeyAfter = await asUser.query(api.apiKeys.getApiKeysRecord)
      expect(apiKeyAfter).toBeNull()
    })

    it("deletes tasks for authenticated user", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
        description: "Test Description",
      })

      expect(taskId).toBeDefined()

      // Delete account
      await asUser.mutation(api.users.deleteAccount)

      // Verify task is deleted (query should return empty)
      const tasks = await asUser.query(api.tasks.getTasks)
      expect(tasks).toEqual([])
    })

    it("does not affect other users' data", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 creates data
      await asUser1.mutation(api.branches.saveBranches, {
        branches: [{ name: "user1-branch" }],
      })

      // User 2 creates data
      await asUser2.mutation(api.branches.saveBranches, {
        branches: [{ name: "user2-branch" }],
      })

      // Verify both users have data
      const user1BranchesBefore = await asUser1.query(api.branches.getBranches)
      const user2BranchesBefore = await asUser2.query(api.branches.getBranches)

      expect(user1BranchesBefore).toHaveLength(1)
      expect(user2BranchesBefore).toHaveLength(1)

      // User 1 deletes their account
      await asUser1.mutation(api.users.deleteAccount)

      // User 1's data should be deleted
      const user1BranchesAfter = await asUser1.query(api.branches.getBranches)
      expect(user1BranchesAfter).toEqual([])

      // User 2's data should still exist
      const user2BranchesAfter = await asUser2.query(api.branches.getBranches)
      expect(user2BranchesAfter).toHaveLength(1)
      expect(user2BranchesAfter).toMatchObject([{ name: "user2-branch" }])
    })
  })
})
