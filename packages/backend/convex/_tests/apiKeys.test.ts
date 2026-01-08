import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createTestInstance,
  createTestUsers,
  createTestWithUser,
} from "../../lib/convex-test-helpers"
import { api } from "../_generated/api"

describe("apiKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("getApiKeysRecord", () => {
    it("returns null when not authenticated", async () => {
      const t = createTestInstance()
      const record = await t.query(api.apiKeys.getApiKeysRecord)
      expect(record).toBeNull()
    })

    it("returns null when authenticated but no API keys exist", async () => {
      const asUser = createTestWithUser()
      const record = await asUser.query(api.apiKeys.getApiKeysRecord)
      expect(record).toBeNull()
    })

    it("returns API keys record when it exists", async () => {
      const asUser = createTestWithUser()

      // Save API keys via action (which handles encryption)
      await asUser.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "test-cursor-key",
      })

      const record = await asUser.query(api.apiKeys.getApiKeysRecord)
      expect(record).not.toBeNull()
      expect(record?.encryptedCursorApiKey).toBeDefined()
      expect(record?.encryptedCursorApiKey).not.toBe("")
    })
  })

  describe("getCursorApiKeyStatus", () => {
    it("returns hasKey false when not authenticated", async () => {
      const t = createTestInstance()
      const status = await t.query(api.apiKeys.getCursorApiKeyStatus)
      expect(status).toEqual({ hasKey: false, maskedKey: null })
    })

    it("returns hasKey false when authenticated but no API key exists", async () => {
      const asUser = createTestWithUser()
      const status = await asUser.query(api.apiKeys.getCursorApiKeyStatus)
      expect(status).toEqual({ hasKey: false, maskedKey: null })
    })

    it("returns hasKey true when API key exists", async () => {
      const asUser = createTestWithUser()

      // Save API key via action
      await asUser.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "test-cursor-key",
      })

      const status = await asUser.query(api.apiKeys.getCursorApiKeyStatus)
      expect(status).toEqual({ hasKey: true, maskedKey: "****" })
    })

    it("returns hasKey false when API key is empty string", async () => {
      const asUser = createTestWithUser()

      // Save empty API key
      await asUser.mutation(api.apiKeys.saveCursorApiKey, {
        encryptedApiKey: "",
      })

      const status = await asUser.query(api.apiKeys.getCursorApiKeyStatus)
      expect(status).toEqual({ hasKey: false, maskedKey: null })
    })
  })

  describe("getOpenaiApiKeyStatus", () => {
    it("returns hasKey false when not authenticated", async () => {
      const t = createTestInstance()
      const status = await t.query(api.apiKeys.getOpenaiApiKeyStatus)
      expect(status).toEqual({ hasKey: false, maskedKey: null })
    })

    it("returns hasKey false when authenticated but no API key exists", async () => {
      const asUser = createTestWithUser()
      const status = await asUser.query(api.apiKeys.getOpenaiApiKeyStatus)
      expect(status).toEqual({ hasKey: false, maskedKey: null })
    })

    it("returns hasKey true when API key exists", async () => {
      const asUser = createTestWithUser()

      // Save API key via action
      await asUser.action(api.apiKeysActions.saveOpenaiApiKey, {
        apiKey: "test-openai-key",
      })

      const status = await asUser.query(api.apiKeys.getOpenaiApiKeyStatus)
      expect(status).toEqual({ hasKey: true, maskedKey: "****" })
    })

    it("returns hasKey false when API key is empty string", async () => {
      const asUser = createTestWithUser()

      // Save empty API key
      await asUser.mutation(api.apiKeys.saveOpenaiApiKey, {
        encryptedApiKey: "",
      })

      const status = await asUser.query(api.apiKeys.getOpenaiApiKeyStatus)
      expect(status).toEqual({ hasKey: false, maskedKey: null })
    })
  })

  describe("saveCursorApiKey", () => {
    it("saves Cursor API key for authenticated user", async () => {
      const asUser = createTestWithUser()

      // Use action to save (handles encryption)
      const result = await asUser.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "test-cursor-key-123",
      })

      expect(result).toEqual({ success: true })

      // Verify API key was saved
      const record = await asUser.query(api.apiKeys.getApiKeysRecord)
      expect(record).not.toBeNull()
      expect(record?.encryptedCursorApiKey).toBeDefined()
      expect(record?.encryptedCursorApiKey).not.toBe("")
    })

    it("updates existing Cursor API key", async () => {
      const asUser = createTestWithUser()

      // Save initial API key
      await asUser.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "initial-key",
      })

      const record1 = await asUser.query(api.apiKeys.getApiKeysRecord)
      const initialEncrypted = record1?.encryptedCursorApiKey

      // Update API key
      await asUser.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "updated-key",
      })

      const record2 = await asUser.query(api.apiKeys.getApiKeysRecord)
      expect(record2?.encryptedCursorApiKey).not.toBe(initialEncrypted)
    })

    it("creates new record if none exists", async () => {
      const asUser = createTestWithUser()

      await asUser.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "test-key",
      })

      const record = await asUser.query(api.apiKeys.getApiKeysRecord)
      expect(record).not.toBeNull()
      expect(record?.userId).toBeDefined()
    })

    it("throws error when not authenticated", async () => {
      const t = createTestInstance()

      await expect(
        t.mutation(api.apiKeys.saveCursorApiKey, {
          encryptedApiKey: "encrypted-key",
        })
      ).rejects.toThrow()
    })
  })

  describe("saveOpenaiApiKey", () => {
    it("saves OpenAI API key for authenticated user", async () => {
      const asUser = createTestWithUser()

      // Use action to save (handles encryption)
      const result = await asUser.action(api.apiKeysActions.saveOpenaiApiKey, {
        apiKey: "test-openai-key-123",
      })

      expect(result).toEqual({ success: true })

      // Verify API key was saved
      const record = await asUser.query(api.apiKeys.getApiKeysRecord)
      expect(record).not.toBeNull()
      expect(record?.encryptedOpenaiApiKey).toBeDefined()
      expect(record?.encryptedOpenaiApiKey).not.toBe("")
    })

    it("updates existing OpenAI API key", async () => {
      const asUser = createTestWithUser()

      // Save initial API key
      await asUser.action(api.apiKeysActions.saveOpenaiApiKey, {
        apiKey: "initial-key",
      })

      const record1 = await asUser.query(api.apiKeys.getApiKeysRecord)
      const initialEncrypted = record1?.encryptedOpenaiApiKey

      // Update API key
      await asUser.action(api.apiKeysActions.saveOpenaiApiKey, {
        apiKey: "updated-key",
      })

      const record2 = await asUser.query(api.apiKeys.getApiKeysRecord)
      expect(record2?.encryptedOpenaiApiKey).not.toBe(initialEncrypted)
    })

    it("creates new record if none exists", async () => {
      const asUser = createTestWithUser()

      await asUser.action(api.apiKeysActions.saveOpenaiApiKey, {
        apiKey: "test-key",
      })

      const record = await asUser.query(api.apiKeys.getApiKeysRecord)
      expect(record).not.toBeNull()
      expect(record?.userId).toBeDefined()
    })

    it("throws error when not authenticated", async () => {
      const t = createTestInstance()

      await expect(
        t.mutation(api.apiKeys.saveOpenaiApiKey, {
          encryptedApiKey: "encrypted-key",
        })
      ).rejects.toThrow()
    })
  })

  describe("deleteCursorApiKey", () => {
    it("deletes Cursor API key for authenticated user", async () => {
      const asUser = createTestWithUser()

      // Save API key first
      await asUser.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "test-key",
      })

      // Verify it exists
      const statusBefore = await asUser.query(api.apiKeys.getCursorApiKeyStatus)
      expect(statusBefore.hasKey).toBe(true)

      // Delete API key
      const result = await asUser.mutation(api.apiKeys.deleteCursorApiKey)
      expect(result).toEqual({ success: true })

      // Verify it was deleted
      const statusAfter = await asUser.query(api.apiKeys.getCursorApiKeyStatus)
      expect(statusAfter.hasKey).toBe(false)
    })

    it("succeeds even when no API key exists", async () => {
      const asUser = createTestWithUser()

      const result = await asUser.mutation(api.apiKeys.deleteCursorApiKey)
      expect(result).toEqual({ success: true })
    })

    it("throws error when not authenticated", async () => {
      const t = createTestInstance()

      await expect(
        t.mutation(api.apiKeys.deleteCursorApiKey)
      ).rejects.toThrow()
    })
  })

  describe("deleteOpenaiApiKey", () => {
    it("deletes OpenAI API key for authenticated user", async () => {
      const asUser = createTestWithUser()

      // Save API key first
      await asUser.action(api.apiKeysActions.saveOpenaiApiKey, {
        apiKey: "test-key",
      })

      // Verify it exists
      const statusBefore = await asUser.query(api.apiKeys.getOpenaiApiKeyStatus)
      expect(statusBefore.hasKey).toBe(true)

      // Delete API key
      const result = await asUser.mutation(api.apiKeys.deleteOpenaiApiKey)
      expect(result).toEqual({ success: true })

      // Verify it was deleted
      const statusAfter = await asUser.query(api.apiKeys.getOpenaiApiKeyStatus)
      expect(statusAfter.hasKey).toBe(false)
    })

    it("succeeds even when no API key exists", async () => {
      const asUser = createTestWithUser()

      const result = await asUser.mutation(api.apiKeys.deleteOpenaiApiKey)
      expect(result).toEqual({ success: true })
    })

    it("throws error when not authenticated", async () => {
      const t = createTestInstance()

      await expect(
        t.mutation(api.apiKeys.deleteOpenaiApiKey)
      ).rejects.toThrow()
    })
  })

  describe("deleteAllApiKeys", () => {
    it("deletes all API keys for authenticated user", async () => {
      const asUser = createTestWithUser()

      // Save both API keys
      await asUser.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "cursor-key",
      })
      await asUser.action(api.apiKeysActions.saveOpenaiApiKey, {
        apiKey: "openai-key",
      })

      // Verify they exist
      const cursorStatusBefore = await asUser.query(
        api.apiKeys.getCursorApiKeyStatus
      )
      const openaiStatusBefore = await asUser.query(
        api.apiKeys.getOpenaiApiKeyStatus
      )
      expect(cursorStatusBefore.hasKey).toBe(true)
      expect(openaiStatusBefore.hasKey).toBe(true)

      // Delete all API keys
      const result = await asUser.mutation(api.apiKeys.deleteAllApiKeys)
      expect(result).toEqual({ success: true })

      // Verify record was deleted
      const record = await asUser.query(api.apiKeys.getApiKeysRecord)
      expect(record).toBeNull()
    })

    it("succeeds even when no API keys exist", async () => {
      const asUser = createTestWithUser()

      const result = await asUser.mutation(api.apiKeys.deleteAllApiKeys)
      expect(result).toEqual({ success: true })
    })

    it("throws error when not authenticated", async () => {
      const t = createTestInstance()

      await expect(t.mutation(api.apiKeys.deleteAllApiKeys)).rejects.toThrow()
    })
  })

  describe("multi-user isolation", () => {
    it("isolates API keys per user", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 saves Cursor API key
      await asUser1.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "user1-cursor-key",
      })

      // User 2 saves different Cursor API key
      await asUser2.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "user2-cursor-key",
      })

      // Each user only sees their own API key status
      const user1Status = await asUser1.query(api.apiKeys.getCursorApiKeyStatus)
      const user2Status = await asUser2.query(api.apiKeys.getCursorApiKeyStatus)

      expect(user1Status.hasKey).toBe(true)
      expect(user2Status.hasKey).toBe(true)

      // Verify they have separate records
      const user1Record = await asUser1.query(api.apiKeys.getApiKeysRecord)
      const user2Record = await asUser2.query(api.apiKeys.getApiKeysRecord)

      expect(user1Record?._id).not.toBe(user2Record?._id)
      expect(user1Record?.userId).not.toBe(user2Record?.userId)
    })

    it("allows users to have different API key combinations", async () => {
      const [asUser1, asUser2] = createTestUsers([
        { name: "User 1" },
        { name: "User 2" },
      ])

      // User 1 has only Cursor API key
      await asUser1.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "cursor-key",
      })

      // User 2 has only OpenAI API key
      await asUser2.action(api.apiKeysActions.saveOpenaiApiKey, {
        apiKey: "openai-key",
      })

      // Verify isolation
      const user1CursorStatus = await asUser1.query(
        api.apiKeys.getCursorApiKeyStatus
      )
      const user1OpenaiStatus = await asUser1.query(
        api.apiKeys.getOpenaiApiKeyStatus
      )
      const user2CursorStatus = await asUser2.query(
        api.apiKeys.getCursorApiKeyStatus
      )
      const user2OpenaiStatus = await asUser2.query(
        api.apiKeys.getOpenaiApiKeyStatus
      )

      expect(user1CursorStatus.hasKey).toBe(true)
      expect(user1OpenaiStatus.hasKey).toBe(false)
      expect(user2CursorStatus.hasKey).toBe(false)
      expect(user2OpenaiStatus.hasKey).toBe(true)
    })
  })

  describe("API key independence", () => {
    it("allows saving Cursor API key without OpenAI API key", async () => {
      const asUser = createTestWithUser()

      await asUser.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "cursor-key",
      })

      const cursorStatus = await asUser.query(api.apiKeys.getCursorApiKeyStatus)
      const openaiStatus = await asUser.query(api.apiKeys.getOpenaiApiKeyStatus)

      expect(cursorStatus.hasKey).toBe(true)
      expect(openaiStatus.hasKey).toBe(false)
    })

    it("allows saving OpenAI API key without Cursor API key", async () => {
      const asUser = createTestWithUser()

      await asUser.action(api.apiKeysActions.saveOpenaiApiKey, {
        apiKey: "openai-key",
      })

      const cursorStatus = await asUser.query(api.apiKeys.getCursorApiKeyStatus)
      const openaiStatus = await asUser.query(api.apiKeys.getOpenaiApiKeyStatus)

      expect(cursorStatus.hasKey).toBe(false)
      expect(openaiStatus.hasKey).toBe(true)
    })

    it("allows saving both API keys independently", async () => {
      const asUser = createTestWithUser()

      await asUser.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "cursor-key",
      })
      await asUser.action(api.apiKeysActions.saveOpenaiApiKey, {
        apiKey: "openai-key",
      })

      const cursorStatus = await asUser.query(api.apiKeys.getCursorApiKeyStatus)
      const openaiStatus = await asUser.query(api.apiKeys.getOpenaiApiKeyStatus)

      expect(cursorStatus.hasKey).toBe(true)
      expect(openaiStatus.hasKey).toBe(true)
    })

    it("allows deleting one API key without affecting the other", async () => {
      const asUser = createTestWithUser()

      // Save both API keys
      await asUser.action(api.apiKeysActions.saveCursorApiKey, {
        apiKey: "cursor-key",
      })
      await asUser.action(api.apiKeysActions.saveOpenaiApiKey, {
        apiKey: "openai-key",
      })

      // Delete Cursor API key
      await asUser.mutation(api.apiKeys.deleteCursorApiKey)

      // Verify OpenAI API key still exists
      const cursorStatus = await asUser.query(api.apiKeys.getCursorApiKeyStatus)
      const openaiStatus = await asUser.query(api.apiKeys.getOpenaiApiKeyStatus)

      expect(cursorStatus.hasKey).toBe(false)
      expect(openaiStatus.hasKey).toBe(true)
    })
  })
})
