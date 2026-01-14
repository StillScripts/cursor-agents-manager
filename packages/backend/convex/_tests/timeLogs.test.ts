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

    it("returns time logs for a specific task (only completed)", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      // Create completed time logs
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

      // Create an ongoing time log (should be filtered out)
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 1800000,
        // No endTime = ongoing
      })

      // Query time logs for the task - should only return completed ones
      const timeLogs = await asUser.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })

      expect(timeLogs).toHaveLength(2)
      expect(timeLogs[0].taskId).toBe(taskId)
      expect(timeLogs[1].taskId).toBe(taskId)
      // Verify all returned logs have endTime
      expect(timeLogs[0].endTime).toBeDefined()
      expect(timeLogs[1].endTime).toBeDefined()
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

    it("returns all time logs for authenticated user (only completed)", async () => {
      const asUser = createTestWithUser()

      // Create tasks
      const task1 = await asUser.mutation(api.tasks.createTask, {
        title: "Task 1",
      })
      const task2 = await asUser.mutation(api.tasks.createTask, {
        title: "Task 2",
      })

      // Create completed time logs for different tasks
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

      // Create an ongoing time log (should be filtered out)
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId: task1,
        startTime: now - 1800000,
        // No endTime = ongoing
      })

      // Query all time logs - should only return completed ones
      const timeLogs = await asUser.query(api.timeLogs.getAllTimeLogs)

      expect(timeLogs).toHaveLength(2)
      expect(timeLogs[0].taskId).toBe(task2)
      expect(timeLogs[1].taskId).toBe(task1)
      // Verify all returned logs have endTime
      expect(timeLogs[0].endTime).toBeDefined()
      expect(timeLogs[1].endTime).toBeDefined()
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

    it("returns only completed time logs from today", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.getTime()

      // Create a completed time log from today
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: todayStart + 3600000, // 1 hour after midnight
        endTime: todayStart + 7200000, // 2 hours after midnight
        activityType: "coding",
      })

      // Create an ongoing time log from today (should be filtered out)
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: todayStart + 10800000, // 3 hours after midnight
        // No endTime = ongoing
      })

      // Create a time log from yesterday
      const yesterdayStart = todayStart - 24 * 60 * 60 * 1000
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: yesterdayStart + 3600000,
        endTime: yesterdayStart + 7200000,
        activityType: "review",
      })

      // Query today's time logs - should only return completed ones from today
      const todayLogs = await asUser.query(api.timeLogs.getTodayTimeLogs)

      expect(todayLogs).toHaveLength(1)
      expect(todayLogs[0].activityType).toBe("coding")
      expect(todayLogs[0].endTime).toBeDefined()
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
    it("saves a completed time log for authenticated user", async () => {
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

    it("saves an ongoing time log (without endTime)", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      const now = Date.now()
      const timeLogId = await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now,
        // No endTime = ongoing task
      })

      expect(timeLogId).toBeDefined()

      // Verify active time log can be retrieved
      const activeLog = await asUser.query(api.timeLogs.getActiveTimeLog)
      expect(activeLog).not.toBeNull()
      expect(activeLog?._id).toBe(timeLogId)
      expect(activeLog?.taskId).toBe(taskId)
      expect(activeLog?.startTime).toBe(now)

      // Verify it's not in completed logs
      const completedLogs = await asUser.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })
      expect(completedLogs).toHaveLength(0)
    })

    it("prevents creating multiple active tasks", async () => {
      const asUser = createTestWithUser()

      // Create tasks
      const task1 = await asUser.mutation(api.tasks.createTask, {
        title: "Task 1",
      })
      const task2 = await asUser.mutation(api.tasks.createTask, {
        title: "Task 2",
      })

      const now = Date.now()

      // Create first ongoing task
      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId: task1,
        startTime: now,
        // No endTime = ongoing
      })

      // Try to create second ongoing task - should fail
      await expect(
        asUser.mutation(api.timeLogs.saveTimeLog, {
          taskId: task2,
          startTime: now + 1000,
          // No endTime = ongoing
        })
      ).rejects.toThrow("already have an active task")
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

  describe("getActiveTimeLog", () => {
    it("returns null when not authenticated", async () => {
      const t = createTestInstance()
      const activeLog = await t.query(api.timeLogs.getActiveTimeLog)
      expect(activeLog).toBeNull()
    })

    it("returns null when no active task exists", async () => {
      const asUser = createTestWithUser()
      const activeLog = await asUser.query(api.timeLogs.getActiveTimeLog)
      expect(activeLog).toBeNull()
    })

    it("returns active time log when one exists", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
        description: "Test Description",
      })

      const now = Date.now()
      const timeLogId = await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now,
        // No endTime = ongoing
      })

      const activeLog = await asUser.query(api.timeLogs.getActiveTimeLog)
      expect(activeLog).not.toBeNull()
      expect(activeLog?._id).toBe(timeLogId)
      expect(activeLog?.taskId).toBe(taskId)
      expect(activeLog?.startTime).toBe(now)
      expect(activeLog?.task.title).toBe("Test Task")
      expect(activeLog?.task.description).toBe("Test Description")
    })

    it("returns null when task is deleted", async () => {
      const asUser = createTestWithUser()

      // Create a task and active time log
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: Date.now(),
        // No endTime = ongoing
      })

      // Delete the task
      await asUser.mutation(api.tasks.deleteTask, { taskId })

      // Active log should return null since task is deleted
      const activeLog = await asUser.query(api.timeLogs.getActiveTimeLog)
      expect(activeLog).toBeNull()
    })
  })

  describe("stopTimeLog", () => {
    it("stops an active time log", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      const startTime = Date.now()
      const timeLogId = await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime,
        // No endTime = ongoing
      })

      // Verify it's active
      const activeBefore = await asUser.query(api.timeLogs.getActiveTimeLog)
      expect(activeBefore).not.toBeNull()

      // Stop the time log
      const endTime = Date.now()
      const result = await asUser.mutation(api.timeLogs.stopTimeLog, {
        timeLogId,
        endTime,
      })

      expect(result).toEqual({ success: true })

      // Verify it's no longer active
      const activeAfter = await asUser.query(api.timeLogs.getActiveTimeLog)
      expect(activeAfter).toBeNull()

      // Verify it appears in completed logs
      const completedLogs = await asUser.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })
      expect(completedLogs).toHaveLength(1)
      expect(completedLogs[0].endTime).toBe(endTime)
    })

    it("throws error when time log does not exist", async () => {
      const asUser = createTestWithUser()

      // Create a task and time log to get a valid ID format
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })
      const timeLogId = await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: Date.now(),
        endTime: Date.now(),
      })

      // Delete the time log
      await asUser.mutation(api.timeLogs.deleteTimeLog, { timeLogId })

      // Try to stop deleted time log
      await expect(
        asUser.mutation(api.timeLogs.stopTimeLog, {
          timeLogId,
          endTime: Date.now(),
        })
      ).rejects.toThrow("Time log not found or unauthorized")
    })

    it("throws error when time log belongs to different user", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 creates a task and active time log
      const taskId = await asUser1.mutation(api.tasks.createTask, {
        title: "User 1 Task",
      })
      const timeLogId = await asUser1.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: Date.now(),
        // No endTime = ongoing
      })

      // User 2 tries to stop User 1's time log
      await expect(
        asUser2.mutation(api.timeLogs.stopTimeLog, {
          timeLogId,
          endTime: Date.now(),
        })
      ).rejects.toThrow("Time log not found or unauthorized")
    })

    it("throws error when time log is already completed", async () => {
      const asUser = createTestWithUser()

      // Create a task and completed time log
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })
      const now = Date.now()
      const timeLogId = await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: now - 3600000,
        endTime: now,
      })

      // Try to stop already completed time log
      await expect(
        asUser.mutation(api.timeLogs.stopTimeLog, {
          timeLogId,
          endTime: Date.now(),
        })
      ).rejects.toThrow("Time log is already completed")
    })

    it("throws error when not authenticated", async () => {
      const t = createTestInstance()
      const asUser = createTestWithUser()

      // Create a task and active time log
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })
      const timeLogId = await asUser.mutation(api.timeLogs.saveTimeLog, {
        taskId,
        startTime: Date.now(),
        // No endTime = ongoing
      })

      // Try to stop without authentication
      await expect(
        t.mutation(api.timeLogs.stopTimeLog, {
          timeLogId,
          endTime: Date.now(),
        })
      ).rejects.toThrow()
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
