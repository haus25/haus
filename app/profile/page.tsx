"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "../components/navbar"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Badge } from "../components/ui/badge"
import { Breadcrumbs } from "../components/breadcrumbs"
import { QuickAccess } from "../contexts/auth"
import { SettingsModal } from "../components/settings"
import { 
  User, 
  Calendar, 
  Ticket, 
  Edit, 
  Loader2, 
  RefreshCw,
  MapPin,
  Heart,
  Globe
} from "lucide-react"
import { useAuth } from "../contexts/auth"
import { useEvents } from "../contexts/events"
import { fetchUserTickets } from "../services/tickets"
import { SUPPORTED_SOCIAL_PLATFORMS } from "../lib/constants"

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userProfile, isConnected } = useAuth()
  const { events, loading: eventsLoading } = useEvents()
  const [activeTab, setActiveTab] = useState("info")
  const [userTickets, setUserTickets] = useState<any[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)

  // Get active tab from URL parameters
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && ["info", "events", "tickets"].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Fetch user tickets when profile loads
  useEffect(() => {
    if (isConnected && userProfile?.address) {
      loadUserTickets()
    }
  }, [isConnected, userProfile?.address])

  const loadUserTickets = async () => {
    if (!userProfile?.address) return
    
    setTicketsLoading(true)
    try {
      console.log('PROFILE: Fetching tickets for user:', userProfile.address)
      const tickets = await fetchUserTickets(userProfile.address)
      setUserTickets(tickets)
      console.log('PROFILE: Found', tickets.length, 'tickets')
    } catch (error) {
      console.error('PROFILE: Error fetching user tickets:', error)
    } finally {
      setTicketsLoading(false)
    }
  }

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", value)
    router.replace(url.pathname + url.search)
  }

  const handleStartLivestream = async (event: any) => {
    try {
      console.log('PROFILE: Starting livestream for event', event.contractEventId)
      
      // Import streaming service
      const { streamingService } = await import('../services/streaming')
      
      // Get stream information for this event
      const streamInfo = await streamingService.getStreamInfo(event.contractEventId.toString())
      
      console.log('PROFILE: Stream info:', streamInfo)
      
      // Navigate to event room as creator with streaming capabilities
      router.push(`/room/${event.contractEventId}?isCreator=true`)
      
    } catch (error) {
      console.error('PROFILE: Error starting livestream:', error)
      // Still navigate to event room even if stream setup fails
      router.push(`/room/${event.contractEventId}?isCreator=true`)
    }
  }

  if (!isConnected || !userProfile) {
    return (
      <div className="min-h-screen flex flex-col texture-bg">
        <Navbar />
        <QuickAccess />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md text-center">
            <CardHeader>
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>Please connect your wallet to view your profile</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    )
  }

  // Filter events created by this user
  const userEvents = events.filter(
    (event) => event.creatorAddress.toLowerCase() === userProfile.address.toLowerCase()
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTicketNumber = (ticketNumber: number, totalTickets: number) => {
    return `#${ticketNumber}/${totalTickets}`
  }

  const getSocialCount = () => {
    return Object.values(userProfile.socials || {}).filter(Boolean).length
  }

  return (
    <div className="min-h-screen flex flex-col texture-bg">
      <Navbar />
      <QuickAccess />

      <main className="flex-1 container py-12">
        <Breadcrumbs items={[{ label: "Profile" }]} />

        {/* Profile Header */}
        <div className="mb-8">
          <div className="relative">
            {/* Banner */}
            {userProfile.banner && (
              <div 
                className="h-48 rounded-lg bg-cover bg-center mb-4"
                style={{ backgroundImage: `url(${userProfile.banner})` }}
              />
            )}
            
            {/* Profile Info */}
            <div className="flex items-end justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20 border-4 border-background">
                  <AvatarImage src={userProfile.avatar || undefined} alt={userProfile.name} />
                  <AvatarFallback>
                    <User className="h-10 w-10" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold">{userProfile.displayName || userProfile.name}</h1>
                  <p className="text-muted-foreground">@{userProfile.name}</p>
                  {userProfile.bio && (
                    <p className="text-sm mt-2 max-w-md">{userProfile.bio}</p>
                  )}
                </div>
              </div>
              
              {/* Edit Button */}
              <SettingsModal>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </SettingsModal>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Info</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Your Events ({userEvents.length})</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center space-x-2">
              <Ticket className="h-4 w-4" />
              <span>Your Tickets ({userTickets.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Profile Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Username</label>
                    <p className="font-medium">@{userProfile.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Display Name</label>
                    <p className="font-medium">{userProfile.displayName || userProfile.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Bio</label>
                    <p className="text-sm">{userProfile.bio || "No bio set"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
                    <p className="font-mono text-xs break-all">{userProfile.address}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Favorite Categories</label>
                    {userProfile.preferences && userProfile.preferences.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {userProfile.preferences.map((category) => (
                          <Badge key={category} variant="secondary">
                            {category.replace(/-/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">No preferences set</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Social Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="h-4 w-4 mr-2" />
                    Social Links ({getSocialCount()})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getSocialCount() > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(userProfile.socials || {}).map(([platform, username]) => {
                        if (!username) return null
                        const config = SUPPORTED_SOCIAL_PLATFORMS[platform as keyof typeof SUPPORTED_SOCIAL_PLATFORMS]
                        if (!config) return null
                        
                        return (
                          <div key={platform} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{config.name}</span>
                            <a 
                              href={platform === 'website' ? 
                                (username.startsWith('http') ? username : `https://${username}`) :
                                `${config.baseUrl}${username.replace('@', '')}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              {platform === 'website' ? username : `@${username.replace('@', '')}`}
                            </a>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No social links added</p>
                  )}
                </CardContent>
              </Card>

              {/* Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Events Created</span>
                    <Badge variant="secondary">{userEvents.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tickets Purchased</span>
                    <Badge variant="secondary">{userTickets.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Spent</span>
                    <Badge variant="secondary">
                      {userTickets.reduce((total, ticket) => total + ticket.purchasePrice, 0).toFixed(2)} SEI
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Profile Completeness</span>
                    <Badge variant={userProfile.isProfileComplete ? "default" : "secondary"}>
                      {userProfile.isProfileComplete ? "Complete" : "Incomplete"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Events</h2>
              <Button onClick={() => router.push("/factory")}>Create New Event</Button>
            </div>

            {eventsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading your events...</p>
              </div>
            ) : userEvents.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {userEvents.map((event) => (
                  <Card key={event.id} className="hover:shadow-md transition-shadow">
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{event.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Date:</span>
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Participants:</span>
                          <span>{event.participants}/{event.maxParticipants}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Price:</span>
                          <span>{event.ticketPrice} SEI</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Status:</span>
                          <Badge variant={event.status === "live" ? "default" : "secondary"}>
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => router.push(`/room/${event.contractEventId}?isCreator=true`)}
                          className="flex-1"
                        >
                          Event Room
                        </Button>
                        {event.status === 'upcoming' ? (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => router.push(`/kiosk/${event.contractEventId}`)}
                            className="flex-1"
                          >
                            Curate
                          </Button>
                        ) : event.status !== 'completed' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStartLivestream(event)}
                            className="flex-1"
                            disabled={event.status === 'live'}
                          >
                            {event.status === 'live' ? 'Live' : 'Start Stream'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Events Created</h3>
                  <p className="text-muted-foreground mb-6">
                    You haven't created any events yet. Start by creating your first event!
                  </p>
                  <Button onClick={() => router.push("/factory")}>Create Your First Event</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Tickets</h2>
              <div className="flex space-x-2">
                <Button variant="outline" className="hover:text-background" onClick={loadUserTickets} disabled={ticketsLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${ticketsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={() => router.push("/kiosk")}>Browse Events</Button>
              </div>
            </div>

            {ticketsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading your tickets...</p>
              </div>
            ) : userTickets.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {userTickets.map((ticket) => {
                  // Find the corresponding event
                  const event = events.find(e => e.contractEventId === ticket.eventId)
                  
                  const handleTicketClick = () => {
                    // Redirect to event room with ticket information
                    router.push(`/room/${ticket.eventId}?ticketId=${ticket.ticketId}&isCreator=false`)
                  }
                  
                  return (
                    <Card 
                      key={`${ticket.kioskAddress}-${ticket.ticketId}`} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={handleTicketClick}
                    >
                      <div className="relative">
                        <div className="aspect-video overflow-hidden rounded-t-lg">
                          <img 
                            src={event?.image || '/placeholder.svg'} 
                            alt={event?.title || 'Event'} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-mono">
                          #{ticket.eventId}
                        </div>
                      </div>
                      <CardHeader>
                        <CardTitle className="line-clamp-1">{event?.title || `Event #${ticket.eventId}`}</CardTitle>
                        <CardDescription>
                          Ticket {formatTicketNumber(ticket.ticketNumber, ticket.totalTickets)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Event ID:</span>
                            <span className="font-mono">#{ticket.eventId}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Ticket:</span>
                            <span className="font-mono">{ticket.name}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Price Paid:</span>
                            <span>{ticket.purchasePrice} SEI</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Category:</span>
                            <Badge variant="outline">{ticket.artCategory}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Purchased:</span>
                            <span>{new Date(ticket.purchaseTimestamp * 1000).toLocaleDateString()}</span>
                          </div>
                          {event && (
                            <div className="flex items-center justify-between text-sm">
                              <span>Event Date:</span>
                              <span>{formatDate(event.date)}</span>
                            </div>
                          )}
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground text-center">
                              Click to enter event room
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Tickets Purchased</h3>
                  <p className="text-muted-foreground mb-6">
                    You haven't purchased any event tickets yet. Browse available events to get started!
                  </p>
                  <Button onClick={() => router.push("/kiosk")}>Browse Events</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
