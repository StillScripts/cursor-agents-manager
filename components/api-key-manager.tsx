"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Key, Eye, EyeOff, Check, Trash2 } from "lucide-react"

interface ApiKeyResponse {
  hasApiKey: boolean
  masked?: string
  createdAt?: string
  updatedAt?: string
}

async function fetchApiKeyStatus(): Promise<ApiKeyResponse> {
  const response = await fetch("/api/user/api-key")
  if (!response.ok) {
    throw new Error("Failed to fetch API key status")
  }
  return response.json()
}

async function saveApiKey(apiKey: string): Promise<void> {
  const response = await fetch("/api/user/api-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to save API key")
  }
}

async function deleteApiKey(): Promise<void> {
  const response = await fetch("/api/user/api-key", {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete API key")
  }
}

export function ApiKeyManager() {
  const [isEditing, setIsEditing] = useState(false)
  const [newApiKey, setNewApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState("")
  const queryClient = useQueryClient()

  const { data: apiKeyData, isLoading } = useQuery({
    queryKey: ["apiKey"],
    queryFn: fetchApiKeyStatus,
  })

  const saveMutation = useMutation({
    mutationFn: saveApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKey"] })
      setIsEditing(false)
      setNewApiKey("")
      setShowKey(false)
      setError("")
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKey"] })
    },
  })

  const handleSave = () => {
    if (!newApiKey.trim() || newApiKey.trim().length < 10) {
      setError("Please enter a valid API key (at least 10 characters)")
      return
    }
    setError("")
    saveMutation.mutate(newApiKey.trim())
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
          <CardTitle className="text-base font-semibold">Cursor API Key</CardTitle>
        </div>
        <CardDescription>
          {apiKeyData?.hasApiKey
            ? "Your API key is configured. The app will use live data from Cursor."
            : "Add your Cursor API key to connect to live data. Without it, the app runs in simulation mode."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {!isEditing && apiKeyData?.hasApiKey && (
          <>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <code className="text-sm font-mono">{apiKeyData.masked}</code>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  Update
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {!isEditing && !apiKeyData?.hasApiKey && (
          <Button onClick={() => setIsEditing(true)} className="w-full">
            <Key className="h-4 w-4 mr-2" />
            Add API Key
          </Button>
        )}

        {isEditing && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  placeholder="key_..."
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  disabled={saveMutation.isPending}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="flex-1">
                {saveMutation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saveMutation.isPending}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
