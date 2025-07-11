"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "../components/navbar"
import { Button } from "../components/ui/button"
import { Slider } from "../components/ui/slider"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Card, CardContent } from "../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { DollarSign, Crown, Video, Eye, Share2 } from "lucide-react"
import { TipModal } from "../components/tipModal"
import { Breadcrumbs } from "../components/breadcrumbs"
import { Switch } from "../components/ui/switch"
import { Label } from "../components/ui/label"
import { useAuth } from "../contexts/auth"
import { EventVideoPlayer } from "../components/videoPlayer"
import { TicketVerification } from "../components/ticketVerification"
import { EventChat } from "../components/eventChat"
import { getRandomVideo } from "../lib/constants"

export default function EventRoom() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const eventId = searchParams.get("eventId")
  const ticketId = searchParams.get("ticketId")

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [tipAmount, setTipAmount] = useState(5)
  const [chatMessage, setChatMessage] = useState("")
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      user: "artist.eth",
      message: "Welcome everyone to my live painting session!",
      timestamp: new Date().toISOString(),
    },
    { id: 2, user: "collector1.eth", message: "Excited to be here!", timestamp: new Date().toISOString() },
    { id: 3, user: "art_lover.eth", message: "The colors are amazing already", timestamp: new Date().toISOString() },
    {
      id: 4,
      user: "nft_whale.eth",
      message: "Just tipped 20 SEI! Love your work",
      timestamp: new Date().toISOString(),
    },
  ])
  const [showChat, setShowChat] = useState(false)
  const [viewMode, setViewMode] = useState<"watch" | "stream">("watch")
  const [isTipModalOpen, setIsTipModalOpen] = useState(false)
  const [hasDelegation, setHasDelegation] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenFormat, setScreenFormat] = useState<"default" | "overlay" | "side">("default")
  const [hasTicket, setHasTicket] = useState(false)
  const [isVerifyingTicket, setIsVerifyingTicket] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(60 * 60) // 60 minutes in seconds
  const [eventDuration, setEventDuration] = useState(60 * 60) // Default 60 minutes
  const [eventData, setEventData] = useState({
    id: eventId || "1",
    title: "Live Painting Session: Abstract Landscapes",
    creator: "artist.eth",
    category: "live-painting",
    date: new Date().toISOString(),
    duration: 60, // in minutes
    ticketPrice: 10,
    status: "live",
  })
  const [videoSource, setVideoSource] = useState("")
  const [showTitle, setShowTitle] = useState(true)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const titleTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Mock user tickets for verification
  const userTickets = [
    { id: "1", eventId: "1", category: "live-painting" },
    { id: "2", eventId: "2", category: "standup-comedy" },
    { id: "3", eventId: "3", category: "poetry-slam" },
  ]

  // Mock data for participants and top tippers
  const participants = [
    { id: 1, name: "artist.eth", avatar: "/placeholder.svg?height=40&width=40", isPerformer: true },
    {
      id: 2,
      name: userProfile?.ensName || "jabyl.eth",
      avatar:
        userProfile?.avatar ||
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/21c09ec3-fb44-40b5-9ffc-6fedc032fe3b-I36E2znZKmldANSRQFL5kgjSSjYRka.jpeg",
      tipped: 50,
    },
    { id: 3, name: "art_lover.eth", avatar: "/placeholder.svg?height=40&width=40", tipped: 35 },
    { id: 4, name: "nft_whale.eth", avatar: "/placeholder.svg?height=40&width=40", tipped: 20 },
    { id: 5, name: "crypto_fan.eth", avatar: "/placeholder.svg?height=40&width=40", tipped: 15 },
    { id: 6, name: "web3_user.eth", avatar: "/placeholder.svg?height=40&width=40", tipped: 10 },
    { id: 7, name: "defi_guy.eth", avatar: "/placeholder.svg?height=40&width=40", tipped: 5 },
    { id: 8, name: "token_holder.eth", avatar: "/placeholder.svg?height=40&width=40", tipped: 5 },
  ]

  const topTippers = [...participants].sort((a, b) => (b.tipped || 0) - (a.tipped || 0)).slice(0, 5)

  // Initialize event data and check ticket
  useEffect(() => {
    // Simulate loading event data
    if (eventId) {
      // In a real app, fetch event data from API
      const mockEventData = {
        id: eventId,
        title: "Live Painting Session: Abstract Landscapes",
        creator: "artist.eth",
        category: "live-painting",
        date: new Date().toISOString(),
        duration: 60, // in minutes
        ticketPrice: 10,
        status: "live",
      }

      setEventData(mockEventData)
      setEventDuration(mockEventData.duration * 60) // Convert minutes to seconds
      setTimeRemaining(mockEventData.duration * 60) // Reset timer

      // Set video source based on event category
      setVideoSource(getRandomVideo(mockEventData.category))
    } else {
      // Default video if no event ID - use the default category
      setVideoSource(getRandomVideo("default"))
    }

    // Simulate ticket verification
    setTimeout(() => {
      // Check if user has a ticket for this event
      const hasValidTicket = userTickets.some((ticket) => ticket.eventId === eventId && ticket.id === ticketId)
      setHasTicket(hasValidTicket || false)
      setIsVerifyingTicket(false)
    }, 2000)
  }, [eventId, ticketId])

  // Start the countdown timer
  useEffect(() => {
    if (hasTicket) {
      // Set up the timer
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    // Clean up on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [hasTicket])

  // Handle title display in fullscreen mode
  useEffect(() => {
    if (isFullscreen) {
      setShowTitle(true)

      // Hide title after 3 seconds
      titleTimerRef.current = setTimeout(() => {
        setShowTitle(false)
      }, 3000)
    } else {
      setShowTitle(true)

      // Clear any existing timer
      if (titleTimerRef.current) {
        clearTimeout(titleTimerRef.current)
      }
    }

    return () => {
      if (titleTimerRef.current) {
        clearTimeout(titleTimerRef.current)
      }
    }
  }, [isFullscreen])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (chatMessage.trim()) {
      setChatMessages([
        ...chatMessages,
        {
          id: chatMessages.length + 1,
          user: userProfile?.ensName || "you.eth",
          message: chatMessage,
          timestamp: new Date().toISOString(),
        },
      ])
      setChatMessage("")
    }
  }

  const handleTipSuccess = () => {
    setIsTipModalOpen(false)
    // Add the tip message to the chat
    setChatMessages([
      ...chatMessages,
      {
        id: chatMessages.length + 1,
        user: "system",
        message: `${userProfile?.ensName || "you.eth"} tipped ${tipAmount} SEI!`,
        timestamp: new Date().toISOString(),
      },
    ])
    // Update delegation status if it was just set
    setHasDelegation(true)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn)
  }

  const toggleMic = () => {
    setIsMicOn(!isMicOn)
  }

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing)
  }

  const verifyTicket = () => {
    setIsVerifyingTicket(true)
    // Simulate verification process
    setTimeout(() => {
      setHasTicket(true)
      setIsVerifyingTicket(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container py-6">
        <Breadcrumbs items={[{ label: "Event Room" }]} />

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{eventData.title}</h1>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === "watch" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("watch")}
              className={viewMode === "watch" ? "bg-primary text-primary-foreground" : ""}
            >
              <Eye className="h-4 w-4 mr-2" />
              Watch
            </Button>
            <Button
              variant={viewMode === "stream" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("stream")}
              className={viewMode === "stream" ? "bg-primary text-primary-foreground" : ""}
            >
              <Video className="h-4 w-4 mr-2" />
              Stream
            </Button>
          </div>
        </div>

        {/* Screen Format Selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Screen Format</h3>
            <div className="flex space-x-2">
              {["default", "overlay", "side"].map((format) => (
                <Button
                  key={format}
                  variant={screenFormat === format ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScreenFormat(format as any)}
                  className={screenFormat === format ? "bg-primary text-primary-foreground" : ""}
                >
                  {format.charAt(0).toUpperCase() + format.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Title above the screen (when not in fullscreen) */}
        {!isFullscreen && (
          <div className="mb-2">
            <h2 className="text-xl font-bold">{eventData.title}</h2>
            <p className="text-sm text-muted-foreground">by {eventData.creator}</p>
          </div>
        )}

        {/* Main Content with Conditional Layout */}
        <div className={isFullscreen ? "fixed inset-0 z-50 p-4 bg-background" : ""}>
          <div
            className={`
              ${screenFormat === "side" ? "flex gap-6" : ""}
              ${isFullscreen ? "" : "w-full"}
            `}
          >
            {/* Video Container */}
            <div
              className={`
                ${screenFormat === "side" ? "w-2/3" : "w-full"}
                ${screenFormat === "default" && !isFullscreen ? "mb-6" : ""}
              `}
            >
              <EventVideoPlayer
                videoSource={videoSource}
                isFullscreen={isFullscreen}
                isMuted={isMuted}
                showChat={showChat}
                participantsCount={participants.length}
                timeRemaining={timeRemaining}
                eventTitle={eventData.title}
                creatorName={eventData.creator}
                showTitle={showTitle}
                onToggleFullscreen={toggleFullscreen}
                onToggleMute={toggleMute}
                onToggleChat={() => setShowChat(!showChat)}
                onOpenTip={viewMode === "watch" ? () => setIsTipModalOpen(true) : undefined}
              >
                {/* Ticket Verification Overlay */}
                <TicketVerification
                  isVerifying={isVerifyingTicket}
                  hasTicket={hasTicket}
                  hasTicketId={!!ticketId}
                  onVerify={verifyTicket}
                />

                {/* Chat Overlay */}
                {screenFormat === "overlay" && !isFullscreen && hasTicket && showChat && (
                  <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-black/60 backdrop-blur-sm overflow-hidden">
                    <EventChat
                      messages={chatMessages}
                      message={chatMessage}
                      onMessageChange={setChatMessage}
                      onSendMessage={handleSendMessage}
                      isOverlay={true}
                    />
                  </div>
                )}
              </EventVideoPlayer>

              {/* Stream Settings or Tipping Section */}
              {!isFullscreen && hasTicket && (
                <div className="mt-4 p-4 border rounded-lg">
                  {viewMode === "watch" ? (
                    <>
                      <h3 className="text-lg font-medium mb-2">Support the Artist</h3>
                      <div className="flex items-center space-x-4 mb-4">
                        <span className="text-sm text-muted-foreground">Tip Amount:</span>
                        <Slider
                          defaultValue={[5]}
                          max={100}
                          step={1}
                          value={[tipAmount]}
                          onValueChange={(value) => setTipAmount(value[0])}
                          className="w-full max-w-xs"
                        />
                        <span className="font-medium">{tipAmount} SEI</span>
                      </div>
                      <div className="flex space-x-2">
                        {[5, 10, 20, 50].map((amount) => (
                          <Button key={amount} variant="outline" size="sm" onClick={() => setTipAmount(amount)}>
                            {amount}
                          </Button>
                        ))}
                      </div>
                      <Button
                        className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => setIsTipModalOpen(true)}
                      >
                        Send Tip
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium mb-4">Stream Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="auto-record">Auto Record</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically record your stream to create an RTA
                            </p>
                          </div>
                          <Switch id="auto-record" defaultChecked />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="enable-chat">Enable Chat</Label>
                            <p className="text-sm text-muted-foreground">Allow viewers to chat during your stream</p>
                          </div>
                          <Switch id="enable-chat" defaultChecked />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="enable-tipping">Enable Tipping</Label>
                            <p className="text-sm text-muted-foreground">
                              Allow viewers to send tips during your stream
                            </p>
                          </div>
                          <Switch id="enable-tipping" defaultChecked />
                        </div>

                        <div className="pt-2">
                          <Button variant="outline" className="w-full">
                            <Share2 className="h-4 w-4 mr-2" />
                            Share Stream Link
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Chat and Participants Section - Only show in default or side-by-side mode */}
            {(screenFormat === "default" || screenFormat === "side") && !isFullscreen && hasTicket && (
              <div className={screenFormat === "side" ? "w-1/3" : "w-full"}>
                <Card className="h-full">
                  <Tabs defaultValue="chat">
                    <TabsList className="w-full">
                      <TabsTrigger value="chat" className="flex-1">
                        Chat
                      </TabsTrigger>
                      <TabsTrigger value="tippers" className="flex-1">
                        Top Tippers
                      </TabsTrigger>
                      <TabsTrigger value="participants" className="flex-1">
                        Participants
                      </TabsTrigger>
                    </TabsList>

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

                    <TabsContent value="tippers" className="m-0">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {topTippers.map((tipper, index) => (
                            <div key={tipper.id} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {index === 0 && <Crown className="h-5 w-5 text-yellow-500" />}
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={tipper.avatar} alt={tipper.name} />
                                  <AvatarFallback>{tipper.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{tipper.name}</p>
                                  {tipper.isPerformer && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                      Artist
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center text-primary">
                                <DollarSign className="h-4 w-4 mr-1" />
                                <span>{tipper.tipped || 0} SEI</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </TabsContent>

                    <TabsContent value="participants" className="m-0">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {participants.map((participant) => (
                            <div key={participant.id} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={participant.avatar} alt={participant.name} />
                                  <AvatarFallback>{participant.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{participant.name}</p>
                                  {participant.isPerformer && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                      Artist
                                    </span>
                                  )}
                                </div>
                              </div>
                              {participant.tipped && (
                                <div className="flex items-center text-primary">
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  <span>{participant.tipped} SEI</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </TabsContent>
                  </Tabs>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <TipModal
        isOpen={isTipModalOpen}
        onClose={() => setIsTipModalOpen(false)}
        onSuccess={handleTipSuccess}
        tipAmount={tipAmount}
        onTipAmountChange={setTipAmount}
        hasDelegation={hasDelegation}
      />
    </div>
  )
}
