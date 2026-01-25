import { useRouter } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { AlertTriangle, Trash2 } from "lucide-react"
import { useState } from "react"
import {
  type DeleteAccountFormData,
  deleteAccountSchema,
} from "validators/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import { deleteUser, signOut } from "@/lib/better-auth/auth-client"
import { FormProvider, useAppForm } from "@/lib/hooks/use-app-form"

export function DeleteAccountButton() {
  const router = useRouter()
  const deleteAccountMutation = useMutation(api.users.deleteAccount)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // @ts-expect-error - useAppForm generic signature expects 12 type args in this version, but inference works correctly
  const form = useAppForm<DeleteAccountFormData>({
    defaultValues: {
      confirmation: "",
    },
    validators: {
      onSubmit: deleteAccountSchema,
    },
    onSubmit: async () => {
      setError(null)

      try {
        // Delete all user data via Convex mutation
        await deleteAccountMutation()

        // Sign out the user
        await deleteUser({
          callbackURL: "/",
        })
        try {
          await signOut()
        } catch (error) {
          console.error("Failed to sign out:", error)
        }
        // In case the callbackURL fails...
        router.navigate({ to: "/" })
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to delete account")
        )
        // Don't close dialog on error so user can try again
      }
    },
  })

  const errorMessage = error?.message ?? null

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={() => setIsOpen(true)}
          >
            <Trash2 className="h-5 w-5 mr-3" />
            Delete Account
          </Button>
        }
      />
      <AlertDialogContent className="max-w-[90%] rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and all associated data including agents, conversations,
            repositories, branches, tasks, and time logs.
          </AlertDialogDescription>
        </AlertDialogHeader>

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
            <form.AppField name="confirmation">
              {(field) => (
                <div className="space-y-2">
                  <field.ControlledInput
                    field={field}
                    label='Type "DELETE" to confirm'
                    description="This confirms that you want to permanently delete your account"
                    placeholder="DELETE"
                    autoComplete="off"
                  />
                </div>
              )}
            </form.AppField>

            {error && errorMessage && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Failed to delete account</AlertTitle>
                <AlertDescription className="mt-2">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={form.state.isSubmitting}
              >
                {form.state.isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Deleting...
                  </span>
                ) : (
                  "Delete Account"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </FormProvider>
      </AlertDialogContent>
    </AlertDialog>
  )
}
