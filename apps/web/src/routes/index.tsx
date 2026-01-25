import { createFileRoute } from "@tanstack/react-router"
import { HomepageScreen } from "@/components/app/unauthenticated/home-screen"

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Your AI Agents, In Your Pocket | Cursor Agents Manager" },
      {
        name: "description",
        content:
          "Launch Cursor background agents, track their progress, and give feedback anywhere, all from your phone. Free and open source mobile app for managing AI agents on the go.",
      },
      {
        property: "og:title",
        content: "Your AI Agents, In Your Pocket | Cursor Agents Manager",
      },
      {
        property: "og:description",
        content:
          "Launch Cursor background agents, track their progress, and give feedback anywhere, all from your phone. Free and open source mobile app for managing AI agents on the go.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/images/app-screenshot.png" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Your AI Agents, In Your Pocket | Cursor Agents Manager",
      },
      {
        name: "twitter:description",
        content:
          "Launch Cursor background agents, track their progress, and give feedback anywhere, all from your phone. Free and open source mobile app for managing AI agents on the go.",
      },
      { name: "twitter:image", content: "/images/app-screenshot.png" },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  return <HomepageScreen />
}
