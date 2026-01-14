"use client"

import { useAction, useQuery } from "convex/react"
import {
  Brain,
  Check,
  Eye,
  EyeOff,
  Key,
  type LucideIcon,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

interface ApiKeyStatus {
  hasKey: boolean
  maskedKey: string | null
}

interface FeatureItemProps {
  icon: LucideIcon
  title: string
  description: string
}

const FeatureItem = ({ icon: Icon, title, description }: FeatureItemProps) => (
  <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-border/50">
    <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
    <div>
      <h4 className="font-semibold text-sm mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
)

const features = [
  {
    icon: Brain,
    title: "AI Conversation Summaries",
    description:
      "Generate intelligent summaries of your agent conversations, making it easy to understand what happened at a glance.",
  },
  {
    icon: Volume2,
    title: "Text-to-Speech for Summaries",
    description:
      "Listen to conversation summaries on the go. Perfect for reviewing agent work while multitasking.",
  },
  {
    icon: Mic,
    title: "Voice Input for Tasks",
    description:
      "Speak your task descriptions instead of typing. Use voice transcription to quickly create agent tasks.",
  },
  {
    icon: NotebookPen,
    title: "AI Prompt Improvement",
    description:
      "Let AI enhance your task descriptions for better clarity and results. Get suggestions to improve your prompts.",
  },
] as const

type AIProvider = "openai" | "verso"

interface ApiKeyEditorProps {
  className?: string
  isEditing: boolean
  provider: AIProvider
  onSave: (apiKey: string) => Promise<void>
  onCancel: () => void
}

const ApiKeyEditor = ({
  className,
  isEditing,
  provider,
  onSave,
  onCancel,
}: ApiKeyEditorProps) => {
  const [showKey, setShowKey] = useState(false)
  const [newApiKey, setNewApiKey] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const providerName = provider === "openai" ? "OpenAI" : "Verso"
  const placeholder = provider === "openai" ? "sk-..." : "Enter your Verso API key"

  const handleSave = async () => {
    if (!newApiKey.trim() || newApiKey.trim().length < 10) {
      setError(`Please enter a valid ${providerName} API key (at least 10 characters)`)
      return
    }
    setError("")
    setIsSaving(true)
    try {
      await onSave(newApiKey.trim())
      setNewApiKey("")
      setShowKey(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to save ${providerName} API key`
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setNewApiKey("")
    setShowKey(false)
    setError("")
    onCancel()
  }

  if (!isEditing) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <Label htmlFor="apiKey">{providerName} API Key</Label>
        <div className="relative">
          <Input
            id="apiKey"
            type={showKey ? "text" : "password"}
            placeholder={placeholder}
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

const AddKeyButton = ({
  onClick,
  provider,
}: {
  onClick: () => void
  provider: AIProvider
}) => {
  const providerName = provider === "openai" ? "OpenAI" : "Verso"
  return (
    <Button onClick={onClick} className="w-full">
      <Key className="h-4 w-4 mr-2" />
      Add {providerName} API Key
    </Button>
  )
}

export function OpenAIApiKeyManager() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("openai")
  const [openaiStatus, setOpenaiStatus] = useState<ApiKeyStatus>({
    hasKey: false,
    maskedKey: null,
  })
  const [versoStatus, setVersoStatus] = useState<ApiKeyStatus>({
    hasKey: false,
    maskedKey: null,
  })

  const currentProvider = useQuery(api.apiKeys.getAiProvider) ?? "openai"
  const getOpenaiApiKeyStatus = useAction(
    api.apiKeysActions.getOpenaiApiKeyStatus
  )
  const getVersoApiKeyStatus = useAction(api.apiKeysActions.getVersoApiKeyStatus)
  const saveOpenaiApiKey = useAction(api.apiKeysActions.saveOpenaiApiKey)
  const saveVersoApiKey = useAction(api.apiKeysActions.saveVersoApiKey)
  const deleteOpenaiApiKey = useAction(api.apiKeysActions.deleteOpenaiApiKey)
  const deleteVersoApiKey = useAction(api.apiKeysActions.deleteVersoApiKey)
  const setAiProvider = useAction(api.apiKeysActions.setAiProvider)

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      const [openai, verso] = await Promise.all([
        getOpenaiApiKeyStatus(),
        getVersoApiKeyStatus(),
      ])
      setOpenaiStatus(openai)
      setVersoStatus(verso)
    } catch (err) {
      console.error("Failed to fetch API key status:", err)
    } finally {
      setIsLoading(false)
    }
  }, [getOpenaiApiKeyStatus, getVersoApiKeyStatus])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    if (currentProvider) {
      setSelectedProvider(currentProvider)
    }
  }, [currentProvider])

  const handleSave = async (apiKey: string) => {
    if (selectedProvider === "openai") {
      await saveOpenaiApiKey({ apiKey })
    } else {
      await saveVersoApiKey({ apiKey })
    }
    await fetchStatus()
    setIsEditing(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      if (selectedProvider === "openai") {
        await deleteOpenaiApiKey()
      } else {
        await deleteVersoApiKey()
      }
      await fetchStatus()
    } catch (err) {
      console.error(`Failed to delete ${selectedProvider} API key:`, err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleProviderChange = async (provider: AIProvider) => {
    setSelectedProvider(provider)
    await setAiProvider({ provider })
    await fetchStatus()
  }

  const currentStatus =
    selectedProvider === "openai" ? openaiStatus : versoStatus
  const providerName = selectedProvider === "openai" ? "OpenAI" : "Verso"

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

  const hasAnyKey = openaiStatus.hasKey || versoStatus.hasKey

  if (!hasAnyKey) {
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
            Add your AI provider API key to unlock powerful AI features that enhance
            your agent management experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select
                value={selectedProvider}
                onValueChange={(value) => handleProviderChange(value as AIProvider)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="verso">Verso AI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {features.map((feature) => (
              <FeatureItem key={feature.title} {...feature} />
            ))}
          </div>

          {!isEditing && (
            <AddKeyButton
              provider={selectedProvider}
              onClick={() => setIsEditing(true)}
            />
          )}
          <ApiKeyEditor
            className="rounded-lg bg-background/50 p-4"
            isEditing={isEditing}
            provider={selectedProvider}
            onSave={handleSave}
            onCancel={handleCancel}
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
            AI Provider Settings
          </CardTitle>
        </div>
        <CardDescription>
          Configure your AI provider and API keys for AI-powered features.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="space-y-2">
          <Label>Preferred AI Provider</Label>
          <Select
            value={selectedProvider}
            onValueChange={(value) => handleProviderChange(value as AIProvider)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="verso">Verso AI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {/* OpenAI Key Section */}
          <div className="space-y-2">
            <Label>OpenAI API Key</Label>
            {openaiStatus.hasKey ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono">{openaiStatus.maskedKey}</code>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProvider("openai")
                      setIsEditing(true)
                    }}
                  >
                    Update
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      setIsDeleting(true)
                      try {
                        await deleteOpenaiApiKey()
                        await fetchStatus()
                      } catch (err) {
                        console.error("Failed to delete OpenAI API key:", err)
                      } finally {
                        setIsDeleting(false)
                      }
                    }}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProvider("openai")
                  setIsEditing(true)
                }}
                className="w-full"
              >
                <Key className="h-4 w-4 mr-2" />
                Add OpenAI API Key
              </Button>
            )}
          </div>

          {/* Verso Key Section */}
          <div className="space-y-2">
            <Label>Verso API Key</Label>
            {versoStatus.hasKey ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono">{versoStatus.maskedKey}</code>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProvider("verso")
                      setIsEditing(true)
                    }}
                  >
                    Update
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      setIsDeleting(true)
                      try {
                        await deleteVersoApiKey()
                        await fetchStatus()
                      } catch (err) {
                        console.error("Failed to delete Verso API key:", err)
                      } finally {
                        setIsDeleting(false)
                      }
                    }}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProvider("verso")
                  setIsEditing(true)
                }}
                className="w-full"
              >
                <Key className="h-4 w-4 mr-2" />
                Add Verso API Key
              </Button>
            )}
          </div>
        </div>

        {isEditing && (
          <ApiKeyEditor
            provider={selectedProvider}
            isEditing={isEditing}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </CardContent>
    </Card>
  )
}
