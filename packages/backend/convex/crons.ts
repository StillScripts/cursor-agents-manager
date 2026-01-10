import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Run nightly sync at midnight UTC (00:00)
// This syncs all agents created in the past day that are not finished
// Note: Change hourUTC to 12 if you want it to run at noon instead
crons.daily(
  "sync-recent-agents",
  {
    hourUTC: 0, // Midnight UTC (12:00 AM) - change to 12 for noon (12:00 PM)
    minuteUTC: 0,
  },
  internal.syncAgents.syncRecentAgents
)

export default crons
