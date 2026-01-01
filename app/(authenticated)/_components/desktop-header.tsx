"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { navItems } from "@/app/(authenticated)/_components/nav-items"
import { cn } from "@/lib/utils"

export function DesktopHeader() {
  const pathname = usePathname()

  return (
    <header className="hidden md:block fixed  top-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-b border-border z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-end">
        <nav className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/agent")
                : pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
