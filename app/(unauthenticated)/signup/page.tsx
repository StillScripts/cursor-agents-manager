import type { Metadata } from "next"
import { Suspense } from "react"
import { LoginFormSkeleton } from "@/components/forms/login-form"
import { SignupForm } from "@/components/forms/signup-form"

export const metadata: Metadata = {
  title: "Create Account",
  description: "Sign up for Cursor Agent Manager",
}

export default function SignupPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <SignupForm />
    </Suspense>
  )
}
