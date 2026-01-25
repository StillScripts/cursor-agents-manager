import { Link, useLocation } from "@tanstack/react-router"
import {
  isNavItemActive,
  navItems,
} from "@/components/app/authenticated/nav-items"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const location = useLocation()
  const pathname = location.pathname

  return (
    <nav className="fixed md:hidden bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom z-50">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-20 h-full transition-colors",
              isNavItemActive(item.href, pathname)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
