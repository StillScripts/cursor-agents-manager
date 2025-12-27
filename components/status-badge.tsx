import type { AgentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: AgentStatus
}

const statusConfig: Record<
  AgentStatus,
  { label: string; className: string; dotClass: string }
> = {
  RUNNING: {
    label: "Running",
    className: "bg-success/15 text-success",
    dotClass: "bg-success animate-pulse",
  },
  FINISHED: {
    label: "Finished",
    className: "bg-primary/15 text-primary",
    dotClass: "bg-primary",
  },
  ERROR: {
    label: "Error",
    className: "bg-destructive/15 text-destructive",
    dotClass: "bg-destructive",
  },
  CREATING: {
    label: "Creating",
    className: "bg-warning/15 text-warning",
    dotClass: "bg-warning animate-pulse",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        config.className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  )
}
