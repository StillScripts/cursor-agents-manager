import { Info } from "lucide-react"

export function SimulationBanner() {
  return (
    <div className="bg-warning/10 border-b border-warning/20 px-4 py-2.5 flex items-center gap-2">
      <Info className="h-4 w-4 text-warning flex-shrink-0" />
      <p className="text-xs text-warning">Simulation mode - No CURSOR_API_KEY configured</p>
    </div>
  )
}
