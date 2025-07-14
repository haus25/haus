"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Ticket, ExternalLink, Calendar, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "../contexts/auth"
import { createTicketPurchaseService, type TicketInfo } from "../services/buyTicket"
import { useWalletClient } from "wagmi"
import { toast } from "sonner"
import { useTimeFormatter } from "../hooks/hydration"

interface UserTicket extends TicketInfo {
  ticketId: number
  ticketFactoryAddress: string
  eventName: string
  eventStatus: string
  eventDate: number
  purchaseTxHash: string
}

interface UserTicketsProps {
  className?: string
}

export function UserTickets({ className }: UserTicketsProps) {
  const { userProfile, isConnected } = useAuth()
  const { data: walletClient } = useWalletClient()
  const router = useRouter()
  const formatTime = useTimeFormatter()
  
  const [tickets, setTickets] = useState<UserTicket[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch user tickets from blockchain
  const fetchUserTickets = async () => {
    if (!isConnected || !userProfile?.address || !walletClient) {
      return
    }

    setIsLoading(true)
    try {
      console.log('USER_TICKETS: Fetching tickets for user:', userProfile.address)
      
      // TODO: Implement proper ticket fetching from contracts
      // This would query the TicketFactory contracts to find all tickets owned by the user
      // For now, we start with empty array - all data comes from chain
      
      // Example implementation:
      // const ticketService = createTicketPurchaseService(walletClient)
      // const userTickets = await ticketService.getUserTickets(userProfile.address)
      // setTickets(userTickets)
      
      setTickets([]) // No mock data - only real blockchain data
    } catch (error) {
      console.error('USER_TICKETS: Error fetching user tickets:', error)
      toast.error("Failed to load tickets")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserTickets()
  }, [isConnected, userProfile?.address, walletClient])

  const goToEvent = (ticketId: number, eventId: string) => {
    router.push(`/event-room?eventId=${eventId}&ticketId=${ticketId}`)
  }

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Ticket className="h-5 w-5 mr-2" />
            Your Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Connect your wallet to view tickets</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Ticket className="h-5 w-5 mr-2" />
            Your Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tickets...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Ticket className="h-5 w-5 mr-2" />
          Your Tickets
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="text-center py-8">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No tickets found</p>
            <Button onClick={() => router.push("/event-market")}>
              Browse Events
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.ticketId} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{ticket.eventName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Ticket #{ticket.ticketId}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {ticket.eventStatus}
                  </Badge>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground mb-3">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{formatTime(ticket.eventDate)}</span>
                  <span className="mx-2">•</span>
                  <User className="h-4 w-4 mr-1" />
                  <span>Paid {ticket.purchasePrice} SEI</span>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => goToEvent(ticket.ticketId, ticket.eventId.toString())}
                    disabled={ticket.eventStatus === "completed"}
                  >
                    {ticket.eventStatus === "live" ? "Join Event" : "View Event"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(`https://seitrace.com/tx/${ticket.purchaseTxHash}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Transaction
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 