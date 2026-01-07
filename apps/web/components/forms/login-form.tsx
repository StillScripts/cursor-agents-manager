"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { signIn } from "@/lib/better-auth/auth-client"
import { FormProvider, useAppForm } from "@/lib/hooks/use-app-form"
import { type SignInFormData, signInFormSchema } from "@/lib/validators/auth"

function LoginFormContent() {
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  // @ts-expect-error - useAppForm generic signature expects 12 type args in this version, but inference works correctly
  const form = useAppForm<SignInFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signInFormSchema,
    },
    onSubmit: async ({ value }) => {
      setError("")

      try {
        const result = await signIn.email({
          email: value.email,
          password: value.password,
          callbackURL: callbackUrl,
        })

        if (result.error) {
          setError(result.error.message || "Failed to sign in")
          return
        }

        router.push(callbackUrl)
        router.refresh()
      } catch (_err) {
        setError("An unexpected error occurred")
      }
    },
  })

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Sign in to your Cursor Agent Manager account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider value={form}>
            <form
              id={form.formId}
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
              className="space-y-4"
            >
              <FieldGroup>
                <form.AppField name="email">
                  {(field) => (
                    <field.ControlledInput
                      field={field}
                      label="Email"
                      type="email"
                      placeholder="you@example.com"
                    />
                  )}
                </form.AppField>

                <form.AppField name="password">
                  {(field) => (
                    <field.ControlledInput
                      field={field}
                      label="Password"
                      type="password"
                    />
                  )}
                </form.AppField>
              </FieldGroup>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="mt-6">
                <form.SubscribeButton
                  formId={form.formId}
                  label="Sign In"
                  className="w-full"
                />
              </div>
            </form>
          </FormProvider>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function LoginFormSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-32" />
            <div className="h-4 bg-muted rounded w-48" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function LoginForm() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginFormContent />
    </Suspense>
  )
}
