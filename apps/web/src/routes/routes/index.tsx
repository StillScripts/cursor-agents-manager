import { createFileRoute, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { HomepageScreen } from "@/app/(unauthenticated)/_components/home-screen"
import { isAuthenticated } from "@/lib/better-auth/auth-server"

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await isAuthenticated()
})

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const authenticated = await checkAuth()
    if (authenticated) {
      throw redirect({ to: "/agents" })
    }
  },
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
      { property: "og:image", content: "/images/app-screenshot.png" },
      { property: "og:type", content: "website" },
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
