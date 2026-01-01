import { proxy } from "./proxy"
import type { NextRequest } from "next/server"

/**
 * Next.js middleware entry point
 * Delegates to proxy function which contains the actual middleware logic
 */
export async function middleware(request: NextRequest) {
  return proxy(request)
}

// Re-export config from proxy
export { config } from "./proxy"
