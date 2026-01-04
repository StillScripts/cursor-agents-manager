import type { Metadata } from "next"
import { Suspense } from "react"
import { ActivityScreen } from "@/app/(authenticated)/account/_components/activity-screen"

export const metadata: Metadata = {
  title: "Your Activity",
  description: "View your time tracking activity",
}

export default function ActivityPage() {
  return (
    <Suspense fallback={null}>
      <ActivityScreen />
    </Suspense>
  )
}
