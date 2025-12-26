"use client"

import { useSession as useBetterAuthSession } from "@/lib/auth-client"

export function useSession() {
  const { data, isPending, error } = useBetterAuthSession()

  return {
    session: data?.session,
    user: data?.user,
    isLoading: isPending,
    error,
  }
}
