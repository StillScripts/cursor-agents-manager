// hooks/useStableQuery.ts

import { useQuery } from "convex/react"
import { useRef } from "react"

export const useStableQuery = ((name, ...args) => {
  const result = useQuery(name, ...args)
  // Initialize ref to undefined, not with result, to avoid issues on remount
  const stored = useRef<typeof result>(undefined)

  // Update stored value whenever we get a defined result
  if (result !== undefined) {
    stored.current = result
  }

  // Return stored value (last known good value) if available,
  // otherwise return current result (which may be undefined on first load)
  // This ensures we don't lose data during refetches or remounts
  return stored.current !== undefined ? stored.current : result
}) as typeof useQuery
