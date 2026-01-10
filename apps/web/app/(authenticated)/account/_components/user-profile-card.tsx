"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { useSession } from "@/lib/hooks/use-session"

export function UserProfileCard() {
  const { user, isLoading } = useSession()

  const getUserInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return "U"
  }

  const getUserName = () => {
    if (user?.name) return user.name
    if (user?.email) return user.email.split("@")[0]
    return "User"
  }

  if (isLoading) {
    return <SkeletonCard />
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">
              {getUserInitial()}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{getUserName()}</p>
            <p className="text-sm text-muted-foreground">
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <Link href="/account/activity">
            <Button variant="outline" className="w-full">
              Your Activity
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
