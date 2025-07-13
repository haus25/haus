"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ProfileTicketsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main profile page with tickets tab
    router.replace("/profile?tab=tickets")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to your tickets...</p>
    </div>
  )
} 