import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "../_generated/api"
import {
  createTestInstance,
  createTestUsers,
  createTestWithUser,
} from "./testHelpers"

const defaultRepositories = [
  { url: "https://github.com/user/repo1", name: "Repo 1" },
  { url: "https://github.com/user/repo2", name: "Repo 2" },
  { url: "https://github.com/org/project", name: "Project" },
]

describe("repositories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getRepositories", () => {
    it("returns empty array when not authenticated", async () => {
      const t = createTestInstance()
      const repositories = await t.query(api.repositories.getRepositories)
      expect(repositories).toEqual([])
    })

    it("returns empty array when authenticated but no repositories exist", async () => {
      const asUser = createTestWithUser()
      const repositories = await asUser.query(api.repositories.getRepositories)
      expect(repositories).toEqual([])
    })

    it("returns repositories for authenticated user after saving", async () => {
      const asUser = createTestWithUser()

      await asUser.mutation(api.repositories.saveRepositories, {
        repositories: defaultRepositories,
      })

      const repositories = await asUser.query(api.repositories.getRepositories)
      expect(repositories).toHaveLength(defaultRepositories.length)
      expect(repositories).toMatchObject(defaultRepositories)
    })
  })

  describe("saveRepositories", () => {
    it("saves repositories for authenticated user", async () => {
      const asUser = createTestWithUser()

      const savedRepositories = await asUser.mutation(
        api.repositories.saveRepositories,
        {
          repositories: defaultRepositories,
        }
      )

      expect(savedRepositories).toHaveLength(3)
      expect(savedRepositories).toMatchObject(defaultRepositories)
    })

    it("replaces existing repositories when called multiple times", async () => {
      const asUser = createTestWithUser()

      // Save initial repositories
      await asUser.mutation(api.repositories.saveRepositories, {
        repositories: [
          { url: "https://github.com/user/repo1", name: "Repo 1" },
          { url: "https://github.com/user/repo2", name: "Repo 2" },
        ],
      })

      // Replace with new repositories
      await asUser.mutation(api.repositories.saveRepositories, {
        repositories: [
          { url: "https://github.com/org/prod", name: "Production" },
          { url: "https://github.com/org/staging", name: "Staging" },
          { url: "https://github.com/org/qa", name: "QA" },
        ],
      })

      const repositories = await asUser.query(api.repositories.getRepositories)
      expect(repositories).toHaveLength(3)
      expect(repositories).toMatchObject([
        { url: "https://github.com/org/prod", name: "Production" },
        { url: "https://github.com/org/staging", name: "Staging" },
        { url: "https://github.com/org/qa", name: "QA" },
      ])
    })

    it("removes all repositories when called with empty array", async () => {
      const asUser = createTestWithUser()

      // Save some repositories
      await asUser.mutation(api.repositories.saveRepositories, {
        repositories: defaultRepositories,
      })

      // Replace with empty array
      await asUser.mutation(api.repositories.saveRepositories, {
        repositories: [],
      })

      const repositories = await asUser.query(api.repositories.getRepositories)
      expect(repositories).toEqual([])
    })

    it("returns validation error for invalid payload", async () => {
      const asUser = createTestWithUser()

      await expect(
        asUser.mutation(api.repositories.saveRepositories, {
          repositories: [{ url: 123, name: "Test" }],
        } as any)
      ).rejects.toThrow()
    })
  })

  describe("multi-user isolation", () => {
    it("isolates repositories per user", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 saves repositories
      await asUser1.mutation(api.repositories.saveRepositories, {
        repositories: [
          { url: "https://github.com/user1/repo", name: "User 1 Repo" },
        ],
      })

      // User 2 saves different repositories
      await asUser2.mutation(api.repositories.saveRepositories, {
        repositories: [
          { url: "https://github.com/user2/repo", name: "User 2 Repo" },
        ],
      })

      // Each user only sees their own repositories
      const user1Repositories = await asUser1.query(
        api.repositories.getRepositories
      )
      const user2Repositories = await asUser2.query(
        api.repositories.getRepositories
      )

      expect(user1Repositories).toMatchObject([
        { url: "https://github.com/user1/repo", name: "User 1 Repo" },
      ])
      expect(user2Repositories).toMatchObject([
        { url: "https://github.com/user2/repo", name: "User 2 Repo" },
      ])
    })
  })
})
