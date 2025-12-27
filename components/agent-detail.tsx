"use client"

import { formatDistanceToNow } from "date-fns"
import {
  Bot,
  ExternalLink,
  GitBranch,
  Send,
  StopCircle,
  Trash2,
  User,
  Wrench,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
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
} from "@/lib/hooks/use-agents"
import { cn } from "@/lib/utils"
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

  const { data: agent, isLoading: agentLoading } = useAgent(agentId)
  const { data: conversation, isLoading: conversationLoading } =
    useAgentConversation(agentId)
  const stopAgent = useStopAgent()
  const deleteAgent = useDeleteAgent()
  const sendFollowUp = useSendFollowUp()

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
                        {message.type === "assistant_message" ? (
                          <div className="text-foreground markdown-content">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-2 last:mb-0">{children}</p>
                                ),
                                h1: ({ children }) => (
                                  <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="text-sm font-semibold mb-2 mt-3 first:mt-0">
                                    {children}
                                  </h3>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc list-inside mb-2 space-y-1">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal list-inside mb-2 space-y-1">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => (
                                  <li className="ml-2">{children}</li>
                                ),
                                code: ({ children, className }) => {
                                  const isInline =
                                    !className || !className.includes("language-")
                                  return isInline ? (
                                    <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                                      {children}
                                    </code>
                                  ) : (
                                    <code className={className}>{children}</code>
                                  )
                                },
                                pre: ({ children }) => (
                                  <pre className="bg-muted p-2 rounded-lg overflow-x-auto mb-2 text-xs font-mono text-foreground">
                                    {children}
                                  </pre>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-2 border-border pl-3 my-2 italic text-muted-foreground">
                                    {children}
                                  </blockquote>
                                ),
                                a: ({ children, href }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline"
                                  >
                                    {children}
                                  </a>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold">
                                    {children}
                                  </strong>
                                ),
                                em: ({ children }) => (
                                  <em className="italic">{children}</em>
                                ),
                                hr: () => (
                                  <hr className="my-3 border-border" />
                                ),
                                table: ({ children }) => (
                                  <div className="overflow-x-auto my-2">
                                    <table className="min-w-full border-collapse border border-border">
                                      {children}
                                    </table>
                                  </div>
                                ),
                                thead: ({ children }) => (
                                  <thead className="bg-muted">{children}</thead>
                                ),
                                tbody: ({ children }) => (
                                  <tbody>{children}</tbody>
                                ),
                                tr: ({ children }) => (
                                  <tr className="border-b border-border">
                                    {children}
                                  </tr>
                                ),
                                th: ({ children }) => (
                                  <th className="border border-border px-2 py-1 text-left font-semibold">
                                    {children}
                                  </th>
                                ),
                                td: ({ children }) => (
                                  <td className="border border-border px-2 py-1">
                                    {children}
                                  </td>
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
