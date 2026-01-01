/**
 * Tests for Next.js middleware proxy function
 *
 * Tests cover:
 * - Route protection for (authenticated) routes
 * - Access control for (unauthenticated) routes
 * - Redirect behavior for authenticated/unauthenticated users
 * - API auth routes access
 * - Static file handling
 *
 * Run with: bun test --preload ./app/api/_lib/__tests__/preload.ts proxy.test.ts
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { NextRequest } from "next/server"
import { getMockState, resetMockState } from "./app/api/_lib/__tests__/setup"

// Import proxy function (auth is already mocked in preload.ts)
import { proxy } from "./proxy"

describe("Next.js Middleware Proxy - Authentication", () => {
  beforeEach(() => {
    resetMockState()
  })

  afterEach(() => {
    resetMockState()
  })

  // ==========================================================================
  // Helper: Create NextRequest
  // ==========================================================================

  function createRequest(
    pathname: string,
    options: { headers?: HeadersInit } = {}
  ): NextRequest {
    const url = new URL(pathname, "http://localhost:3000")
    const headers = new Headers(options.headers || {})
    return new NextRequest(url, { headers })
  }

  // ==========================================================================
  // (authenticated) Routes - Should Require Authentication
  // ==========================================================================

  describe("(authenticated) routes", () => {
    it("allows access when user has valid session", async () => {
      const state = getMockState()
      state.authenticated = true

      const request = createRequest("/")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to /account when user has valid session", async () => {
      const state = getMockState()
      state.authenticated = true

      const request = createRequest("/account")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to /settings when user has valid session", async () => {
      const state = getMockState()
      state.authenticated = true

      const request = createRequest("/settings")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to /agent/[id] when user has valid session", async () => {
      const state = getMockState()
      state.authenticated = true

      const request = createRequest("/agent/bc_agent123")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it("redirects to /login when user has no session", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/")
      const response = await proxy(request)

      expect(response.status).toBe(307) // Temporary redirect
      const location = response.headers.get("location")
      expect(location).toContain("/login")
      expect(location).toContain("callbackUrl=%2F")
    })

    it("redirects to /login with callbackUrl when accessing protected route", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/account")
      const response = await proxy(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("location")
      expect(location).toContain("/login")
      expect(location).toContain("callbackUrl=%2Faccount")
    })

    it("redirects to /login with callbackUrl for nested protected routes", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/agent/bc_agent123")
      const response = await proxy(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("location")
      expect(location).toContain("/login")
      expect(location).toContain("callbackUrl=%2Fagent%2Fbc_agent123")
    })
  })

  // ==========================================================================
  // (unauthenticated) Routes - Should Not Require Authentication
  // ==========================================================================

  describe("(unauthenticated) routes", () => {
    it("allows access to /login when user has no session", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/login")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to /signup when user has no session", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/signup")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it("redirects authenticated user from /login to home", async () => {
      const state = getMockState()
      state.authenticated = true

      const request = createRequest("/login")
      const response = await proxy(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("location")
      expect(location).toBe("http://localhost:3000/")
    })

    it("redirects authenticated user from /signup to home", async () => {
      const state = getMockState()
      state.authenticated = true

      const request = createRequest("/signup")
      const response = await proxy(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("location")
      expect(location).toBe("http://localhost:3000/")
    })
  })

  // ==========================================================================
  // API Routes
  // ==========================================================================

  describe("API routes", () => {
    it("allows access to /api/auth/* without authentication", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/api/auth/sign-in")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to /api/auth/* with authentication", async () => {
      const state = getMockState()
      state.authenticated = true

      const request = createRequest("/api/auth/sign-in")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it("protects /api/agents when user has no session", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/api/agents")
      const response = await proxy(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("location")
      expect(location).toContain("/login")
      expect(location).toContain("callbackUrl=%2Fapi%2Fagents")
    })

    it("allows access to /api/agents when user has valid session", async () => {
      const state = getMockState()
      state.authenticated = true

      const request = createRequest("/api/agents")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })
  })

  // ==========================================================================
  // Static Files and Public Routes
  // ==========================================================================

  describe("static files and public routes", () => {
    it("allows access to /_next/static files", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/_next/static/chunks/main.js")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to /manifest.json", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/manifest.json")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to files with extensions (static assets)", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/icon.svg")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to image files", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/placeholder.jpg")
      const response = await proxy(request)

      expect(response.status).toBe(200)
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("edge cases", () => {
    it("handles query parameters in callbackUrl correctly", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/account?tab=settings")
      const response = await proxy(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("location")
      expect(location).toContain("/login")
      expect(location).toContain("callbackUrl=%2Faccount%3Ftab%3Dsettings")
    })

    it("handles nested paths correctly", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/agent/bc_123/conversation")
      const response = await proxy(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("location")
      expect(location).toContain("/login")
      expect(location).toContain(
        "callbackUrl=%2Fagent%2Fbc_123%2Fconversation"
      )
    })

    it("handles root path correctly when unauthenticated", async () => {
      const state = getMockState()
      state.authenticated = false

      const request = createRequest("/")
      const response = await proxy(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("location")
      expect(location).toContain("/login")
      expect(location).toContain("callbackUrl=%2F")
    })
  })
})
