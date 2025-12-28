"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const STORAGE_KEY = "cursor-agent-branches"

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
          return []
        }
      }
      return []
    }
    throw new Error("Failed to fetch branches")
  }

  const data: BranchesResponse = await response.json()
  return data.branches || []
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

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const branchesMutation = useMutation({
    mutationFn: saveBranches,
    onSuccess: (data) => {
      queryClient.setQueryData(["branches"], data)
      // Clear localStorage after successful migration
      localStorage.removeItem(STORAGE_KEY)
    },
  })

  return {
    branchesQuery,
    hasBranches:
      branchesQuery.isSuccess && branchesQuery.data?.some((b) => b.name.trim()),
    branchesMutation,
  }
}
