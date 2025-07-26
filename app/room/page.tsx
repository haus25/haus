"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "../components/navbar"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Input } from "../components/ui/input"
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
  Heart,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  X,
  Volume2,
  VolumeX
} from "lucide-react"
import { toast } from "sonner"
import { createTicketService } from "../services/tickets"
import { sendTip, getEventTippingData } from "../services/tipping"

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
  const [tipAmount, setTipAmount] = useState("")
  const [customTipAmount, setCustomTipAmount] = useState("")
  const [showCustomTip, setShowCustomTip] = useState(false)
  const [isTipping, setIsTipping] = useState(false)
  
  // Video player UI states
  const [isVideoExpanded, setIsVideoExpanded] = useState(false)
  const [showOverlayChat, setShowOverlayChat] = useState(true)
  const [showTipsBar, setShowTipsBar] = useState(true)
  const [isHoveringVideo, setIsHoveringVideo] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(false)
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  
  // Tipping data
  const [currentTippedAmount, setCurrentTippedAmount] = useState("0")
  const [reserveProgress, setReserveProgress] = useState(0)

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

  // Load tipping data
  useEffect(() => {
    const loadTippingData = async () => {
      if (!eventId) return

      try {
        const tippingData = await getEventTippingData(eventId)
        console.log('ROOM: Tipping data loaded:', tippingData)
        
        setCurrentTippedAmount(tippingData.totalTips)
        
        // Calculate progress percentage
        if (eventData?.reservePrice) {
          const progress = (parseFloat(tippingData.totalTips) / parseFloat(eventData.reservePrice)) * 100
          setReserveProgress(Math.min(progress, 100))
        }
      } catch (error) {
        console.error('ROOM: Error loading tipping data:', error)
      }
    }

    if (eventData) {
      loadTippingData()
      
      // Refresh tipping data every 30 seconds when stream is live
      if (streamStatus.isLive) {
        const interval = setInterval(loadTippingData, 30000)
        return () => clearInterval(interval)
      }
    }
  }, [eventId, eventData, streamStatus.isLive])

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

  // Handle tipping with real blockchain integration
  const handleTip = async (amount: number) => {
    console.log('ROOM: handleTip called with amount:', amount)
    console.log('ROOM: User profile:', userProfile)
    console.log('ROOM: Wallet client:', !!walletClient)
    console.log('ROOM: Event data:', !!eventData)
    console.log('ROOM: Has ticket:', hasTicket)
    console.log('ROOM: Is creator:', isCreator)
    
    if (!userProfile || !walletClient || !eventData) {
      toast.error('Please connect your wallet to send tips')
      return
    }

    if (!hasTicket && !isCreator) {
      toast.error('You need a ticket to tip in this event')
      return
    }

    try {
      setIsTipping(true)
      setTipAmount(amount.toString())
      
      console.log('ROOM: Calling sendTip with eventId:', eventId, 'amount:', amount)
      const hash = await sendTip(eventId!, amount.toString(), "", walletClient)
      console.log('ROOM: Tip transaction hash:', hash)
      toast.success(`Tip of ${amount} SEI sent successfully!`)
      
      // Refresh tipping data after successful tip
      setTimeout(async () => {
        try {
          const tippingData = await getEventTippingData(eventId!)
          setCurrentTippedAmount(tippingData.totalTips)
          
          if (eventData?.reservePrice) {
            const progress = (parseFloat(tippingData.totalTips) / parseFloat(eventData.reservePrice)) * 100
            setReserveProgress(Math.min(progress, 100))
          }
        } catch (refreshError) {
          console.error('ROOM: Error refreshing tipping data:', refreshError)
        }
      }, 2000) // Wait 2 seconds for blockchain confirmation
      
    } catch (error) {
      console.error("ROOM: Error sending tip:", error)
      toast.error(error instanceof Error ? error.message : 'Failed to send tip')
      toast.error('Failed to send tip')
    } finally {
      setIsTipping(false)
    }
  }

  // Handle video hover and controls
  const handleVideoMouseMove = () => {
    setIsHoveringVideo(true)
    setControlsVisible(true)
    
    if (controlsTimeout) {
      clearTimeout(controlsTimeout)
    }
    
    if (isVideoExpanded) {
      const timeout = setTimeout(() => {
        setControlsVisible(false)
      }, 3000)
      
      setControlsTimeout(timeout)
    }
  }

  const handleVideoMouseLeave = () => {
    if (!isVideoExpanded) {
      setIsHoveringVideo(false)
    }
    if (controlsTimeout) {
      clearTimeout(controlsTimeout)
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
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
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
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
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
      {/* Navbar - hidden in expanded view */}
      {!isVideoExpanded && <Navbar />}

      <main className={`${isVideoExpanded ? 'fixed inset-0 z-50 bg-black overflow-hidden' : 'flex-1 container py-6'}`}>
        {/* Breadcrumbs - only in normal view */}
        {!isVideoExpanded && (
          <Breadcrumbs items={[
            { label: "Ticket Kiosk", href: "/kiosk" },
            { label: eventData.title || `Event #${eventId}` }
          ]} />
        )}

        {/* Event Header - only in normal view */}
        {!isVideoExpanded && (
          <div className="mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">{eventData.title || `Event #${eventId}`}</h1>
                  <Badge 
                    variant={eventTiming.status === 'live' ? 'default' : eventTiming.status === 'upcoming' ? 'secondary' : 'outline'}
                    className={`${
                      eventTiming.status === 'live' 
                        ? 'bg-primary text-primary-foreground animate-pulse border-primary' 
                        : 'bg-secondary text-secondary-foreground border-secondary'
                    }`}
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
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {eventData.creator?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-right">
                    <p className="font-medium text-foreground">Creator</p>
                    <p className="text-sm text-muted-foreground">
                      {eventData.creator?.slice(0, 6)}...{eventData.creator?.slice(-4)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Layout */}
        <div className={`${isVideoExpanded ? 'relative w-full h-full' : 'grid grid-cols-1 lg:grid-cols-4 gap-6'}`}>
          
          {/* Video Player Section */}
          <div className={`${isVideoExpanded ? 'absolute inset-0 w-full h-full' : 'lg:col-span-3'}`}>
            <div 
              className={`relative ${isVideoExpanded ? 'w-full h-full' : ''}`}
              onMouseMove={handleVideoMouseMove}
              onMouseLeave={handleVideoMouseLeave}
            >
              <div className={`${isVideoExpanded ? 'w-full h-full' : ''}`}>
                <Streaming
                  eventId={eventId}
                  isCreator={isCreator}
                  ticketKioskAddress={eventData.ticketKioskAddress}
                  eventStartTime={new Date(eventData.startDate).toISOString()}
                  eventDuration={Math.floor(eventData.eventDuration / 60)} // Convert to minutes
                  onStreamStatusChange={handleStreamStatusChange}
                />
              </div>
              
              {/* Video Controls Overlay - only shown on hover */}
              {(isHoveringVideo || controlsVisible) && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top Right Controls */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
                    {/* Viewer Count - properly positioned */}
                    <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-lg border border-white/20">
                      <div className="flex items-center text-sm">
                        <Users className="h-4 w-4 mr-2" />
                        {streamStatus.viewerCount}
                      </div>
                    </div>
                    
                    {/* Expand/Minimize Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 bg-black/60 backdrop-blur-sm border border-white/20"
                      onClick={() => setIsVideoExpanded(!isVideoExpanded)}
                    >
                      {isVideoExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Bottom Controls - only in expanded view */}
                  {isVideoExpanded && (
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
                      {/* Left Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20 bg-black/60 backdrop-blur-sm border border-white/20"
                          onClick={() => setIsMuted(!isMuted)}
                        >
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>

                        {/* Chat Toggle */}
                        {!isCreator && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 bg-black/60 backdrop-blur-sm border border-white/20"
                            onClick={() => setShowOverlayChat(!showOverlayChat)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Right Controls - Tips Toggle */}
                      {!isCreator && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-primary/90 bg-primary/80 backdrop-blur-sm border border-primary"
                          onClick={() => setShowTipsBar(!showTipsBar)}
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Tips
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Reserve Price Progress - below video in normal view */}
            {!isVideoExpanded && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Reserve Price Progress:</span>
                    <span className="text-muted-foreground">
                      {currentTippedAmount} / {eventData.reservePrice} SEI
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-accent rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${reserveProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quick Tipping - Normal View */}
                {!isCreator && hasTicket && (
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">Send Tip:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCustomTip(!showCustomTip)}
                      >
                        Custom
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {[2, 5, 10].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={() => handleTip(amount)}
                          disabled={isTipping}
                        >
                          <Heart className="h-3 w-3 mr-1" />
                          {amount}
                        </Button>
                      ))}
                    </div>

                    {/* Custom Amount Input - Normal View */}
                    {showCustomTip && (
                      <div className="mt-3 flex items-center gap-2">
                        <Input
                          type="number"
                          value={customTipAmount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomTipAmount(e.target.value)}
                          placeholder="Enter SEI amount"
                          className="flex-1"
                          min="0.1"
                          step="0.1"
                        />
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => {
                            const amount = parseFloat(customTipAmount)
                            if (amount > 0) {
                              handleTip(amount)
                              setCustomTipAmount("")
                              setShowCustomTip(false)
                            }
                          }}
                          disabled={!customTipAmount || parseFloat(customTipAmount) <= 0 || isTipping}
                        >
                          <Heart className="h-3 w-3 mr-1" />
                          Tip
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Chat Only (no tabs, minimal) - Normal View */}
          {!isVideoExpanded && (
            <div className="space-y-6">
              {/* Simple Chat Card */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-card-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Live Chat
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <EventChat
                    messages={chatMessages}
                    message={chatMessage}
                    onMessageChange={setChatMessage}
                    onSendMessage={handleSendMessage}
                    height="400px"
                  />
                </CardContent>
              </Card>

              {/* Access Information - minimal */}
              <Card className="border-border bg-card">
                <CardContent className="p-4 text-sm space-y-2">
                  {isCreator ? (
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-primary" />
                      <span className="text-card-foreground">You are the event creator</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-card-foreground">Valid NFT ticket required</span>
                    </div>
                  )}

                  {!isCreator && !hasTicket && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-2 border-border text-foreground hover:bg-accent"
                      onClick={() => router.push(`/kiosk/${eventId}`)}
                    >
                      Buy Ticket
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Overlay Chat - Expanded View */}
        {isVideoExpanded && showOverlayChat && !isCreator && (
          <div className="absolute top-4 right-4 w-80 h-[calc(100vh-8rem)] z-40">
            <Card className={`
              h-full bg-black/40 backdrop-blur-md border-white/10 transition-opacity duration-300
              hover:bg-black/70 hover:border-white/20
              ${isHoveringVideo || controlsVisible ? 'opacity-100' : 'opacity-30'}
            `}>
              <CardHeader className="pb-2 flex-row items-center justify-between border-b border-white/20">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-white" />
                  <h3 className="text-white font-medium text-sm">Chat</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-6 w-6"
                  onClick={() => setShowOverlayChat(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 bg-transparent flex-1 h-full">
                <EventChat
                  messages={chatMessages}
                  message={chatMessage}
                  onMessageChange={setChatMessage}
                  onSendMessage={handleSendMessage}
                  isOverlay={true}
                  height="calc(100% - 64px)"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tips Horizontal Bar - Expanded View */}
        {isVideoExpanded && showTipsBar && !isCreator && (isHoveringVideo || controlsVisible) && (
          <div className="absolute bottom-16 left-4 right-4 z-40">
            <div className="bg-black/40 backdrop-blur-md text-white px-4 py-3 rounded-lg border border-white/10 hover:bg-black/70 hover:border-white/20 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="font-medium">Reserve Price:</span>
                  <span>{currentTippedAmount} / {eventData.reservePrice} SEI</span>
                  <div className="w-32 bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${reserveProgress}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Quick tip buttons */}
                <div className="flex items-center gap-2">
                  {[2, 5, 10].map((amount) => (
                    <Button
                      key={amount}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-primary/90 bg-primary/80 backdrop-blur-sm border border-primary"
                      onClick={() => handleTip(amount)}
                      disabled={isTipping}
                    >
                      <Heart className="h-3 w-3 mr-1" />
                      {amount}
                    </Button>
                  ))}
                  
                  {/* Custom Amount Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-primary/90 bg-primary/80 backdrop-blur-sm border border-primary"
                    onClick={() => setShowCustomTip(!showCustomTip)}
                  >
                    Custom
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-8 w-8"
                    onClick={() => setShowTipsBar(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Tip Input - Expanded View */}
        {isVideoExpanded && showCustomTip && !isCreator && (isHoveringVideo || controlsVisible) && (
          <div className="absolute bottom-28 left-4 right-4 z-40">
            <div className="bg-black/40 backdrop-blur-md text-white px-4 py-3 rounded-lg border border-white/10 hover:bg-black/70 hover:border-white/20 transition-all duration-300">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Custom Amount:</span>
                <Input
                  type="number"
                  value={customTipAmount}
                                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomTipAmount(e.target.value)}
                  placeholder="Enter SEI amount"
                  className="w-32 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  min="0.1"
                  step="0.1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-primary/90 bg-primary/80"
                  onClick={() => {
                    const amount = parseFloat(customTipAmount)
                    if (amount > 0) {
                      handleTip(amount)
                      setCustomTipAmount("")
                      setShowCustomTip(false)
                    }
                  }}
                  disabled={!customTipAmount || parseFloat(customTipAmount) <= 0 || isTipping}
                >
                  <Heart className="h-3 w-3 mr-1" />
                  Send Tip
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-8 w-8"
                  onClick={() => setShowCustomTip(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
