"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ProfileEventsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main profile page with events tab
    router.replace("/profile?tab=events")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to your events...</p>
    </div>
  )
} 