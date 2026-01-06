"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAction } from "convex/react"
import { api } from "@/convex/_generated/api"

export function useSummarizeConversation() {
  const queryClient = useQueryClient()
  const summarizeAction = useAction(api.openAI.summarizeConversation)

  return useMutation({
    mutationFn: async (agentId: string) => {
      const result = await summarizeAction({ agentId })
      // Summary is saved to database by the action, audioSummary is cleared
      return {
        id: agentId,
        summary: result.summary,
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch agent data with new summary and audio
      queryClient.invalidateQueries({ queryKey: ["agents"] })
    },
  })
}

export function useTranscribeAudio() {
  const transcribeAction = useAction(api.openAI.transcribeAudio)

  return useMutation({
    mutationFn: async (audioFile: File) => {
      // Convert File to base64 for Convex transport
      const arrayBuffer = await audioFile.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      )

      const result = await transcribeAction({
        audioData: base64,
        mimeType: audioFile.type,
      })

      return result.text
    },
  })
}

export function useTextToSpeech() {
  const ttsAction = useAction(api.openAI.textToSpeech)

  return useMutation({
    mutationFn: async (params: { text: string; voice?: string }) => {
      const result = await ttsAction(params)

      // Convert base64 back to blob URL for audio playback
      const binaryString = atob(result.audioData)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: result.mimeType })

      return URL.createObjectURL(blob)
    },
  })
}

export function useImprovePrompt() {
  const improvePromptAction = useAction(api.openAI.improvePrompt)

  return useMutation({
    mutationFn: async (text: string) => {
      const result = await improvePromptAction({ text })
      return result.text
    },
  })
}
