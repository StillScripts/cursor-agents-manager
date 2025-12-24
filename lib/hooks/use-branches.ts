"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "cursor-agent-branches"
const DEFAULT_BRANCHES = ["master"]

export interface Branch {
  name: string
}

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setBranches(JSON.parse(stored))
      } catch {
        setBranches([{ name: DEFAULT_BRANCHES[0] }])
      }
    } else {
      setBranches([{ name: DEFAULT_BRANCHES[0] }])
    }
    setIsLoaded(true)
  }, [])

  const saveBranches = useCallback((newBranches: Branch[]) => {
    setBranches(newBranches)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBranches))
  }, [])

  const addBranch = useCallback(
    (branch: Branch) => {
      const newBranches = [...branches, branch]
      saveBranches(newBranches)
    },
    [branches, saveBranches],
  )

  const removeBranch = useCallback(
    (index: number) => {
      const newBranches = branches.filter((_, i) => i !== index)
      saveBranches(newBranches)
    },
    [branches, saveBranches],
  )

  const updateBranch = useCallback(
    (index: number, branch: Branch) => {
      const newBranches = [...branches]
      newBranches[index] = branch
      saveBranches(newBranches)
    },
    [branches, saveBranches],
  )

  return {
    branches,
    isLoaded,
    addBranch,
    removeBranch,
    updateBranch,
    saveBranches,
  }
}
