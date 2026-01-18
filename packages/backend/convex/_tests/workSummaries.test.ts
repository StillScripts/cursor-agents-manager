import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createTestInstance,
  createTestWithUser,
} from "../../lib/convex-test-helpers"
import { api, internal } from "../_generated/api"

describe("workSummaries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getTodayWorkSummary", () => {
    it("returns null when not authenticated", async () => {
      const t = createTestInstance()
      const workSummary = await t.query(api.workSummaries.getTodayWorkSummary)
      expect(workSummary).toBeNull()
    })

    it("returns null when authenticated but no summary exists", async () => {
      const asUser = createTestWithUser()
      const workSummary = await asUser.query(
        api.workSummaries.getTodayWorkSummary
      )
      expect(workSummary).toBeNull()
    })

    it("returns today's work summary after saving", async () => {
      const t = createTestInstance()
      const asUser = t.withIdentity({ name: "Test User", subject: "user123" })

      // Save a work summary using the internal mutation
      await t.mutation(internal.workSummaries.saveTodayWorkSummary, {
        userId: "user123",
        summary: "Today I worked on implementing new features and fixing bugs.",
      })

      // Query as the authenticated user
      const workSummary = await asUser.query(
        api.workSummaries.getTodayWorkSummary
      )

      expect(workSummary).not.toBeNull()
      expect(workSummary?.summary).toBe(
        "Today I worked on implementing new features and fixing bugs."
      )
      expect(workSummary?.day).toMatch(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
      expect(workSummary?._id).toBeDefined()
      expect(workSummary?.createdAt).toBeDefined()
    })
  })

  describe("saveTodayWorkSummary (internal mutation)", () => {
    it("creates a new work summary that can be retrieved", async () => {
      const t = createTestInstance()
      const asUser = t.withIdentity({ name: "Test User", subject: "user123" })

      const summary = "Completed tasks A, B, and C. Started work on task D."

      const summaryId = await t.mutation(
        internal.workSummaries.saveTodayWorkSummary,
        {
          userId: "user123",
          summary,
        }
      )

      expect(summaryId).toBeDefined()

      // Verify it can be retrieved
      const workSummary = await asUser.query(
        api.workSummaries.getTodayWorkSummary
      )
      expect(workSummary?.summary).toBe(summary)
      expect(workSummary?._id).toBe(summaryId)
    })

    it("updates existing work summary when called multiple times for same day", async () => {
      const t = createTestInstance()
      const asUser = t.withIdentity({ name: "Test User", subject: "user123" })

      // Save initial summary
      const id1 = await t.mutation(
        internal.workSummaries.saveTodayWorkSummary,
        {
          userId: "user123",
          summary: "Initial summary",
        }
      )

      // Update with new summary
      const id2 = await t.mutation(
        internal.workSummaries.saveTodayWorkSummary,
        {
          userId: "user123",
          summary: "Updated summary with more details",
        }
      )

      // Should return the same ID (updated, not created new)
      expect(id1).toBe(id2)

      // Verify the updated summary is returned
      const workSummary = await asUser.query(
        api.workSummaries.getTodayWorkSummary
      )
      expect(workSummary?.summary).toBe("Updated summary with more details")
      expect(workSummary?._id).toBe(id1)
    })

    it("maintains only one summary per user per day", async () => {
      const t = createTestInstance()
      const asUser = t.withIdentity({ name: "Test User", subject: "user123" })

      // Save multiple summaries for the same day
      await t.mutation(internal.workSummaries.saveTodayWorkSummary, {
        userId: "user123",
        summary: "First summary",
      })

      await t.mutation(internal.workSummaries.saveTodayWorkSummary, {
        userId: "user123",
        summary: "Second summary",
      })

      await t.mutation(internal.workSummaries.saveTodayWorkSummary, {
        userId: "user123",
        summary: "Third summary",
      })

      // Should only have the latest summary
      const workSummary = await asUser.query(
        api.workSummaries.getTodayWorkSummary
      )
      expect(workSummary?.summary).toBe("Third summary")
    })

    it("uses YYYY-MM-DD format for day field", async () => {
      const t = createTestInstance()
      const asUser = t.withIdentity({ name: "Test User", subject: "user123" })

      await t.mutation(internal.workSummaries.saveTodayWorkSummary, {
        userId: "user123",
        summary: "Test summary",
      })

      const workSummary = await asUser.query(
        api.workSummaries.getTodayWorkSummary
      )

      // Verify day format is YYYY-MM-DD
      expect(workSummary?.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      // Verify it's a valid date
      const date = new Date(workSummary!.day)
      expect(date).toBeInstanceOf(Date)
      expect(Number.isNaN(date.getTime())).toBe(false)
    })
  })

  describe("multi-user isolation", () => {
    it("isolates work summaries per user", async () => {
      const t = createTestInstance()
      const asUser1 = t.withIdentity({ name: "User 1", subject: "user1" })
      const asUser2 = t.withIdentity({ name: "User 2", subject: "user2" })

      // User 1 saves a work summary
      await t.mutation(internal.workSummaries.saveTodayWorkSummary, {
        userId: "user1",
        summary: "User 1 worked on feature X and bug Y.",
      })

      // User 2 saves a different work summary
      await t.mutation(internal.workSummaries.saveTodayWorkSummary, {
        userId: "user2",
        summary: "User 2 worked on feature Z and deployment.",
      })

      // Each user only sees their own summary
      const user1Summary = await asUser1.query(
        api.workSummaries.getTodayWorkSummary
      )
      const user2Summary = await asUser2.query(
        api.workSummaries.getTodayWorkSummary
      )

      expect(user1Summary?.summary).toBe(
        "User 1 worked on feature X and bug Y."
      )
      expect(user2Summary?.summary).toBe(
        "User 2 worked on feature Z and deployment."
      )
    })

    it("user cannot see another user's work summary", async () => {
      const t = createTestInstance()
      const asUser1 = t.withIdentity({ name: "User 1", subject: "user1" })
      const asUser2 = t.withIdentity({ name: "User 2", subject: "user2" })

      // User 1 saves a work summary
      await t.mutation(internal.workSummaries.saveTodayWorkSummary, {
        userId: "user1",
        summary: "User 1's confidential work summary.",
      })

      // User 1 should see their own summary
      const user1Summary = await asUser1.query(
        api.workSummaries.getTodayWorkSummary
      )
      expect(user1Summary?.summary).toBe("User 1's confidential work summary.")

      // User 2 should not see User 1's summary
      const user2Summary = await asUser2.query(
        api.workSummaries.getTodayWorkSummary
      )
      expect(user2Summary).toBeNull()
    })
  })
})
