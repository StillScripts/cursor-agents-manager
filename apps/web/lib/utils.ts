import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    try {
      const error = await response.json()
      throw new Error(error.error || "Failed to fetch data")
    } catch {
      // If JSON parsing fails, throw default error message
      throw new Error("Failed to fetch data")
    }
  }
  // Try to parse as JSON first, fall back to text
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    // If not JSON, return text as-is
    return text as T
  }
}
