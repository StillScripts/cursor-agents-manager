import { useConvexAction } from "better-convex/react"
import { useCallback, useEffect, useState } from "react"
import { api } from "@/convex/_generated/api"

interface ModelsState {
  data: string[] | undefined
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
}

export function useModels() {
  const [state, setState] = useState<ModelsState>({
    data: undefined,
    isLoading: true,
    isSuccess: false,
    error: null,
  })

  const getModels = useConvexAction(api.cursor.getModels)

  const fetchModels = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const result = await getModels()
      setState({
        data: result.models,
        isLoading: false,
        isSuccess: true,
        error: null,
      })
    } catch (err) {
      setState({
        data: undefined,
        isLoading: false,
        isSuccess: false,
        error: err instanceof Error ? err : new Error("Failed to fetch models"),
      })
    }
  }, [getModels])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  return {
    modelsQuery: state,
    hasModels: state.isSuccess && state.data && state.data.length > 0,
  }
}
