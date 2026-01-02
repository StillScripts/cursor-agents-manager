"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { signUp } from "@/lib/auth-client"
import { FormProvider, useAppForm } from "@/lib/hooks/use-app-form"
import {
  signUpFormSchema,
  type SignUpFormData,
} from "@/lib/schemas/auth"

export function SignupForm() {
  const [error, setError] = useState("")
  const router = useRouter()

  // @ts-expect-error - useAppForm generic signature expects 12 type args in this version, but inference works correctly
  const form = useAppForm<SignUpFormData>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: signUpFormSchema,
    },
    onSubmit: async ({ value }) => {
      setError("")

      try {
        const result = await signUp.email({
          email: value.email,
          password: value.password,
          name: value.name,
          callbackURL: "/",
        })

        if (result.error) {
          setError(result.error.message || "Failed to create account")
          return
        }

        // Successfully signed up, redirect to home
        router.push("/")
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
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Sign up for Cursor Agent Manager</CardDescription>
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
                <form.AppField name="name">
                  {(field) => (
                    <field.ControlledInput
                      field={field}
                      label="Name"
                      placeholder="Your name"
                    />
                  )}
                </form.AppField>

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
                      description="Must be at least 8 characters"
                    />
                  )}
                </form.AppField>

                <form.AppField name="confirmPassword">
                  {(field) => (
                    <field.ControlledInput
                      field={field}
                      label="Confirm Password"
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
                  label="Create Account"
                  className="w-full"
                />
              </div>
            </form>
          </FormProvider>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
