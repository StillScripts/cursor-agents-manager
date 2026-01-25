import { useAction } from "convex/react"
import {
  AlertCircle,
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  Github,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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

interface TokenStatus {
  hasKey: boolean
  maskedKey: string | null
}

interface TokenValidation {
  valid: boolean
  username?: string
  avatarUrl?: string
  expiresAt?: string | null
  scopes?: string[]
  error?: string
}

export function GithubTokenManager() {
  const [isEditing, setIsEditing] = useState(false)
  const [newToken, setNewToken] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({
    hasKey: false,
    maskedKey: null,
  })
  const [validation, setValidation] = useState<TokenValidation | null>(null)

  const getGithubTokenStatus = useAction(
    api.apiKeysActions.getGithubTokenStatus
  )
  const saveGithubToken = useAction(api.apiKeysActions.saveGithubToken)
  const deleteGithubToken = useAction(api.apiKeysActions.deleteGithubToken)
  const checkGithubToken = useAction(api.github.checkGithubToken)

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      const status = await getGithubTokenStatus()
      setTokenStatus(status)
    } catch (err) {
      console.error("Failed to fetch GitHub token status:", err)
    } finally {
      setIsLoading(false)
    }
  }, [getGithubTokenStatus])

  const handleValidate = useCallback(async () => {
    setIsValidating(true)
    try {
      const result = await checkGithubToken()
      setValidation(result)
    } catch (err) {
      setValidation({
        valid: false,
        error: err instanceof Error ? err.message : "Failed to validate token",
      })
    } finally {
      setIsValidating(false)
    }
  }, [checkGithubToken])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Auto-validate when token exists and validation hasn't been done
  useEffect(() => {
    if (tokenStatus.hasKey && !validation && !isValidating) {
      handleValidate()
    }
  }, [tokenStatus.hasKey, validation, isValidating, handleValidate])

  const handleSave = async () => {
    if (!newToken.trim() || newToken.trim().length < 10) {
      setError(
        "Please enter a valid GitHub Personal Access Token (at least 10 characters)"
      )
      return
    }
    setError("")
    setIsSaving(true)
    try {
      await saveGithubToken({ token: newToken.trim() })
      await fetchStatus()
      setValidation(null) // Clear validation so it re-validates
      setIsEditing(false)
      setNewToken("")
      setShowToken(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save GitHub token"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteGithubToken()
      await fetchStatus()
      setValidation(null)
    } catch (err) {
      console.error("Failed to delete GitHub token:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setNewToken("")
    setShowToken(false)
    setError("")
  }

  const formatExpiration = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return null
    try {
      const date = new Date(expiresAt)
      const now = new Date()
      const daysUntilExpiry = Math.ceil(
        (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntilExpiry < 0) {
        return { text: "Expired", isExpired: true, isWarning: false }
      }
      if (daysUntilExpiry <= 7) {
        return {
          text: `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`,
          isExpired: false,
          isWarning: true,
        }
      }
      return {
        text: `Expires ${date.toLocaleDateString()}`,
        isExpired: false,
        isWarning: false,
      }
    } catch {
      return null
    }
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

  const expiration = formatExpiration(validation?.expiresAt)

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Github className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">
            GitHub Personal Access Token
          </CardTitle>
        </div>
        <CardDescription>
          {tokenStatus.hasKey
            ? "Your GitHub token is configured. You can merge pull requests directly from the app."
            : "Add a GitHub Personal Access Token to enable PR merging. Token needs 'repo' scope for private repos or 'public_repo' for public repos."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {!isEditing && tokenStatus.hasKey && (
          <>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <code className="text-sm font-mono">{tokenStatus.maskedKey}</code>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleValidate}
                  disabled={isValidating}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
                  />
                </Button>
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

            {/* Validation Status */}
            {validation && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  {validation.valid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span
                    className={`text-sm font-medium ${validation.valid ? "text-green-500" : "text-destructive"}`}
                  >
                    {validation.valid ? "Token Valid" : "Token Invalid"}
                  </span>
                </div>

                {validation.valid && validation.username && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={validation.avatarUrl}
                        alt={validation.username}
                      />
                      <AvatarFallback>
                        {validation.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      Connected as{" "}
                      <span className="font-medium text-foreground">
                        @{validation.username}
                      </span>
                    </span>
                  </div>
                )}

                {expiration && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        expiration.isExpired
                          ? "destructive"
                          : expiration.isWarning
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {expiration.text}
                    </Badge>
                  </div>
                )}

                {validation.valid &&
                  validation.scopes &&
                  validation.scopes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {validation.scopes.map((scope) => (
                        <Badge
                          key={scope}
                          variant="outline"
                          className="text-xs"
                        >
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  )}

                {validation.error && (
                  <p className="text-sm text-destructive">{validation.error}</p>
                )}
              </div>
            )}
          </>
        )}

        {!isEditing && !tokenStatus.hasKey && (
          <Button onClick={() => setIsEditing(true)} className="w-full">
            <Github className="h-4 w-4 mr-2" />
            Add GitHub Token
          </Button>
        )}

        {isEditing && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="githubToken">Personal Access Token</Label>
              <div className="relative">
                <Input
                  id="githubToken"
                  type={showToken ? "text" : "password"}
                  placeholder="ghp_..."
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  disabled={isSaving}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a token at GitHub Settings &gt; Developer settings &gt;
                Personal access tokens
              </p>
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
