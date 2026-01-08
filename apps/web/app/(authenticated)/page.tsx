import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Home",
  description: "Cursor Agent Manager",
}

export default async function HomePage() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Hello, World!</h1>
        <p className="text-muted-foreground">Welcome to Cursor Agent Manager</p>
      </div>
    </div>
  )
}
