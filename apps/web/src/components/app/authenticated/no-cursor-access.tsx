"use client"

import { Key } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/app/authenticated/page-header"
import { Button } from "@/components/ui/button"

interface NoCursorAccessProps {
  title: string
}

export function NoCursorAccess({ title }: NoCursorAccessProps) {
  return (
    <>
      <PageHeader title={title} />
      <div className="flex-1 overflow-auto">
        <div className="px-3 py-2">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Key className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-2">
              You need a cursor key to use this feature.
            </p>
            <Link href="/account">
              <Button variant="default" className="mt-2">
                Go to Account Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
