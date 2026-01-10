# Cursor Agent Manager

<div align="center">

**Manage your Cursor background agents on the go** 🚀

A mobile-first Next.js application for managing Cursor background agents from anywhere. Built with modern web technologies and designed for developers who need to monitor and control their AI agents while away from their desk.

[![Built with Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.2.16+ installed
- [Convex](https://convex.dev) account (free tier available)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/StillScripts/cursor-agents-manager.git
   cd cursor-agents-manager
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Configure environment variables**
   
   **Step 3a: Create environment file at monorepo root**
   ```bash
   cp .env.example .env.local
   ```
   
   **Step 3b: Generate and set encryption secret**
   ```bash
   openssl rand -base64 32
   ```
   Edit `.env.local` (at the monorepo root) and set `ENCRYPTION_SECRET` to the generated value.
   
   > **Note**: You only need to set `ENCRYPTION_SECRET` manually. The other 3 variables (`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`) will be automatically generated when you run `bun run dev` in the next step. Convex CLI will prompt you to create a project and add these values.
   
   See [Environment Variables](#-environment-variables) for complete details.

4. **Start development server**
   ```bash
   bun run dev
   ```
   
   This command starts both the Next.js dev server and Convex dev server together. On first run, Convex will:
   - Prompt you to create a Convex project (if you haven't already)
   - Generate and add the Convex environment variables to your `.env.local` file (at monorepo root)
   - Create `packages/backend/.env.local` with `CONVEX_DEPLOYMENT`

5. **Configure Convex Dashboard environment variables**
   
   After Convex creates your project, go to your [Convex Dashboard](https://dashboard.convex.dev) → Settings → Environment Variables and configure variables for your **dev** deployment:
   
   **Required:**
   - `SITE_URL` = `http://localhost:3000` (for development)
   - `ENCRYPTION_SECRET` = same value as in `.env.local` (at monorepo root)
   
   **Optional (for webhook support):**
   - `CURSOR_WEBHOOK_URL` = `https://your-deployment.convex.site/webhooks/cursor`
   - `CURSOR_WEBHOOK_SECRET` = generate with `openssl rand -hex 32`
   
   > **Note**: For production, you'll need to set these same variables in your production deployment's environment variables, but with `SITE_URL` set to your production URL (e.g., `https://your-app.com`).

🎉 **Open [http://localhost:3000](http://localhost:3000)** and create your account!

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Architecture** | Bun Monorepo with Workspaces |
| **Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS 4, Base UI |
| **Authentication** | Better Auth + Convex |
| **Backend** | Convex (database, functions, real-time) |
| **State Management** | TanStack React Query + Convex |
| **Forms** | TanStack React Form |
| **Runtime** | Bun |
| **Language** | TypeScript 5.0 |
| **Deployment** | Vercel + Convex |

## ⚙️ Environment Variables

Environment variables are organized into three categories based on where they're used:

### 1. Local Development (`.env.local` at monorepo root)

These 4 variables are all you need for local development. The `.env.local` file should be created at the **monorepo root** (same directory as `package.json`).

**Setup:**
```bash
cp .env.example .env.local
```

**The 4 Required Variables:**

```bash
# 1. Convex Deployment (Auto-generated)
# Automatically generated when you run `bun run dev` for the first time
CONVEX_DEPLOYMENT=dev:your-deployment-name

# 2. Convex URL (Auto-generated)
# Automatically generated when you run `bun run dev` for the first time
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# 3. Convex Site URL (Auto-generated)
# Automatically generated when you run `bun run dev` for the first time
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site

# 4. Encryption Secret (Manual - Required)
# Generate with: openssl rand -base64 32
# IMPORTANT: This same value must also be set in Convex Dashboard
ENCRYPTION_SECRET=your-encryption-secret-min-32-chars
```

> **Note**: When you run `bun run dev` for the first time, Convex CLI will automatically:
> - Create `packages/backend/.env.local` with `CONVEX_DEPLOYMENT`
> - Add the 3 Convex variables (items 1-3 above) to your `.env.local` file (at monorepo root)
> - You only need to manually set `ENCRYPTION_SECRET` (item 4)

### 2. Convex CLI Variables (`packages/backend/.env.local`)

These variables are used by the Convex CLI when running `bunx convex dev`.

**Auto-generated:** Convex CLI automatically creates this file when you run `bun run dev` for the first time. You typically don't need to create it manually.

**Contains:**
```bash
CONVEX_DEPLOYMENT=dev:your-deployment-name
```

This tells the Convex CLI which deployment to use. It's automatically synced with the value in `.env.local` (at monorepo root).

### 3. Convex Dashboard Environment Variables

These variables are used by Convex functions running in the Convex cloud (not locally). Set them in your Convex Dashboard: **Settings → Environment Variables**

You need to configure these for **both your dev and production deployments** (with different `SITE_URL` values).

#### Required Variables

| Variable | Purpose | Dev Value | Prod Value |
|----------|---------|-----------|------------|
| `SITE_URL` | Your app URL for Better Auth | `http://localhost:3000` | `https://your-app.com` |
| `ENCRYPTION_SECRET` | Secret for encrypting API keys. **Must match** the value in `.env.local` (at monorepo root) | Same as local | Same as local |

#### Optional Variables (for webhook support)

| Variable | Purpose | How to Get |
|----------|---------|------------|
| `CURSOR_WEBHOOK_URL` | Your Convex webhook endpoint | `https://your-deployment.convex.site/webhooks/cursor` |
| `CURSOR_WEBHOOK_SECRET` | Secret for webhook signature verification | Generate with `openssl rand -hex 32` |

**Where to find your Convex site URL:**
- Check `NEXT_PUBLIC_CONVEX_SITE_URL` in your `.env.local` file (at monorepo root)
- Or find it in your Convex Dashboard under your deployment settings

**Setting Variables in Convex Dashboard:**
1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your deployment (dev or production)
3. Navigate to **Settings → Environment Variables**
4. Add the required variables for that deployment
5. Repeat for your production deployment with production `SITE_URL`

### Generating Secrets

Generate secure random secrets:

```bash
# For ENCRYPTION_SECRET (base64) - used in both .env.local and Convex Dashboard
openssl rand -base64 32

# For CURSOR_WEBHOOK_SECRET (hex) - only used in Convex Dashboard
openssl rand -hex 32
```

### Quick Setup Summary

**Local Development:**
1. **Create `.env.local` at monorepo root** with `ENCRYPTION_SECRET` (generate with `openssl rand -base64 32`)
2. **Run `bun run dev`** from monorepo root - Convex CLI will auto-generate the 3 Convex variables
3. You now have all 4 variables needed for local development ✅

**Convex Dashboard (Dev Deployment):**
1. Go to [Convex Dashboard](https://dashboard.convex.dev) → Select your dev deployment → Settings → Environment Variables
2. Add required variables:
   - `SITE_URL` = `http://localhost:3000`
   - `ENCRYPTION_SECRET` = same value as in `.env.local` (at monorepo root)
3. Add optional variables (for webhook support):
   - `CURSOR_WEBHOOK_URL` = `https://your-deployment.convex.site/webhooks/cursor`
   - `CURSOR_WEBHOOK_SECRET` = generate with `openssl rand -hex 32`

**Convex Dashboard (Production Deployment):**
1. Go to [Convex Dashboard](https://dashboard.convex.dev) → Select your production deployment → Settings → Environment Variables
2. Add required variables:
   - `SITE_URL` = `https://your-app.com` (your production URL)
   - `ENCRYPTION_SECRET` = same value as in `.env.local` (at monorepo root)
3. Add optional variables (for webhook support):
   - `CURSOR_WEBHOOK_URL` = `https://your-production-deployment.convex.site/webhooks/cursor`
   - `CURSOR_WEBHOOK_SECRET` = same value as dev (or generate a new one)

> **⚠️ Important**: Never commit `.env.local` files to version control. They're already in `.gitignore`.

## 📁 Project Structure

This is a **Bun monorepo** with the following structure:

```
cursor-agents-manager/
├── 📱 apps/web/                  # Next.js Web Application
│   ├── app/                      # Next.js App Router
│   │   ├── (authenticated)/      # Pages requiring login
│   │   │   ├── page.tsx          # Agent list (home)
│   │   │   ├── new/              # Launch new agent
│   │   │   ├── agent/[id]/       # Agent detail view
│   │   │   ├── account/          # Account management
│   │   │   └── settings/         # User settings
│   │   ├── (unauthenticated)/    # Public pages
│   │   │   ├── login/            # Login page
│   │   │   └── signup/           # Signup page
│   │   └── (server)/api/         # API Routes
│   ├── components/               # React Components
│   ├── lib/                      # App-specific logic & hooks
│   └── proxy.ts                  # Route protection middleware
│
├── 📦 packages/
│   ├── backend/                  # Convex Backend
│   │   └── convex/               # Convex functions
│   │       ├── schema.ts         # Database schema
│   │       ├── agents.ts         # Agent queries
│   │       ├── cursor.ts         # Agent mutations/actions
│   │       ├── apiKeys.ts        # API key queries
│   │       ├── auth.ts           # Better Auth + Convex
│   │       └── ...               # Other Convex functions
│   ├── validators/               # Shared Zod schemas
│   ├── encryption/               # AES-256-GCM encryption
│   ├── helpers/                  # Shared utilities
│   └── tests/                    # Shared test configuration
│
├── 🔧 scripts/
│   └── dev.ts                    # Unified dev server script
│
└── package.json                  # Workspace configuration
```

### Monorepo Workspaces

| Workspace | Purpose |
|-----------|---------|
| `apps/web` | Next.js 16 web application |
| `packages/backend` | Convex backend (schema, functions, actions) |
| `packages/validators` | Shared Zod validation schemas |
| `packages/encryption` | AES-256-GCM encryption utilities |
| `packages/helpers` | Shared utilities (formatting, mock data) |
| `packages/tests` | Shared Vitest configuration and tests |

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server (Next.js + Convex) |
| `bun run build` | Create production build |
| `bun run start` | Start production server |
| `bun run lint` | Run Biome for code quality |
| `bun run lint:fix` | Auto-fix linting and formatting issues |
| `bun run test` | Run tests (Vitest + convex-test) |

### Development Workflow

```bash
# Start both Next.js and Convex dev servers together (recommended)
bun run dev

# Or run individually in separate terminals:
bun run dev:web      # Next.js only (apps/web)
bun run dev:backend  # Convex only (packages/backend)
```

## 📚 Documentation

- **[AGENTS.md](./AGENTS.md)** - Comprehensive architecture, testing, and implementation guide
- **[CLAUDE.md](./CLAUDE.md)** - Detailed development guide
- **[Convex Docs](https://docs.convex.dev)** - Backend documentation
- **[Better Auth Docs](https://www.better-auth.com/docs)** - Authentication documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ for developers managing Cursor agents**

[⭐ Star this repo](https://github.com/StillScripts/cursor-agents-manager) • [🐛 Report Bug](https://github.com/StillScripts/cursor-agents-manager/issues) • [✨ Request Feature](https://github.com/StillScripts/cursor-agents-manager/issues)

</div>
