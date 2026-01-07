"use client"

import { Mic, Square } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useTranscribeAudio } from "@/lib/hooks/use-ai"

export function AudioRecorder({
  onTranscribed,
}: {
  onTranscribed: (text: string) => void
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const transcribe = useTranscribeAudio()

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
          onTranscribed(text)
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

  if (!isSupported) {
    return (
      <div className="text-sm text-muted-foreground">
        Voice input not supported in this browser
      </div>
    )
  }

  const isProcessing = isTranscribing || transcribe.isPending

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={isRecording ? "destructive" : "outline"}
        size="icon"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!isRecording && isProcessing}
        title={
          isRecording
            ? "Stop recording"
            : isProcessing
              ? "Transcribing..."
              : "Start voice input"
        }
      >
        {isProcessing ? (
          <Spinner className="h-4 w-4" />
        ) : isRecording ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      {(isRecording || isProcessing) && (
        <span className="text-sm text-muted-foreground">
          {isRecording ? "Recording..." : "Transcribing..."}
        </span>
      )}
    </div>
  )
}
