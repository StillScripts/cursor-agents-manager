"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import type React from "react"
import { useState } from "react"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"

// Cache configuration constants
const FIVE_MINUTES = 5 * 60 * 1000
const TEN_MINUTES = 10 * 60 * 1000

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 5 minutes
            staleTime: FIVE_MINUTES,
            // Keep unused data in cache for 10 minutes
            gcTime: TEN_MINUTES,
            // Refetch when window regains focus
            refetchOnWindowFocus: true,
            // Refetch when component remounts (navigating back to page)
            refetchOnMount: true,
            // Retry failed requests up to 3 times
            retry: 3,
          },
        },
      })
  )

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="theme"
    >
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
