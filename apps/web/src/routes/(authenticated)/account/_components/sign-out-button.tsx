"use client"

import { useNavigate } from "@tanstack/react-router"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/better-auth/auth-client"

export function SignOutButton() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: "/login" })
    // Force a full page reload to clear all auth state
    window.location.href = "/login"
  }

  return (
    <Button
      variant="outline"
      className="w-full justify-start text-foreground border-border bg-background hover:bg-muted"
      onClick={handleSignOut}
    >
      <LogOut className="h-5 w-5 mr-3" />
      Sign Out
    </Button>
  )
}
