"use client"

import { useAtomValue } from "jotai"
import { Clock } from "lucide-react"
import { todayEntriesAtom } from "@/lib/atoms"
import { formatDuration, formatTime } from "@/lib/formatting"

export function TodayEntries() {
  const entries = useAtomValue(todayEntriesAtom)

  if (entries.length === 0) return null

  return (
    <div className="w-full max-w-md">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Today&apos;s Sessions
      </h3>
      <div className="space-y-2">
        {entries.slice(0, 5).map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/30 text-sm"
          >
            <div className="flex-1 min-w-0">
              <span className="text-foreground truncate block">
                {entry.title}
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground ml-4">
              <span className="text-xs">
                {formatTime(entry.startTime.toString())}
              </span>
              <span className="font-mono text-foreground">
                {formatDuration(entry.duration)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
