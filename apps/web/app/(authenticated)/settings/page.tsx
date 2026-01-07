import { ArrowRight, Mic, Sparkles, Volume2 } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { PageHeader } from "@/app/(authenticated)/_components/page-header"
import { ThemeSelector } from "@/app/(authenticated)/settings/_components/theme-selector"
import { BranchesFormContainer } from "@/components/forms/branches-form"
import { RepositoriesFormContainer } from "@/components/forms/repositories-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure your repositories and branches",
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <div className="p-4 flex flex-col gap-4 sm:gap-6">
        <PageHeader title="Settings" showBack />
        <ThemeSelector />
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                Unlock AI-Powered Features
              </CardTitle>
            </div>
            <CardDescription className="text-base">
              Add your OpenAI API key to unlock powerful AI features that
              enhance your agent management experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-border/50">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm mb-1">
                    AI Conversation Summaries
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Get intelligent summaries of your agent conversations,
                    making it easy to understand what happened at a glance.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-border/50">
                <Volume2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm mb-1">
                    Text-to-Speech for Summaries
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Listen to conversation summaries on the go. Perfect for
                    reviewing agent work while multitasking.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-border/50">
                <Mic className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm mb-1">
                    Voice Input for Tasks
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Speak your task descriptions instead of typing. Use voice
                    transcription to quickly create agent tasks.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-border/50">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm mb-1">
                    AI Prompt Improvement
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Let AI enhance your task descriptions for better clarity and
                    results. Get suggestions to improve your prompts.
                  </p>
                </div>
              </div>
            </div>
            <Link href="/account">
              <div className="flex items-center justify-between p-4 bg-primary/10 hover:bg-primary/20 rounded-lg border border-primary/20 transition-colors cursor-pointer group">
                <div>
                  <p className="font-semibold text-sm mb-1">
                    Add Your OpenAI API Key
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Get your key from platform.openai.com
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <RepositoriesFormContainer />
        <BranchesFormContainer />
      </div>
    </Suspense>
  )
}
