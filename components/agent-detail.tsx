"use client"

import { formatDistanceToNow } from "date-fns"
import {
  Bot,
  ExternalLink,
  GitBranch,
  Send,
  Sparkles,
  StopCircle,
  Trash2,
  User,
  Wrench,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
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
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  useAgent,
  useAgentConversation,
  useDeleteAgent,
  useSendFollowUp,
  useStopAgent,
  useSummarizeConversation,
} from "@/lib/hooks/use-agents"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { PageHeader } from "./page-header"
import { SimulationBanner } from "./simulation-banner"
import { StatusBadge } from "./status-badge"

interface AgentDetailProps {
  agentId: string
}

export function AgentDetail({ agentId }: AgentDetailProps) {
  const router = useRouter()
  const [followUpMessage, setFollowUpMessage] = useState("")
  const [openItems, setOpenItems] = useState<string[]>(["summary"])
  const [aiSummary, setAiSummary] = useState<string | null>(null)

  const { data: agent, isLoading: agentLoading } = useAgent(agentId)
  const { data: conversation, isLoading: conversationLoading } =
    useAgentConversation(agentId)
  const stopAgent = useStopAgent()
  const deleteAgent = useDeleteAgent()
  const sendFollowUp = useSendFollowUp()
  const summarizeConversation = useSummarizeConversation()
  const { toast } = useToast()

  // Load summary from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = `agent-summary-${agentId}`
      const stored = localStorage.getItem(key)
      if (stored) {
        setAiSummary(stored)
      }
    }
  }, [agentId])

  // Update summary when mutation succeeds
  useEffect(() => {
    if (summarizeConversation.isSuccess && summarizeConversation.data) {
      setAiSummary(summarizeConversation.data.summary)
    }
  }, [summarizeConversation.isSuccess, summarizeConversation.data])

  const handleStop = async () => {
    await stopAgent.mutateAsync(agentId)
  }

  const handleDelete = async () => {
    await deleteAgent.mutateAsync(agentId)
    router.push("/")
  }

  const handleSendFollowUp = async () => {
    if (!followUpMessage.trim()) return
    await sendFollowUp.mutateAsync({ id: agentId, message: followUpMessage })
    setFollowUpMessage("")
  }

  const handleSummarize = async () => {
    try {
      await summarizeConversation.mutateAsync(agentId)
      toast({
        title: "Summary generated",
        description: "The conversation has been summarized successfully.",
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to summarize conversation"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  if (agentLoading) {
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

  return (
    <>
      <PageHeader title={agent.name} showBack expandable />
      {agent.simulation && <SimulationBanner />}

      <div className="p-4 space-y-4">
        <Accordion value={openItems} onValueChange={setOpenItems}>
          {/* Summary Accordion */}
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
                  <span>
                    Created{" "}
                    {formatDistanceToNow(new Date(agent.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
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
                {aiSummary && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        AI Summary
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {aiSummary}
                    </p>
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
                {conversationLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner className="h-6 w-6 text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Summarize Button */}
                    {conversation && conversation.messages.length > 0 && (
                      <div className="flex justify-end mb-3">
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
                          {aiSummary ? "Regenerate Summary" : "Summarize Conversation"}
                        </Button>
                      </div>
                    )}
                    {conversation?.messages.map((message) => (
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
                        <p className="text-foreground whitespace-pre-wrap">
                          {message.text || message.toolResult || "..."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {canStop && (
                  <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                    <Textarea
                      placeholder="Send a follow-up message..."
                      value={followUpMessage}
                      onChange={(e) => setFollowUpMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault()
                          handleSendFollowUp()
                        }
                      }}
                      className="min-h-[80px] resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Press ⌘+Enter to send
                      </span>
                      <Button
                        size="sm"
                        onClick={handleSendFollowUp}
                        disabled={
                          !followUpMessage.trim() || sendFollowUp.isPending
                        }
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
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  )
}
