import { createFileRoute } from "@tanstack/react-router"
import { ActivityScreen } from "@/components/app/authenticated/account/activity-screen"

export const Route = createFileRoute("/_authenticated/account/activity")({
  head: () => ({
    meta: [
      { title: "Your Activity | Cursor Agents" },
      { name: "description", content: "View your time tracking activity" },
    ],
  }),
  component: ActivityPage,
})

function ActivityPage() {
  return <ActivityScreen />
}
