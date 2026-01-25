import { Bot, User, Wrench } from "lucide-react"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { filterMessagesForDisplay } from "@/lib/conversation-utils"
import { useAgentConversation } from "@/lib/hooks/use-agents"
import { cn } from "@/lib/utils"

export function ConversationSection({ agentId }: { agentId: string }) {
  const [showThinkingProcess, setShowThinkingProcess] = useState(false)

  const { data: conversation, isLoading: conversationLoading } =
    useAgentConversation(agentId)

  return (
    <AccordionItem
      value="conversation"
      className="border border-border rounded-xl overflow-hidden"
    >
      <AccordionTrigger className="px-4 py-3 bg-card hover:no-underline">
        <span className="font-semibold text-foreground">Conversation</span>
      </AccordionTrigger>
      <AccordionContent className="bg-card">
        <div className="px-4 pb-4">
          {conversationLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          ) : conversation && conversation.messages.length > 0 ? (
            <div className="space-y-3">
              {/* Show Thinking Process Toggle */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <label
                  htmlFor="show-thinking-toggle"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Show Thinking Process
                </label>
                <Switch
                  id="show-thinking-toggle"
                  checked={showThinkingProcess}
                  onCheckedChange={setShowThinkingProcess}
                />
              </div>
              {filterMessagesForDisplay(
                conversation.messages,
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
          ) : (
            <div className="flex items-center justify-center py-8 text-center">
              <p className="text-muted-foreground text-sm">
                No conversation found
              </p>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
