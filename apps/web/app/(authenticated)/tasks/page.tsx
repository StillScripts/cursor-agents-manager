import { Suspense } from "react"
import { TimeTrackingScreen } from "@/components/time-tracking/components/time-tracking-screen"

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TimeTrackingScreen />
    </Suspense>
  )
}
