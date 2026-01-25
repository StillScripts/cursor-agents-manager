import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GithubIcon as Github } from "@/components/ui/icons"
import { useSession } from "@/lib/hooks/use-session"

// ============================================================================
// HEADER COMPONENT
// ============================================================================
function Header({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <picture>
            <source type="image/webp" srcSet="/android-chrome-192x192.webp" />
            <img
              src="/android-chrome-192x192.png"
              alt="Cursor Agents Manager"
              width={48}
              height={48}
              className="h-12 w-12 rounded-full"
              fetchPriority="high"
            />
          </picture>
          <span className="font-semibold text-foreground">
            Cursor Agents Manager
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <a
            href="#features"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            How It Works
          </a>
          <a
            href="#screenshots"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Screenshots
          </a>
        </nav>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link to="/agents" className="hidden sm:inline-flex">
              <Button>Go to Agents</Button>
            </Link>
          ) : (
            <>
              <a
                href="https://github.com/StillScripts/cursor-agents-manager"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0"
              >
                <Button variant="ghost" size="icon-xl">
                  <Github className="h-5 w-5" />
                  <span className="sr-only">GitHub</span>
                </Button>
              </a>
              <Link to="/signup" className="hidden sm:inline-flex">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function HeroSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-24 md:pb-20 md:pt-32">
      <div className="absolute inset-0 -z-10">
        {/* Animated gradient orbs */}
        <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-primary/5 blur-3xl [animation-delay:1s]" />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      <div className="container mx-auto">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            Open Source & Free
          </div>

          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Your AI Agents,
            <br />
            <span className="bg-linear-to-r from-primary via-primary to-emerald-400 bg-clip-text text-transparent">
              In Your Pocket
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-8 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
            Launch Cursor background agents, track their progress, and give
            feedback, anywhere, all from your phone. No more running back to
            your desk to check on updates.
          </p>

          {/* CTA Buttons */}
          {isAuthenticated ? (
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/agents">
                <Button size="lg" className="gap-2">
                  Go to Agents
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="https://github.com/StillScripts/cursor-agents-manager"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="gap-2">
                  <Github className="h-5 w-5" />
                  View on GitHub
                </Button>
              </a>
              <Link to="/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 bg-transparent"
                >
                  See How It Works
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

          <picture>
            <source
              type="image/webp"
              srcSet="/images/app-screenshot-800.webp 800w, /images/app-screenshot-1320.webp 1320w"
              sizes="(max-width: 1536px) 100vw, 1536px"
            />
            <img
              src="/images/app-screenshot.png"
              alt="Terminal"
              width={1540}
              height={793}
              className="mt-6 md:mt-8 mx-auto rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm w-full max-w-[1536px]"
              fetchPriority="high"
              loading="eager"
            />
          </picture>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// FEATURES SECTION COMPONENT
// ============================================================================
function FeaturesSection() {
  const features = [
    {
      number: "01",
      title: "Launch Remotely",
      description:
        "Start background agents on any repo, from any device. On the train, at lunch, wherever.",
      highlight: "Any device. Any time.",
    },
    {
      number: "02",
      title: "Real-Time Tracking",
      description:
        "Watch your agents work. See status updates, progress, and completions as they happen.",
      highlight: "Never wonder what's happening.",
    },
    {
      number: "03",
      title: "AI Summaries",
      description:
        "Get instant summaries of what your agents did. Skip the conversation logs, get the highlights.",
      highlight: "Powered by your OpenAI key.",
    },
    {
      number: "04",
      title: "Voice Input",
      description:
        "Speak your task descriptions. Launch agents faster than you can type.",
      highlight: "Talk to your agents.",
    },
    {
      number: "05",
      title: "Text-to-Speech",
      description:
        "Listen to summaries while you multitask. Review agent work on your morning walk.",
      highlight: "Hands-free reviews.",
    },
    {
      number: "06",
      title: "Task Management",
      description:
        "Make use of simple time-tracking and task management to improve your own process.",
      highlight: "Track every second you spend on agents.",
    },
  ]

  return (
    <section
      id="features"
      className="relative border-t border-border/40 px-4 py-20 md:py-28"
    >
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(34 197 94 / 0.3) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
            Features
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Everything you need.
            <br />
            <span className="text-muted-foreground">Nothing you don't.</span>
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.number}
              className={`group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card/80 ${
                index === 0 ? "md:col-span-2 lg:col-span-1" : ""
              }`}
            >
              {/* Large number watermark */}
              <span className="absolute -right-4 -top-4 text-[8rem] font-bold leading-none text-primary/5 transition-colors duration-300 group-hover:text-primary/10">
                {feature.number}
              </span>

              {/* Content */}
              <div className="relative">
                <span className="mb-4 inline-block font-mono text-xs text-primary">
                  {feature.number}
                </span>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                <p className="text-xs font-medium text-primary">
                  {feature.highlight}
                </p>
              </div>

              {/* Hover line effect */}
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-linear-to-r from-primary to-emerald-400 transition-all duration-300 group-hover:w-full" />
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 flex max-w-md items-center justify-center gap-4">
          <div className="h-px flex-1 bg-linear-to-r from-transparent to-primary/50" />
          <span className="text-xs text-muted-foreground">
            More features coming soon
          </span>
          <div className="h-px flex-1 bg-linear-to-l from-transparent to-primary/50" />
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// HOW IT WORKS SECTION COMPONENT
// ============================================================================
function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Connect Your Cursor Account",
      description:
        "Create a Cursor API key and link it to enable immediate integration with your Cursor account.",
    },
    {
      number: "02",
      title: "Launch an Agent",
      description:
        "Add the repositories you want to use Cursor agents on. Describe tasks, choose projects and launch agents.",
    },
    {
      number: "03",
      title: "Monitor Progress",
      description:
        "Track agent status in real-time. Get notified when tasks complete. Use the built-in time-tracking.",
    },
  ]

  return (
    <section id="how-it-works" className="px-4 py-20 md:py-28">
      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Get Started in Minutes
          </h2>
          <p className="text-muted-foreground">
            No complex setup. Just connect your&nbsp;
            <a
              href="https://cursor.com/dashboard?tab=cloud-agents"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4 hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded"
            >
              Cursor
            </a>
            &nbsp;account, launch agents, and have fun
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="relative hidden md:block">
            {/* Base line connecting all three steps */}
            <div className="absolute left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] top-8 h-[2px] bg-border/50" />
            {/* Animated pulsing line overlay */}
            <div className="absolute left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] top-8 h-[2px] overflow-hidden">
              <div
                className="h-full w-1/3 animate-pulse-flow rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--primary)), transparent)",
                  boxShadow:
                    "0 0 12px hsl(var(--primary)), 0 0 24px hsl(var(--primary) / 0.5)",
                }}
              />
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/50 bg-background">
                    <div className="absolute inset-0 rounded-2xl bg-primary/10" />
                    <span className="relative font-mono text-xl font-bold text-primary">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-flow {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(400%);
            opacity: 0;
          }
        }
        .animate-pulse-flow {
          animation: pulse-flow 2.5s ease-in-out infinite;
        }
      `}</style>
    </section>
  )
}

// ============================================================================
// SCREENSHOTS SECTION COMPONENT
// ============================================================================
function ScreenshotsSection() {
  const screenshots = [
    {
      title: "Your Agents Dashboard",
      description:
        "See all your running and completed agents at a glance with real-time status updates.",
      src: "/images/agents-dashboard.png",
      width: 1258,
      height: 476,
    },
    {
      title: "Launch Agent",
      description:
        "Describe tasks with text or voice input. Attach images and select your target repository.",
      src: "/images/launch-agent.png",
      width: 1258,
      height: 476,
    },
    {
      title: "AI-Powered Features",
      description:
        "Unlock summaries, text-to-speech, voice input, and AI prompt improvement with your API key.",
      src: "/images/ai-enhancements.png",
      width: 1258,
      height: 476,
    },
  ]

  return (
    <section
      id="screenshots"
      className="border-t border-border/40 bg-card/30 px-4 py-20 md:py-28"
    >
      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            See It in Action
          </h2>
          <p className="text-muted-foreground">
            A clean, focused interface designed for managing AI agents on any
            device.
          </p>
        </div>

        <div className="mx-auto mt-16 grid gap-8 md:grid-cols-3">
          {screenshots.map((screenshot) => {
            const base = /^\/images\/(.+)\.(png|jpg|jpeg)$/i.exec(
              screenshot.src || ""
            )?.[1]
            const img = (
              <img
                src={screenshot.src || "/placeholder.svg"}
                alt={screenshot.title}
                width={screenshot.width ?? 1258}
                height={screenshot.height ?? 476}
                className="w-full object-cover"
                loading="lazy"
              />
            )
            return (
              <div key={screenshot.title} className="group flex flex-col">
                <div className="relative mb-4 overflow-hidden rounded-xl border border-border/50 bg-background transition-all group-hover:border-primary/50">
                  {base ? (
                    <picture>
                      <source
                        type="image/webp"
                        srcSet={`/images/${base}-400.webp 400w, /images/${base}-800.webp 800w`}
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      {img}
                    </picture>
                  ) : (
                    img
                  )}
                </div>
                <h3 className="mb-1 font-semibold text-foreground">
                  {screenshot.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {screenshot.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// CTA SECTION COMPONENT
// ============================================================================
function CtaSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (isAuthenticated) {
    return null // Don't show CTA section for logged-in users
  }

  return (
    <section className="px-4 py-20 md:py-28">
      <div className="container mx-auto">
        <div className="mx-auto max-w-3xl rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center md:p-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
            <Github className="h-4 w-4" />
            Open Source
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to Build Your Own Cursor Agent Management System?
          </h2>
          <p className="mb-8 text-muted-foreground">
            Cursor Agents Manager is completely free and open source. Self-host
            it, modify it, or contribute to make it better.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://github.com/StillScripts/cursor-agents-manager"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="gap-2">
                <Github className="h-5 w-5" />
                Star on GitHub
              </Button>
            </a>
            <Link to="/signup">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 bg-transparent"
              >
                Try for Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// FOOTER COMPONENT
// ============================================================================
function Footer() {
  return (
    <footer className="border-t border-border/40 px-4 py-8">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Built with</span>
          <span className="text-primary">♥</span>
          <span>by</span>
          <a
            href="https://github.com/StillScripts"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            StillScripts
          </a>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/StillScripts/cursor-agents-manager"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  )
}

// ============================================================================
// MAIN HOMEPAGE SCREEN COMPONENT
// ============================================================================
export function HomepageScreen() {
  const { user, isLoading } = useSession()
  const isAuthenticated = !isLoading && !!user

  return (
    <div className="min-h-screen bg-background">
      <Header isAuthenticated={isAuthenticated} />
      <main>
        <HeroSection isAuthenticated={isAuthenticated} />
        <FeaturesSection />
        <HowItWorksSection />
        <ScreenshotsSection />
        <CtaSection isAuthenticated={isAuthenticated} />
      </main>
      <Footer />
    </div>
  )
}
