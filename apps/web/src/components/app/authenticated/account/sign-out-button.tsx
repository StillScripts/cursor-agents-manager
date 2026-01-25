import { useRouter } from "@tanstack/react-router"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/better-auth/auth-client"

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.navigate({ to: "/login" })
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
