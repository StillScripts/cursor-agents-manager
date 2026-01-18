"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { useEffect } from "react"
import { PageHeader } from "@/app/(authenticated)/_components/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error("Authenticated route error:", error)
  }, [error])

  return (
    <>
      <PageHeader title="Error" />
      <div className="p-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <CardTitle>Something went wrong</CardTitle>
                <CardDescription className="mt-1">
                  An error occurred while loading this page
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We encountered an error while loading this page. Please try
              refreshing or navigate back to continue.
            </p>
            {error.message && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {error.message}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={reset} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = "/agents"
                }}
                className="flex-1"
              >
                Go to agents
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
