import { ImageIcon, Upload, X } from "lucide-react"
import type React from "react"
import { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface PromptImage {
  data: string
  dimension: {
    width: number
    height: number
  }
}

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
  const [isDragOver, setIsDragOver] = useState(false)
  const [mimeTypes, setMimeTypes] = useState<Map<number, string>>(new Map())

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      const remainingSlots = maxImages - value.length
      if (remainingSlots <= 0) return

      const filesToProcess = Array.from(files).slice(0, remainingSlots)
      setIsProcessing(true)

      try {
        const newImages: (PromptImage & { mimeType?: string })[] =
          await Promise.all(
            filesToProcess.map(
              (file): Promise<PromptImage & { mimeType?: string }> =>
                new Promise((resolve, reject) => {
                  if (!file.type.startsWith("image/")) {
                    reject(new Error(`${file.name} is not an image file`))
                    return
                  }

                  if (file.size > 10 * 1024 * 1024) {
                    reject(new Error(`${file.name} is too large (max 10MB)`))
                    return
                  }

                  const reader = new FileReader()

                  reader.onload = (e) => {
                    const img = new window.Image()
                    img.crossOrigin = "anonymous"
                    img.onload = () => {
                      const dataUrl = e.target?.result as string
                      const mimeTypeMatch = dataUrl.match(/data:([^;]+);/)
                      const mimeType = mimeTypeMatch
                        ? mimeTypeMatch[1]
                        : "image/png"
                      const base64Data = dataUrl.includes(",")
                        ? dataUrl.split(",")[1]
                        : dataUrl

                      resolve({
                        data: base64Data,
                        dimension: {
                          width: img.width,
                          height: img.height,
                        },
                        mimeType,
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

        const startIndex = value.length
        const newMimeTypes = new Map(mimeTypes)
        newImages.forEach((img, idx) => {
          if (img.mimeType) {
            newMimeTypes.set(startIndex + idx, img.mimeType)
          }
        })
        setMimeTypes(newMimeTypes)

        const imagesToStore: PromptImage[] = newImages.map(
          ({ mimeType, ...img }) => img
        )
        onChange([...value, ...imagesToStore])
      } catch (err) {
        console.error("Error processing images:", err)
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    },
    [maxImages, value, mimeTypes, onChange]
  )

  const handleRemove = (index: number) => {
    const newImages = value.filter((_, i) => i !== index)
    onChange(newImages)

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

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const isInvalid = Boolean(error)
  const canAddMore = value.length < maxImages

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (
        (e.key === "Enter" || e.key === " ") &&
        canAddMore &&
        !disabled &&
        !isProcessing
      ) {
        e.preventDefault()
        handleButtonClick()
      }
    },
    [canAddMore, disabled, isProcessing, handleButtonClick]
  )

  const getPreviewUrl = (image: PromptImage, index: number) => {
    const mimeType = mimeTypes.get(index) || "image/png"
    return `data:${mimeType};base64,${image.data}`
  }

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled && value.length < maxImages) {
        setIsDragOver(true)
      }
    },
    [disabled, value.length, maxImages]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (disabled || value.length >= maxImages) return

      const files = e.dataTransfer.files
      handleFileSelect(files)
    },
    [disabled, value.length, maxImages, handleFileSelect]
  )

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none flex items-center gap-2">
          {label}
          <span className="text-xs font-normal text-muted-foreground">
            (Optional)
          </span>
        </label>
      )}
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          onBlur={onBlur}
          disabled={disabled || !canAddMore || isProcessing}
          className="hidden"
        />

        {/* Drag & Drop Zone */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: Drag-and-drop zones require div with drag handlers; keyboard and ARIA support added for accessibility */}
        <div
          role={canAddMore && !disabled && !isProcessing ? "button" : undefined}
          tabIndex={canAddMore && !disabled && !isProcessing ? 0 : undefined}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={
            canAddMore && !disabled && !isProcessing
              ? handleButtonClick
              : undefined
          }
          onKeyDown={handleKeyDown}
          {...(canAddMore &&
            !disabled &&
            !isProcessing && {
              "aria-label":
                "Upload images by clicking or dragging and dropping",
            })}
          className={cn(
            "relative bg-input/30 border-2 border-dashed rounded-lg p-6 transition-all duration-200 text-center",
            canAddMore && !disabled && !isProcessing
              ? "cursor-pointer hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              : "cursor-not-allowed opacity-60",
            isDragOver
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-muted-foreground/25"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "p-3 rounded-full transition-colors",
                isDragOver ? "bg-primary/10" : "bg-muted"
              )}
            >
              {isDragOver ? (
                <ImageIcon className="h-6 w-6 text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {isProcessing
                  ? "Processing..."
                  : isDragOver
                    ? "Drop images here"
                    : canAddMore
                      ? "Drag & drop images here"
                      : `Maximum ${maxImages} images reached`}
              </p>
              {canAddMore && !isProcessing && (
                <p className="text-xs text-muted-foreground mt-1">
                  or{" "}
                  <span className="text-primary underline underline-offset-2">
                    browse files
                  </span>{" "}
                  • {value.length}/{maxImages} images
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Image Previews */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {value.map((image, index) => (
              <div key={index} className="relative group">
                {/** biome-ignore lint/performance/noImgElement: We do not care about this rule here */}
                <img
                  src={getPreviewUrl(image, index) || "/placeholder.svg"}
                  alt={`Preview ${index + 1}`}
                  className="h-28 max-h-28 w-auto rounded-md object-cover border border-border"
                />

                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  className={cn(
                    "absolute -top-1 -right-1 p-1.5 rounded-full text-destructive-foreground shadow-md bg-card",
                    "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                    "hover:bg-destructive/90 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label={`Remove image ${index + 1}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {isInvalid && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  )
}
