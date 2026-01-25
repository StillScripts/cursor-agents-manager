import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ConvexProvider } from "better-convex/react"
import { ConvexReactClient } from "convex/react"
import { Provider as JotaiProvider } from "jotai"
import type React from "react"
import { useState } from "react"
import { authClient } from "@/lib/better-auth/auth-client"
import { CursorKeyProvider } from "@/lib/hooks/use-cursor-key"
import { GithubKeyProvider } from "@/lib/hooks/use-github-key"
import { OpenAIKeyProvider } from "@/lib/hooks/use-openai-key"
import { ThemeProvider } from "@/lib/theme-provider"

// Cache configuration constants
const FIVE_MINUTES = 5 * 60 * 1000
const TEN_MINUTES = 10 * 60 * 1000

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!)

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
    <ThemeProvider>
      <JotaiProvider>
        <ConvexBetterAuthProvider
          client={convex}
          authClient={authClient}
          initialToken={initialToken}
        >
          <ConvexProvider client={convex} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <CursorKeyProvider>
                <OpenAIKeyProvider>
                  <GithubKeyProvider>{children}</GithubKeyProvider>
                </OpenAIKeyProvider>
              </CursorKeyProvider>
            </QueryClientProvider>
          </ConvexProvider>
        </ConvexBetterAuthProvider>
      </JotaiProvider>
    </ThemeProvider>
  )
}
