import { createFileRoute } from "@tanstack/react-router"
import { handler } from "@/lib/better-auth/auth-server"

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return await handler(request)
      },
      POST: async ({ request }: { request: Request }) => {
        return await handler(request)
      },
    },
  },
})
