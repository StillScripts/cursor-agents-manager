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
   
   Copy the example file:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```
   
   Generate your encryption secret and add it to `apps/web/.env.local`:
   ```bash
   openssl rand -base64 32
   ```
   
   Edit `apps/web/.env.local` and set `ENCRYPTION_SECRET` to the generated value.
   
   > **Note**: The Convex variables (`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`) will be automatically generated when you run `bun run dev` for the first time. Convex will prompt you to create a project and add these values to your `.env.local` file.
   
   See [Environment Variables](#-environment-variables) for complete details.

4. **Start development server**
   ```bash
   bun run dev
   ```
   
   This command starts both the Next.js dev server and Convex dev server together. On first run, Convex will:
   - Prompt you to create a Convex project (if you haven't already)
   - Generate and add the Convex environment variables to your `.env.local` file

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

### Local Environment (`.env.local`)

Copy the example file and fill in your values:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Your `.env.local` should contain:

```bash
# Convex Configuration
# These are auto-generated when you run `bun run dev` for the first time
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site

# Encryption Secret
# Used for encrypting API keys stored in Convex
# Generate with: openssl rand -base64 32
# This same value must also be set in your Convex dashboard
ENCRYPTION_SECRET=your-encryption-secret-min-32-chars
```

> **Note**: The Convex variables (`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`) are automatically generated when you first run `bun run dev` and Convex prompts you to create a project.

### Convex Dashboard Environment Variables

Set these in your Convex dashboard (Settings → Environment Variables):

| Variable | Purpose |
|----------|---------|
| `SITE_URL` | Your app URL (e.g., `http://localhost:3000` for dev) |
| `ENCRYPTION_SECRET` | Same as your local encryption secret |
| `CURSOR_WEBHOOK_URL` | Your Convex webhook endpoint (e.g., `https://your-deployment.convex.site/webhooks/cursor`) |
| `CURSOR_WEBHOOK_SECRET` | Secret for webhook signature verification (generate with `openssl rand -hex 32`) |

### Generating Secrets

Generate secure random secrets:

```bash
# For ENCRYPTION_SECRET (base64)
openssl rand -base64 32

# For CURSOR_WEBHOOK_SECRET (hex)
openssl rand -hex 32
```

> **⚠️ Important**: Never commit `.env.local` to version control. It's already in `.gitignore`.

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
