import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "./page-header"

export const AgentCardSkeleton = () => {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-4 w-4 rounded" />
      </div>
    </div>
  )
}

export function AgentListSkeleton() {
  const refreshButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      disabled
      aria-label="Refresh agents"
    >
      <RefreshCw className="h-4 w-4 animate-spin" />
    </Button>
  )

  return (
    <>
      <PageHeader title="Your Agents" action={refreshButton} />
      <div className="px-3 py-2">
        {/* Simulation banner skeleton */}
        <Skeleton className="h-10 w-full rounded-lg mb-3" />

        {/* Agent cards skeleton */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </>
  )
}
