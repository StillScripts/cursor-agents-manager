import type { Metadata } from "next"
import { HomepageScreen } from "@/app/(unauthenticated)/_components/home-screen"

export const metadata: Metadata = {
  title: "Home",
  description: "Cursor Agent Manager",
}

export default async function HomePage() {
  return <HomepageScreen />
}
