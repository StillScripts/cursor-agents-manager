"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "cursor-agent-repositories"

export interface Repository {
  url: string
  name: string
}

export function useRepositories() {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setRepositories(JSON.parse(stored))
      } catch {
        setRepositories([])
      }
    }
    setIsLoaded(true)
  }, [])

  const saveRepositories = useCallback((repos: Repository[]) => {
    setRepositories(repos)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(repos))
  }, [])

  const addRepository = useCallback(
    (repo: Repository) => {
      const newRepos = [...repositories, repo]
      saveRepositories(newRepos)
    },
    [repositories, saveRepositories],
  )

  const removeRepository = useCallback(
    (index: number) => {
      const newRepos = repositories.filter((_, i) => i !== index)
      saveRepositories(newRepos)
    },
    [repositories, saveRepositories],
  )

  const updateRepository = useCallback(
    (index: number, repo: Repository) => {
      const newRepos = [...repositories]
      newRepos[index] = repo
      saveRepositories(newRepos)
    },
    [repositories, saveRepositories],
  )

  return {
    repositories,
    isLoaded,
    addRepository,
    removeRepository,
    updateRepository,
    saveRepositories,
  }
}
