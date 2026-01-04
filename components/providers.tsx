"use client"

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConvexReactClient } from "convex/react"
import { ThemeProvider } from "next-themes"
import type React from "react"
import { useState } from "react"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { authClient } from "@/lib/better-auth/auth-client"

// Cache configuration constants
const FIVE_MINUTES = 5 * 60 * 1000
const TEN_MINUTES = 10 * 60 * 1000

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function Providers({
  children,
  initialToken,
}: {
  children: React.ReactNode
  initialToken?: string | null
}) {
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
      <ConvexBetterAuthProvider
        client={convex}
        authClient={authClient}
        initialToken={initialToken}
      >
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            {children}
            <ToastViewport />
          </ToastProvider>
        </QueryClientProvider>
      </ConvexBetterAuthProvider>
    </ThemeProvider>
  )
}
