"use client"

import { Send } from "lucide-react"
import { useState } from "react"
import { TextareaWithVoice } from "@/components/ai/textarea-with-voice"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  useAgent,
  useAppendUserMessage,
  useSendFollowUp,
} from "@/lib/hooks/use-agents"
import { useOpenAIKey } from "@/lib/hooks/use-openai-key"
import type { Agent } from "@/lib/types"

export function FollowUpMessageInput({
  agentId,
  initialAgent,
}: {
  agentId: string
  initialAgent?: (Agent & { simulation: boolean }) | null
}) {
  const [followUpMessage, setFollowUpMessage] = useState("")

  const { data: agent } = useAgent(agentId, initialAgent)
  const sendFollowUp = useSendFollowUp()
  const appendUserMessage = useAppendUserMessage()
  const { hasOpenAIKey } = useOpenAIKey()

  const handleSendFollowUp = async () => {
    if (!followUpMessage.trim()) return

    // Optimistically add the message to the conversation
    await appendUserMessage.mutateAsync({
      agentId,
      message: followUpMessage,
    })

    // Send the message to the Cursor API
    await sendFollowUp.mutateAsync({ id: agentId, message: followUpMessage })

    setFollowUpMessage("")
  }

  if (!agent) {
    return null
  }

  const canSendFollowUp =
    agent.status === "RUNNING" ||
    agent.status === "FINISHED" ||
    agent.status === "ERROR"

  if (!canSendFollowUp) {
    return null
  }

  return (
    <div className="border border-border rounded-xl p-4 bg-card">
      <div className="flex flex-col gap-3">
        {hasOpenAIKey ? (
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
        ) : (
          <Textarea
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
        )}
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
  )
}
