import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export interface TimeEntry {
  id: string
  title: string
  description?: string
  startTime: number
  endTime?: number
  duration: number
}

export interface ActiveTimer {
  title: string
  description?: string
  startTime: number
}

// Persisted atoms using localStorage
export const timeEntriesAtom = atomWithStorage<TimeEntry[]>(
  "chrono-entries",
  []
)
export const activeTimerAtom = atomWithStorage<ActiveTimer | null>(
  "chrono-active",
  null
)

// UI state atoms
export const viewAtom = atom<"timer" | "tasks">("timer")
export const taskInputAtom = atom("")
export const descriptionInputAtom = atom("")

// Derived atoms
export const uniqueTasksAtom = atom((get) => {
  const entries = get(timeEntriesAtom)
  const taskMap = new Map<
    string,
    {
      title: string
      description?: string
      totalDuration: number
      lastUsed: number
    }
  >()

  entries.forEach((entry) => {
    const existing = taskMap.get(entry.title)
    if (existing) {
      existing.totalDuration += entry.duration
      existing.lastUsed = Math.max(existing.lastUsed, entry.startTime)
    } else {
      taskMap.set(entry.title, {
        title: entry.title,
        description: entry.description,
        totalDuration: entry.duration,
        lastUsed: entry.startTime,
      })
    }
  })

  return Array.from(taskMap.values()).sort((a, b) => b.lastUsed - a.lastUsed)
})

export const tasksWithEntriesAtom = atom((get) => {
  const entries = get(timeEntriesAtom)
  const taskMap = new Map<
    string,
    {
      title: string
      description?: string
      totalDuration: number
      lastUsed: number
      entries: TimeEntry[]
    }
  >()

  entries.forEach((entry) => {
    const existing = taskMap.get(entry.title)
    if (existing) {
      existing.totalDuration += entry.duration
      existing.lastUsed = Math.max(existing.lastUsed, entry.startTime)
      existing.entries.push(entry)
    } else {
      taskMap.set(entry.title, {
        title: entry.title,
        description: entry.description,
        totalDuration: entry.duration,
        lastUsed: entry.startTime,
        entries: [entry],
      })
    }
  })

  // Sort entries within each task by most recent first
  taskMap.forEach((task) => {
    task.entries.sort((a, b) => b.startTime - a.startTime)
  })

  return Array.from(taskMap.values()).sort((a, b) => b.lastUsed - a.lastUsed)
})

export const todayEntriesAtom = atom((get) => {
  const entries = get(timeEntriesAtom)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()

  return entries
    .filter((entry) => entry.startTime >= todayStart)
    .sort((a, b) => b.startTime - a.startTime)
})

export const todayTotalAtom = atom((get) => {
  const todayEntries = get(todayEntriesAtom)
  return todayEntries.reduce((total, entry) => total + entry.duration, 0)
})
