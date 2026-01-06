"use client"

import { useQuery } from "@tanstack/react-query"
import { useAction } from "convex/react"
import { createContext, useContext, type ReactNode } from "react"
import { api } from "@/convex/_generated/api"

interface OpenAIKeyContextValue {
  hasOpenAIKey: boolean
  isLoading: boolean
  refetch: () => void
}

const OpenAIKeyContext = createContext<OpenAIKeyContextValue | undefined>(
  undefined
)

export function OpenAIKeyProvider({ children }: { children: ReactNode }) {
  const getOpenaiApiKeyStatus = useAction(
    api.apiKeysActions.getOpenaiApiKeyStatus
  )

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["openai-api-key-status"],
    queryFn: async () => {
      const status = await getOpenaiApiKeyStatus()
      return status
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  const hasOpenAIKey = data?.hasKey ?? false

  return (
    <OpenAIKeyContext.Provider
      value={{
        hasOpenAIKey,
        isLoading,
        refetch: () => {
          refetch()
        },
      }}
    >
      {children}
    </OpenAIKeyContext.Provider>
  )
}

export function useOpenAIKey() {
  const context = useContext(OpenAIKeyContext)
  if (context === undefined) {
    throw new Error("useOpenAIKey must be used within OpenAIKeyProvider")
  }
  return context
}
