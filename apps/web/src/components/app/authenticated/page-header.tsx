
import { useRouter } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  showBack?: boolean
  action?: React.ReactNode
  className?: string
  expandable?: boolean
}

export function PageHeader({
  title,
  showBack = false,
  action,
  className,
  expandable = false,
}: PageHeaderProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top",
        className
      )}
    >
      <div className="flex items-start justify-between min-h-14 px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -ml-2 shrink-0"
              onClick={() => router.history.back()}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <h1
              className={cn(
                "text-lg font-semibold leading-tight flex-1 min-w-0",
                expandable && !isExpanded && "truncate",
                expandable && !isExpanded && "cursor-pointer",
                expandable && isExpanded && "wrap-break-word"
              )}
              onClick={
                expandable && !isExpanded
                  ? () => setIsExpanded(true)
                  : undefined
              }
            >
              {title}
            </h1>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {expandable && isExpanded && (
        <button
          className="absolute inset-0 z-10"
          onClick={() => setIsExpanded(false)}
          aria-label="Collapse title"
        />
      )}
    </header>
  )
}
