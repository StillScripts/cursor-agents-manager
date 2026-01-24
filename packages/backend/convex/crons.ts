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

// Run hourly to check and execute recurring jobs
// This checks for launch agents with recurring jobs that are due to run and executes them
crons.hourly(
  "check-recurring-jobs",
  {
    minuteUTC: 0, // Run at the top of every hour
  },
  internal.launchAgents.checkAndExecuteRecurringJobs
)

export default crons
