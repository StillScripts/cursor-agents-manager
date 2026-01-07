"use client"

import { Mic, Sparkles, Square } from "lucide-react"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useImprovePrompt, useTranscribeAudio } from "@/lib/hooks/use-ai"

interface TextareaWithVoiceProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onTranscribed?: (text: string) => void
  appendTranscription?: boolean
}

export function TextareaWithVoice({
  onTranscribed,
  appendTranscription = true,
  value,
  onChange,
  className,
  ...props
}: TextareaWithVoiceProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const transcribe = useTranscribeAudio()
  const improvePrompt = useImprovePrompt()

  useEffect(() => {
    // Check browser support
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setIsSupported(false)
    }

    // Cleanup on unmount
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop()
        } catch (error) {
          console.error("Error stopping MediaRecorder:", error)
        }
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop()
        }
      }
    }
  }, [])

  const handleTranscribed = (text: string) => {
    if (onTranscribed) {
      onTranscribed(text)
      return
    }

    // If onChange is provided, create a synthetic event with the new value
    if (onChange) {
      const currentValue = typeof value === "string" ? value : ""
      const newValue = appendTranscription
        ? `${currentValue}${currentValue ? " " : ""}${text}`
        : text

      // Create a synthetic event
      const syntheticEvent = {
        target: { value: newValue },
        currentTarget: { value: newValue },
      } as React.ChangeEvent<HTMLTextAreaElement>

      onChange(syntheticEvent)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })

      // Use compatible MIME type (Safari: audio/mp4, Chrome: audio/webm)
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4"

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      streamRef.current = stream
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const file = new File([blob], "recording.webm", { type: mimeType })

        // Stop all tracks
        for (const track of stream.getTracks()) {
          track.stop()
        }

        // Clear stream reference
        streamRef.current = null

        // Immediately show transcribing state for better UX
        setIsTranscribing(true)

        // Send to API
        try {
          const text = await transcribe.mutateAsync(file)
          handleTranscribed(text)
        } catch (error) {
          console.error("Error transcribing audio:", error)
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error starting recording:", error)
    }
  }

  const stopRecording = () => {
    // Stop the MediaRecorder if it exists and is recording
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop()
      } catch (error) {
        console.error("Error stopping MediaRecorder:", error)
      }
    }

    // Stop all tracks in the stream
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }

    setIsRecording(false)
  }

  const handleImprovePrompt = async () => {
    const currentValue = typeof value === "string" ? value : ""
    if (!currentValue.trim()) {
      return
    }

    try {
      const improvedText = await improvePrompt.mutateAsync(currentValue)

      if (onChange) {
        const syntheticEvent = {
          target: { value: improvedText },
          currentTarget: { value: improvedText },
        } as React.ChangeEvent<HTMLTextAreaElement>

        onChange(syntheticEvent)
      }
    } catch (error) {
      console.error("Error improving prompt:", error)
    }
  }

  const isProcessing = isTranscribing || transcribe.isPending

  return (
    <div className="relative w-full">
      <InputGroup className="flex flex-col-reverse items-start">
        <InputGroupTextarea
          value={value}
          onChange={onChange}
          className={className}
          {...props}
        />
        <InputGroupAddon align="inline-start" className="items-end pb-2 gap-1">
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            onClick={handleImprovePrompt}
            disabled={
              improvePrompt.isPending ||
              !value ||
              (typeof value === "string" && !value.trim())
            }
            title="Improve prompt with AI"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </InputGroupButton>
          {isSupported && (
            <InputGroupButton
              size="icon-xs"
              variant={isRecording ? "destructive" : "ghost"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={
                !isRecording && (isTranscribing || transcribe.isPending)
              }
              title={
                isRecording
                  ? "Stop recording"
                  : isTranscribing || transcribe.isPending
                    ? "Transcribing..."
                    : "Start voice input"
              }
            >
              {isTranscribing || transcribe.isPending ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : isRecording ? (
                <Square className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
      {(isRecording || isProcessing) && (
        <div className="absolute bottom-2 left-2 flex items-center gap-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-md text-xs text-muted-foreground border border-border/50">
          {isProcessing ? (
            <>
              <Spinner className="h-3 w-3" />
              <span>Transcribing audio...</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              <span>Recording...</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
