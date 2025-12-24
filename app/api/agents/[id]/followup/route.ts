import { type NextRequest, NextResponse } from "next/server"
import { addMessageToConversation } from "@/lib/mock-data"
import { isSimulationMode, CURSOR_API_URL } from "@/lib/api-utils"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()

  if (isSimulationMode()) {
    addMessageToConversation(id, {
      id: `msg_${Date.now()}`,
      type: "user_message",
      text: body.prompt?.text || body.message,
    })

    setTimeout(() => {
      addMessageToConversation(id, {
        id: `msg_${Date.now() + 1}`,
        type: "assistant_message",
        text: "I understand. I'm working on your follow-up request. This is a simulated response.",
      })
    }, 1000)

    return NextResponse.json({ success: true, simulation: true })
  }

  try {
    const response = await fetch(`${CURSOR_API_URL}/${id}/followup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CURSOR_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json({ ...data, simulation: false })
  } catch (error) {
    console.error("Error sending follow-up:", error)
    return NextResponse.json({ error: "Failed to send follow-up" }, { status: 500 })
  }
}
