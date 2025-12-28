import type { Metadata } from "next"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Cursor Agent Manager account",
}

export default function LoginPage() {
  return <LoginForm />
}
