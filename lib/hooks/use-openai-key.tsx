"use client"

import { useAction } from "convex/react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
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
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      const status = await getOpenaiApiKeyStatus()
      setHasOpenAIKey(status.hasKey)
    } catch (error) {
      console.error("Failed to fetch OpenAI API key status:", error)
      setHasOpenAIKey(false)
    } finally {
      setIsLoading(false)
    }
  }, [getOpenaiApiKeyStatus])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return (
    <OpenAIKeyContext.Provider
      value={{
        hasOpenAIKey,
        isLoading,
        refetch: fetchStatus,
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
