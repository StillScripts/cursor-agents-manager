"use client"

import type { ReactNode } from "react"
import { BottomNav } from "./bottom-nav"

interface MobileShellProps {
  children: ReactNode
}

export function MobileShell({ children }: MobileShellProps) {
  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-background">
      <main className="flex-1 overflow-y-auto mobile-scroll pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
