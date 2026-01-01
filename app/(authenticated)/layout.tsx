import type { ReactNode } from "react"
import { BottomNav } from "@/app/(authenticated)/_components/bottom-nav"
import { DesktopHeader } from "@/app/(authenticated)/_components/desktop-header"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col min-h-screen bg-background">
        <DesktopHeader />
        <main className="flex-1 pt-16">
          <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
        </main>
      </div>

      {/* Mobile Layout */}
      <div className="flex md:hidden flex-col h-dvh max-w-md mx-auto bg-background">
        <main className="flex-1 overflow-y-auto mobile-scroll pb-20">
          {children}
        </main>
        <BottomNav />
      </div>
    </>
  )
}
