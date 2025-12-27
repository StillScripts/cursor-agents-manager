import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"
import {
  getUserApiKey,
  isSimulationMode,
} from "@/lib/api-utils"
import { getSimulatedConversation } from "@/lib/mock-data"
import { CURSOR_API_URL } from "@/lib/api-utils"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const simMode = await isSimulationMode(request)

  // Get conversation
  let conversation
  if (simMode) {
    conversation = getSimulatedConversation(id)
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }
  } else {
    try {
      const apiKey = await getUserApiKey(request)
      if (!apiKey) {
        return NextResponse.json(
          { error: "API key not configured" },
          { status: 401 }
        )
      }

      const response = await fetch(`${CURSOR_API_URL}/${id}/conversation`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      conversation = await response.json()
    } catch (error) {
      console.error("Error fetching conversation:", error)
      return NextResponse.json(
        { error: "Failed to fetch conversation" },
        { status: 500 }
      )
    }
  }

  // Check if conversation has messages
  if (!conversation.messages || conversation.messages.length === 0) {
    return NextResponse.json(
      { error: "No conversation messages to summarize" },
      { status: 400 }
    )
  }

  // Format conversation for summarization
  const conversationText = conversation.messages
    .map((msg: any) => {
      if (msg.type === "user_message") {
        return `User: ${msg.text || ""}`
      } else if (msg.type === "assistant_message") {
        return `Agent: ${msg.text || ""}`
      } else if (msg.type === "tool_call") {
        return `Tool Call: ${msg.toolName} - ${JSON.stringify(msg.toolInput || {})}`
      } else if (msg.type === "tool_result") {
        return `Tool Result: ${msg.toolResult || ""}`
      }
      return ""
    })
    .filter(Boolean)
    .join("\n\n")

  if (!conversationText.trim()) {
    return NextResponse.json(
      { error: "Conversation has no meaningful content to summarize" },
      { status: 400 }
    )
  }

  // Check for OpenAI API key
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    return NextResponse.json(
      {
        error:
          "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.",
      },
      { status: 500 }
    )
  }

  try {
    // Generate summary using AI SDK
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Please provide a concise summary of the following conversation between a user and a Cursor AI agent. Focus on:
- The main task or goal
- Key actions taken by the agent
- Important decisions or outcomes
- Any errors or issues encountered

Conversation:
${conversationText}

Summary:`,
      maxTokens: 500,
    })

    return NextResponse.json({ summary: text })
  } catch (error) {
    console.error("Error generating summary:", error)
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    )
  }
}
