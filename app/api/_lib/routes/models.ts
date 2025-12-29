import { Hono } from "hono"
import {
  type SimulationVariables,
  withSimulationMode,
} from "../middleware/simulation"

const SIMULATED_MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "gpt-4o",
  "gpt-4o-mini",
  "o1-preview",
]

const app = new Hono<{ Variables: SimulationVariables }>()

// Apply simulation mode detection
app.use("*", withSimulationMode)

// GET /api/models - List available models
app.get("/", async (c) => {
  const simulationMode = c.get("simulationMode")
  const apiKey = c.get("apiKey")

  if (simulationMode) {
    return c.json({
      models: SIMULATED_MODELS,
      simulation: true,
    })
  }

  try {
    const response = await fetch("https://api.cursor.com/v0/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return c.json({ ...data, simulation: false })
  } catch (error) {
    console.error("Error fetching models:", error)
    return c.json({ error: "Failed to fetch models" }, 500)
  }
})

export { app as modelsApp }
