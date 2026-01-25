import { createFileRoute } from "@tanstack/react-router"
import { TimeTrackingScreen } from "@/components/time-tracking/components/time-tracking-screen"

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks | Cursor Agents" },
      { name: "description", content: "Track your time and tasks" },
    ],
  }),
  component: TasksPage,
})

function TasksPage() {
  return <TimeTrackingScreen />
}
