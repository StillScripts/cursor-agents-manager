import type { AnyFieldApi } from "@tanstack/react-form"
import { Plus, Trash2 } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { TextareaWithVoice } from "@/components/ai/textarea-with-voice"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type FieldProps = {
  field: AnyFieldApi
  description?: string
  label?: string
}

/**
 * Extracts error message from TanStack Form error.
 * Handles strings, Error objects, Zod errors, and other error objects.
 */
export const extractErrorMessage = (error: unknown): string | undefined => {
  if (error === null || error === undefined) {
    return undefined
  }

  // If it's already a string, return it
  if (typeof error === "string") {
    return error
  }

  // If it's an Error instance, use its message
  if (error instanceof Error) {
    return error.message
  }

  // If it's an object with a message property
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string") {
      return message
    }
  }

  // Fallback: try to stringify, but avoid "[object Object]"
  try {
    const stringified = String(error)
    // If it's the generic object string, try JSON.stringify
    if (stringified === "[object Object]") {
      return JSON.stringify(error)
    }
    return stringified
  } catch {
    return "Validation error"
  }
}

const getFieldProps = (
  field: AnyFieldApi,
  description?: string,
  label?: string
): FieldProps & { isInvalid: boolean } => {
  return {
    field,
    description,
    label,
    isInvalid: field.state.meta.isTouched && !field.state.meta.isValid,
  }
}

export const ControlledField = ({
  children,
  description,
  field,
  isInvalid,
  label,
}: {
  children: React.ReactNode
  isInvalid: boolean
} & FieldProps) => {
  return (
    <Field data-invalid={isInvalid}>
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && (
        <FieldError
          errors={field.state.meta.errors.map((e) => {
            const message = extractErrorMessage(e)
            return message ? { message } : undefined
          })}
        />
      )}
    </Field>
  )
}

export const ControlledInput = ({
  field,
  label,
  description,
  ...props
}: FieldProps & ComponentProps<typeof Input>) => {
  const fieldProps = getFieldProps(field, description, label)
  return (
    <ControlledField {...fieldProps}>
      <Input
        {...props}
        id={field.name}
        name={field.name}
        value={field.state.value || ""}
        onBlur={field.handleBlur}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          field.handleChange(e.currentTarget.value || undefined)
        }}
        aria-invalid={fieldProps.isInvalid}
      />
    </ControlledField>
  )
}

export const ControlledTextarea = ({
  field,
  label,
  description,
  ...props
}: FieldProps & ComponentProps<typeof Textarea>) => {
  const fieldProps = getFieldProps(field, description, label)
  return (
    <ControlledField {...fieldProps}>
      <Textarea
        {...props}
        id={field.name}
        name={field.name}
        value={field.state.value || ""}
        onBlur={field.handleBlur}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          field.handleChange(e.currentTarget.value || undefined)
        }}
        aria-invalid={fieldProps.isInvalid}
      />
    </ControlledField>
  )
}

export const ControlledTextareaWithVoice = ({
  field,
  label,
  description,
  className,
  ...props
}: FieldProps & ComponentProps<typeof TextareaWithVoice>) => {
  const fieldProps = getFieldProps(field, description, label)
  return (
    <Field data-invalid={fieldProps.isInvalid}>
      {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
      <TextareaWithVoice
        {...props}
        className={className}
        id={field.name}
        name={field.name}
        value={field.state.value || ""}
        onBlur={field.handleBlur}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          field.handleChange(e.currentTarget.value || undefined)
        }}
        aria-invalid={fieldProps.isInvalid}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {fieldProps.isInvalid && (
        <FieldError
          errors={field.state.meta.errors.map((e) => {
            const message = extractErrorMessage(e)
            return message ? { message } : undefined
          })}
        />
      )}
    </Field>
  )
}

export const ControlledSelect = ({
  field,
  label,
  description,
  options,
  placeholder,
  onValueChange,
  ...props
}: FieldProps & {
  options: Array<{ value: string; label: string }>
  placeholder?: string
  onValueChange?: (value: string) => void
} & Omit<ComponentProps<typeof SelectTrigger>, "children">) => {
  const fieldProps = getFieldProps(field, description, label)
  const hasValue = Boolean(field.state.value)
  return (
    <ControlledField {...fieldProps}>
      <Select
        value={field.state.value || null}
        onValueChange={(value) => {
          field.handleChange(value || undefined)
          onValueChange?.(value)
        }}
      >
        <SelectTrigger {...props}>
          {hasValue ? (
            <SelectValue />
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ControlledField>
  )
}

export const ControlledArrayField = <T,>({
  field,
  label,
  description,
  defaultItem,
  renderItem,
  addButtonText = "Add Item",
}: FieldProps & {
  defaultItem: T
  renderItem: (
    index: number,
    item: T,
    updateItem: (updatedItem: T) => void
  ) => ReactNode
  addButtonText?: string
}) => {
  const fieldProps = getFieldProps(field, description, label)
  const items = (field.state.value as T[]) || []

  const addItem = () => {
    field.handleChange([...items, defaultItem] as T[])
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    field.handleChange(newItems as T[])
  }

  const updateItem = (index: number, updatedItem: T) => {
    const newItems = items.map((item, i) => (i === index ? updatedItem : item))
    field.handleChange(newItems as T[])
  }

  return (
    <ControlledField {...fieldProps}>
      <FieldGroup className="gap-3">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center p-4 border border-dashed rounded-md">
            No items yet. Click &quot;{addButtonText}&quot; to get started.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              className="relative border border-border rounded-md p-4 space-y-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Item {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="h-7 px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {renderItem(index, item, (updatedItem) =>
                updateItem(index, updatedItem)
              )}
            </div>
          ))
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {addButtonText}
        </Button>
      </FieldGroup>
    </ControlledField>
  )
}

export const ControlledSwitch = ({
  field,
  label,
  description,
  ...props
}: FieldProps & ComponentProps<typeof Switch>) => {
  const fieldProps = getFieldProps(field, description, label)
  return (
    <Field orientation="horizontal" data-invalid={fieldProps.isInvalid}>
      <Switch
        {...props}
        id={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
      />
      <FieldContent>
        {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
        {description && <FieldDescription>{description}</FieldDescription>}
        {fieldProps.isInvalid && (
          <FieldError
            errors={field.state.meta.errors.map((e) => {
              const message = extractErrorMessage(e)
              return message ? { message } : undefined
            })}
          />
        )}
      </FieldContent>
    </Field>
  )
}

const skeletonHeights = {
  input: "h-8",
  textarea: "h-[120px]",
  select: "h-8",
} as const

export const FieldSkeleton = ({
  label,
  description,
  variant = "input",
  className,
}: {
  label?: string
  description?: string
  variant?: keyof typeof skeletonHeights
  className?: string
}) => {
  return (
    <Field>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Skeleton
        className={cn(skeletonHeights[variant], "w-full rounded-lg", className)}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}
