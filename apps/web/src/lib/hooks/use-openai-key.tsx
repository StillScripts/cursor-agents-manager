import { useConvexQuery } from "better-convex/react"
import { createContext, type ReactNode, useContext } from "react"
import { api } from "@/convex/_generated/api"

interface OpenAIKeyContextValue {
  hasOpenAIKey: boolean
  isLoading: boolean
}

const OpenAIKeyContext = createContext<OpenAIKeyContextValue | undefined>(
  undefined
)

export function OpenAIKeyProvider({ children }: { children: ReactNode }) {
  const status = useConvexQuery(api.apiKeys.getOpenaiApiKeyStatus)

  return (
    <OpenAIKeyContext.Provider
      value={{
        hasOpenAIKey: status?.hasKey ?? false,
        isLoading: status === undefined,
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
