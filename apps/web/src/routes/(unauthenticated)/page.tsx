import type { Metadata } from "next"
import { HomepageScreen } from "@/app/(unauthenticated)/_components/home-screen"

export const metadata: Metadata = {
  title: "Your AI Agents, In Your Pocket | Cursor Agents Manager",
  description:
    "Launch Cursor background agents, track their progress, and give feedback anywhere, all from your phone. Free and open source mobile app for managing AI agents on the go.",
  openGraph: {
    title: "Your AI Agents, In Your Pocket | Cursor Agents Manager",
    description:
      "Launch Cursor background agents, track their progress, and give feedback anywhere, all from your phone. Free and open source mobile app for managing AI agents on the go.",
    images: [
      {
        url: "/images/app-screenshot.png",
        width: 1536,
        height: 730,
        alt: "Cursor Agents Manager - Your AI Agents, In Your Pocket",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your AI Agents, In Your Pocket | Cursor Agents Manager",
    description:
      "Launch Cursor background agents, track their progress, and give feedback anywhere, all from your phone. Free and open source mobile app for managing AI agents on the go.",
    images: ["/images/app-screenshot.png"],
  },
}

export default async function HomePage() {
  return <HomepageScreen />
}
