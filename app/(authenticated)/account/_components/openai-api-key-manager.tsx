"use client"

import { useAction } from "convex/react"
import {
  Brain,
  Check,
  Eye,
  EyeOff,
  Key,
  Mic,
  NotebookPen,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

interface ApiKeyStatus {
  hasKey: boolean
  maskedKey: string | null
}

const OpenAIKeyEditor = ({
  className,
  isEditing,
  showKey,
  newApiKey,
  isSaving,
  setNewApiKey,
  handleSave,
  handleCancel,
  setShowKey,
  error,
}: {
  className?: string
  isEditing: boolean
  showKey: boolean
  newApiKey: string
  setNewApiKey: (key: string) => void
  handleSave: () => void
  handleCancel: () => void
  isSaving: boolean
  setShowKey: (show: boolean) => void
  error: string
}) => {
  if (!isEditing) {
    return null
  }
  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
        <div className="relative">
          <Input
            id="openaiApiKey"
            type={showKey ? "text" : "password"}
            placeholder="sk-..."
            value={newApiKey}
            onChange={(e) => setNewApiKey(e.target.value)}
            disabled={isSaving}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? (
            "Saving..."
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function OpenAIApiKeyManager() {
  const [isEditing, setIsEditing] = useState(false)
  const [newApiKey, setNewApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({
    hasKey: false,
    maskedKey: null,
  })

  const getOpenaiApiKeyStatus = useAction(
    api.apiKeysActions.getOpenaiApiKeyStatus
  )
  const saveOpenaiApiKey = useAction(api.apiKeysActions.saveOpenaiApiKey)
  const deleteOpenaiApiKey = useAction(api.apiKeysActions.deleteOpenaiApiKey)

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      const status = await getOpenaiApiKeyStatus()
      setApiKeyStatus(status)
    } catch (err) {
      console.error("Failed to fetch OpenAI API key status:", err)
    } finally {
      setIsLoading(false)
    }
  }, [getOpenaiApiKeyStatus])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleSave = async () => {
    if (!newApiKey.trim() || newApiKey.trim().length < 10) {
      setError("Please enter a valid OpenAI API key (at least 10 characters)")
      return
    }
    setError("")
    setIsSaving(true)
    try {
      await saveOpenaiApiKey({ apiKey: newApiKey.trim() })
      await fetchStatus()
      setIsEditing(false)
      setNewApiKey("")
      setShowKey(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save OpenAI API key"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteOpenaiApiKey()
      await fetchStatus()
    } catch (err) {
      console.error("Failed to delete OpenAI API key:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setNewApiKey("")
    setShowKey(false)
    setError("")
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (apiKeyStatus.hasKey) {
    return (
      <Card className="bg-linear-to-br from-primary/5 to-primary/0 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              Unlock AI-Powered Features
            </CardTitle>
          </div>
          <CardDescription className="text-base">
            Add your OpenAI API key to unlock powerful AI features that enhance
            your agent management experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-border/50">
              <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm mb-1">
                  AI Conversation Summaries
                </h4>
                <p className="text-sm text-muted-foreground">
                  Generate intelligent summaries of your agent conversations,
                  making it easy to understand what happened at a glance.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-border/50">
              <Volume2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
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
              <Mic className="h-5 w-5 text-primary mt-0.5 shrink-0" />
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
              <NotebookPen className="h-5 w-5 text-primary mt-0.5 shrink-0" />
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

          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="w-full">
              <Key className="h-4 w-4 mr-2" />
              Add OpenAI API Key
            </Button>
          )}
          <OpenAIKeyEditor
            className="rounded-lg bg-background/50 p-4"
            isEditing={isEditing}
            showKey={showKey}
            newApiKey={newApiKey}
            setNewApiKey={setNewApiKey}
            handleSave={handleSave}
            handleCancel={handleCancel}
            isSaving={isSaving}
            setShowKey={setShowKey}
            error={error}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">
            OpenAI API Key
          </CardTitle>
        </div>
        <CardDescription>
          {apiKeyStatus.hasKey
            ? "Your OpenAI API key is configured. You can now use AI-powered conversation summaries."
            : "Add your OpenAI API key to enable AI-powered conversation summaries. Get your key from platform.openai.com."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {!isEditing && apiKeyStatus.hasKey && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <code className="text-sm font-mono">{apiKeyStatus.maskedKey}</code>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Update
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {!isEditing && !apiKeyStatus.hasKey && (
          <Button onClick={() => setIsEditing(true)} className="w-full">
            <Key className="h-4 w-4 mr-2" />
            Add OpenAI API Key
          </Button>
        )}

        <OpenAIKeyEditor
          isEditing={isEditing}
          showKey={showKey}
          newApiKey={newApiKey}
          setNewApiKey={setNewApiKey}
          handleSave={handleSave}
          handleCancel={handleCancel}
          isSaving={isSaving}
          setShowKey={setShowKey}
          error={error}
        />
      </CardContent>
    </Card>
  )
}
