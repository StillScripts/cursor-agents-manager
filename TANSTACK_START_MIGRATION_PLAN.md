# TanStack Start Migration Plan

## Executive Summary

This document outlines a comprehensive plan to migrate the Cursor Agent Manager web application from **Next.js 16** to **TanStack Start**. TanStack Start is a full-stack React framework built on top of TanStack Router, providing file-based routing, server-side rendering, and API routes with a focus on type safety and developer experience.

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [TanStack Start Overview](#tanstack-start-overview)
4. [Migration Strategy](#migration-strategy)
5. [Detailed Migration Steps](#detailed-migration-steps)
6. [Key Differences & Challenges](#key-differences--challenges)
7. [Testing Strategy](#testing-strategy)
8. [Rollout Plan](#rollout-plan)
9. [Risk Assessment](#risk-assessment)
10. [Timeline Estimate](#timeline-estimate)

---

## Overview

### Current Stack
- **Framework**: Next.js 16 (App Router)
- **Runtime**: Bun
- **UI**: React 19
- **Routing**: Next.js App Router with route groups
- **Authentication**: Better Auth with Convex backend
- **State Management**: TanStack React Query + Convex
- **Forms**: TanStack React Form
- **Styling**: Tailwind CSS 4
- **Deployment**: Vercel

### Target Stack
- **Framework**: TanStack Start
- **Runtime**: Bun (maintained)
- **UI**: React 19 (maintained)
- **Routing**: TanStack Router (file-based)
- **Authentication**: Better Auth with Convex backend (maintained)
- **State Management**: TanStack React Query + Convex (maintained)
- **Forms**: TanStack React Form (maintained)
- **Styling**: Tailwind CSS 4 (maintained)
- **Deployment**: TBD (Vercel, Cloudflare Workers, or Node.js)

---

## Current Architecture Analysis

### Route Structure

The app uses Next.js route groups to organize pages by authentication state:

```
app/
├── (authenticated)/          # Protected routes
│   ├── layout.tsx            # Auth layout with navigation
│   ├── page.tsx              # Home: agent list
│   ├── agents/page.tsx       # Agent list view
│   ├── new/page.tsx          # Launch new agent
│   ├── agent/[id]/page.tsx   # Agent detail
│   ├── account/page.tsx      # Account management
│   ├── settings/page.tsx     # User settings
│   └── tasks/page.tsx        # Time tracking
│
├── (unauthenticated)/        # Public routes
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Login
│   └── signup/page.tsx       # Signup
│
├── (server)/                 # API routes
│   └── api/auth/[...all]/route.ts
│
└── layout.tsx                # Root layout
```

### Key Features

1. **Route Protection**: Custom `proxy.ts` middleware for authentication
2. **API Routes**: Single API route for Better Auth (`/api/auth/[...all]`)
3. **Layouts**: Nested layouts for authenticated vs unauthenticated pages
4. **Metadata**: SEO metadata in layouts and pages
5. **PWA Support**: Service worker, manifest, install prompt
6. **Theme Management**: Dark mode with next-themes
7. **Font Loading**: Google Fonts (Inter, JetBrains Mono)

### Dependencies Analysis

**Core Next.js Dependencies:**
- `next` - Framework
- `next-themes` - Theme management (needs replacement)
- `@vercel/analytics` - Analytics (Vercel-specific)

**Framework-Agnostic Dependencies:**
- `@tanstack/react-query` - ✅ Compatible
- `@tanstack/react-form` - ✅ Compatible
- `@tanstack/react-table` - ✅ Compatible
- `better-auth` - ✅ Compatible (works with any framework)
- `convex` - ✅ Compatible
- `tailwindcss` - ✅ Compatible
- All UI components - ✅ Compatible

---

## TanStack Start Overview

### What is TanStack Start?

TanStack Start is a full-stack React framework that provides:
- **File-based routing** similar to Next.js App Router
- **Server-side rendering** and streaming
- **API routes** with type-safe request/response handling
- **Built on TanStack Router** for type-safe routing
- **Framework-agnostic** deployment (Node.js, Cloudflare Workers, etc.)
- **No vendor lock-in** (unlike Next.js → Vercel)

### Key Concepts

1. **Routes**: File-based routing in `app/routes/` directory
2. **Loaders**: Server-side data fetching (similar to Next.js Server Components)
3. **Actions**: Server-side mutations (similar to Next.js Server Actions)
4. **API Routes**: HTTP handlers in `app/api/` directory
5. **Layouts**: Nested layouts using `_layout.tsx` files
6. **Meta**: SEO metadata using `meta` exports

### TanStack Start File Structure

```
app/
├── routes/
│   ├── _root.tsx              # Root layout
│   ├── index.tsx              # Home page
│   ├── login.tsx              # Login page
│   ├── signup.tsx             # Signup page
│   ├── _authenticated.tsx     # Auth layout
│   │   ├── agents.tsx         # Agent list
│   │   ├── agents.new.tsx     # New agent
│   │   ├── agents.$id.tsx     # Agent detail
│   │   ├── account.tsx        # Account page
│   │   ├── settings.tsx       # Settings
│   │   └── tasks.tsx          # Tasks
│   └── api/
│       └── auth.$.tsx         # Auth API route
│
├── entry-client.tsx           # Client entry point
├── entry-server.tsx           # Server entry point
└── router.tsx                 # Router configuration
```

---

## Migration Strategy

### Phase 1: Setup & Foundation (Week 1)
1. Install TanStack Start dependencies
2. Set up TanStack Start project structure
3. Configure build system and dev server
4. Set up routing structure
5. Migrate root layout and providers

### Phase 2: Authentication & Routing (Week 2)
1. Migrate authentication middleware
2. Set up protected route groups
3. Migrate auth API routes
4. Test authentication flow

### Phase 3: Page Migration (Week 3-4)
1. Migrate public pages (landing, login, signup)
2. Migrate authenticated pages (agents, account, settings)
3. Migrate dynamic routes (agent detail)
4. Update navigation components

### Phase 4: API & Data Fetching (Week 5)
1. Migrate API routes (if any beyond auth)
2. Update data fetching hooks
3. Migrate server-side data fetching
4. Test API integrations

### Phase 5: Polish & Optimization (Week 6)
1. Migrate PWA features
2. Update theme management
3. Optimize bundle size
4. Performance testing
5. Fix any remaining issues

### Phase 6: Deployment & Testing (Week 7)
1. Set up deployment pipeline
2. End-to-end testing
3. User acceptance testing
4. Production deployment

---

## Detailed Migration Steps

### Step 1: Install TanStack Start

```bash
cd apps/web
bun add @tanstack/start @tanstack/router @tanstack/router-devtools
bun add -d @tanstack/start-vite-plugin vite
```

**Remove Next.js:**
```bash
bun remove next @vercel/analytics
```

### Step 2: Update Project Structure

**Create TanStack Start structure:**
```
apps/web/
├── app/
│   ├── routes/              # TanStack Start routes
│   │   ├── _root.tsx        # Root layout
│   │   ├── index.tsx        # Landing page
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── _authenticated.tsx  # Auth layout
│   │   │   ├── agents.tsx
│   │   │   ├── agents.new.tsx
│   │   │   ├── agents.$id.tsx
│   │   │   ├── account.tsx
│   │   │   ├── settings.tsx
│   │   │   └── tasks.tsx
│   │   └── api/
│   │       └── auth.$.tsx   # Catch-all auth route
│   ├── entry-client.tsx
│   ├── entry-server.tsx
│   └── router.tsx
├── components/              # Keep as-is
├── lib/                     # Keep as-is
└── public/                  # Keep as-is
```

### Step 3: Configure Build System

**Create `vite.config.ts`:**
```typescript
import { defineConfig } from 'vite'
import { TanStackStartVite } from '@tanstack/start/vite'

export default defineConfig({
  plugins: [TanStackStartVite()],
  server: {
    port: 3000,
  },
})
```

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "dev": "vinxi dev",
    "build": "vinxi build",
    "start": "vinxi start"
  }
}
```

### Step 4: Migrate Root Layout

**Before (Next.js):**
```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* metadata, fonts, theme script */}
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**After (TanStack Start):**
```typescript
// app/routes/_root.tsx
import { createRootRoute } from '@tanstack/react-router'
import { Providers } from '@/components/providers'

export const Route = createRootRoute({
  component: RootComponent,
  meta: () => [
    { title: 'Cursor Agents' },
    { name: 'description', content: 'Manage your Cursor background agents' },
  ],
})

function RootComponent() {
  return (
    <html>
      <head>
        {/* fonts, theme script */}
      </head>
      <body>
        <Providers>
          <Outlet />
        </Providers>
      </body>
    </html>
  )
}
```

### Step 5: Migrate Route Protection

**Before (Next.js `proxy.ts`):**
```typescript
export async function proxy(request: NextRequest) {
  const authenticated = await isAuthenticated()
  if (!authenticated && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect('/login')
  }
  return NextResponse.next()
}
```

**After (TanStack Start loader):**
```typescript
// app/routes/_authenticated.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/better-auth/auth-server'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      throw redirect({
        to: '/login',
        search: { callbackUrl: location.pathname },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <>
      <DesktopHeader />
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </>
  )
}
```

### Step 6: Migrate Pages

**Before (Next.js):**
```typescript
// app/(authenticated)/agents/page.tsx
export default function AgentsPage() {
  return <AgentsList />
}
```

**After (TanStack Start):**
```typescript
// app/routes/_authenticated/agents.tsx
import { createFileRoute } from '@tanstack/react-router'
import { AgentsList } from '@/components/agents-list'

export const Route = createFileRoute('/_authenticated/agents')({
  component: AgentsPage,
})

function AgentsPage() {
  return <AgentsList />
}
```

### Step 7: Migrate Dynamic Routes

**Before (Next.js):**
```typescript
// app/(authenticated)/agent/[id]/page.tsx
export default function AgentPage({ params }: { params: { id: string } }) {
  return <AgentDetail id={params.id} />
}
```

**After (TanStack Start):**
```typescript
// app/routes/_authenticated/agents.$id.tsx
import { createFileRoute } from '@tanstack/react-router'
import { AgentDetail } from '@/components/agent-detail'

export const Route = createFileRoute('/_authenticated/agents/$id')({
  component: AgentPage,
})

function AgentPage() {
  const { id } = Route.useParams()
  return <AgentDetail id={id} />
}
```

### Step 8: Migrate API Routes

**Before (Next.js):**
```typescript
// app/(server)/api/auth/[...all]/route.ts
import { handler } from '@/lib/better-auth/auth-server'
export const { GET, POST } = handler
```

**After (TanStack Start):**
```typescript
// app/routes/api/auth.$.tsx
import { createAPIFileRoute } from '@tanstack/start/api'
import { handler } from '@/lib/better-auth/auth-server'

export const Route = createAPIFileRoute('/api/auth/$')({
  GET: handler,
  POST: handler,
})
```

### Step 9: Migrate Metadata

**Before (Next.js):**
```typescript
export const metadata: Metadata = {
  title: 'Agents',
  description: 'Manage your agents',
}
```

**After (TanStack Start):**
```typescript
export const Route = createFileRoute('/agents')({
  meta: () => [
    { title: 'Agents' },
    { name: 'description', content: 'Manage your agents' },
  ],
})
```

### Step 10: Update Theme Management

**Replace `next-themes` with custom solution:**
```typescript
// lib/theme.ts
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark')
  
  useEffect(() => {
    // Theme logic
  }, [theme])
  
  return { theme, setTheme }
}
```

Or use a TanStack Start-compatible theme library.

### Step 11: Update Font Loading

**Before (Next.js):**
```typescript
import { Inter } from 'next/font/google'
const fontSans = Inter({ subsets: ['latin'] })
```

**After (TanStack Start):**
```typescript
// Load fonts via link tags or CSS imports
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

### Step 12: Update PWA Configuration

**Service Worker:**
- Keep `public/sw.js` as-is
- Update registration in `entry-client.tsx`

**Manifest:**
- Keep `public/manifest.json` as-is
- Reference in root layout `<head>`

### Step 13: Update Dev Script

**Update `scripts/dev.ts`:**
```typescript
const web = spawn(['bun', 'run', '--filter=web', 'dev'], {
  // TanStack Start uses vinxi, not next dev
})
```

---

## Key Differences & Challenges

### 1. Routing System

**Next.js:**
- Route groups: `(authenticated)`, `(unauthenticated)`
- Dynamic routes: `[id]`, `[...slug]`
- Layouts: `layout.tsx` files

**TanStack Start:**
- Route groups: `_authenticated.tsx` (underscore prefix)
- Dynamic routes: `$id.tsx`, `$.tsx` (catch-all)
- Layouts: `_layout.tsx` files or parent routes

**Migration Impact:** Medium - Requires restructuring route files

### 2. Server Components vs Loaders

**Next.js:**
- Server Components by default
- `async` components for data fetching

**TanStack Start:**
- Loaders for server-side data fetching
- Components are client-side by default

**Migration Impact:** Medium - Need to extract data fetching to loaders

### 3. Middleware vs Before Load

**Next.js:**
- `middleware.ts` or `proxy.ts` for route protection
- Runs on edge/server

**TanStack Start:**
- `beforeLoad` in route definitions
- Runs per route

**Migration Impact:** Low - Similar concept, different implementation

### 4. API Routes

**Next.js:**
- `route.ts` files with named exports (`GET`, `POST`)
- Automatic route handling

**TanStack Start:**
- `api/` directory with `createAPIFileRoute`
- Similar pattern but different API

**Migration Impact:** Low - Straightforward migration

### 5. Metadata

**Next.js:**
- `metadata` export object
- Rich metadata API

**TanStack Start:**
- `meta` function returning array
- Less rich but sufficient

**Migration Impact:** Low - Simple conversion

### 6. Font Loading

**Next.js:**
- `next/font/google` with optimization
- Automatic font optimization

**TanStack Start:**
- Manual font loading
- No automatic optimization

**Migration Impact:** Low - Use standard link tags or CSS imports

### 7. Image Optimization

**Next.js:**
- `next/image` component
- Automatic image optimization

**TanStack Start:**
- No built-in image optimization
- Use standard `<img>` or third-party solution

**Migration Impact:** Low - App uses `unoptimized: true`, so minimal impact

### 8. Analytics

**Next.js:**
- `@vercel/analytics` (Vercel-specific)

**TanStack Start:**
- Need alternative (Plausible, Google Analytics, etc.)

**Migration Impact:** Low - Replace with framework-agnostic solution

### 9. Deployment

**Next.js:**
- Optimized for Vercel
- Can deploy elsewhere but optimized for Vercel

**TanStack Start:**
- Framework-agnostic
- Deploy to Node.js, Cloudflare Workers, etc.

**Migration Impact:** Medium - Need to set up new deployment pipeline

---

## Testing Strategy

### Unit Tests
- ✅ Keep existing tests (Vitest)
- Update imports if needed
- Test route components independently

### Integration Tests
- Test authentication flow
- Test protected routes
- Test API routes

### E2E Tests
- Update Playwright tests for new routing
- Test navigation flows
- Test form submissions

### Manual Testing Checklist
- [ ] Authentication (login, signup, logout)
- [ ] Route protection (redirects)
- [ ] All pages load correctly
- [ ] Dynamic routes work
- [ ] API routes function
- [ ] PWA features work
- [ ] Theme switching works
- [ ] Mobile navigation works
- [ ] Form submissions work
- [ ] Data fetching works

---

## Rollout Plan

### Option 1: Big Bang Migration
- Migrate entire app at once
- Test thoroughly before deployment
- **Risk:** High
- **Timeline:** 6-7 weeks

### Option 2: Incremental Migration (Recommended)
- Create new TanStack Start app alongside Next.js
- Migrate routes incrementally
- Use feature flags to switch between frameworks
- **Risk:** Medium
- **Timeline:** 8-10 weeks

### Option 3: Parallel Run
- Run both apps in parallel
- Gradually migrate users
- **Risk:** Low
- **Timeline:** 10-12 weeks

**Recommendation:** Option 2 (Incremental Migration)

---

## Risk Assessment

### High Risk
1. **Route Protection Logic**
   - Different middleware system
   - Need thorough testing

2. **Data Fetching Patterns**
   - Server Components → Loaders migration
   - Potential performance impact

3. **Deployment Pipeline**
   - New deployment target
   - Unknown performance characteristics

### Medium Risk
1. **Third-Party Integrations**
   - Better Auth compatibility
   - Convex compatibility
   - PWA features

2. **Theme Management**
   - Replacing `next-themes`
   - Potential flash of unstyled content

3. **Build System**
   - Moving from Next.js to Vite/Vinxi
   - Different bundling behavior

### Low Risk
1. **Component Migration**
   - React components work as-is
   - UI library compatibility

2. **State Management**
   - TanStack Query works as-is
   - Convex works as-is

3. **Styling**
   - Tailwind CSS works as-is
   - No changes needed

---

## Timeline Estimate

### Phase 1: Setup & Foundation (Week 1)
- **Days 1-2:** Install dependencies, set up project structure
- **Days 3-4:** Configure build system, dev server
- **Day 5:** Migrate root layout, test basic routing

### Phase 2: Authentication & Routing (Week 2)
- **Days 1-2:** Migrate authentication middleware
- **Days 3-4:** Set up protected routes, test auth flow
- **Day 5:** Migrate auth API routes

### Phase 3: Page Migration (Weeks 3-4)
- **Week 3:** Migrate public pages + 2-3 authenticated pages
- **Week 4:** Migrate remaining authenticated pages + dynamic routes

### Phase 4: API & Data Fetching (Week 5)
- **Days 1-2:** Migrate API routes
- **Days 3-4:** Update data fetching, test integrations
- **Day 5:** Performance optimization

### Phase 5: Polish & Optimization (Week 6)
- **Days 1-2:** PWA features, theme management
- **Days 3-4:** Bundle optimization, performance testing
- **Day 5:** Bug fixes, polish

### Phase 6: Deployment & Testing (Week 7)
- **Days 1-2:** Set up deployment pipeline
- **Days 3-4:** E2E testing, UAT
- **Day 5:** Production deployment

**Total Estimated Time:** 7 weeks (35 working days)

---

## Additional Considerations

### Performance
- TanStack Start may have different performance characteristics
- Need to benchmark before/after
- Monitor bundle sizes

### SEO
- Ensure meta tags work correctly
- Test server-side rendering
- Verify Open Graph tags

### Developer Experience
- Team needs to learn TanStack Start
- Update documentation
- Update development workflows

### Maintenance
- TanStack Start is newer, less mature
- Community support may be smaller
- Need to monitor for updates/breaking changes

### Rollback Plan
- Keep Next.js version in separate branch
- Can revert if critical issues arise
- Gradual migration allows for rollback

---

## Success Criteria

1. ✅ All routes migrated and working
2. ✅ Authentication flow works correctly
3. ✅ All pages render correctly
4. ✅ API routes function properly
5. ✅ PWA features work
6. ✅ Performance is equal or better
7. ✅ Bundle size is reasonable
8. ✅ All tests pass
9. ✅ No regressions in functionality
10. ✅ Deployment pipeline works

---

## Next Steps

1. **Review this plan** with the team
2. **Set up TanStack Start** in a feature branch
3. **Create proof of concept** for one route
4. **Validate approach** before full migration
5. **Begin Phase 1** once approved

---

## Resources

- [TanStack Start Documentation](https://tanstack.com/start/latest)
- [TanStack Router Documentation](https://tanstack.com/router/latest)
- [TanStack Start GitHub](https://github.com/tanstack/start)
- [Migration Examples](https://github.com/tanstack/start/tree/main/examples)

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-23  
**Author:** AI Assistant  
**Status:** Draft - Pending Review
