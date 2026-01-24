import { atom } from "jotai"

// UI state atoms (no longer using localStorage for task tracking)
export const viewAtom = atom<"timer" | "tasks">("timer")
export const taskInputAtom = atom("")
export const descriptionInputAtom = atom("")
