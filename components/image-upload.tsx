"use client"

import { Upload, X } from "lucide-react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { PromptImage } from "@/lib/schemas/cursor/launch-agent"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  value: PromptImage[]
  onChange: (images: PromptImage[]) => void
  onBlur?: () => void
  label?: string
  description?: string
  error?: string
  maxImages?: number
  disabled?: boolean
}

export function ImageUpload({
  value = [],
  onChange,
  onBlur,
  label = "Images",
  description,
  error,
  maxImages = 5,
  disabled = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  // Store mime types for preview (index -> mime type)
  const [mimeTypes, setMimeTypes] = useState<Map<number, string>>(new Map())

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const remainingSlots = maxImages - value.length
    if (remainingSlots <= 0) {
      return
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots)
    setIsProcessing(true)

    try {
      const newImages: (PromptImage & { mimeType?: string })[] =
        await Promise.all(
          filesToProcess.map(
            (file): Promise<PromptImage & { mimeType?: string }> =>
              new Promise((resolve, reject) => {
                // Validate file type
                if (!file.type.startsWith("image/")) {
                  reject(new Error(`${file.name} is not an image file`))
                  return
                }

                // Validate file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                  reject(new Error(`${file.name} is too large (max 10MB)`))
                  return
                }

                const reader = new FileReader()

                reader.onload = (e) => {
                  const img = new Image()
                  img.onload = () => {
                    const dataUrl = e.target?.result as string
                    // Extract mime type from data URL
                    const mimeTypeMatch = dataUrl.match(/data:([^;]+);/)
                    const mimeType = mimeTypeMatch
                      ? mimeTypeMatch[1]
                      : "image/png"
                    // Remove data:image/...;base64, prefix if present
                    const base64Data = dataUrl.includes(",")
                      ? dataUrl.split(",")[1]
                      : dataUrl

                    resolve({
                      data: base64Data,
                      dimension: {
                        width: img.width,
                        height: img.height,
                      },
                      mimeType, // Store temporarily for preview
                    } as PromptImage & { mimeType: string })
                  }
                  img.onerror = () => {
                    reject(new Error(`Failed to load image: ${file.name}`))
                  }
                  img.src = e.target?.result as string
                }

                reader.onerror = () => {
                  reject(new Error(`Failed to read file: ${file.name}`))
                }

                reader.readAsDataURL(file)
              })
          )
        )

      // Store mime types for preview
      const startIndex = value.length
      const newMimeTypes = new Map(mimeTypes)
      newImages.forEach((img, idx) => {
        if (img.mimeType) {
          newMimeTypes.set(startIndex + idx, img.mimeType)
        }
      })
      setMimeTypes(newMimeTypes)

      // Remove mimeType before storing (not part of schema)
      const imagesToStore: PromptImage[] = newImages.map(
        ({ mimeType, ...img }) => img
      )
      onChange([...value, ...imagesToStore])
    } catch (err) {
      console.error("Error processing images:", err)
      // You could show a toast notification here
    } finally {
      setIsProcessing(false)
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = (index: number) => {
    const newImages = value.filter((_, i) => i !== index)
    onChange(newImages)

    // Update mime types map
    const newMimeTypes = new Map<number, string>()
    newImages.forEach((_, i) => {
      const originalIndex = i < index ? i : i + 1
      const mimeType = mimeTypes.get(originalIndex)
      if (mimeType) {
        newMimeTypes.set(i, mimeType)
      }
    })
    setMimeTypes(newMimeTypes)
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const getPreviewUrl = (image: PromptImage, index: number) => {
    // Use stored mime type if available, otherwise default to png
    const mimeType = mimeTypes.get(index) || "image/png"
    return `data:${mimeType};base64,${image.data}`
  }

  const isInvalid = Boolean(error)
  const canAddMore = value.length < maxImages

  return (
    <Field data-invalid={isInvalid}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            onBlur={onBlur}
            disabled={disabled || !canAddMore || isProcessing}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            disabled={disabled || !canAddMore || isProcessing}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {isProcessing
              ? "Processing..."
              : canAddMore
                ? `Upload Images (${value.length}/${maxImages})`
                : `Maximum ${maxImages} images reached`}
          </Button>
        </div>

        {value.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {value.map((image, index) => (
              <div
                key={index}
                className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
              >
                <img
                  src={getPreviewUrl(image, index)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  className={cn(
                    "absolute top-1 right-1 p-1 rounded-full bg-destructive/90 hover:bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label={`Remove image ${index + 1}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                  {image.dimension.width} × {image.dimension.height}
                </div>
              </div>
            ))}
          </div>
        )}

        {description && <FieldDescription>{description}</FieldDescription>}
        {isInvalid && error && <FieldError errors={[{ message: error }]} />}
      </div>
    </Field>
  )
}
