import { createFileRoute, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { Suspense } from "react"
import { LoginFormSkeleton } from "@/components/forms/login-form"
import { SignupForm } from "@/components/forms/signup-form"
import { isAuthenticated } from "@/lib/better-auth/auth-server"

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await isAuthenticated()
})

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    const authenticated = await checkAuth()
    if (authenticated) {
      throw redirect({ to: "/agents" })
    }
  },
  head: () => ({
    meta: [
      { title: "Create Account | Cursor Agents" },
      { name: "description", content: "Sign up for Cursor Agent Manager" },
    ],
  }),
  component: SignupPage,
})

function SignupPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <SignupForm />
    </Suspense>
  )
}
