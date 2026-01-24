"use client"

import { useQuery } from "convex/react"
import { createContext, type ReactNode, useContext } from "react"
import { api } from "@/convex/_generated/api"

interface CursorKeyContextValue {
  hasCursorKey: boolean
  isLoading: boolean
}

const CursorKeyContext = createContext<CursorKeyContextValue | undefined>(
  undefined
)

export function CursorKeyProvider({ children }: { children: ReactNode }) {
  const status = useQuery(api.apiKeys.getCursorApiKeyStatus)

  return (
    <CursorKeyContext.Provider
      value={{
        hasCursorKey: status?.hasKey ?? false,
        isLoading: status === undefined,
      }}
    >
      {children}
    </CursorKeyContext.Provider>
  )
}

export function useCursorKey() {
  const context = useContext(CursorKeyContext)
  if (context === undefined) {
    throw new Error("useCursorKey must be used within CursorKeyProvider")
  }
  return context
}
