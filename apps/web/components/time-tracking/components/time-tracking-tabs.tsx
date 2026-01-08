"use client"

import { useAtom } from "jotai"
import { ListTodo, Timer } from "lucide-react"
import { viewAtom } from "@/lib/atoms"
import { cn } from "@/lib/utils"

export function Navigation() {
  const [view, setView] = useAtom(viewAtom)

  return (
    <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
      <button
        onClick={() => setView("timer")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          view === "timer"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Timer className="w-4 h-4" />
        Timer
      </button>
      <button
        onClick={() => setView("tasks")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          view === "tasks"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <ListTodo className="w-4 h-4" />
        Tasks
      </button>
    </div>
  )
}
