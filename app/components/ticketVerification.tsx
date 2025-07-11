"use client"
import { Button } from "./ui/button"
import { AlertTriangle, Ticket } from "lucide-react"

interface TicketVerificationProps {
  isVerifying: boolean
  hasTicket: boolean
  hasTicketId: boolean
  onVerify: () => void
}

export function TicketVerification({ isVerifying, hasTicket, hasTicketId, onVerify }: TicketVerificationProps) {
  if (isVerifying) {
    return (
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Verifying Ticket</h2>
        <p className="text-white/80 text-center">Please wait while we verify your ticket...</p>
      </div>
    )
  }

  if (!hasTicket) {
    return (
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20">
        {hasTicketId ? (
          <>
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Uh-oh, you don't have this ticket</h2>
            <p className="text-white/80 text-center mb-6 max-w-md">Please verify your ticket to continue.</p>
            <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={onVerify}>
              <span className="text-black font-medium">Verify Ticket</span>
            </Button>
          </>
        ) : (
          <>
            <Ticket className="h-12 w-12 text-primary mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Verify Ticket to Enter</h2>
            <p className="text-white/80 text-center mb-6 max-w-md">
              This event requires a ticket for access. Please verify your ticket to continue.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={onVerify}>
              <span className="text-black font-medium">Verify Ticket</span>
            </Button>
          </>
        )}
      </div>
    )
  }

  return null
}
