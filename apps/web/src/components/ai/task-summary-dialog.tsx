import { Sparkles, Wand2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useImprovePrompt } from "@/lib/hooks/use-ai"

interface TaskSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTask: string
  onTaskUpdate: (text: string, branchName?: string) => void
}

export function TaskSummaryDialog({
  open,
  onOpenChange,
  currentTask,
  onTaskUpdate,
}: TaskSummaryDialogProps) {
  const [improvedSummary, setImprovedSummary] = useState<string | null>(null)
  const [suggestedBranchName, setSuggestedBranchName] = useState<
    string | undefined
  >(undefined)
  const [error, setError] = useState<string | null>(null)

  const improvePrompt = useImprovePrompt()

  // Generate improved prompt
  const handleGenerateSummary = useCallback(async () => {
    if (!currentTask.trim()) return

    setError(null)
    try {
      const result = await improvePrompt.mutateAsync({ text: currentTask })
      setImprovedSummary(result.text)
      setSuggestedBranchName(result.branchName)
    } catch (error) {
      console.error("Error generating summary:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to improve prompt. Please try again."
      setError(errorMessage)
    }
  }, [currentTask, improvePrompt])

  // Reset state and auto-generate when dialog opens
  useEffect(() => {
    if (open && currentTask.trim()) {
      setImprovedSummary(null)
      setSuggestedBranchName(undefined)
      setError(null)
      handleGenerateSummary()
    }
  }, [open, currentTask, handleGenerateSummary])

  // Apply the improved task
  const handleApply = () => {
    if (improvedSummary) {
      onTaskUpdate(improvedSummary, suggestedBranchName)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Task Assistant
          </DialogTitle>
          <DialogDescription>
            Improve your task description with AI assistance.
          </DialogDescription>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 min-h-0">
          <div className="space-y-4">
            {/* Original Task */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Original Task
              </label>
              <div className="p-3 bg-muted/50 rounded-lg text-sm border border-border/50 max-h-24 overflow-y-auto">
                {currentTask || (
                  <span className="text-muted-foreground italic">
                    No task description yet
                  </span>
                )}
              </div>
            </div>

            {/* Improved Summary */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                AI-Improved Version
              </label>
              {improvedSummary ? (
                <div className="p-3 bg-primary/5 rounded-lg text-sm border border-primary/20 max-h-40 overflow-y-auto">
                  {improvedSummary}
                </div>
              ) : error ? (
                <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5 flex flex-col items-center gap-3">
                  <span className="text-sm text-destructive text-center">
                    {error}
                  </span>
                  <Button
                    onClick={handleGenerateSummary}
                    disabled={!currentTask.trim() || improvePrompt.isPending}
                    size="sm"
                    variant="outline"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-border rounded-lg flex flex-col items-center gap-3">
                  {improvePrompt.isPending ? (
                    <>
                      <Spinner className="h-5 w-5" />
                      <span className="text-sm text-muted-foreground">
                        Generating improved version...
                      </span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground text-center">
                        Click the button below to get a quick AI-generated
                        improvement on your task description.
                      </span>
                      <Button
                        onClick={handleGenerateSummary}
                        disabled={!currentTask.trim()}
                        size="sm"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Improve Prompt
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Suggested Branch Name */}
            {suggestedBranchName && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Suggested Branch Name
                </label>
                <div className="p-2 bg-muted/50 rounded-lg text-sm font-mono border border-border/50">
                  {suggestedBranchName}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {improvedSummary && (
            <Button onClick={handleApply} className="flex-1 sm:flex-none">
              Apply Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
