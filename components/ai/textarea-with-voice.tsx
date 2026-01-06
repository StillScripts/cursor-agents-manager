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
import { useImprovePrompt, useTranscribeAudio } from "@/lib/hooks/use-ai"
import { useOpenAIKey } from "@/lib/hooks/use-openai-key"

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
  const [isSupported, setIsSupported] = useState(true)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const transcribe = useTranscribeAudio()
  const improvePrompt = useImprovePrompt()
  const { hasOpenAIKey } = useOpenAIKey()

  useEffect(() => {
    // Check browser support
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setIsSupported(false)
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

        // Send to API
        try {
          const text = await transcribe.mutateAsync(file)
          handleTranscribed(text)
        } catch (error) {
          console.error("Error transcribing audio:", error)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error starting recording:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
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

  return (
    <InputGroup className="flex flex-col-reverse items-start">
      <InputGroupTextarea
        value={value}
        onChange={onChange}
        className={className}
        {...props}
      />
      <InputGroupAddon align="inline-start" className="items-end pb-2 gap-1">
        {hasOpenAIKey && (
          <>
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
                disabled={transcribe.isPending}
                title={isRecording ? "Stop recording" : "Start voice input"}
              >
                {isRecording ? (
                  <Square className="h-3.5 w-3.5" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
              </InputGroupButton>
            )}
          </>
        )}
      </InputGroupAddon>
    </InputGroup>
  )
}
