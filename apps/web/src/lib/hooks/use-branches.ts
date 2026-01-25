import { useConvexMutation } from "better-convex/react"
import { api } from "@/convex/_generated/api"
import { useStableQuery } from "@/lib/hooks/use-stable-query"

export interface Branch {
  name: string
}

export function useBranches() {
  const branches = useStableQuery(api.branches.getBranches)
  const saveBranches = useConvexMutation(api.branches.saveBranches)

  return {
    branches,
    isLoading: branches === undefined,
    hasBranches: branches?.some((b) => b.name.trim()),
    saveBranches: (branchList: Branch[]) =>
      saveBranches({ branches: branchList }),
  }
}
