#!/usr/bin/env bun

import { spawn } from "bun"

console.log("🚀 Starting dev servers...")
console.log("📱 Web app: http://localhost:3000")
console.log("🗄️  Convex dev server starting...\n")

// Spawn both processes
const web = spawn(["bun", "run", "--filter=web", "dev"], {
  stdout: "inherit",
  stderr: "inherit",
})

const db = spawn(["bunx", "convex", "dev"], {
  cwd: "packages/db",
  stdout: "inherit",
  stderr: "inherit",
})

// Wait for both processes
await Promise.all([web.exited, db.exited])
