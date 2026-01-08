import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createTestInstance,
  createTestUsers,
  createTestWithUser,
} from "../../lib/convex-test-helpers"
import { api } from "../_generated/api"

describe("timeLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getTimeLogsByTask", () => {
    it("returns empty array when not authenticated", async () => {
      const t = createTestInstance()
      // Create a task with an authenticated user first to get a valid ID
      const asUser = createTestWithUser()
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      // Query without authentication should return empty array
      const timeLogs = await t.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })
      expect(timeLogs).toEqual([])
    })

    it("returns empty array when task does not exist", async () => {
      const asUser = createTestWithUser()

      // Create a task to get a valid ID format, then delete it
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })
      await asUser.mutation(api.tasks.deleteTask, { taskId })

      // Query for deleted task should return empty array
      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })
      expect(timeLogs).toEqual([])
    })

    it("returns empty array when task belongs to different user", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 creates a task
      const taskId = await asUser1.mutation(api.tasks.createTask, {
        title: "User 1 Task",
      })

      // User 2 should not see time logs for User 1's task
      const timeLogs = await asUser2.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })
      expect(timeLogs).toEqual([])
    })

    it("returns time logs for a specific task", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      // Create time logs
      const now = Date.now()
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 3600000,
        endTime: now,
        activityType: "coding",
      })

      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 7200000,
        endTime: now - 3600000,
        activityType: "review",
      })

      // Query time logs for the task
      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })

      expect(timeLogs).toHaveLength(2)
      expect(timeLogs[0].taskId).toBe(taskId)
      expect(timeLogs[1].taskId).toBe(taskId)
    })

    it("returns time logs ordered by createdAt descending", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      const now = Date.now()

      // Create first time log
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 3600000,
        endTime: now - 1800000,
        activityType: "coding",
      })

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Create second time log
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 1800000,
        endTime: now,
        activityType: "review",
      })

      // Query time logs - should be ordered by createdAt descending
      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })

      expect(timeLogs).toHaveLength(2)
      // Most recently created should be first
      expect(timeLogs[0].activityType).toBe("review")
      expect(timeLogs[1].activityType).toBe("coding")
    })

    it("returns empty array when no time logs exist for task", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      // Query time logs - should be empty
      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })
      expect(timeLogs).toEqual([])
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

      // Create tasks
      const task1 = await asUser.mutation(api.tasks.createTask, {
        title: "Task 1",
      })
      const task2 = await asUser.mutation(api.tasks.createTask, {
        title: "Task 2",
      })

      // Create time logs for different tasks
      const now = Date.now()
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId: task1,
        startTime: now - 3600000,
        endTime: now,
        activityType: "coding",
      })

      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId: task2,
        startTime: now - 7200000,
        endTime: now - 3600000,
        activityType: "review",
      })

      // Query all time logs
      const timeLogs = await asUser.query(api.timeLogs.getAllTimeLogs)

      expect(timeLogs).toHaveLength(2)
      expect(timeLogs[0].taskId).toBe(task2)
      expect(timeLogs[1].taskId).toBe(task1)
    })

    it("returns time logs ordered by createdAt descending", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      const now = Date.now()

      // Create first time log
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 3600000,
        endTime: now - 1800000,
      })

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Create second time log
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 1800000,
        endTime: now,
      })

      // Query all time logs
      const timeLogs = await asUser.query(api.timeLogs.getAllTimeLogs)

      expect(timeLogs).toHaveLength(2)
      // Most recently created should be first
      expect(timeLogs[0].endTime).toBe(now)
      expect(timeLogs[1].endTime).toBe(now - 1800000)
    })

    it("excludes time logs from other users", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 creates a task and time log
      const task1 = await asUser1.mutation(api.tasks.createTask, {
        title: "User 1 Task",
      })
      const now = Date.now()
      await asUser1.mutation(api.timeLogs.saveTimeLog, {
        taskId: task1,
        startTime: now - 3600000,
        endTime: now,
      })

      // User 2 creates a task and time log
      const task2 = await asUser2.mutation(api.tasks.createTask, {
        title: "User 2 Task",
      })
      await asUser2.mutation(api.timeLogs.saveTimeLog, {
        taskId: task2,
        startTime: now - 3600000,
        endTime: now,
      })

      // Each user only sees their own time logs
      const user1Logs = await asUser1.query(api.timeLogs.getAllTimeLogs)
      const user2Logs = await asUser2.query(api.timeLogs.getAllTimeLogs)

      expect(user1Logs).toHaveLength(1)
      expect(user1Logs[0].taskId).toBe(task1)

      expect(user2Logs).toHaveLength(1)
      expect(user2Logs[0].taskId).toBe(task2)
    })
  })

  describe("getTodayTimeLogs", () => {
    it("returns empty array when not authenticated", async () => {
      const t = createTestInstance()
      const timeLogs = await t.query(api.timeLogs.getTodayTimeLogs)
      expect(timeLogs).toEqual([])
    })

    it("returns only time logs from today", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      const now = Date.now()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.getTime()

      // Create a time log from today
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: todayStart + 3600000, // 1 hour after midnight
        endTime: todayStart + 7200000, // 2 hours after midnight
        activityType: "coding",
      })

      // Create a time log from yesterday
      const yesterdayStart = todayStart - 24 * 60 * 60 * 1000
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: yesterdayStart + 3600000,
        endTime: yesterdayStart + 7200000,
        activityType: "review",
      })

      // Query today's time logs
      const todayLogs = await asUser.query(api.timeLogs.getTodayTimeLogs)

      expect(todayLogs).toHaveLength(1)
      expect(todayLogs[0].activityType).toBe("coding")
    })

    it("returns empty array when no time logs from today exist", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      // Create a time log from yesterday
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const yesterdayStart = today.getTime() - 24 * 60 * 60 * 1000

      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: yesterdayStart + 3600000,
        endTime: yesterdayStart + 7200000,
      })

      // Query today's time logs - should be empty
      const todayLogs = await asUser.query(api.timeLogs.getTodayTimeLogs)
      expect(todayLogs).toEqual([])
    })

    it("returns time logs ordered by createdAt descending", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.getTime()

      // Create first time log
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: todayStart + 3600000,
        endTime: todayStart + 5400000,
      })

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Create second time log
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: todayStart + 5400000,
        endTime: todayStart + 7200000,
      })

      // Query today's time logs
      const todayLogs = await asUser.query(api.timeLogs.getTodayTimeLogs)

      expect(todayLogs).toHaveLength(2)
      // Most recently created should be first
      expect(todayLogs[0].endTime).toBe(todayStart + 7200000)
      expect(todayLogs[1].endTime).toBe(todayStart + 5400000)
    })
  })

  describe("saveTimeLog", () => {
    it("saves a time log for authenticated user", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      const now = Date.now()
      const timeLogId = await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 3600000,
        endTime: now,
        activityType: "coding",
      })

      expect(timeLogId).toBeDefined()

      // Verify time log was created
      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })
      expect(timeLogs).toHaveLength(1)
      expect(timeLogs[0]).toMatchObject({
        taskId,
        startTime: now - 3600000,
        endTime: now,
        activityType: "coding",
      })
    })

    it("saves time log without activityType", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      const now = Date.now()
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 3600000,
        endTime: now,
      })

      // Verify time log was created
      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })
      expect(timeLogs).toHaveLength(1)
      expect(timeLogs[0].activityType).toBeUndefined()
    })

    it("throws error when task does not exist", async () => {
      const asUser = createTestWithUser()

      // Create a task to get a valid ID format, then delete it
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })
      await asUser.mutation(api.tasks.deleteTask, { taskId })

      // Try to save time log for deleted task
      const now = Date.now()
      await expect(
        asUser.mutation(api.timeLogs.saveTimeLog, {
          taskId,
          startTime: now - 3600000,
          endTime: now,
        })
      ).rejects.toThrow("Task not found or unauthorized")
    })

    it("throws error when task belongs to different user", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 creates a task
      const taskId = await asUser1.mutation(api.tasks.createTask, {
        title: "User 1 Task",
      })

      // User 2 tries to save time log for User 1's task
      const now = Date.now()
      await expect(
        asUser2.mutation(api.timeLogs.saveTimeLog, {
          taskId,
          startTime: now - 3600000,
          endTime: now,
        })
      ).rejects.toThrow("Task not found or unauthorized")
    })

    it("throws error when not authenticated", async () => {
      const t = createTestInstance()
      // Create a task with an authenticated user first to get a valid ID
      const asUser = createTestWithUser()
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      // Try to save time log without authentication
      const now = Date.now()
      await expect(
        t.mutation(api.timeLogs.saveTimeLog, {
          taskId,
          startTime: now - 3600000,
          endTime: now,
        })
      ).rejects.toThrow()
    })

    it("sets createdAt timestamp", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      const beforeTime = Date.now()
      const now = Date.now()

      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 3600000,
        endTime: now,
      })

      const afterTime = Date.now()

      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })
      expect(timeLogs[0].createdAt).toBeGreaterThanOrEqual(beforeTime)
      expect(timeLogs[0].createdAt).toBeLessThanOrEqual(afterTime)
    })
  })

  describe("deleteTimeLog", () => {
    it("deletes a time log for authenticated user", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      // Create a time log
      const now = Date.now()
      const timeLogId = await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 3600000,
        endTime: now,
      })

      // Delete the time log
      const result = await asUser.mutation(api.timeLogs.deleteTimeLog, {
        timeLogId,
      })

      expect(result).toEqual({ success: true })

      // Verify time log was deleted
      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })
      expect(timeLogs).toEqual([])
    })

    it("throws error when time log does not exist", async () => {
      const asUser = createTestWithUser()

      // Create a task and time log
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })
      const now = Date.now()
      const timeLogId = await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 3600000,
        endTime: now,
      })

      // Delete the time log
      await asUser.mutation(api.timeLogs.deleteTimeLog, { timeLogId })

      // Try to delete again
      await expect(
        asUser.mutation(api.timeLogs.deleteTimeLog, { timeLogId })
      ).rejects.toThrow("Time log not found or unauthorized")
    })

    it("throws error when time log belongs to different user", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 creates a task and time log
      const taskId = await asUser1.mutation(api.tasks.createTask, {
        title: "User 1 Task",
      })
      const now = Date.now()
      const timeLogId = await asUser1.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 3600000,
        endTime: now,
      })

      // User 2 tries to delete User 1's time log
      await expect(
        asUser2.mutation(api.timeLogs.deleteTimeLog, { timeLogId })
      ).rejects.toThrow("Time log not found or unauthorized")
    })

    it("throws error when not authenticated", async () => {
      const t = createTestInstance()
      // Create a task and time log with an authenticated user first
      const asUser = createTestWithUser()
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })
      const now = Date.now()
      const timeLogId = await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 3600000,
        endTime: now,
      })

      // Try to delete without authentication
      await expect(
        t.mutation(api.timeLogs.deleteTimeLog, { timeLogId })
      ).rejects.toThrow()
    })
  })

  describe("multi-user isolation", () => {
    it("isolates time logs per user", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 creates a task and time log
      const task1 = await asUser1.mutation(api.tasks.createTask, {
        title: "User 1 Task",
      })
      const now = Date.now()
      await asUser1.mutation(api.timeLogs.saveTimeLog, {
        taskId: task1,
        startTime: now - 3600000,
        endTime: now,
        activityType: "coding",
      })

      // User 2 creates a task and time log
      const task2 = await asUser2.mutation(api.tasks.createTask, {
        title: "User 2 Task",
      })
      await asUser2.mutation(api.timeLogs.saveTimeLog, {
        taskId: task2,
        startTime: now - 3600000,
        endTime: now,
        activityType: "review",
      })

      // Each user only sees their own time logs
      const user1Logs = await asUser1.query(api.timeLogs.getAllTimeLogs)
      const user2Logs = await asUser2.query(api.timeLogs.getAllTimeLogs)

      expect(user1Logs).toHaveLength(1)
      expect(user1Logs[0].activityType).toBe("coding")
      expect(user1Logs[0].taskId).toBe(task1)

      expect(user2Logs).toHaveLength(1)
      expect(user2Logs[0].activityType).toBe("review")
      expect(user2Logs[0].taskId).toBe(task2)
    })
  })
})
