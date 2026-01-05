/**
 * Test utilities for React component testing
 * 
 * Provides helper functions for rendering components with common providers
 * and utilities that might be needed across component tests.
 */

import type { ReactElement } from "react"
import { render, type RenderOptions } from "@testing-library/react"

/**
 * Custom render function that wraps components with any necessary providers
 * 
 * @param ui - The React component to render
 * @param options - Additional render options
 * @returns Render result with testing utilities
 * 
 * @example
 * ```tsx
 * const { container } = renderWithProviders(<Card>Test</Card>)
 * expect(container).toHaveTextContent("Test")
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, {
    ...options,
    // Add any global providers here if needed (e.g., ThemeProvider, QueryClientProvider)
    // wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
  })
}

// Re-export everything from @testing-library/react for convenience
export * from "@testing-library/react"
