import { headers } from "next/headers"
import { cache } from "react"
import { auth } from "./auth"

export const getCurrentSession = cache(async () => {
  return await auth.api.getSession({
    headers: await headers(),
  })
})

export async function requireAuth() {
  const session = await getCurrentSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}
