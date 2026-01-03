import { type ReactNode, Suspense } from "react"
import { BottomNav } from "@/app/(authenticated)/_components/bottom-nav"
import { DesktopHeader } from "@/app/(authenticated)/_components/desktop-header"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <DesktopHeader />
      </Suspense>
      <main className="h-dvh overflow-y-auto mobile-scroll pb-20 bg-background max-w-md mx-auto w-full md:h-auto md:flex md:flex-col md:min-h-screen md:pt-16 md:overflow-visible md:pb-0 md:max-w-none">
        <div className="md:max-w-7xl md:mx-auto md:px-6 md:py-8 md:w-full">
          {children}
        </div>
      </main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  )
}
