import { describe, expect, it } from "vitest"
import { cn, handleResponse } from "@/lib/utils"

describe("utils", () => {
  describe("cn", () => {
    it("combines class names", () => {
      const result = cn("bg-red-500", "text-white")
      expect(result).toBe("bg-red-500 text-white")
    })
  })

  describe("handleResponse", () => {
    it("handles a successful response", async () => {
      const response = new Response("Hello, world!", { status: 200 })
      const result = await handleResponse(response)
      expect(result).toBe("Hello, world!")
    })

    it("throws an error for a failed response", async () => {
      const response = new Response("Error", { status: 500 })
      await expect(handleResponse(response)).rejects.toThrow(
        "Failed to fetch data"
      )
    })
  })
})
