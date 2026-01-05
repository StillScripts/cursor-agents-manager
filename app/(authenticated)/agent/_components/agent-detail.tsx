"use client"

import {
  Bot,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  Send,
  Sparkles,
  StopCircle,
  Trash2,
  User,
  Volume2,
  Wrench,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { PageHeader } from "@/app/(authenticated)/_components/page-header"
import { SimulationBanner } from "@/app/(authenticated)/_components/simulation-banner"
import { StatusBadge } from "@/app/(authenticated)/_components/status-badge"
import { TextareaWithVoice } from "@/components/ai/textarea-with-voice"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { filterMessagesForDisplay } from "@/lib/conversation-utils"
import { formatDurationMs, formatRelativeTime } from "@/lib/formatting"
import {
  useAgent,
  useAgentConversation,
  useDeleteAgent,
  useSendFollowUp,
  useStopAgent,
} from "@/lib/hooks/use-agents"
import { useSummarizeConversation, useTextToSpeech } from "@/lib/hooks/use-ai"
import { useAgentTimeLogs, useSaveTimeLog } from "@/lib/hooks/use-time-logs"
import { useTimeTracking } from "@/lib/hooks/use-time-tracking"
import type { Agent, AgentConversation } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AgentDetailProps {
  agentId: string
  initialAgent?: (Agent & { simulation: boolean }) | null
  initialConversation?: (AgentConversation & { simulation: boolean }) | null
}

export function AgentDetail({
  agentId,
  initialAgent,
  initialConversation,
}: AgentDetailProps) {
  const router = useRouter()
  const [followUpMessage, setFollowUpMessage] = useState("")
  const [openItems, setOpenItems] = useState<string[]>(["summary"])
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [showThinkingProcess, setShowThinkingProcess] = useState(false)

  const { data: agent, isLoading: agentLoading } = useAgent(
    agentId,
    initialAgent
  )
  const { data: conversation, isLoading: conversationLoading } =
    useAgentConversation(agentId, initialConversation)
  const { timeLogs } = useAgentTimeLogs(agentId)
  const { saveTimeLog } = useSaveTimeLog()
  const stopAgent = useStopAgent()
  const deleteAgent = useDeleteAgent()
  const sendFollowUp = useSendFollowUp()
  const summarizeConversation = useSummarizeConversation()
  const textToSpeech = useTextToSpeech()

  // Audio player state
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Load summary from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = `agent-summary-${agentId}`
      const stored = localStorage.getItem(key)
      if (stored) {
        setAiSummary(stored)
        setShowSummary(true)
      }
    }
  }, [agentId])

  // Update summary when mutation succeeds
  useEffect(() => {
    if (summarizeConversation.isSuccess && summarizeConversation.data) {
      setAiSummary(summarizeConversation.data.summary)
      setShowSummary(true)
    }
  }, [summarizeConversation.isSuccess, summarizeConversation.data])

  // Cleanup blob URLs when component unmounts or audioUrl changes
  useEffect(() => {
    return () => {
      if (audioUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // Time tracking for conversation review (auto-start on mount)
  const timeTracking = useTimeTracking()

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only want to start once on mount
  useEffect(() => {
    timeTracking.start()
  }, [])

  const handleStop = async () => {
    await stopAgent.mutateAsync(agentId)
  }

  const handleDelete = async () => {
    await deleteAgent.mutateAsync(agentId)
    router.push("/")
  }

  const handleSendFollowUp = async () => {
    if (!followUpMessage.trim()) return

    // Capture start time before sending
    const startTime = timeTracking.startsAt

    await sendFollowUp.mutateAsync({ id: agentId, message: followUpMessage })
    setFollowUpMessage("")

    // Save time log after successful follow-up
    if (startTime) {
      try {
        await saveTimeLog({
          agentId,
          activityType: "conversation_review",
          startTime,
        })
        // Reset timer after saving
        timeTracking.stop()
        timeTracking.start()
      } catch (error) {
        console.error("Failed to save time log:", error)
      }
    }
  }

  const handleSummarize = async () => {
    try {
      await summarizeConversation.mutateAsync(agentId)
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to summarize conversation"
      console.error(errorMessage)
    }
  }

  const handleListenToSummary = async () => {
    if (!aiSummary) return

    try {
      const url = await textToSpeech.mutateAsync({ text: aiSummary })
      setAudioUrl(url)
    } catch (error) {
      console.error("Error generating audio:", error)
    }
  }

  // Only show loading if we don't have initial data and query is loading
  if (!initialAgent && agentLoading) {
    return (
      <>
        <PageHeader title="Agent" showBack />
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </>
    )
  }

  if (!agent) {
    return (
      <>
        <PageHeader title="Agent" showBack />
        <div className="flex flex-col items-center justify-center py-20 text-center p-4">
          <p className="text-destructive">Agent not found</p>
        </div>
      </>
    )
  }

  const repoName = agent.source.repository.split("/").slice(-2).join("/")
  const canStop = agent.status === "RUNNING" || agent.status === "CREATING"
  const canSendFollowUp =
    agent.status === "RUNNING" ||
    agent.status === "FINISHED" ||
    agent.status === "ERROR"

  // Calculate total time spent from time logs (duration = endTime - startTime)
  // Falls back to createdAt if endTime is undefined (for future "ongoing" task support)
  const totalTimeSpent = timeLogs?.reduce((total, log) => {
    const start = log.startTime
    const end = log.endTime ?? log.createdAt
    return total + (end - start)
  }, 0)

  return (
    <>
      <PageHeader title={agent.name} showBack expandable />
      {agent.simulation && <SimulationBanner />}

      <div className="p-4 space-y-4">
        <Accordion value={openItems} onValueChange={setOpenItems}>
          <AccordionItem
            value="summary"
            className="border border-border rounded-xl mb-3 overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 bg-card hover:no-underline">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">Summary</span>
                <StatusBadge status={agent.status} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="bg-card">
              <div className="px-4 pb-4 space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span suppressHydrationWarning>
                    Created{" "}
                    {formatRelativeTime(agent.createdAt, { addSuffix: true })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm py-2 px-3 bg-primary/10 rounded-lg border border-primary/20">
                  <Clock className="h-4 w-4 text-primary" />
                  {typeof totalTimeSpent === "number" && totalTimeSpent > 0 ? (
                    <>
                      <span className="text-muted-foreground">Time spent:</span>
                      <span className="text-foreground font-medium">
                        {formatDurationMs(totalTimeSpent)}
                      </span>
                    </>
                  ) : (
                    <Skeleton className="h-4 w-28" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Repository:</span>
                    <span className="text-foreground truncate">{repoName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Branch:</span>
                    <span className="text-foreground truncate">
                      {agent.target.branchName || agent.source.ref}
                    </span>
                  </div>

                  {agent.target.prUrl && (
                    <a
                      href={agent.target.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Pull Request
                    </a>
                  )}
                </div>

                {agent.summary && (
                  <p className="text-sm text-muted-foreground pt-3 border-t border-border">
                    {agent.summary}
                  </p>
                )}

                {/* AI-Generated Summary */}
                {aiSummary && showSummary && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        AI Summary
                      </span>
                    </div>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {aiSummary}
                    </ReactMarkdown>
                    {audioUrl && (
                      <div className="mt-3">
                        {/* biome-ignore lint/a11y/useMediaCaption: Audio is text-to-speech of summary already displayed above */}
                        <audio
                          ref={audioRef}
                          controls
                          className="w-full"
                          src={audioUrl}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Summary Action Buttons */}
                {conversation && conversation.messages.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setShowThinkingProcess(!showThinkingProcess)
                      }
                    >
                      {showThinkingProcess ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Hide Thinking Process
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Show Thinking Process
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSummarize}
                      disabled={summarizeConversation.isPending}
                    >
                      {summarizeConversation.isPending ? (
                        <Spinner className="h-4 w-4 mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {aiSummary ? "Regenerate Summary" : "Summarize"}
                    </Button>
                    {aiSummary && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSummary(!showSummary)}
                        >
                          {showSummary ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Hide Summary
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              View Summary
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleListenToSummary}
                          disabled={textToSpeech.isPending}
                        >
                          {textToSpeech.isPending ? (
                            <Spinner className="h-4 w-4 mr-2" />
                          ) : (
                            <Volume2 className="h-4 w-4 mr-2" />
                          )}
                          Listen to Summary
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Actions inside Summary */}
                <div className="flex gap-3 pt-3 border-t border-border">
                  {canStop && (
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={handleStop}
                      disabled={stopAgent.isPending}
                    >
                      {stopAgent.isPending ? (
                        <Spinner className="h-4 w-4 mr-2" />
                      ) : (
                        <StopCircle className="h-4 w-4 mr-2" />
                      )}
                      Stop Agent
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger
                      className={canStop ? "" : "flex-1"}
                      render={
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      }
                    />
                    <AlertDialogContent className="max-w-[90%] rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The agent and its
                          conversation history will be permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground"
                        >
                          {deleteAgent.isPending ? (
                            <Spinner className="h-4 w-4 mr-2" />
                          ) : null}
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Conversation Accordion */}
          <AccordionItem
            value="conversation"
            className="border border-border rounded-xl overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 bg-card hover:no-underline">
              <span className="font-semibold text-foreground">
                Conversation
              </span>
            </AccordionTrigger>
            <AccordionContent className="bg-card">
              <div className="px-4 pb-4">
                {!initialConversation && conversationLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner className="h-6 w-6 text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterMessagesForDisplay(
                      conversation?.messages || [],
                      showThinkingProcess
                    ).map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "p-3 rounded-xl text-sm",
                          message.type === "user_message"
                            ? "bg-primary/15 ml-8"
                            : message.type === "tool_call" ||
                                message.type === "tool_result"
                              ? "bg-muted border border-border"
                              : "bg-muted border border-border mr-8"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {message.type === "user_message" ? (
                            <User className="h-3.5 w-3.5 text-primary" />
                          ) : message.type === "tool_call" ||
                            message.type === "tool_result" ? (
                            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="text-xs font-medium text-muted-foreground">
                            {message.type === "user_message"
                              ? "You"
                              : message.type === "tool_call"
                                ? `Tool: ${message.toolName}`
                                : message.type === "tool_result"
                                  ? "Result"
                                  : "Agent"}
                          </span>
                        </div>
                        {message.type === "assistant_message" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground prose-a:text-primary prose-blockquote:text-muted-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground prose-h1:text-foreground prose-h2:text-foreground prose-h3:text-foreground prose-h4:text-foreground prose-h5:text-foreground prose-h6:text-foreground prose-hr:border-border prose-table:text-foreground prose-th:text-foreground prose-td:text-foreground">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ children, href }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {children}
                                  </a>
                                ),
                              }}
                            >
                              {message.text || "..."}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-foreground whitespace-pre-wrap">
                            {message.text || message.toolResult || "..."}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Follow-up Message Section - Always visible below conversation */}
        {canSendFollowUp && (
          <div className="border border-border rounded-xl p-4 bg-card">
            <div className="flex flex-col gap-3">
              <TextareaWithVoice
                placeholder="Send a follow-up message to continue the task..."
                value={followUpMessage}
                onChange={(e) => setFollowUpMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleSendFollowUp()
                  }
                }}
                className="min-h-[100px] resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Press ⌘+Enter or Ctrl+Enter to send
                </span>
                <Button
                  onClick={handleSendFollowUp}
                  disabled={!followUpMessage.trim() || sendFollowUp.isPending}
                >
                  {sendFollowUp.isPending ? (
                    <Spinner className="h-4 w-4 mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
