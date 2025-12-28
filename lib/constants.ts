/**
 * Static variables based on third party sources or core configurations
 **/

export const CURSOR_MODEL_AUTO_VALUE = "Auto"

export const CURSOR_MODEL_OPTIONS = [
  { value: CURSOR_MODEL_AUTO_VALUE, label: "Auto (Recommended)" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Latest)" },
  { value: "claude-3-5-sonnet-20240620", label: "Claude 3.5 Sonnet (June)" },
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
  { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "o1-preview", label: "o1 Preview" },
  { value: "o1-mini", label: "o1 Mini" },
] as const
