"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "../components/navbar"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Breadcrumbs } from "../components/breadcrumbs"
import { Streaming } from "../components/streaming"
import { EventChat } from "../components/eventChat"
import { useAuth } from "../contexts/auth"
import { createEventFactoryService } from "../services/create"
import { streamingService } from "../services/streaming"
import { useWalletClient } from "wagmi"
import { 
  Video, 
  Users, 
  Clock, 
  Calendar,
  DollarSign,
  Crown,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Heart
} from "lucide-react"
import { toast } from "sonner"
import { createTicketService } from "../services/tickets"
import { sendTip } from "../services/tipping"

export default function EventRoom() {
  const { userProfile, isConnected } = useAuth()
  const { data: walletClient } = useWalletClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get parameters from URL - prioritize path param, fallback to query param for compatibility
  const eventIdParam = searchParams.get("eventId") || searchParams.get("id")
  const isCreatorParam = searchParams.get("isCreator") === "true"
  const ticketIdParam = searchParams.get("ticketId")

  // State management
  const [eventId, setEventId] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)
  
  // Simple 3-boolean logic as requested
  const [isCreator, setIsCreator] = useState(false)
  const [isParticipant, setIsParticipant] = useState(false)
  const [hasTicket, setHasTicket] = useState(false)
  const [eventData, setEventData] = useState<any>(null)
  const [isLoadingEvent, setIsLoadingEvent] = useState(true)
  const [streamStatus, setStreamStatus] = useState({
    isLive: false,
    viewerCount: 0,
    hasAccess: false
  })
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatMessage, setChatMessage] = useState("")
  const [activeTab, setActiveTab] = useState("stream")
  const [tipAmount, setTipAmount] = useState("")
  const [isTipping, setIsTipping] = useState(false)

  // Initialize from URL parameters - prioritize path parameter format
  useEffect(() => {
    // First, check if this is a path parameter format: /room/${eventId}
    const pathSegments = window.location.pathname.split('/').filter(Boolean)
    if (pathSegments.length >= 2 && pathSegments[0] === 'room') {
      const pathEventId = pathSegments[1]
      if (pathEventId && !isNaN(Number(pathEventId))) {
        setEventId(pathEventId)
        setIsCreator(isCreatorParam)
        setTicketId(ticketIdParam)
        console.log('EVENT_ROOM: Using path parameter for event:', pathEventId)
        return
      }
    }

    // Fallback: Check if we have eventId in query parameters (legacy support)
    if (eventIdParam) {
      setEventId(eventIdParam)
      setIsCreator(isCreatorParam)
      setTicketId(ticketIdParam)
      console.log('EVENT_ROOM: Using query parameter for event:', eventIdParam)
      return
    }

    console.log('EVENT_ROOM: No valid event ID found in URL')
  }, [eventIdParam, isCreatorParam, ticketIdParam])

  // Simple 3-boolean verification: isCreator, isParticipant, hasTicket
  useEffect(() => {
    const verifyUserAccess = async () => {
      if (!eventId || !userProfile?.address || !walletClient || !isConnected) {
        return
      }

      try {
        const ticketService = createTicketService(walletClient)
        
        // Check if user is the creator of this event
        const eventDetails = await ticketService.getEventDetails(Number(eventId))
        const userIsCreator = eventDetails.creator.toLowerCase() === userProfile.address.toLowerCase()
        
        if (userIsCreator) {
          // User is the creator
          setIsCreator(true)
          setIsParticipant(false)
          setHasTicket(false) // Creator doesn't need ticket
          setStreamStatus(prev => ({ ...prev, hasAccess: true }))
        } else {
          // User is a participant - check for ticket
          setIsCreator(false)
          setIsParticipant(true)
          
          const userHasTicket = await ticketService.userHasTicket(Number(eventId), userProfile.address)
          setHasTicket(userHasTicket)
          
          if (userHasTicket) {
            setStreamStatus(prev => ({ ...prev, hasAccess: true }))
          } else {
            // No ticket - show message and let user decide to buy ticket
            setStreamStatus(prev => ({ ...prev, hasAccess: false }))
            console.log('EVENT_ROOM: User does not have a ticket for this event')
          }
        }

      } catch (error) {
        console.error('EVENT_ROOM: Error verifying user access:', error)
        toast.error('Failed to verify event access')
      }
    }

    verifyUserAccess()
  }, [eventId, userProfile, walletClient, isConnected, router])

  // Load event data from blockchain
  useEffect(() => {
    const loadEventData = async () => {
      if (!eventId) return

      try {
        setIsLoadingEvent(true)
        console.log('EVENT_ROOM: Loading event data for ID:', eventId)

        // Fetch all events and find the one matching the ID
        const { fetchOnChainEvents } = await import('../services/tickets')
        const events = await fetchOnChainEvents()
        const targetEvent = events.find(e => e.contractEventId === parseInt(eventId))

        if (!targetEvent) {
          console.error('EVENT_ROOM: Event not found for ID:', eventId)
          setEventData({
            id: eventId,
            title: `Event #${eventId}`,
            expired: true,
            message: 'Event not found'
          })
          setIsLoadingEvent(false)
          return
        }

        console.log('EVENT_ROOM: Event details loaded:', targetEvent)

        // Check event availability from backend
        const availability = await streamingService.checkStreamStatus(eventId)
        console.log('EVENT_ROOM: Backend availability:', availability)

        // Validate event timing against blockchain data
        const ticketService = createTicketService(walletClient)
        const timingValidation = await ticketService.validateEventTiming(Number(eventId))
        console.log('EVENT_ROOM: Blockchain timing validation:', timingValidation)

        if (!timingValidation.isValid || timingValidation.status === 'ended') {
          // Event has ended according to blockchain, show expired message
          setEventData({
            id: eventId,
            title: targetEvent.title,
            expired: true,
            message: 'This event has ended'
          })
          setIsLoadingEvent(false)
          return
        }

        if (!availability.available && availability.hasEnded) {
          // Event has ended according to backend, show expired message
          setEventData({
            id: eventId,
            title: targetEvent.title,
            expired: true,
            message: 'This event has ended'
          })
          setIsLoadingEvent(false)
          return
        }

        // Build complete event data with blockchain timing validation
        const eventData = {
          id: eventId,
          contractEventId: parseInt(eventId),
          creator: targetEvent.creator,
          creatorAddress: targetEvent.creatorAddress,
          startDate: timingValidation.startTime.getTime(),
          eventDuration: Math.floor((timingValidation.endTime.getTime() - timingValidation.startTime.getTime()) / 1000), // duration in seconds
          reservePrice: targetEvent.reservePrice,
          metadataURI: targetEvent.eventMetadataURI,
          ticketKioskAddress: targetEvent.ticketKioskAddress,
          finalized: targetEvent.finalized,
          // From event data
          title: targetEvent.title,
          description: targetEvent.description,
          category: targetEvent.category,
          image: targetEvent.image,
          // Availability info (prefer blockchain over backend)
          available: timingValidation.isValid && (timingValidation.status === 'upcoming' || timingValidation.status === 'live'),
          isActive: timingValidation.isValid && timingValidation.status === 'live',
          hasEnded: !timingValidation.isValid || (timingValidation.status as string) === 'ended',
          ticketPrice: targetEvent.ticketPrice,
          maxParticipants: targetEvent.maxParticipants,
          participants: targetEvent.participants,
          status: timingValidation.status,
          // Timing validation info
          timingValidation
        }

        setEventData(eventData)
        console.log('EVENT_ROOM: Event data set:', eventData)

      } catch (error) {
        console.error('EVENT_ROOM: Error loading event data:', error)
        toast.error('Failed to load event data')
      } finally {
        setIsLoadingEvent(false)
      }
    }

    loadEventData()
  }, [eventId])

  // Initialize chat with welcome message
  useEffect(() => {
    if (eventData && userProfile) {
      setChatMessages([
        {
          id: 1,
          user: "system",
          message: `Welcome to ${eventData.title || `Event #${eventId}`}!`,
          timestamp: new Date().toISOString(),
          isSystem: true
        }
      ])
    }
  }, [eventData, userProfile])

  // Handle stream status changes
  const handleStreamStatusChange = useCallback((status: {
    isLive: boolean
    viewerCount: number
    hasAccess: boolean
  }) => {
    setStreamStatus(status)
    console.log('EVENT_ROOM: Stream status updated:', status)
  }, [])

  // Handle chat message sending
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (chatMessage.trim() && userProfile) {
      const newMessage = {
          id: chatMessages.length + 1,
        user: userProfile.displayName || userProfile.name || "Anonymous",
          message: chatMessage,
          timestamp: new Date().toISOString(),
        avatar: userProfile.avatar
      }

      setChatMessages(prev => [...prev, newMessage])
      setChatMessage("")
    }
  }

  // Handle tipping
  const handleTip = async () => {
    if (!tipAmount || !userProfile || !walletClient || !eventData) {
      toast.error('Please enter a tip amount and connect your wallet')
      return
    }

    try {
      setIsTipping(true)
      
      // Convert walletClient to ethers signer
      const { BrowserProvider } = await import('ethers')
      const provider = new BrowserProvider(walletClient.transport)
      const signer = await provider.getSigner()
      
      // Send tip using the tipping service
      const txHash = await sendTip(eventId!, tipAmount, `Tip from ${userProfile.displayName || userProfile.name}`, signer)
      
      toast.success(`Sent ${tipAmount} SEI tip! Transaction: ${txHash.slice(0, 10)}...`)
      
      // Add tip message to chat
      const tipMessage = {
        id: chatMessages.length + 1,
        user: userProfile.displayName || userProfile.name || "Anonymous",
        message: `💝 Tipped ${tipAmount} SEI`,
        timestamp: new Date().toISOString(),
        avatar: userProfile.avatar,
        isTip: true
      }
      setChatMessages(prev => [...prev, tipMessage])
      setTipAmount("")
      
    } catch (error) {
      console.error('Error sending tip:', error)
      toast.error('Failed to send tip')
    } finally {
      setIsTipping(false)
    }
  }

  // Get time until event starts/ends
  const getEventTiming = () => {
    if (!eventData) return { status: 'loading', timeText: '' }
    
    const now = new Date()
    const startTime = new Date(eventData.startDate)
    const endTime = new Date(eventData.startDate + eventData.eventDuration * 1000)

    if (now < startTime) {
      const timeUntilStart = startTime.getTime() - now.getTime()
      const hours = Math.floor(timeUntilStart / (1000 * 60 * 60))
      const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60))
      return { 
        status: 'upcoming', 
        timeText: `Starts in ${hours > 0 ? `${hours}h ` : ''}${minutes}m` 
      }
    } else if (now <= endTime) {
      const timeUntilEnd = endTime.getTime() - now.getTime()
      const hours = Math.floor(timeUntilEnd / (1000 * 60 * 60))
      const minutes = Math.floor((timeUntilEnd % (1000 * 60 * 60)) / (1000 * 60))
      return { 
        status: 'live', 
        timeText: `${hours > 0 ? `${hours}h ` : ''}${minutes}m remaining` 
      }
    } else {
      return { status: 'ended', timeText: 'Event ended' }
    }
  }

  if (!eventId) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">No Event ID</h1>
            <p className="text-muted-foreground mb-6">
              Please provide a valid event ID to access the event room.
            </p>
            <Button onClick={() => router.push('/kiosk')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ticket Kiosk
            </Button>
          </div>
        </main>
      </div>
    )
  }

  if (isLoadingEvent) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading event details...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!eventData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The event you're looking for doesn't exist or couldn't be loaded.
            </p>
            <Button onClick={() => router.push('/kiosk')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ticket Kiosk
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // Handle expired events
  if (eventData.expired || eventData.hasEnded) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Event Has Ended</h1>
            <p className="text-muted-foreground mb-2">
              {eventData.title || `Event #${eventId}`}
            </p>
            <p className="text-muted-foreground mb-6">
              {eventData.message || 'This event room is no longer available.'}
            </p>
            <Button onClick={() => router.push('/kiosk')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ticket Kiosk
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const eventTiming = getEventTiming()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container py-6">
        <Breadcrumbs items={[
          { label: "Ticket Kiosk", href: "/kiosk" },
          { label: eventData.title || `Event #${eventId}` }
        ]} />

        {/* Event Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{eventData.title || `Event #${eventId}`}</h1>
                <Badge 
                  variant={eventTiming.status === 'live' ? 'default' : eventTiming.status === 'upcoming' ? 'secondary' : 'outline'}
                  className={eventTiming.status === 'live' ? 'bg-red-500 text-white animate-pulse' : ''}
                >
                  {eventTiming.status === 'live' && <Video className="h-3 w-3 mr-1" />}
                  {eventTiming.status.toUpperCase()}
                </Badge>
              </div>
              
              {eventData.description && (
                <p className="text-muted-foreground mb-4">{eventData.description}</p>
              )}

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(eventData.startDate).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  {eventTiming.timeText}
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  {streamStatus.viewerCount} {streamStatus.viewerCount === 1 ? 'viewer' : 'viewers'}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={eventData.creatorAvatar} alt="Creator" />
                  <AvatarFallback>{eventData.creator?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <p className="font-medium">Creator</p>
                  <p className="text-sm text-muted-foreground">
                    {eventData.creator?.slice(0, 6)}...{eventData.creator?.slice(-4)}
                  </p>
          </div>
        </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Stream Section */}
          <div className="lg:col-span-3">
            <Streaming
              eventId={eventId}
              isCreator={isCreator}
              ticketKioskAddress={eventData.ticketKioskAddress}
              eventStartTime={new Date(eventData.startDate).toISOString()}
              eventDuration={Math.floor(eventData.eventDuration / 60)} // Convert to minutes
              onStreamStatusChange={handleStreamStatusChange}
            />

            {/* Event Details */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Start Time</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(eventData.startDate).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.floor(eventData.eventDuration / 60)} minutes
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Category</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {eventData.category?.replace('-', ' ') || 'General'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Reserve Price</p>
                    <p className="text-sm text-muted-foreground">
                      {eventData.reservePrice} SEI
                    </p>
                  </div>
                </div>

                {eventData.ticketKioskAddress && (
                  <div>
                    <p className="text-sm font-medium mb-2">Ticket Contract</p>
                    <code className="text-xs bg-muted p-2 rounded block">
                      {eventData.ticketKioskAddress}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>
                      </div>

          {/* Chat and Tipping Section */}
          <div className="space-y-6">
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="stream" className="flex-1">
                    <Video className="h-4 w-4 mr-1" />
                    Stream
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Chat
                  </TabsTrigger>
                  {!isCreator && (
                    <TabsTrigger value="tip" className="flex-1">
                      <Heart className="h-4 w-4 mr-1" />
                      Tip
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="stream" className="m-0">
                  <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <Badge variant={streamStatus.isLive ? 'default' : 'secondary'}>
                        {streamStatus.isLive ? 'Live' : 'Offline'}
                      </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                      <span className="text-sm">Viewers</span>
                      <span className="text-sm font-medium">{streamStatus.viewerCount}</span>
                        </div>

                        <div className="flex items-center justify-between">
                      <span className="text-sm">Access</span>
                      <div className="flex items-center gap-2">
                        {streamStatus.hasAccess ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {streamStatus.hasAccess ? 'Verified' : 'No Access'}
                        </span>
                          </div>
                        </div>

                    {isCreator && (
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Crown className="h-4 w-4 text-yellow-500" />
                          Creator Controls
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Use the streaming controls above to start/stop your stream
                        </p>
                      </div>
                    )}
                  </CardContent>
                </TabsContent>

                    <TabsContent value="chat" className="m-0">
                      <CardContent className="p-0">
                        <EventChat
                          messages={chatMessages}
                          message={chatMessage}
                          onMessageChange={setChatMessage}
                          onSendMessage={handleSendMessage}
                        />
                  </CardContent>
                </TabsContent>

                {!isCreator && (
                  <TabsContent value="tip" className="m-0">
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Send a tip to the creator</p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={tipAmount}
                            onChange={(e) => setTipAmount(e.target.value)}
                            placeholder="Amount in SEI"
                            className="flex-1 px-3 py-2 border rounded-md text-sm"
                            min="0"
                            step="0.1"
                          />
                          <Button 
                            onClick={handleTip}
                            disabled={isTipping || !tipAmount}
                            size="sm"
                          >
                            {isTipping ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Heart className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {[0.1, 0.5, 1].map((amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={() => setTipAmount(amount.toString())}
                          >
                            {amount} SEI
                          </Button>
                        ))}
                      </div>
                      </CardContent>
                    </TabsContent>
                )}
                  </Tabs>
                </Card>

            {/* Access Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Access Requirements</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {isCreator ? (
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span>You are the event creator</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Valid NFT ticket required</span>
              </div>
            )}
                
                <p className="text-xs text-muted-foreground">
                  {isCreator 
                    ? "You have full access to streaming controls"
                    : "Purchase a ticket from the Ticket Kiosk to join"
                  }
                </p>

                {!isCreator && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={() => router.push(`/kiosk/${eventId}`)}
                  >
                    Buy Ticket
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
