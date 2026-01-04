import type { Metadata } from "next"
import { Suspense } from "react"
import { LoginForm, LoginFormSkeleton } from "@/components/forms/login-form"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Cursor Agent Manager account",
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
