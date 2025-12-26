"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

const STORAGE_KEY = "cursor-agent-branches"
const DEFAULT_BRANCHES = ["master"]

export interface Branch {
  name: string
  id?: number
}

interface BranchesResponse {
  branches: Branch[]
}

async function fetchBranches(): Promise<Branch[]> {
  const response = await fetch("/api/user/branches")

  if (!response.ok) {
    // If unauthorized, try to migrate from localStorage
    if (response.status === 401) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return [{ name: DEFAULT_BRANCHES[0] }]
        }
      }
      return [{ name: DEFAULT_BRANCHES[0] }]
    }
    throw new Error("Failed to fetch branches")
  }

  const data: BranchesResponse = await response.json()
  const branches = data.branches || []

  // If no branches, return default
  return branches.length > 0 ? branches : [{ name: DEFAULT_BRANCHES[0] }]
}

async function saveBranches(branchList: Branch[]): Promise<Branch[]> {
  const response = await fetch("/api/user/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branches: branchList }),
  })

  if (!response.ok) {
    throw new Error("Failed to save branches")
  }

  const data: BranchesResponse = await response.json()
  return data.branches || []
}

export function useBranches() {
  const queryClient = useQueryClient()

  const { data: branches = [{ name: DEFAULT_BRANCHES[0] }], isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const mutation = useMutation({
    mutationFn: saveBranches,
    onSuccess: (data) => {
      queryClient.setQueryData(["branches"], data)
      // Clear localStorage after successful migration
      localStorage.removeItem(STORAGE_KEY)
    },
  })

  const saveBranchesMutation = (branchList: Branch[]) => {
    mutation.mutate(branchList)
  }

  return {
    branches,
    isLoaded: !isLoading,
    saveBranches: saveBranchesMutation,
    isLoading,
    isSaving: mutation.isPending,
    error: mutation.error,
  }
}
