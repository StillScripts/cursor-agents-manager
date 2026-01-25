import { useConvexQuery } from "better-convex/react"
import { createContext, type ReactNode, useContext } from "react"
import { api } from "@/convex/_generated/api"

interface GithubKeyContextValue {
  hasGithubKey: boolean
  isLoading: boolean
}

const GithubKeyContext = createContext<GithubKeyContextValue | undefined>(
  undefined
)

export function GithubKeyProvider({ children }: { children: ReactNode }) {
  const status = useConvexQuery(api.apiKeys.getGithubTokenStatus)

  return (
    <GithubKeyContext.Provider
      value={{
        hasGithubKey: status?.hasKey ?? false,
        isLoading: status === undefined,
      }}
    >
      {children}
    </GithubKeyContext.Provider>
  )
}

export function useGithubKey() {
  const context = useContext(GithubKeyContext)
  if (context === undefined) {
    throw new Error("useGithubKey must be used within GithubKeyProvider")
  }
  return context
}
