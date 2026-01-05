"use client"

import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export interface Branch {
  name: string
}

export function useBranches() {
  const branches = useQuery(api.branches.getBranches)
  const saveBranches = useMutation(api.branches.saveBranches)

  return {
    branches,
    isLoading: branches === undefined,
    hasBranches: branches?.some((b) => b.name.trim()),
    saveBranches: (branchList: Branch[]) =>
      saveBranches({ branches: branchList }),
  }
}
