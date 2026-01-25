import { Link } from "@tanstack/react-router"
import { ChevronRight, Settings } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function SettingsLinkCard() {
  return (
    <Link to="/settings">
      <Card className="bg-card border-border hover:bg-accent/50 transition-colors cursor-pointer active:scale-[0.98]">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Settings</p>
              <p className="text-sm text-muted-foreground">
                App preferences and notifications
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
