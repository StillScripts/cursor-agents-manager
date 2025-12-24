export function isSimulationMode(): boolean {
  const apiKey = process.env.CURSOR_API_KEY

  // Only use real API if key exists, is not empty, and looks like a real key
  const hasValidKey =
    apiKey &&
    apiKey.trim().length > 10 &&
    !apiKey.includes("undefined") &&
    !apiKey.includes("your-api-key") &&
    !apiKey.includes("placeholder")

  return !hasValidKey
}

export const CURSOR_API_URL = "https://api.cursor.com/v0/agents"
