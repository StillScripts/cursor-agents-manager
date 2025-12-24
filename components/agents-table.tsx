"use client"

import { useState } from "react"
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Bot } from "lucide-react"
import { useAgents } from "@/lib/hooks/use-agents"
import { AgentCard } from "./agent-card"
import { SimulationBanner } from "./simulation-banner"
import { PageHeader } from "./page-header"
import { AgentListSkeleton } from "./agent-list-skeleton"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { Agent } from "@/lib/types"

const columns: ColumnDef<Agent>[] = [
  {
    accessorKey: "agent",
    cell: ({ row }) => <AgentCard agent={row.original} />,
  },
]

export function AgentsTable() {
  const [page, setPage] = useState(0)
  const limit = 20

  const { data, isLoading, error, isFetching } = useAgents(page, limit)

  const table = useReactTable({
    data: data?.agents ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalPages ?? 0,
    state: {
      pagination: {
        pageIndex: page,
        pageSize: limit,
      },
    },
  })

  const canPreviousPage = page > 0
  const canNextPage = data ? page < data.totalPages - 1 : false

  if (isLoading) {
    return <AgentListSkeleton />
  }

  return (
    <>
      <PageHeader title="Your Agents" />
      {data?.simulation && <SimulationBanner />}

      <div className="flex-1 overflow-auto">
        <div className="px-3 py-2">
          {error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-destructive mb-2">Failed to load agents</p>
              <p className="text-sm text-muted-foreground">Please try again later</p>
            </div>
          )}

          {data?.agents && data.agents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-1">No agents yet</p>
              <p className="text-sm text-muted-foreground">Launch your first agent to get started</p>
            </div>
          )}

          {data?.agents && data.agents.length > 0 && (
            <>
              <div className="space-y-2">
                {table.getRowModel().rows.map((row) => (
                  <div key={row.id}>
                    {flexRender(row.getVisibleCells()[0].column.columnDef.cell, row.getVisibleCells()[0].getContext())}
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between py-4 border-t border-border mt-4">
                <div className="text-xs text-muted-foreground">
                  {isFetching && !isLoading ? (
                    <span className="flex items-center gap-1.5">
                      <Spinner className="h-3 w-3" />
                      Refreshing...
                    </span>
                  ) : (
                    <span>
                      Page {page + 1} of {data.totalPages} ({data.total} agents)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={!canPreviousPage || isFetching}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!canNextPage || isFetching}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
