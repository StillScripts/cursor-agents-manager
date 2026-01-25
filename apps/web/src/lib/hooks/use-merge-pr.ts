import { useConvexAction } from "better-convex/react"
import { useState } from "react"
import { api } from "@/convex/_generated/api"

type MergeMethod = "merge" | "squash" | "rebase"

interface MergeResult {
  success: boolean
  message: string
  sha?: string
}

export function useMergePullRequest() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MergeResult | null>(null)
  const mergePrAction = useConvexAction(api.github.mergePullRequest)

  const mergePr = async (
    prUrl: string,
    mergeMethod: MergeMethod = "squash"
  ): Promise<MergeResult | null> => {
    setIsPending(true)
    setError(null)
    setResult(null)

    try {
      const mergeResult = await mergePrAction({ prUrl, mergeMethod })
      setResult(mergeResult)
      return mergeResult
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to merge pull request"
      setError(errorMessage)
      return null
    } finally {
      setIsPending(false)
    }
  }

  const reset = () => {
    setError(null)
    setResult(null)
  }

  return { mergePr, isPending, error, result, reset }
}
