import type { Metadata } from "next"
import { SignupForm } from "@/components/signup-form"

export const metadata: Metadata = {
  title: "Create Account",
  description: "Sign up for Cursor Agent Manager",
}

export default function SignupPage() {
  return <SignupForm />
}
