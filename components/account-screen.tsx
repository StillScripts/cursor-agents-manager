"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { PageHeader } from "./page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Key, Settings, HelpCircle, LogOut, ChevronRight, Zap } from "lucide-react"
import { useSession } from "@/lib/hooks/use-session"
import { signOut } from "@/lib/auth-client"

const menuItems = [
  {
    icon: Key,
    label: "API Key",
    description: "Configure your Cursor API key",
    href: "/account",
  },
  {
    icon: Settings,
    label: "Settings",
    description: "App preferences and notifications",
    href: "/settings",
  },
  {
    icon: HelpCircle,
    label: "Help & Support",
    description: "Documentation and contact support",
    href: "/account",
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
        <div className="p-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
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
                <span className="text-xl font-bold text-primary">{getUserInitial()}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{getUserName()}</p>
                <p className="text-sm text-muted-foreground">{user?.email || "user@example.com"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Usage</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Agents this month</span>
                <span className="text-foreground font-medium">5 / 50</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "10%" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="space-y-6 pt-2">
          {menuItems.map((item) => (
            <Link key={item.label} href={item.href}>
              <Card className="bg-card border-border hover:bg-accent/50 transition-colors cursor-pointer active:scale-[0.98]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Sign Out */}
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>

        {/* Version */}
        <p className="text-xs text-center text-muted-foreground pt-4">Cursor Agent Manager v1.0.0</p>
      </div>
    </>
  )
}
