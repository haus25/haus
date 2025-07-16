"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ProfileTicketsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main profile page with tickets tab
    router.replace("/profile?tab=tickets")
  }, [router])

  // Return static content for SSR
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-medium">Redirecting to your tickets...</p>
        <p className="text-sm text-muted-foreground mt-2">
          If you are not redirected automatically, <a href="/profile?tab=tickets" className="text-primary underline">click here</a>
        </p>
      </div>
    </div>
  )
} 