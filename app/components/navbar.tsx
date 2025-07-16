"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HausLogo } from "./logo"
import { UserNav } from "./userNav"
import { memo, useState } from "react"
import { Button } from "./ui/button"
import { Plus } from "lucide-react"
import { useAuth } from "../contexts/auth"
import { WaitlistModal } from "./waitlist"

// Memoize the navbar to prevent unnecessary re-renders
export const Navbar = memo(function Navbar() {
  const pathname = usePathname()
  const { isConnected, hasInviteAccess } = useAuth()
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)

  // Check if we're on the landing page
  const isLandingPage = pathname === "/"

  // Check if we're in an authentication flow
  const isAuthFlow = pathname.includes("/auth") || pathname.includes("/login") || pathname.includes("/signup")

  const handleCreateClick = () => {
    if (!hasInviteAccess) {
      setShowWaitlistModal(true)
    }
  }

  // Determine which navigation links to show
  const renderNavLinks = () => {
    // Don't show nav links on landing page or in auth flows
    if (isLandingPage || isAuthFlow) {
      return (
        <>
          {hasInviteAccess && (
            <Link href="/event-factory">
              <Button variant="outline" size="sm" className="hidden md:flex">
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </Link>
          )}

          {!hasInviteAccess && (
            <Button variant="outline" size="sm" className="hidden md:flex" onClick={handleCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          )}
        </>
      )
    }

    // Show full navigation for app pages
    return (
      <div className="hidden md:flex items-center space-x-4">
        <Link
          href="/event-factory"
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            pathname.includes("/event-factory") ? "bg-primary/10 text-primary" : "hover:bg-secondary"
          }`}
        >
          Factory
        </Link>
        <Link
          href="/ticket-kiosk"
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            pathname.includes("/ticket-kiosk") ? "bg-primary/10 text-primary" : "hover:bg-secondary"
          }`}
        >
          Kiosk
        </Link>
        <Link
          href="/event-room"
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            pathname.includes("/event-room") ? "bg-primary/10 text-primary" : "hover:bg-secondary"
          }`}
        >
          Room
        </Link>
      </div>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <HausLogo className="w-8 h-4" />
              <span className="font-bold text-lg tracking-wide bauhaus-text">HAUS</span>
            </Link>
            <div className="hidden md:flex ml-2">
              <p className="text-sm font-medium">reality, in the making.</p>
            </div>
          </div>

          <nav className="flex items-center gap-6">
            {renderNavLinks()}
            <UserNav />
          </nav>
        </div>
      </header>

      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        redirectPath="/event-factory" // Redirect to event factory after successful code entry
      />
    </>
  )
})
