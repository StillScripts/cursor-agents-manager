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

  // Get existing database by name
  async getUserDatabaseByName(dbName: string): Promise<TursoDatabase | null> {
    const response = await fetch(
      `https://api.turso.tech/v1/organizations/${this.organizationName}/databases/${dbName}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      const error = await response.text()
      throw new Error(`Failed to get database: ${error}`)
    }

    const data = await response.json()
    const database = data.database || data

    // Ensure we have a valid database object with required properties
    if (!database || !database.hostname) {
      throw new Error(`Invalid database response: missing hostname`)
    }

    return {
      name: database.name || dbName,
      hostname: database.hostname,
    }
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
      const errorText = await response.text()
      let errorMessage = errorText

      // Try to parse JSON error response
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error) {
          errorMessage = errorJson.error
        }
      } catch {
        // Not JSON, use text as-is
      }

      // Check if database already exists
      if (errorMessage.includes("already exists")) {
        // Fetch the existing database
        const existing = await this.getUserDatabaseByName(dbName)
        if (existing) {
          // Ensure the database object has the name property
          // (API response might not include it, but we know it from dbName)
          return {
            name: existing.name || dbName,
            hostname: existing.hostname,
          }
        }
      }
      throw new Error(`Failed to create database: ${errorText}`)
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
  // Note: No foreign keys to user table since user data is in master DB
  async initializeUserSchema(dbUrl: string, authToken: string) {
    const client = createClient({
      url: dbUrl,
      authToken: authToken,
    })

    // Repositories table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS repositories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)

    // Branches table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)

    // User settings table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    // Time logs table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS time_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        created_at INTEGER NOT NULL
      )
    `)

    // Agents table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        source_repository TEXT NOT NULL,
        source_ref TEXT,
        target_branch_name TEXT,
        target_url TEXT,
        target_pr_url TEXT,
        target_auto_create_pr INTEGER DEFAULT 0,
        model TEXT,
        summary TEXT,
        provider_data TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        cached_at INTEGER NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        sync_error TEXT,
        deleted_at INTEGER
      )
    `)

    // Create indexes for performance
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id)
    `)
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_agents_provider ON agents(provider)
    `)
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)
    `)
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_agents_user_status ON agents(user_id, status)
    `)
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_agents_updated_at ON agents(updated_at)
    `)
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_agents_deleted_at ON agents(deleted_at)
    `)

    await client.close()
  }
}

export const tursoManager = new TursoManager()
