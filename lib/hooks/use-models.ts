"use client"

import { useQuery } from "@tanstack/react-query"

interface ModelsResponse {
  models: string[]
  simulation?: boolean
}

async function fetchModels(): Promise<string[]> {
  const response = await fetch("/api/models")

  if (!response.ok) {
    throw new Error("Failed to fetch models")
  }

  const data: ModelsResponse = await response.json()
  return data.models || []
}

export function useModels() {
  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: fetchModels,
    staleTime: 60 * 60 * 1000, // 1 hour - models don't change frequently
  })

  return {
    modelsQuery,
    hasModels:
      modelsQuery.isSuccess && modelsQuery.data && modelsQuery.data.length > 0,
  }
}
