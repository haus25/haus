"use client"

import { useState, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import { Clock, Compass, HelpCircle, Plus, Ticket } from "lucide-react"
import { useAuth } from "../contexts/auth"
import { WaitlistModal } from "./waitlist"
import { LoginModal } from "./loginModal"

// Lazy load the RTA info modal
const RtaInfoModal = lazy(() => import("./rtaInfo").then((mod) => ({ default: mod.RtaInfoModal })))

// Loading fallback
const LoadingFallback = () => <div className="hidden">Loading...</div>

export function QuickAccess() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { isConnected, hasInviteAccess } = useAuth()
  const router = useRouter()
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRtaModal, setShowRtaModal] = useState(false)
  const [redirectPath, setRedirectPath] = useState("")

  const handleButtonClick = (path: string) => {
    if (hasInviteAccess) {
      if (isConnected) {
        router.push(path)
      } else {
        setRedirectPath(path)
        setShowLoginModal(true)
      }
    } else {
      setRedirectPath(path)
      setShowWaitlistModal(true)
    }
  }

  const handleHelpClick = () => {
    setShowRtaModal(true)
  }

  return (
    <>
      <div
        className={`fixed right-4 bottom-4 z-40 flex flex-col items-end transition-all duration-300 ${
          isExpanded ? "gap-2" : ""
        }`}
      >
        {isExpanded && (
          <div className="flex flex-col gap-2 mb-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background shadow-md"
              onClick={() => handleButtonClick("/event-factory")}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Create Event</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background shadow-md"
              onClick={() => handleButtonClick("/ticket-kiosk")}
            >
              <Compass className="h-4 w-4" />
              <span className="sr-only">Discover Events</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background shadow-md"
              onClick={() => handleButtonClick("/profile")}
            >
              <Ticket className="h-4 w-4" />
              <span className="sr-only">My Tickets</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background shadow-md"
              onClick={handleHelpClick}
            >
              <HelpCircle className="h-4 w-4" />
              <span className="sr-only">Help</span>
            </Button>
          </div>
        )}

        <Button size="icon" className="rounded-full shadow-lg" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <Clock className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          <span className="sr-only">Quick Access</span>
        </Button>
      </div>

      <WaitlistModal
        isOpen={showWaitlistModal}
        onClose={() => setShowWaitlistModal(false)}
        redirectPath={redirectPath}
      />

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} redirectPath={redirectPath} />

      <Suspense fallback={<LoadingFallback />}>
        {showRtaModal && <RtaInfoModal open={showRtaModal} onClose={() => setShowRtaModal(false)} />}
      </Suspense>
    </>
  )
}
