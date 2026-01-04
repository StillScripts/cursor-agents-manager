/**
 * Authentication is fully powered by Better Auth
 */

import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/lib/better-auth/auth"

export const { GET, POST } = toNextJsHandler(auth)
