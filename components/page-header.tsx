"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  showBack?: boolean
  action?: React.ReactNode
  className?: string
  expandable?: boolean
}

export function PageHeader({ title, showBack = false, action, className, expandable = false }: PageHeaderProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top",
        className,
      )}
    >
      <div className="flex items-start justify-between min-h-14 px-4 py-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {showBack && (
            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 shrink-0" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-start gap-1 flex-1 min-w-0">
            <h1
              className={cn(
                "text-lg font-semibold leading-tight",
                expandable && !isExpanded && "truncate",
                expandable && isExpanded && "break-words",
              )}
            >
              {title}
            </h1>
            {expandable && !isExpanded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(true)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {expandable && isExpanded && (
        <button className="absolute inset-0 z-10" onClick={() => setIsExpanded(false)} aria-label="Collapse title" />
      )}
    </header>
  )
}
