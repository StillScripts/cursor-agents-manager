# Bug: Convex Client Not Found During SSR

## Error Message

```
Switched to client rendering because the server rendering errored:

Could not find Convex client! `useQuery` must be used in the React component tree under `ConvexProvider`. Did you forget it? See https://docs.convex.dev/quick-start#set-up-convex-in-your-react-app
node_modules/convex/src/react/use_queries.ts (68:11) @ useQueries
```

## Context

This error occurs during server-side rendering (SSR) in a Next.js monorepo setup. The app uses:
- **Next.js 16.1.1** with App Router
- **Convex 1.31.3** with `@convex-dev/better-auth`
- **Monorepo structure** with workspace packages

## Affected Components

The error occurs when `OpenAIKeyProvider` (which uses `useQuery` from `convex/react`) is rendered during SSR, even though it's wrapped in `ConvexBetterAuthProvider`.

### Component Hierarchy

```
RootLayout (server component)
  └─ Suspense
      └─ Providers (client component)
          └─ ThemeProvider
              └─ ConvexBetterAuthProvider
                  └─ QueryClientProvider
                      └─ OpenAIKeyProvider ← ERROR HERE
                          └─ useQuery(api.apiKeys.getOpenaiApiKeyStatus)
```

## Current Implementation

### `apps/web/components/providers.tsx`

```tsx
"use client"

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ConvexReactClient } from "convex/react"
// ...

export function Providers({ children, initialToken }: Props) {
  const [convex] = useState(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  )
  
  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient}
      initialToken={initialToken}
    >
      <QueryClientProvider client={queryClient}>
        <OpenAIKeyProvider>{children}</OpenAIKeyProvider>
      </QueryClientProvider>
    </ConvexBetterAuthProvider>
  )
}
```

### `apps/web/lib/hooks/use-openai-key.tsx`

```tsx
"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function OpenAIKeyProvider({ children }: { children: ReactNode }) {
  const status = useQuery(api.apiKeys.getOpenaiApiKeyStatus) // ← Fails during SSR
  // ...
}
```

## Root Causes (Potential)

### 1. **Monorepo Module Resolution**

The app uses path aliases to reference Convex generated files:

```json
// apps/web/tsconfig.json
{
  "paths": {
    "@/convex/*": ["../../packages/db/convex/*"]
  }
}
```

**Issue**: During SSR, Next.js might not be resolving the `@/convex/_generated/api` import correctly, causing a different instance of `convex/react` to be loaded, which doesn't share the same context.

**Evidence**:
- `packages/db/package.json` has `convex: ^1.31.3`
- `apps/web/package.json` has `convex: ^1.31.3` (recently updated from `^1.31.2`)
- Both packages install their own `node_modules/convex`, potentially creating separate React contexts

### 2. **ConvexBetterAuthProvider SSR Behavior**

`ConvexBetterAuthProvider` from `@convex-dev/better-auth/react` internally wraps `ConvexProvider` from `convex/react`. During SSR:

- The `ConvexReactClient` is created in `useState`, which only runs on the client
- During SSR, React might be trying to render `OpenAIKeyProvider` before the client is fully initialized
- `ConvexBetterAuthProvider` might not be properly handling the SSR case

### 3. **Environment Variable Loading**

The Convex client is initialized with:

```tsx
new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
```

**Issue**: In a monorepo, `.env.local` might be in the wrong location:
- Currently: `.env.local` (root)
- Should be: `apps/web/.env.local` (Next.js only loads env files from the app directory)

If `NEXT_PUBLIC_CONVEX_URL` is `undefined` during SSR, the client initialization fails silently or creates an invalid client.

### 4. **Client Component Rendering During SSR**

Even though `Providers` is marked `"use client"`, Next.js still attempts to render it on the server for the initial HTML. The `useState` hook runs during SSR, but the Convex context might not be properly established.

## Attempted Fixes

### Fix 1: Move ConvexClient to useState ✅
**Status**: Applied
**Change**: Moved `ConvexReactClient` creation from module scope to `useState` inside component
**Result**: No change - error persists

### Fix 2: Version Alignment ✅
**Status**: Applied
**Change**: Updated `apps/web/package.json` to use `convex: ^1.31.3` (matching `packages/db`)
**Result**: No change - error persists

### Fix 3: Add Workspace Dependency ✅
**Status**: Applied
**Change**: Added `"db": "workspace:*"` to `apps/web/package.json`
**Result**: No change - error persists

### Fix 4: Environment Variable Location ⚠️
**Status**: Identified but not verified
**Change**: `.env.local` should be in `apps/web/` not root
**Result**: Needs verification

## Investigation Needed

