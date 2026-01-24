import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { ActivityScreen } from "./account/_components/activity-screen"

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
  return (
    <Suspense fallback={null}>
      <ActivityScreen />
    </Suspense>
  )
}
