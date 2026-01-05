// hooks/useStableQuery.ts

import { useQuery } from "convex/react"
import { useRef } from "react"

export const useStableQuery = ((name, ...args) => {
  const result = useQuery(name, ...args)

  const stored = useRef(result)

  if (result !== undefined) {
    stored.current = result
  }

  // undefined on first load, stale data while reloading, fresh data after loading
  return stored.current
}) as typeof useQuery
