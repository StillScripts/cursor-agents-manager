"use client"

import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useStableQuery } from "@/lib/hooks/use-stable-query"

export interface Repository {
  url: string
  name: string
}

export function useRepositories() {
  const repositories = useStableQuery(api.repositories.getRepositories)
  const saveRepositories = useMutation(api.repositories.saveRepositories)

  return {
    repositories,
    isLoading: repositories === undefined,
    hasRepositories: repositories?.some((r) => r.url.trim()),
    saveRepositories: (repos: Repository[]) =>
      saveRepositories({ repositories: repos }),
  }
}
