import { type NextRequest, NextResponse } from "next/server"
import { getUserApiKey, isSimulationMode } from "@/lib/api-utils"

const SIMULATED_MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "gpt-4o",
  "gpt-4o-mini",
  "o1-preview",
]

export async function GET(request: NextRequest) {
  const simMode = await isSimulationMode(request)

  if (simMode) {
    return NextResponse.json({
      models: SIMULATED_MODELS,
      simulation: true,
    })
  }

  try {
    const apiKey = await getUserApiKey(request)
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 401 }
      )
    }

    const response = await fetch("https://api.cursor.com/v0/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json({ ...data, simulation: false })
  } catch (error) {
    console.error("Error fetching models:", error)
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    )
  }
}
