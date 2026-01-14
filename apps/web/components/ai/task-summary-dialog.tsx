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
  useGenerateFinalTask,
  useImprovePrompt,
  usePlanTask,
} from "@/lib/hooks/use-ai"
import { cn } from "@/lib/utils"

type DialogMode = "summary" | "plan"

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
  const [mode, setMode] = useState<DialogMode>("summary")
  const [messages, setMessages] = useState<PlanningMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [improvedSummary, setImprovedSummary] = useState<string | null>(null)
  const [suggestedBranchName, setSuggestedBranchName] = useState<
    string | undefined
  >(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const improvePrompt = useImprovePrompt()
  const planTask = usePlanTask()
  const generateFinalTask = useGenerateFinalTask()

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMode("summary")
      setMessages([])
      setInputValue("")
      setImprovedSummary(null)
      setSuggestedBranchName(undefined)
    }
  }, [open])

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

  // Generate initial summary when switching to summary mode
  const handleGenerateSummary = useCallback(async () => {
    if (!currentTask.trim()) return

    try {
      const result = await improvePrompt.mutateAsync(currentTask)
      setImprovedSummary(result.text)
      setSuggestedBranchName(result.branchName)
    } catch (error) {
      console.error("Error generating summary:", error)
    }
  }, [currentTask, improvePrompt])

  // Handle sending a message in plan mode
  const handleSendMessage = async () => {
    if (!inputValue.trim() || planTask.isPending) return

    const userMessage = inputValue.trim()
    setInputValue("")

    // Add user message to chat
    const newMessages: PlanningMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ]
    setMessages(newMessages)

    try {
      const response = await planTask.mutateAsync({
        currentTask,
        messages,
        userMessage,
      })

      // Add assistant response
      setMessages([...newMessages, { role: "assistant", content: response }])
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

  // Generate final task from conversation
  const handleGenerateFinalFromChat = async () => {
    if (messages.length === 0) return

    try {
      const result = await generateFinalTask.mutateAsync({
        originalTask: currentTask,
        messages,
      })
      setImprovedSummary(result.text)
      setSuggestedBranchName(result.branchName)
      setMode("summary")
    } catch (error) {
      console.error("Error generating final task:", error)
    }
  }

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

        {/* Mode Tabs */}
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

        {/* Content Area */}
        <div className="flex-1 min-h-0">
          {mode === "summary" ? (
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
                          Click the button below to generate an AI-improved
                          version of your task.
                        </span>
                        <Button
                          onClick={handleGenerateSummary}
                          disabled={!currentTask.trim()}
                          size="sm"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Summary
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
                  {planTask.isPending && (
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
                  disabled={planTask.isPending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || planTask.isPending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {mode === "plan" && messages.length > 0 && (
            <Button
              variant="outline"
              onClick={handleGenerateFinalFromChat}
              disabled={generateFinalTask.isPending}
              className="flex-1 sm:flex-none"
            >
              {generateFinalTask.isPending ? (
                <Spinner className="h-4 w-4 mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Generate Final
            </Button>
          )}
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
