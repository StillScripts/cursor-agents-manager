import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start"

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexUrl: import.meta.env.VITE_CONVEX_URL!,
  convexSiteUrl: import.meta.env.VITE_CONVEX_SITE_URL!,
})

// Helper to check if the user is authenticated (for use in middleware/loaders)
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken()
  return !!token
}
