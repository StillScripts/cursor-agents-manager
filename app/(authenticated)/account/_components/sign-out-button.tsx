"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/better-auth/auth-client"

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={handleSignOut}
    >
      <LogOut className="h-5 w-5 mr-3" />
      Sign Out
    </Button>
  )
}
