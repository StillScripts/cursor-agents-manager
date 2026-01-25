import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { useSession } from "@/lib/hooks/use-session"

export function UserProfileCard() {
  const { user, isLoading } = useSession()

  const userInitial = (
    user?.name?.charAt(0) ??
    user?.email?.charAt(0) ??
    "U"
  ).toUpperCase()

  const userName = user?.name ?? user?.email?.split("@")[0] ?? "User"

  if (isLoading) {
    return <SkeletonCard />
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">
              {userInitial}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{userName}</p>
            <p className="text-sm text-muted-foreground">
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <Link to="/account/activity">
            <Button variant="outline" className="w-full">
              Your Activity
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
