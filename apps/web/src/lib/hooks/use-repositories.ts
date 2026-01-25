import { useConvexMutation } from "better-convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useStableQuery } from "@/lib/hooks/use-stable-query"

export interface Repository {
  _id: Id<"repositories">
  url: string
  name: string
}

export function useRepositories() {
  const repositories = useStableQuery(api.repositories.getRepositories)
  const saveRepositories = useConvexMutation(api.repositories.saveRepositories)

  return {
    repositories,
    isLoading: repositories === undefined,
    hasRepositories: repositories?.some((r) => r.url.trim()),
    saveRepositories: (repos: Repository[]) =>
      saveRepositories({ repositories: repos }),
  }
}
