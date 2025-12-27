"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useFormContext } from "@/lib/hooks/use-app-form"

/**
 * A button that subscribes to the form state and displays a loading spinner when the form is submitting
 * @param label - The button text
 * @param icon - Optional icon to display before the label
 * @returns A button that subscribes to the form state and displays a loading spinner when the form is submitting
 */
export function SubscribeButton({
  formId,
  label,
  icon,
  className,
}: {
  formId: string
  label: string
  icon?: React.ReactNode
  className?: string
}) {
  const form = useFormContext()
  return (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <Button
          form={formId}
          type={isSubmitting ? "button" : "submit"}
          aria-disabled={isSubmitting || !canSubmit}
          disabled={isSubmitting || !canSubmit}
          className={className}
        >
          {isSubmitting ? (
            <Spinner className="h-5 w-5 mr-2" />
          ) : (
            icon && <span className="mr-2">{icon}</span>
          )}
          {label}
          <span aria-live="polite" className="sr-only" role="status">
            {isSubmitting ? "Loading" : label}
          </span>
        </Button>
      )}
    </form.Subscribe>
  )
}
