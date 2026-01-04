import { useMutation, useQueryClient } from "@tanstack/react-query"

export function useSummarizeConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to summarize")
      }

      const data = await response.json()
      return { id: agentId, summary: data.summary }
    },
    onSuccess: (data) => {
      // Store in localStorage (matching existing pattern)
      localStorage.setItem(`agent-summary-${data.id}`, data.summary)
      queryClient.invalidateQueries({ queryKey: ["agents"] })
    },
  })
}

export function useTranscribeAudio() {
  return useMutation({
    mutationFn: async (audioFile: File) => {
      const formData = new FormData()
      formData.append("audio", audioFile)

      const response = await fetch("/api/ai/transcribe", {
        method: "POST",
        body: formData, // No Content-Type header - browser sets it with boundary
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to transcribe")
      }

      const data = await response.json()
      return data.text
    },
  })
}

export function useTextToSpeech() {
  return useMutation({
    mutationFn: async (params: { text: string; voice?: string }) => {
      const response = await fetch("/api/ai/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate speech")
      }

      // Return blob URL for audio playback
      const blob = await response.blob()
      return URL.createObjectURL(blob)
    },
  })
}
