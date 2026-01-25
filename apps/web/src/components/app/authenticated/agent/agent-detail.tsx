"use client"

import { useRouter } from "@tanstack/react-router"
import { formatRelativeTime } from "helpers"
import {
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  GitMerge,
  Sparkles,
  StopCircle,
  Trash2,
  Volume2,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ConversationSection } from "@/components/app/authenticated/agent/conversation-section"
import { FollowUpMessageInput } from "@/components/app/authenticated/agent/follow-up-message-input"
import { PageHeader } from "@/components/app/authenticated/page-header"
import { StatusBadge } from "@/components/app/authenticated/status-badge"
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
import { useAgent, useDeleteAgent, useStopAgent } from "@/lib/hooks/use-agents"
import { useSummarizeConversation, useTextToSpeech } from "@/lib/hooks/use-ai"
import { useGithubKey } from "@/lib/hooks/use-github-key"
import { useMergePullRequest } from "@/lib/hooks/use-merge-pr"
import { useOpenAIKey } from "@/lib/hooks/use-openai-key"
import type { Agent } from "@/lib/types"

export function AgentDetail({
  agentId,
  initialAgent,
}: {
  agentId: string
  initialAgent?: Agent | null
}) {
  const router = useRouter()
  const [openItems, setOpenItems] = useState<string[]>(["summary"])
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)

  const { data: agent, isLoading: agentLoading } = useAgent(
    agentId,
    initialAgent
  )
  const stopAgent = useStopAgent()
  const deleteAgent = useDeleteAgent()
  const summarizeConversation = useSummarizeConversation()
  const textToSpeech = useTextToSpeech()
  const { hasOpenAIKey } = useOpenAIKey()
  const { hasGithubKey } = useGithubKey()
  const {
    mergePr,
    isPending: isMerging,
    error: mergeError,
    result: mergeResult,
  } = useMergePullRequest()

  // Audio player state
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Load summary from agent data (stored in database)
  useEffect(() => {
    if (agent?.summary) {
      setAiSummary(agent.summary)
      setShowSummary(true)
    }
  }, [agent?.summary])

  // Update summary when mutation succeeds (optimistic update)
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

  const handleStop = async () => {
    await stopAgent.mutateAsync(agentId)
  }

  const handleDelete = async () => {
    await deleteAgent.mutateAsync(agentId)
    router.navigate({ to: "/agents" })
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
      // First check if we have stored audio in the database
      if (agent?.audioSummary) {
        // Convert base64 to blob URL
        const binaryString = atob(agent.audioSummary)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: "audio/mpeg" })
        setAudioUrl(URL.createObjectURL(blob))
      } else {
        // Fallback: generate audio on-demand if not stored
        const url = await textToSpeech.mutateAsync({ text: aiSummary })
        setAudioUrl(url)
      }
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

  return (
    <>
      <PageHeader title={agent.name} showBack expandable />

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
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={agent.target.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Pull Request
                      </a>
                      {hasGithubKey && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => mergePr(agent.target.prUrl!, "squash")}
                          disabled={isMerging || mergeResult?.success}
                        >
                          {isMerging ? (
                            <Spinner className="h-4 w-4 mr-2" />
                          ) : mergeResult?.success ? (
                            <GitMerge className="h-4 w-4 mr-2 text-green-500" />
                          ) : (
                            <GitMerge className="h-4 w-4 mr-2" />
                          )}
                          {mergeResult?.success ? "Merged" : "Merge PR"}
                        </Button>
                      )}
                    </div>
                  )}
                  {mergeError && (
                    <p className="text-sm text-destructive">{mergeError}</p>
                  )}
                  {mergeResult?.success && (
                    <p className="text-sm text-green-500">
                      {mergeResult.message}
                    </p>
                  )}
                </div>

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
                {true && (
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                    {hasOpenAIKey && (
                      <>
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

          <ConversationSection agentId={agentId} />
        </Accordion>

        <FollowUpMessageInput agentId={agentId} />
      </div>
    </>
  )
}
