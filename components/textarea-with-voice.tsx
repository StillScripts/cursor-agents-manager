"use client"

import { Mic, Square } from "lucide-react"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { useToast } from "@/hooks/use-toast"
import { useTranscribeAudio } from "@/lib/hooks/use-ai"

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
  const { toast } = useToast()

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
          toast({
            title: "Transcription failed",
            description:
              error instanceof Error ? error.message : "Please try again",
            variant: "destructive",
          })
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error starting recording:", error)
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  return (
    <InputGroup className="flex items-end">
      <InputGroupTextarea
        value={value}
        onChange={onChange}
        className={className}
        {...props}
      />
      {isSupported && (
        <InputGroupAddon align="inline-start" className="items-end pb-2">
          <InputGroupButton
            size="icon-xs"
            variant={isRecording ? "destructive" : "ghost"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={transcribe.isPending}
          >
            {isRecording ? (
              <Square className="h-3.5 w-3.5" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
