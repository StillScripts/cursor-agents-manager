import { Link, useLocation } from "@tanstack/react-router"
import { formatDuration } from "helpers"
import { Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { useActiveTimeLog } from "@/lib/hooks/use-time-logs"

export function GlobalTimerBanner() {
  const location = useLocation()
  const pathname = location.pathname
  const { activeTimeLog, hasActiveTask } = useActiveTimeLog()
  const [elapsed, setElapsed] = useState(0)

  // Update elapsed time every second
  useEffect(() => {
    if (!activeTimeLog) {
      setElapsed(0)
      return
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - activeTimeLog.startTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [activeTimeLog])

  // Hide banner on tasks page or when no active timer
  if (pathname === "/tasks" || !hasActiveTask || !activeTimeLog) {
    return null
  }

  return (
    <Link
      to="/tasks"
      className="bg-primary/10 mb-2 rounded px-4 py-2 flex items-center gap-3 hover:bg-primary/15 transition-colors"
    >
      <Clock className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary font-mono">
            {formatDuration(elapsed)}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-medium text-foreground truncate">
            {activeTimeLog.task.title}
          </span>
        </div>
        {activeTimeLog.task.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {activeTimeLog.task.description}
          </p>
        )}
      </div>
      <span className="text-xs text-primary shrink-0">View →</span>
    </Link>
  )
}
