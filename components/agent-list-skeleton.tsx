import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "./page-header"

export function AgentListSkeleton() {
  return (
    <>
      <PageHeader title="Your Agents" />
      <div className="px-3 py-2">
        {/* Simulation banner skeleton */}
        <Skeleton className="h-10 w-full rounded-lg mb-3" />

        {/* Agent cards skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-3">
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
          ))}
        </div>

        {/* Pagination skeleton */}
        <div className="flex items-center justify-between py-4 border-t border-border mt-4">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    </>
  )
}
