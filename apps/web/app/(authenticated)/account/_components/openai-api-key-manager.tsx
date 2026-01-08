"use client"

import { useAction } from "convex/react"
import { Check, Eye, EyeOff, Key, Trash2 } from "lucide-react"
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

interface ApiKeyStatus {
  hasKey: boolean
  maskedKey: string | null
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

        {isEditing && (
          <div className="space-y-3">
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
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
