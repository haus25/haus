"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { streamingService } from "../../services/streaming"
import { WebRTCStreaming } from "../../components/webrtcStreaming"
import { EventChat } from "../../components/eventChat"
import { createEventFactoryService } from "../../services/create"
import { useWalletClient } from 'wagmi'
import { useAuth } from "../../contexts/auth"
import { 
  Video, 
  Users, 
  Clock, 
  Calendar,
  Crown,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ExternalLink
} from "lucide-react"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"

export default function StreamingRoom() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { userProfile, isConnected } = useAuth()
  const { data: walletClient } = useWalletClient()

  const eventId = params.eventId as string
  const isCreator = searchParams.get("isCreator") === "true"
  const ticketId = searchParams.get("ticketId")

  // State management
  const [eventData, setEventData] = useState<any>(null)
  const [isLoadingEvent, setIsLoadingEvent] = useState(true)
  const [eventAvailability, setEventAvailability] = useState<any>(null)
  const [streamStatus, setStreamStatus] = useState({
    isLive: false,
    viewerCount: 0,
    hasAccess: false
  })
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatMessage, setChatMessage] = useState("")

  // Check event availability and load data
  useEffect(() => {
    const loadEventData = async () => {
      if (!eventId) return

      try {
        setIsLoadingEvent(true)
        console.log('STREAMING_ROOM: Loading event data for ID:', eventId)

        // Check event availability first
        const availability = await streamingService.checkEventAvailability(eventId)
        setEventAvailability(availability)
        
        console.log('STREAMING_ROOM: Event availability:', availability)

        if (!availability.available && availability.hasEnded) {
          // Event has ended
          setEventData({
            id: eventId,
            title: `Event #${eventId}`,
            expired: true,
            message: availability.message
          })
          setIsLoadingEvent(false)
          return
        }

        // Load blockchain event data if wallet is connected
        if (walletClient) {
          const eventService = createEventFactoryService(walletClient)
          const eventDetails = await eventService.getEventDetails(parseInt(eventId))

          // Fetch metadata from IPFS if available
          let eventMetadata: any = {}
          if (eventDetails.metadataURI) {
            try {
              const metadataResponse = await fetch(eventDetails.metadataURI)
              if (metadataResponse.ok) {
                eventMetadata = await metadataResponse.json()
              }
            } catch (error) {
              console.warn('STREAMING_ROOM: Could not load event metadata:', error)
            }
          }

          const eventData = {
            id: eventId,
            contractEventId: eventId,
            creator: eventDetails.creator,
            startDate: eventDetails.startDate * 1000,
            eventDuration: eventDetails.eventDuration,
            reservePrice: eventDetails.reservePrice,
            metadataURI: eventDetails.metadataURI,
            ticketKioskAddress: eventDetails.ticketKioskAddress,
            finalized: eventDetails.finalized,
            title: eventMetadata?.title || `Event #${eventId}`,
            description: eventMetadata?.description || '',
            category: eventMetadata?.category || 'general',
            image: eventMetadata?.image || '',
            available: availability.available,
            isActive: availability.isActive,
            hasEnded: availability.hasEnded,
            ...eventMetadata
          }

          setEventData(eventData)
        } else {
          // Basic event data without blockchain info
          setEventData({
            id: eventId,
            title: `Event #${eventId}`,
            description: 'Live streaming event',
            available: availability.available,
            isActive: availability.isActive,
            hasEnded: availability.hasEnded
          })
        }

      } catch (error) {
        console.error('STREAMING_ROOM: Error loading event data:', error)
        setEventData({
          id: eventId,
          title: `Event #${eventId}`,
          error: 'Failed to load event data'
        })
      } finally {
        setIsLoadingEvent(false)
      }
    }

    loadEventData()
  }, [eventId, walletClient])

  // Initialize chat
  useEffect(() => {
    if (eventData && !eventData.expired) {
      setChatMessages([
        {
          id: 1,
          user: "system",
          message: `Welcome to ${eventData.title}!`,
          timestamp: new Date().toISOString(),
          isSystem: true
        }
      ])
    }
  }, [eventData])

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

  // Handle stream status changes
  const handleStreamStatusChange = (status: {
    isLive: boolean
    viewerCount: number
    hasAccess: boolean
  }) => {
    setStreamStatus(status)
  }

  // Loading state
  if (isLoadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading event room...</p>
        </div>
      </div>
    )
  }

  // Event not found or error
  if (!eventData || eventData.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
          <p className="text-gray-400 mb-6">
            {eventData?.error || 'This event room could not be loaded.'}
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = 'https://haus25.live/ticket-kiosk'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ticket Kiosk
          </Button>
        </div>
      </div>
    )
  }

  // Event has ended
  if (eventData.expired || eventData.hasEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <Clock className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Event Has Ended</h1>
          <p className="text-gray-400 mb-2">{eventData.title}</p>
          <p className="text-gray-400 mb-6">
            {eventData.message || 'This event room is no longer available.'}
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = 'https://haus25.live/ticket-kiosk'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ticket Kiosk
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">{eventData.title}</h1>
              <Badge 
                variant={streamStatus.isLive ? 'default' : 'secondary'}
                className={streamStatus.isLive ? 'bg-red-500 text-white animate-pulse' : ''}
              >
                {streamStatus.isLive && <Video className="h-3 w-3 mr-1" />}
                {streamStatus.isLive ? 'LIVE' : 'OFFLINE'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users className="h-4 w-4" />
                {streamStatus.viewerCount} viewers
              </div>
              
              {isCreator && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                  <Crown className="h-3 w-3 mr-1" />
                  Creator
                </Badge>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = 'https://haus25.live/event-room?eventId=' + eventId}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Event Details
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Stream Area */}
          <div className="lg:col-span-3">
            <div className="bg-gray-900 rounded-lg overflow-hidden">
                             <WebRTCStreaming
                 eventId={eventId}
                 ticketKioskAddress={eventData.ticketKioskAddress}
                 isCreator={isCreator}
                 eventStartTime={eventData.startDate ? new Date(eventData.startDate).toISOString() : new Date().toISOString()}
                 eventDuration={eventData.eventDuration ? Math.floor(eventData.eventDuration / 60) : 30}
                 onStreamStatusChange={handleStreamStatusChange}
               />
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900 border-gray-700 h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Live Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <EventChat
                  messages={chatMessages}
                  message={chatMessage}
                  onMessageChange={setChatMessage}
                  onSendMessage={handleSendMessage}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 