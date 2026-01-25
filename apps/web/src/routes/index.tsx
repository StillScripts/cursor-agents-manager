import { createFileRoute } from "@tanstack/react-router"
import { HomepageScreen } from "@/components/app/unauthenticated/home-screen"

const title = "Your AI Agents, In Your Pocket | Cursor Agents Manager"
const description =
  "Launch Cursor background agents, track their progress, and give feedback anywhere, all from your phone. Free and open source mobile app for managing AI agents on the go."
const ogImage = "/images/app-screenshot.png"

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      {
        name: "description",
        content: description,
      },
      {
        property: "og:title",
        content: title,
      },
      {
        property: "og:description",
        content: description,
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: ogImage },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: title,
      },
      {
        name: "twitter:description",
        content: description,
      },
      { name: "twitter:image", content: ogImage },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  return <HomepageScreen />
}
