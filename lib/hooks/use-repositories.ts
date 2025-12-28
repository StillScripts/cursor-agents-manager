"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const STORAGE_KEY = "cursor-agent-repositories"

export interface Repository {
  url: string
  name: string
  id?: number
}

interface RepositoriesResponse {
  repositories: Repository[]
}

async function fetchRepositories(): Promise<Repository[]> {
  const response = await fetch("/api/user/repositories")

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
    }
    throw new Error("Failed to fetch repositories")
  }

  const data: RepositoriesResponse = await response.json()
  return data.repositories || []
}

async function saveRepositories(repos: Repository[]): Promise<Repository[]> {
  const response = await fetch("/api/user/repositories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repositories: repos }),
  })

  if (!response.ok) {
    throw new Error("Failed to save repositories")
  }

  const data: RepositoriesResponse = await response.json()
  return data.repositories || []
}

export function useRepositories() {
  const queryClient = useQueryClient()

  const repositoriesQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: fetchRepositories,
    staleTime: 5 * 60 * 1000,
  })

  const repositoriesMutation = useMutation({
    mutationFn: saveRepositories,
    onSuccess: (data) => {
      queryClient.setQueryData(["repositories"], data)
      // Clear localStorage after successful migration
      localStorage.removeItem(STORAGE_KEY)
    },
  })

  return {
    repositoriesQuery,
    hasRepositories:
      repositoriesQuery.isSuccess &&
      repositoriesQuery.data?.some((r) => r.url.trim()),
    repositoriesMutation,
  }
}
