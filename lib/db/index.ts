import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

// Main auth database (single, shared)
const client = createClient({
  url: process.env.TURSO_AUTH_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export const db = drizzle(client)
