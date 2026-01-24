import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { Suspense } from "react"
import { BottomNav } from "@/app/(authenticated)/_components/bottom-nav"
import { DesktopHeader } from "@/app/(authenticated)/_components/desktop-header"
import { GlobalTimerBanner } from "@/app/(authenticated)/_components/global-timer-banner"
import { isAuthenticated } from "@/lib/better-auth/auth-server"

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await isAuthenticated()
})

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const authenticated = await checkAuth()
    if (!authenticated) {
      throw redirect({
        to: "/login",
        search: { callbackUrl: location.pathname },
      })
    }
  },
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <>
      <Suspense fallback={null}>
        <DesktopHeader />
      </Suspense>

      <main className="h-dvh overflow-y-auto mobile-scroll main-content-bottom-padding bg-background max-w-md mx-auto w-full md:h-auto md:flex md:flex-col md:min-h-screen md:pt-16 md:overflow-visible md:max-w-none">
        <div className="md:max-w-7xl md:mx-auto md:px-6 md:py-8 md:w-full pb-8 md:pb-0">
          <Suspense fallback={null}>
            <GlobalTimerBanner />
          </Suspense>
          <Outlet />
        </div>
      </main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  )
}
