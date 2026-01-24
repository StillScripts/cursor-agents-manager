"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useTheme } from "@/lib/theme-provider"

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Appearance</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ToggleGroup
          value={[theme || "system"]}
          onValueChange={(values) => {
            if (values.length > 0) {
              setTheme(values[0])
            }
          }}
          variant="outline"
          className="grid grid-cols-3 w-full"
        >
          {themeOptions.map((option) => {
            const Icon = option.icon
            const isActive = theme === option.value
            return (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="flex flex-col gap-2 h-auto py-3 data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:border-primary"
              >
                <Icon
                  suppressHydrationWarning
                  className="h-5 w-5"
                  fill={isActive ? "currentColor" : "none"}
                />
                <span className="text-xs font-medium">{option.label}</span>
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </CardContent>
    </Card>
  )
}
