"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "../components/navbar"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Breadcrumbs } from "../components/breadcrumbs"
import { WebRTCStreaming } from "../components/webrtcStreaming"
import { EventChat } from "../components/eventChat"
import { useAuth } from "../contexts/auth"
import { createEventFactoryService } from "../services/create"
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
  ExternalLink
} from "lucide-react"
import { toast } from "sonner"

export default function EventRoom() {
  const { userProfile, isConnected } = useAuth()
  const { data: walletClient } = useWalletClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get parameters from URL
  const eventId = searchParams.get("eventId")
  const isCreator = searchParams.get("isCreator") === "true"
  const ticketId = searchParams.get("ticketId")

  // State management
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

  // Load event data from blockchain
  useEffect(() => {
    const loadEventData = async () => {
      if (!eventId) return

      try {
        setIsLoadingEvent(true)
        console.log('EVENT_ROOM: Loading event data for ID:', eventId)

        // Fetch all events and find the one matching the ID
        const { fetchOnChainEvents } = await import('../services/onChainEvents')
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
        const { streamingService } = await import('../services/streaming')
        const availability = await streamingService.checkEventAvailability(eventId)
        
        console.log('EVENT_ROOM: Event availability:', availability)

        if (!availability.available && availability.hasEnded) {
          // Event has ended, show expired message
          setEventData({
            id: eventId,
            title: targetEvent.title,
            expired: true,
            message: availability.message
          })
          setIsLoadingEvent(false)
          return
        }

        // Build complete event data
        const eventData = {
          id: eventId,
          contractEventId: parseInt(eventId),
          creator: targetEvent.creator,
          creatorAddress: targetEvent.creatorAddress,
          startDate: new Date(targetEvent.date).getTime(), // Convert to milliseconds
          eventDuration: targetEvent.duration * 60, // Convert minutes to seconds for consistency
          reservePrice: targetEvent.reservePrice,
          metadataURI: targetEvent.eventMetadataURI,
          ticketKioskAddress: targetEvent.ticketKioskAddress,
          finalized: targetEvent.finalized,
          // From event data
          title: targetEvent.title,
          description: targetEvent.description,
          category: targetEvent.category,
          image: targetEvent.image,
          // Availability info
          available: availability.available,
          isActive: availability.isActive,
          hasEnded: availability.hasEnded,
          ticketPrice: targetEvent.ticketPrice,
          maxParticipants: targetEvent.maxParticipants,
          participants: targetEvent.participants,
          status: targetEvent.status
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
  const handleStreamStatusChange = (status: {
    isLive: boolean
    viewerCount: number
    hasAccess: boolean
  }) => {
    setStreamStatus(status)
    console.log('EVENT_ROOM: Stream status updated:', status)
  }

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

  // Check if event has started
  const hasEventStarted = () => {
    if (!eventData) return false
    return new Date() >= new Date(eventData.startDate)
  }

  // Check if event has ended
  const hasEventEnded = () => {
    if (!eventData) return false
    const endTime = new Date(eventData.startDate + eventData.eventDuration * 1000)
    return new Date() >= endTime
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

  // Redirect to room.haus25.live for live events
  useEffect(() => {
    if (eventData && hasEventStarted() && !hasEventEnded()) {
      const streamingUrl = `https://room.haus25.live/${eventId}${isCreator ? '?isCreator=true' : ''}${ticketId ? `&ticketId=${ticketId}` : ''}`
      
      // Show user they're being redirected
      toast.info('Redirecting to live stream...', { duration: 2000 })
      
      setTimeout(() => {
        window.location.href = streamingUrl
      }, 2000)
    }
  }, [eventData, eventId, isCreator, ticketId])

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
            <Button onClick={() => router.push('/ticket-kiosk')}>
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
            <Button onClick={() => router.push('/ticket-kiosk')}>
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
            <Button onClick={() => router.push('/ticket-kiosk')}>
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
          { label: "Ticket Kiosk", href: "/ticket-kiosk" },
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

              {hasEventStarted() && !hasEventEnded() && (
                <Button
                  onClick={() => {
                    const streamingUrl = `https://room.haus25.live/${eventId}${isCreator ? '?isCreator=true' : ''}${ticketId ? `&ticketId=${ticketId}` : ''}`
                    window.location.href = streamingUrl
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Go to Live Stream
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stream Section */}
          <div className="lg:col-span-2">
            {hasEventStarted() && !hasEventEnded() ? (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Live Stream
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Stream Active</h3>
                    <p className="text-muted-foreground mb-4">
                      This event is currently live! Click the button below to join.
                    </p>
                    <Button 
                      onClick={() => {
                        const streamingUrl = `https://room.haus25.live/${eventId}${isCreator ? '?isCreator=true' : ''}${ticketId ? `&ticketId=${ticketId}` : ''}`
                        window.location.href = streamingUrl
                      }}
                      size="lg"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Live Stream
                    </Button>
          </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-6">
                <CardContent className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    {eventTiming.status === 'upcoming' ? 'Event Not Started' : 'Event Ended'}
                  </h3>
                  <p className="text-muted-foreground">
                    {eventTiming.status === 'upcoming' 
                      ? `This event will start ${eventTiming.timeText.toLowerCase()}`
                      : 'This event has concluded'
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Event Details */}
            <Card>
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

          {/* Chat and Info Section */}
          <div className="space-y-6">
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="stream" className="flex-1">Stream Info</TabsTrigger>
                  <TabsTrigger value="chat" className="flex-1">Chat</TabsTrigger>
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
                        <p className="text-sm font-medium mb-2">Creator Controls</p>
                        <p className="text-xs text-muted-foreground">
                          Stream controls are available in the live room
                        </p>
                      </div>
                    )}
                  </CardContent>
                </TabsContent>

                    <TabsContent value="chat" className="m-0">
                      <CardContent className="p-0">
                     {!hasEventStarted() ? (
                       <div className="p-4 text-center text-muted-foreground">
                         <p>Chat will be available when the event starts</p>
                       </div>
                     ) : hasEventEnded() ? (
                       <div className="p-4 text-center text-muted-foreground">
                         <p>Event has ended</p>
                       </div>
                     ) : (
                        <EventChat
                          messages={chatMessages}
                          message={chatMessage}
                          onMessageChange={setChatMessage}
                          onSendMessage={handleSendMessage}
                        />
                     )}
                      </CardContent>
                    </TabsContent>
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
                    onClick={() => router.push(`/ticket-kiosk/${eventId}`)}
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
