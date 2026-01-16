"use client"

import { FileText, MessageSquare, Send, Sparkles, Wand2 } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import {
  type PlanningMessage,
  useImprovePrompt,
} from "@/lib/hooks/use-ai"
import { cn } from "@/lib/utils"

type DialogMode = "summary" | "plan" | "loading"

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
  const [mode, setMode] = useState<DialogMode>("loading")
  const [messages, setMessages] = useState<PlanningMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [improvedSummary, setImprovedSummary] = useState<string | null>(null)
  const [suggestedBranchName, setSuggestedBranchName] = useState<
    string | undefined
  >(undefined)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const improvePrompt = useImprovePrompt()

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMode("loading")
      setMessages([])
      setInputValue("")
      setImprovedSummary(null)
      setSuggestedBranchName(undefined)
      setIsInitialLoad(true)
    }
  }, [open])

  // Auto-generate summary when dialog opens with task content
  useEffect(() => {
    if (open && isInitialLoad && currentTask.trim()) {
      setIsInitialLoad(false)
      handleAutoGenerateSummary()
    } else if (open && isInitialLoad && !currentTask.trim()) {
      // No task content, go directly to summary mode
      setIsInitialLoad(false)
      setMode("summary")
    }
  }, [open, isInitialLoad, currentTask, handleAutoGenerateSummary])

  // Auto-scroll to bottom when new messages arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally scroll when message count changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages.length])

  // Focus input when switching to plan mode
  useEffect(() => {
    if (mode === "plan" && inputRef.current) {
      inputRef.current.focus()
    }
  }, [mode])

  // Auto-generate summary on load
  const handleAutoGenerateSummary = useCallback(async () => {
    if (!currentTask.trim()) return

    try {
      setMode("loading")
      const result = await improvePrompt.mutateAsync({
        text: currentTask,
        messages: [],
      })

      // Check if questions were returned (plan mode)
      if (result.questions && result.questions.trim()) {
        // Switch to plan mode with questions as first message
        setMode("plan")
        setMessages([
          { role: "assistant", content: result.questions },
        ])
      } else if (result.text) {
        // Summary is ready
        setMode("summary")
        setImprovedSummary(result.text)
        setSuggestedBranchName(result.branchName)
      } else {
        // Fallback to summary mode
        setMode("summary")
      }
    } catch (error) {
      console.error("Error generating summary:", error)
      setMode("summary")
    }
  }, [currentTask, improvePrompt])

  // Handle sending a message in plan mode - retriggers improvePrompt
  const handleSendMessage = async () => {
    if (!inputValue.trim() || improvePrompt.isPending) return

    const userMessage = inputValue.trim()
    setInputValue("")

    // Add user message to chat
    const newMessages: PlanningMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ]
    setMessages(newMessages)

    try {
      // Retrigger improvePrompt with conversation context
      const result = await improvePrompt.mutateAsync({
        text: currentTask,
        messages: newMessages,
      })

      // Check if more questions are needed
      if (result.questions && result.questions.trim()) {
        // Still in plan mode - add assistant questions
        setMessages([
          ...newMessages,
          { role: "assistant", content: result.questions },
        ])
      } else if (result.text) {
        // Summary is ready - switch to summary mode
        setMode("summary")
        setImprovedSummary(result.text)
        setSuggestedBranchName(result.branchName)
      }
    } catch (error) {
      console.error("Error in planning conversation:", error)
      // Remove the user message on error
      setMessages(messages)
    }
  }

  // Handle key press for sending messages
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Manual regenerate summary
  const handleGenerateSummary = useCallback(async () => {
    if (!currentTask.trim()) return

    try {
      setMode("loading")
      const result = await improvePrompt.mutateAsync({
        text: currentTask,
        messages: [],
      })

      if (result.questions && result.questions.trim()) {
        setMode("plan")
        setMessages([{ role: "assistant", content: result.questions }])
      } else if (result.text) {
        setMode("summary")
        setImprovedSummary(result.text)
        setSuggestedBranchName(result.branchName)
      }
    } catch (error) {
      console.error("Error generating summary:", error)
      setMode("summary")
    }
  }, [currentTask, improvePrompt])

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

        {/* Mode Tabs - Hide during loading */}
        {mode !== "loading" && (
          <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
            <button
              type="button"
              onClick={() => setMode("summary")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center",
                mode === "summary"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="w-4 h-4" />
              Summary
            </button>
            <button
              type="button"
              onClick={() => setMode("plan")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center",
                mode === "plan"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Plan
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 min-h-0">
          {mode === "loading" ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Spinner className="h-8 w-8" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Processing your task...
                </p>
                <p className="text-xs text-muted-foreground">
                  Analyzing task description and generating summary
                </p>
              </div>
            </div>
          ) : mode === "summary" ? (
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
                ) : (
                  <div className="p-4 border border-dashed border-border rounded-lg flex flex-col items-center gap-3">
                    <Wand2 className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground text-center">
                      Click the button below to get a quick AI-generated
                      improvement on your task description.
                    </span>
                    <Button
                      onClick={handleGenerateSummary}
                      disabled={!currentTask.trim() || improvePrompt.isPending}
                      size="sm"
                    >
                      {improvePrompt.isPending ? (
                        <Spinner className="h-4 w-4 mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Quick Summary
                    </Button>
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
          ) : (
            <div className="flex flex-col h-64">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 pb-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Start a conversation to refine your task.</p>
                      <p className="text-xs mt-1">
                        Ask questions or discuss requirements with the AI.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex",
                          msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] px-3 py-2 rounded-lg text-sm",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  {improvePrompt.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-muted px-3 py-2 rounded-lg">
                        <Spinner className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="flex gap-2 pt-3 border-t">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={improvePrompt.isPending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || improvePrompt.isPending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {mode === "summary" && improvedSummary && (
            <Button onClick={handleApply} className="flex-1 sm:flex-none">
              Apply Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
