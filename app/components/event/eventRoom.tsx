"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "../ui/card"
import VideoPlayer from "./videoPlayer"
import TippingPanel from "./tippingPanel"
import ChatPanel from "./chatPanel"
import { fetchEvent, verifyTicket } from "../../services/event"
import { useToast } from "../../hooks/use-toast"
import { useAccount, useSigner } from "wagmi"
import { sendTip } from "../../services/tipping"
import { useAuth } from "../../contexts/auth"

interface EventRoomProps {
  eventId: string
}

export default function EventRoom({ eventId }: EventRoomProps) {
  const [event, setEvent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manifestCid, setManifestCid] = useState<string | null>(null)
  const [hasTicket, setHasTicket] = useState(false)
  const [isVerifyingTicket, setIsVerifyingTicket] = useState(true)
  const { toast } = useToast()
  const { isConnected, address } = useAccount()
  const { data: signer } = useSigner()
  const { connect } = useAuth()

  // Fetch event data and verify ticket
  useEffect(() => {
    const loadEventAndVerifyTicket = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch event data
        const eventData = await fetchEvent(eventId)
        setEvent(eventData)

        // Extract manifest CID from event content URI
        if (eventData.contentUri) {
          const cid = eventData.contentUri.replace("ipfs://", "")
          setManifestCid(cid)
        }

        // Verify ticket if wallet is connected
        if (isConnected && address) {
          setIsVerifyingTicket(true)
          const ticketVerified = await verifyTicket(eventId, address)
          setHasTicket(ticketVerified)
          setIsVerifyingTicket(false)

          if (!ticketVerified) {
            setError("You do not have a ticket for this event")
          }
        } else {
          setIsVerifyingTicket(false)
          setError("Please connect your wallet to access this event")
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Error loading event:", err)
        setError("Failed to load event")
        setIsLoading(false)
        setIsVerifyingTicket(false)
      }
    }

    loadEventAndVerifyTicket()
  }, [eventId, isConnected, address])

  // Handle tipping
  const handleTip = async (amount: number) => {
    if (!isConnected || !address || !signer) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to tip the artist.",
        variant: "destructive",
      })
      return
    }

    try {
      // Send tip transaction
      const txHash = await sendTip(eventId, amount.toString(), "", signer)

      toast({
        title: "Tip Sent",
        description: `You tipped ${amount} SEI to the artist. Transaction: ${txHash.slice(0, 8)}...`,
      })

      return txHash
    } catch (error) {
      console.error("Error sending tip:", error)
      toast({
        title: "Error",
        description: "Failed to send tip. Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  if (isLoading || isVerifyingTicket) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold mb-4">Access Error</h2>
        <p>{error || "Failed to load event"}</p>
        {!isConnected && (
          <button className="mt-4 px-4 py-2 bg-primary text-white rounded-md" onClick={connect}>
            Connect Wallet
          </button>
        )}
        {isConnected && !hasTicket && (
          <button
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
            onClick={() => (window.location.href = `/event-market/${eventId}`)}
          >
            Purchase Ticket
          </button>
        )}
      </div>
    )
  }

  if (!hasTicket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold mb-4">Ticket Required</h2>
        <p>You need a ticket to access this event</p>
        <button
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
          onClick={() => (window.location.href = `/event-market/${eventId}`)}
        >
          Purchase Ticket
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
      <p className="text-gray-500 mb-6">by {event.artist}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              {manifestCid ? (
                <VideoPlayer manifestCid={manifestCid} autoPlay={true} onTip={handleTip} />
              ) : (
                <div className="aspect-video bg-black flex items-center justify-center text-white">
                  <p>Stream not started yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6">
            <TippingPanel eventId={eventId} onTip={handleTip} />
          </div>
        </div>

        <div>
          <ChatPanel eventId={eventId} isLive={event.status === "live"} />
        </div>
      </div>
    </div>
  )
}
