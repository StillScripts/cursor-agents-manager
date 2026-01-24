import { createFileRoute, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { Suspense } from "react"
import { LoginForm, LoginFormSkeleton } from "@/components/forms/login-form"
import { isAuthenticated } from "@/lib/better-auth/auth-server"

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await isAuthenticated()
})

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { callbackUrl?: string } => {
    return {
      callbackUrl: search.callbackUrl as string | undefined,
    }
  },
  beforeLoad: async () => {
    const authenticated = await checkAuth()
    if (authenticated) {
      throw redirect({ to: "/agents" })
    }
  },
  head: () => ({
    meta: [
      { title: "Sign In | Cursor Agents" },
      { name: "description", content: "Sign in to your Cursor Agent Manager account" },
    ],
  }),
  component: LoginPage,
})

function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
