/**
 * Test setup for React component testing with Bun
 * 
 * This file configures the testing environment for React components.
 * It sets up happy-dom as the DOM implementation and imports testing-library matchers.
 * 
 * Bun automatically uses happy-dom when it's installed, but we configure it here
 * to ensure proper setup for React component testing.
 */

import { afterEach } from "bun:test"
import "@testing-library/jest-dom"
import { cleanup } from "@testing-library/react"

// Configure happy-dom environment if available
if (typeof globalThis.HappyDOM !== "undefined") {
  // Happy-dom is automatically used by Bun when installed
  // No additional configuration needed
}

// Cleanup after each test to prevent test pollution
afterEach(() => {
  cleanup()
})
