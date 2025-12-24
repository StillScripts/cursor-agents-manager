import { type NextRequest, NextResponse } from "next/server"
import { getSimulatedAgentsPaginated, addSimulatedAgent, updateSimulatedAgentStatus } from "@/lib/mock-data"
import { isSimulationMode, CURSOR_API_URL } from "@/lib/api-utils"
import type { Agent } from "@/lib/types"

async function simulateDelay() {
  await new Promise((resolve) => setTimeout(resolve, 2000))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "0", 10)
  const limit = Number.parseInt(searchParams.get("limit") || "20", 10)

  if (isSimulationMode()) {
    await simulateDelay()

    const { agents, total, totalPages } = getSimulatedAgentsPaginated(page, limit)
    return NextResponse.json({
      agents,
      page,
      limit,
      total,
      totalPages,
      simulation: true,
    })
  }

  try {
    const url = new URL(CURSOR_API_URL)
    url.searchParams.set("limit", String(limit))

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.CURSOR_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json({ ...data, simulation: false })
  } catch (error) {
    console.error("Error fetching agents:", error)
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (isSimulationMode()) {
    await simulateDelay()

    const newAgent: Agent = {
      id: `bc_${Math.random().toString(36).substr(2, 9)}`,
      name: body.prompt.text.substring(0, 50) + "...",
      status: "CREATING",
      source: body.source,
      target: {
        url: `https://cursor.com/agents?id=bc_sim_new`,
        branchName: body.target?.branchName || `cursor/task-${Date.now()}`,
        autoCreatePr: body.target?.autoCreatePr ?? false,
      },
      createdAt: new Date().toISOString(),
    }

    addSimulatedAgent(newAgent)

    setTimeout(() => {
      updateSimulatedAgentStatus(newAgent.id, "RUNNING")
    }, 2000)

    return NextResponse.json({ ...newAgent, simulation: true }, { status: 201 })
  }

  try {
    const response = await fetch(CURSOR_API_URL, {
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
    return NextResponse.json({ ...data, simulation: false }, { status: 201 })
  } catch (error) {
    console.error("Error launching agent:", error)
    return NextResponse.json({ error: "Failed to launch agent" }, { status: 500 })
  }
}
