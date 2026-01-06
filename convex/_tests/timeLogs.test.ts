import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createTestInstance,
  createTestUsers,
  createTestWithUser,
} from "../../lib/testHelpers"
import { api } from "../_generated/api"

const testAgentId = "test-agent-123"
const testAgentId2 = "test-agent-456"

describe("timeLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getTimeLogsByAgent", () => {
    it("returns empty array when not authenticated", async () => {
      const t = createTestInstance()
      const timeLogs = await t.query(api.timeLogs.getTimeLogsByAgent, {
        agentId: testAgentId,
      })
      expect(timeLogs).toEqual([])
    })

    it("returns empty array when authenticated but no time logs exist", async () => {
      const asUser = createTestWithUser()
      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByAgent, {
        agentId: testAgentId,
      })
      expect(timeLogs).toEqual([])
    })

    it("only returns time logs for the specified agent", async () => {
      const asUser = createTestWithUser()
      const startTime1 = Date.now() - 20000
      const startTime2 = Date.now() - 10000

      // Save logs for two different agents
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        agentId: testAgentId,
        activityType: "task_creation",
        startTime: startTime1,
      })

      await asUser.mutation(api.timeLogs.saveTimeLog, {
        agentId: testAgentId2,
        activityType: "conversation_review",
        startTime: startTime2,
      })

      // Query for first agent - should only get that agent's logs
      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByAgent, {
        agentId: testAgentId,
      })

      expect(timeLogs).toHaveLength(1)
      expect(timeLogs[0].agentId).toBe(testAgentId)
      expect(timeLogs[0].activityType).toBe("task_creation")
    })
  })

  describe("getAllTimeLogs", () => {
    it("returns empty array when not authenticated", async () => {
      const t = createTestInstance()
      const timeLogs = await t.query(api.timeLogs.getAllTimeLogs)
      expect(timeLogs).toEqual([])
    })

    it("returns empty array when authenticated but no time logs exist", async () => {
      const asUser = createTestWithUser()
      const timeLogs = await asUser.query(api.timeLogs.getAllTimeLogs)
      expect(timeLogs).toEqual([])
    })

    it("returns all time logs for authenticated user", async () => {
      const asUser = createTestWithUser()
      const startTime1 = Date.now() - 20000
      const startTime2 = Date.now() - 10000

      await asUser.mutation(api.timeLogs.saveTimeLog, {
        agentId: testAgentId,
        activityType: "task_creation",
        startTime: startTime1,
      })

      await asUser.mutation(api.timeLogs.saveTimeLog, {
        agentId: testAgentId2,
        activityType: "conversation_review",
        startTime: startTime2,
      })

      const timeLogs = await asUser.query(api.timeLogs.getAllTimeLogs)

      expect(timeLogs).toHaveLength(2)
      expect(timeLogs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            agentId: testAgentId,
            activityType: "task_creation",
          }),
          expect.objectContaining({
            agentId: testAgentId2,
            activityType: "conversation_review",
          }),
        ])
      )
    })

    it("only returns time logs for the specific user", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      const startTime = Date.now() - 5000

      // User 1 saves time log
      await asUser1.mutation(api.timeLogs.saveTimeLog, {
        agentId: testAgentId,
        activityType: "task_creation",
        startTime,
      })

      // User 2 saves different time log
      await asUser2.mutation(api.timeLogs.saveTimeLog, {
        agentId: testAgentId2,
        activityType: "conversation_review",
        startTime,
      })

      // Each user only sees their own time logs
      const user1Logs = await asUser1.query(api.timeLogs.getAllTimeLogs)
      const user2Logs = await asUser2.query(api.timeLogs.getAllTimeLogs)

      expect(user1Logs).toHaveLength(1)
      expect(user1Logs[0].agentId).toBe(testAgentId)
      expect(user1Logs[0].activityType).toBe("task_creation")

      expect(user2Logs).toHaveLength(1)
      expect(user2Logs[0].agentId).toBe(testAgentId2)
      expect(user2Logs[0].activityType).toBe("conversation_review")
    })
  })

  describe("saveTimeLog", () => {
    it("saves time log for authenticated user", async () => {
      const asUser = createTestWithUser()
      const startTime = Date.now() - 5000

      const result = await asUser.mutation(api.timeLogs.saveTimeLog, {
        agentId: testAgentId,
        activityType: "task_creation",
        startTime,
      })

      expect(result).toEqual({ success: true })

      // Verify the log was saved
      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByAgent, {
        agentId: testAgentId,
      })

      expect(timeLogs).toHaveLength(1)
      expect(timeLogs[0]).toMatchObject({
        agentId: testAgentId,
        activityType: "task_creation",
        startTime,
      })
      expect(timeLogs[0].endTime).toBeDefined()
      expect(timeLogs[0].createdAt).toBeDefined()
    })

    it("sets endTime and createdAt to current time", async () => {
      const asUser = createTestWithUser()
      const beforeSave = Date.now()
      const startTime = beforeSave - 10000

      await asUser.mutation(api.timeLogs.saveTimeLog, {
        agentId: testAgentId,
        activityType: "conversation_review",
        startTime,
      })

      const afterSave = Date.now()

      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByAgent, {
        agentId: testAgentId,
      })

      expect(timeLogs[0].endTime).toBeGreaterThanOrEqual(beforeSave)
      expect(timeLogs[0].endTime).toBeLessThanOrEqual(afterSave)
      expect(timeLogs[0].createdAt).toBeGreaterThanOrEqual(beforeSave)
      expect(timeLogs[0].createdAt).toBeLessThanOrEqual(afterSave)
    })

    it("saves multiple time logs for the same agent", async () => {
      const asUser = createTestWithUser()
      const startTime1 = Date.now() - 20000
      const startTime2 = Date.now() - 10000

      await asUser.mutation(api.timeLogs.saveTimeLog, {
        agentId: testAgentId,
        activityType: "task_creation",
        startTime: startTime1,
      })

      await asUser.mutation(api.timeLogs.saveTimeLog, {
        agentId: testAgentId,
        activityType: "conversation_review",
        startTime: startTime2,
      })

      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByAgent, {
        agentId: testAgentId,
      })

      expect(timeLogs).toHaveLength(2)
      expect(timeLogs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            activityType: "task_creation",
            startTime: startTime1,
          }),
          expect.objectContaining({
            activityType: "conversation_review",
            startTime: startTime2,
          }),
        ])
      )
    })

    it("accepts both activity types", async () => {
      const asUser = createTestWithUser()
      const startTime = Date.now() - 5000

      // Test task_creation
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        agentId: testAgentId,
        activityType: "task_creation",
        startTime,
      })

      // Test conversation_review
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        agentId: testAgentId2,
        activityType: "conversation_review",
        startTime,
      })

      const allLogs = await asUser.query(api.timeLogs.getAllTimeLogs)
      expect(allLogs).toHaveLength(2)
      expect(allLogs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ activityType: "task_creation" }),
          expect.objectContaining({ activityType: "conversation_review" }),
        ])
      )
    })

    it("returns validation error for invalid payload", async () => {
      const asUser = createTestWithUser()

      await expect(
        asUser.mutation(api.timeLogs.saveTimeLog, {
          agentId: testAgentId,
          activityType: "invalid_type",
          startTime: Date.now(),
        } as any)
      ).rejects.toThrow()
    })

    it("returns validation error for missing startTime", async () => {
      const asUser = createTestWithUser()

      await expect(
        asUser.mutation(api.timeLogs.saveTimeLog, {
          agentId: testAgentId,
          activityType: "task_creation",
        } as any)
      ).rejects.toThrow()
    })
  })
})
