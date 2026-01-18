"use client"

import { NumberField } from "@base-ui/react/number-field"
import { GripHorizontal, Minus, Plus } from "lucide-react"
import type * as React from "react"

import { cn } from "@/lib/utils"

function NumberInputRoot({
  className,
  ...props
}: React.ComponentProps<typeof NumberField.Root>) {
  return (
    <NumberField.Root
      data-slot="number-input"
      className={cn("flex flex-col items-start gap-1", className)}
      {...props}
    />
  )
}

function NumberInputScrubArea({
  className,
  ...props
}: React.ComponentProps<typeof NumberField.ScrubArea>) {
  return (
    <NumberField.ScrubArea
      className={cn("cursor-ew-resize", className)}
      {...props}
    />
  )
}

function NumberInputScrubAreaCursor({
  className,
  ...props
}: React.ComponentProps<typeof NumberField.ScrubAreaCursor>) {
  return (
    <NumberField.ScrubAreaCursor
      className={cn(
        "drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] filter",
        className
      )}
      {...props}
    >
      <GripHorizontal className="size-3.5 text-foreground" />
    </NumberField.ScrubAreaCursor>
  )
}

function NumberInputGroup({
  className,
  ...props
}: React.ComponentProps<typeof NumberField.Group>) {
  return <NumberField.Group className={cn("flex", className)} {...props} />
}

function NumberInputDecrement({
  className,
  ...props
}: React.ComponentProps<typeof NumberField.Decrement>) {
  return (
    <NumberField.Decrement
      className={cn(
        "flex size-10 items-center justify-center rounded-l-lg border border-input bg-input/50 text-foreground select-none transition-colors hover:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30",
        className
      )}
      {...props}
    >
      <Minus className="size-4" />
    </NumberField.Decrement>
  )
}

function NumberInputInput({
  className,
  ...props
}: React.ComponentProps<typeof NumberField.Input>) {
  return (
    <NumberField.Input
      data-slot="number-input-input"
      className={cn(
        "h-10 w-24 border-y border-input bg-transparent text-center text-base tabular-nums text-foreground transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function NumberInputIncrement({
  className,
  ...props
}: React.ComponentProps<typeof NumberField.Increment>) {
  return (
    <NumberField.Increment
      className={cn(
        "flex size-10 items-center justify-center rounded-r-lg border border-input bg-input/50 text-foreground select-none transition-colors hover:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30",
        className
      )}
      {...props}
    >
      <Plus className="size-4" />
    </NumberField.Increment>
  )
}

const NumberInput = Object.assign(NumberInputRoot, {
  Root: NumberInputRoot,
  ScrubArea: NumberInputScrubArea,
  ScrubAreaCursor: NumberInputScrubAreaCursor,
  Group: NumberInputGroup,
  Decrement: NumberInputDecrement,
  Input: NumberInputInput,
  Increment: NumberInputIncrement,
})

export { NumberInput }
