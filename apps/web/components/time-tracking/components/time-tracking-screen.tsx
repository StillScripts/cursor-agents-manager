"use client"

import { useAtomValue } from "jotai"
import { TaskList } from "@/components/time-tracking/components/task-list"
import { Navigation } from "@/components/time-tracking/components/time-tracking-tabs"
import { TimerDisplay } from "@/components/time-tracking/components/timer-display"
import { TodayEntries } from "@/components/time-tracking/components/today-entries"
import { Separator } from "@/components/ui/separator"
import { viewAtom } from "@/lib/atoms"
import { cn } from "@/lib/utils"

export function TimeTrackingScreen() {
  const view = useAtomValue(viewAtom)

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between p-6">
        <h1 className="text-xl font-semibold tracking-tight">
          {view === "timer" ? "Track New Task" : "Your Tasks"}
        </h1>
        <Navigation />
      </div>
      <Separator />

      <div className="flex-1 p-6 relative">
        {/* Timer view - conditionally visible */}
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-12 pt-12 md:pt-20",
            view !== "timer" && "hidden"
          )}
        >
          <TimerDisplay />
          <TodayEntries />
        </div>

        {/* Tasks view - always mounted but conditionally visible to keep queries active */}
        <div
          className={cn(
            "max-w-2xl mx-auto",
            view !== "tasks" && "hidden"
          )}
        >
          <TaskList />
        </div>
      </div>
    </main>
  )
}