### 1. **Verify Environment Variables**

Check if `NEXT_PUBLIC_CONVEX_URL` is available during SSR:

```tsx
// Add logging in providers.tsx
const [convex] = useState(() => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  console.log('Convex URL:', url) // Check if this is undefined
  if (!url) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not defined')
  }
  return new ConvexReactClient(url)
})
```

### 2. **Check Module Resolution**

Verify that both `apps/web` and `packages/db` are using the same `convex` package instance:

```bash
# Check if there are multiple convex installations
find . -path "*/node_modules/convex/package.json" -not -path "*/node_modules/*/node_modules/*"

# Check package versions
cd apps/web && bun list convex
cd packages/db && bun list convex
```

### 3. **Inspect ConvexBetterAuthProvider**

Check the source code or documentation for `@convex-dev/better-auth/react` to understand:
- How it handles SSR
- Whether it requires additional configuration
- If there's a way to disable SSR for Convex queries

### 4. **Test with Minimal Reproduction**

Create a minimal test case:

```tsx
// apps/web/test-convex.tsx
"use client"
import { ConvexProvider } from "convex/react"
import { ConvexReactClient } from "convex/react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

const client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function TestQuery() {
  const result = useQuery(api.apiKeys.getOpenaiApiKeyStatus)
  return <div>{JSON.stringify(result)}</div>
}

export function TestConvex() {
  return (
    <ConvexProvider client={client}>
      <TestQuery />
    </ConvexProvider>
  )
}
```

### 5. **Check Next.js SSR Behavior**

Verify if the issue is specific to Next.js 16.1.1 or App Router:
- Check Next.js logs for SSR warnings
- Try wrapping `OpenAIKeyProvider` in a `Suspense` boundary
- Consider using `dynamic` import with `ssr: false` for components using Convex

## Potential Solutions

### Solution 1: Conditional Rendering for SSR

```tsx
export function OpenAIKeyProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    // Return children without query during SSR
    return <>{children}</>
  }
  
  const status = useQuery(api.apiKeys.getOpenaiApiKeyStatus)
  // ...
}
```

### Solution 2: Move Query to Child Component

Only use `useQuery` in components that are guaranteed to be client-only:

```tsx
// Don't use useQuery in provider
export function OpenAIKeyProvider({ children }: { children: ReactNode }) {
  return <OpenAIKeyContext.Provider value={null}>{children}</OpenAIKeyContext.Provider>
}

// Use useQuery in a separate hook that's only called client-side
export function useOpenAIKey() {
  const status = useQuery(api.apiKeys.getOpenaiApiKeyStatus)
  // ...
}
```

### Solution 3: Fix Environment Variable Loading

Ensure `.env.local` is in the correct location and Next.js can read it:

```bash
# Move or copy .env.local to apps/web/
cp .env.local apps/web/.env.local
```

### Solution 4: Use ConvexProvider Directly

If `ConvexBetterAuthProvider` has SSR issues, try using `ConvexProvider` directly:

```tsx
import { ConvexProvider } from "convex/react"

<ConvexProvider client={convex}>
  <ConvexBetterAuthProvider authClient={authClient} initialToken={initialToken}>
    {/* ... */}
  </ConvexBetterAuthProvider>
</ConvexProvider>
```

### Solution 5: Disable SSR for Convex Queries

Use Next.js `dynamic` import to disable SSR:

```tsx
import dynamic from 'next/dynamic'

const OpenAIKeyProvider = dynamic(
  () => import('@/lib/hooks/use-openai-key').then(m => ({ default: m.OpenAIKeyProvider })),
  { ssr: false }
)
```

## Related Files

- `apps/web/components/providers.tsx` - Provider setup
- `apps/web/lib/hooks/use-openai-key.tsx` - Hook using `useQuery`
- `apps/web/app/layout.tsx` - Root layout rendering Providers
- `apps/web/package.json` - Dependencies
- `packages/db/package.json` - Convex package version
- `apps/web/tsconfig.json` - Path aliases
- `.env.local` / `apps/web/.env.local` - Environment variables

## References

- [Convex React Quick Start](https://docs.convex.dev/quick-start#set-up-convex-in-your-react-app)
- [ConvexBetterAuth Documentation](https://labs.convex.dev/better-auth)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Next.js App Router SSR](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

## Status

**Current Status**: 🔴 **Unresolved**

**Priority**: High - Blocks SSR and causes client-side rendering fallback

**Next Steps**:
1. Verify environment variable location and loading
2. Test module resolution in monorepo
3. Investigate `ConvexBetterAuthProvider` SSR behavior
4. Try conditional rendering or dynamic import workaround
