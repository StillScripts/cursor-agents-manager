import { useSession as useBetterAuthSession } from "@/lib/better-auth/auth-client"

export function useSession() {
  const { data, isPending, error } = useBetterAuthSession()

  return {
    session: data?.session,
    user: data?.user,
    isLoading: isPending,
    error,
  }
}
