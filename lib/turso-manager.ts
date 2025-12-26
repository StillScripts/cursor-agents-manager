import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

export interface TursoDatabase {
  name: string
  hostname: string
}

export class TursoManager {
  private organizationName: string
  private apiToken: string

  constructor() {
    this.organizationName = process.env.TURSO_ORG_NAME!
    this.apiToken = process.env.TURSO_API_TOKEN!
  }

  // Create new database for user
  async createUserDatabase(userId: string): Promise<TursoDatabase> {
    const dbName = `user-${userId.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`

    const response = await fetch(
      `https://api.turso.tech/v1/organizations/${this.organizationName}/databases`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: dbName,
          group: "default",
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create database: ${error}`)
    }

    const data = await response.json()
    return data.database
  }

  // Create auth token for user's database
  async createDatabaseToken(dbName: string): Promise<string> {
    const response = await fetch(
      `https://api.turso.tech/v1/organizations/${this.organizationName}/databases/${dbName}/auth/tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expiration: "never",
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create database token: ${error}`)
    }

    const data = await response.json()
    return data.jwt
  }

  // Get database client for user
  getUserDatabase(dbUrl: string, authToken: string) {
    const client = createClient({
      url: dbUrl,
      authToken: authToken,
    })
    return drizzle(client)
  }

  // Initialize user database schema
  async initializeUserSchema(dbUrl: string, authToken: string) {
    const client = createClient({
      url: dbUrl,
      authToken: authToken,
    })

    await client.execute(`
      CREATE TABLE IF NOT EXISTS repositories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)

    await client.execute(`
      CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)

    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    await client.close()
  }
}

export const tursoManager = new TursoManager()
