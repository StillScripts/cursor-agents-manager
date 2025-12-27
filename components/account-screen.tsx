"use client"

import { ChevronRight, LogOut, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ApiKeyManager } from "@/components/api-key-manager"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { signOut } from "@/lib/auth-client"
import { useSession } from "@/lib/hooks/use-session"
import { PageHeader } from "./page-header"
import { SkeletonCard } from "./skeleton-card"

const menuItems = [
  {
    icon: Settings,
    label: "Settings",
    description: "App preferences and notifications",
    href: "/settings",
  },
]

export function AccountScreen() {
  const { user, isLoading } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

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
    return (
      <>
        <PageHeader title="Account" />
        <div className="p-4 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <Skeleton className="mt-6 h-4 w-20" />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Account" />

      <div className="p-4 space-y-4">
        {/* User Card */}
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
          </CardContent>
        </Card>

        <ApiKeyManager />

        <div className="space-y-6">
          {menuItems.map((item) => (
            <Link key={item.label} href={item.href}>
              <Card className="bg-card border-border hover:bg-accent/50 transition-colors cursor-pointer active:scale-[0.98]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>

        <p className="text-xs text-center text-muted-foreground pt-4">
          Cursor Agent Manager v1.0.0
        </p>
      </div>
    </>
  )
}
