import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createTestInstance,
  createTestUsers,
  createTestWithUser,
} from "../../lib/convex-test-helpers"
import { api } from "../_generated/api"

describe("tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getTasks", () => {
    it("returns empty array when not authenticated", async () => {
      const t = createTestInstance()
      const tasks = await t.query(api.tasks.getTasks)
      expect(tasks).toEqual([])
    })

    it("returns empty array when authenticated but no tasks exist", async () => {
      const asUser = createTestWithUser()
      const tasks = await asUser.query(api.tasks.getTasks)
      expect(tasks).toEqual([])
    })

    it("returns tasks for authenticated user after creating", async () => {
      const asUser = createTestWithUser()

      await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
        description: "Test Description",
      })

      const tasks = await asUser.query(api.tasks.getTasks)
      expect(tasks).toHaveLength(1)
      expect(tasks[0]).toMatchObject({
        title: "Test Task",
        description: "Test Description",
      })
      expect(tasks[0]._id).toBeDefined()
      expect(tasks[0].createdAt).toBeDefined()
    })

    it("returns tasks ordered by createdAt descending", async () => {
      const asUser = createTestWithUser()

      // Create first task
      await asUser.mutation(api.tasks.createTask, {
        title: "First Task",
      })

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Create second task
      await asUser.mutation(api.tasks.createTask, {
        title: "Second Task",
      })

      const tasks = await asUser.query(api.tasks.getTasks)
      expect(tasks).toHaveLength(2)
      // Most recently created should be first
      expect(tasks[0].title).toBe("Second Task")
      expect(tasks[1].title).toBe("First Task")
    })

    it("excludes tasks from other users", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 creates a task
      await asUser1.mutation(api.tasks.createTask, {
        title: "User 1 Task",
      })

      // User 2 should not see User 1's task
      const user2Tasks = await asUser2.query(api.tasks.getTasks)
      expect(user2Tasks).toEqual([])

      // User 1 should see their task
      const user1Tasks = await asUser1.query(api.tasks.getTasks)
      expect(user1Tasks).toHaveLength(1)
      expect(user1Tasks[0].title).toBe("User 1 Task")
    })
  })

  describe("getTask", () => {
    it("returns null when not authenticated", async () => {
      const t = createTestInstance()
      // Create a task with an authenticated user first to get a valid ID
      const asUser = createTestWithUser()
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      // Query without authentication should return null
      const task = await t.query(api.tasks.getTask, { taskId })
      expect(task).toBeNull()
    })

    it("returns null when task does not exist", async () => {
      const asUser = createTestWithUser()

      // Create a task to get a valid ID format, then delete it
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })
      await asUser.mutation(api.tasks.deleteTask, { taskId })

      // Query for deleted task should return null
      const task = await asUser.query(api.tasks.getTask, { taskId })
      expect(task).toBeNull()
    })

    it("returns null when task belongs to different user", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 creates a task
      const taskId = await asUser1.mutation(api.tasks.createTask, {
        title: "User 1 Task",
      })

      // User 2 should not see User 1's task
      const task = await asUser2.query(api.tasks.getTask, { taskId })
      expect(task).toBeNull()
    })

    it("returns task when it exists for the user", async () => {
      const asUser = createTestWithUser()

      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
        description: "Test Description",
      })

      const task = await asUser.query(api.tasks.getTask, { taskId })

      expect(task).not.toBeNull()
      expect(task?._id).toBe(taskId)
      expect(task?.title).toBe("Test Task")
      expect(task?.description).toBe("Test Description")
      expect(task?.createdAt).toBeDefined()
    })
  })

  describe("createTask", () => {
    it("creates a new task for authenticated user", async () => {
      const asUser = createTestWithUser()

      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "New Task",
        description: "Task Description",
      })

      expect(taskId).toBeDefined()

      // Verify task was created
      const task = await asUser.query(api.tasks.getTask, { taskId })
      expect(task).not.toBeNull()
      expect(task?.title).toBe("New Task")
      expect(task?.description).toBe("Task Description")
    })

    it("creates task without description", async () => {
      const asUser = createTestWithUser()

      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Task Without Description",
      })

      const task = await asUser.query(api.tasks.getTask, { taskId })
      expect(task).not.toBeNull()
      expect(task?.title).toBe("Task Without Description")
      expect(task?.description).toBeUndefined()
    })

    it("trims whitespace from title and description", async () => {
      const asUser = createTestWithUser()

      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "  Trimmed Title  ",
        description: "  Trimmed Description  ",
      })

      const task = await asUser.query(api.tasks.getTask, { taskId })
      expect(task?.title).toBe("Trimmed Title")
      expect(task?.description).toBe("Trimmed Description")
    })

    it("handles empty description string as undefined", async () => {
      const asUser = createTestWithUser()

      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Task",
        description: "   ",
      })

      const task = await asUser.query(api.tasks.getTask, { taskId })
      expect(task?.description).toBeUndefined()
    })

    it("throws error when not authenticated", async () => {
      const t = createTestInstance()

      await expect(
        t.mutation(api.tasks.createTask, {
          title: "Test Task",
        })
      ).rejects.toThrow()
    })

    it("sets createdAt timestamp", async () => {
      const asUser = createTestWithUser()
      const beforeTime = Date.now()

      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      const task = await asUser.query(api.tasks.getTask, { taskId })
      const afterTime = Date.now()

      expect(task?.createdAt).toBeGreaterThanOrEqual(beforeTime)
      expect(task?.createdAt).toBeLessThanOrEqual(afterTime)
    })
  })

  describe("deleteTask", () => {
    it("deletes a task for authenticated user", async () => {
      const asUser = createTestWithUser()

      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Task to Delete",
      })

      const result = await asUser.mutation(api.tasks.deleteTask, { taskId })

      expect(result).toEqual({ success: true })

      // Verify task was deleted
      const task = await asUser.query(api.tasks.getTask, { taskId })
      expect(task).toBeNull()
    })

    it("deletes all associated time logs when deleting task", async () => {
      const asUser = createTestWithUser()

      // Create a task
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Task with Time Logs",
      })

      // Create time logs for the task
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

      // Verify time logs exist
      const timeLogsBefore = await asUser.query(
        api.timeLogs.getTimeLogsByTask,
        {
          taskId,
        }
      )
      expect(timeLogsBefore).toHaveLength(2)

      // Delete the task
      await asUser.mutation(api.tasks.deleteTask, { taskId })

      // Verify time logs were deleted
      const timeLogsAfter = await asUser.query(api.timeLogs.getTimeLogsByTask, {
        taskId,
      })
      expect(timeLogsAfter).toEqual([])
    })

    it("throws error when task does not exist", async () => {
      const asUser = createTestWithUser()

      // Create a task to get a valid ID format, then delete it
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })
      await asUser.mutation(api.tasks.deleteTask, { taskId })

      // Try to delete again
      await expect(
        asUser.mutation(api.tasks.deleteTask, { taskId })
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

      // User 2 tries to delete User 1's task
      await expect(
        asUser2.mutation(api.tasks.deleteTask, { taskId })
      ).rejects.toThrow("Task not found or unauthorized")
    })

    it("throws error when not authenticated", async () => {
      const t = createTestInstance()
      // Create a task with an authenticated user first to get a valid ID
      const asUser = createTestWithUser()
      const taskId = await asUser.mutation(api.tasks.createTask, {
        title: "Test Task",
      })

      // Try to delete without authentication
      await expect(
        t.mutation(api.tasks.deleteTask, { taskId })
      ).rejects.toThrow()
    })
  })

  describe("multi-user isolation", () => {
    it("isolates tasks per user", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 creates tasks
      await asUser1.mutation(api.tasks.createTask, {
        title: "User 1 Task 1",
      })
      await asUser1.mutation(api.tasks.createTask, {
        title: "User 1 Task 2",
      })

      // User 2 creates tasks
      await asUser2.mutation(api.tasks.createTask, {
        title: "User 2 Task 1",
      })

      // Each user only sees their own tasks
      const user1Tasks = await asUser1.query(api.tasks.getTasks)
      const user2Tasks = await asUser2.query(api.tasks.getTasks)

      expect(user1Tasks).toHaveLength(2)
      expect(user1Tasks[0].title).toBe("User 1 Task 2")
      expect(user1Tasks[1].title).toBe("User 1 Task 1")

      expect(user2Tasks).toHaveLength(1)
      expect(user2Tasks[0].title).toBe("User 2 Task 1")
    })
  })
})
