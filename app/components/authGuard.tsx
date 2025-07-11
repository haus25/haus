"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "../contexts/auth"
import { LoginModal } from "./loginModal"
import { WaitlistModal } from "./waitlist"
import { Loader2 } from "lucide-react"

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/about", "/help"]

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isConnected, isLoading, hasInviteAccess } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)

  useEffect(() => {
    // Skip auth check for public routes
    if (PUBLIC_ROUTES.includes(pathname)) {
      return
    }

    // First check if user has invite access
    if (!hasInviteAccess) {
      setShowWaitlistModal(true)
      return
    }

    // If they have invite access, then check if they're connected
    if (!isLoading && !isConnected) {
      setShowLoginModal(true)
    }
  }, [isConnected, isLoading, pathname, hasInviteAccess])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // If not on public route and no invite access, show waitlist modal
  if (!PUBLIC_ROUTES.includes(pathname) && !hasInviteAccess) {
    return (
      <>
        {children}
        <WaitlistModal
          isOpen={showWaitlistModal}
          onClose={() => {
            setShowWaitlistModal(false)
            router.push("/")
          }}
          redirectPath={pathname} // Pass the current path for redirect after successful code entry
        />
      </>
    )
  }

  // If has invite access but not authenticated and not on a public route, show login modal
  if (!isConnected && !PUBLIC_ROUTES.includes(pathname) && hasInviteAccess) {
    return (
      <>
        {children}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => {
            setShowLoginModal(false)
            router.push("/")
          }}
          redirectPath={pathname} // Pass the current path for redirect after login
        />
      </>
    )
  }

  // If authenticated or on a public route, render children
  return <>{children}</>
}
