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
import { QuickAccess } from "../components/quickAccess"
import { User, Calendar, Ticket, Settings, Loader2, RefreshCw } from "lucide-react"
import { useAuth } from "../contexts/auth"
import { useEvents } from "../contexts/events"
import { fetchUserTickets } from "../services/onChainEvents"

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userProfile, isConnected } = useAuth()
  const { events, loading: eventsLoading } = useEvents()
  const [activeTab, setActiveTab] = useState("overview")
  const [userTickets, setUserTickets] = useState<any[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)

  // Get active tab from URL parameters
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && ["overview", "events", "tickets", "settings"].includes(tab)) {
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

  return (
    <div className="min-h-screen flex flex-col texture-bg">
      <Navbar />
      <QuickAccess />

      <main className="flex-1 container py-12">
        <Breadcrumbs items={[{ label: "Profile" }]} />

        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userProfile.avatar || undefined} alt={userProfile.name} />
              <AvatarFallback>
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{userProfile.displayName || userProfile.name}</h1>
              <p className="text-muted-foreground">{userProfile.address}</p>
              {userProfile.bio && <p className="text-sm mt-1">{userProfile.bio}</p>}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>My Events ({userEvents.length})</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center space-x-2">
              <Ticket className="h-4 w-4" />
              <span>My Tickets ({userTickets.length})</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Events Created</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userEvents.length}</div>
                  <p className="text-xs text-muted-foreground">Total events organized</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tickets Purchased</CardTitle>
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userTickets.length}</div>
                  <p className="text-xs text-muted-foreground">Events attended</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {userTickets.reduce((total, ticket) => total + ticket.purchasePrice, 0).toFixed(2)} SEI
                  </div>
                  <p className="text-xs text-muted-foreground">On event tickets</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest events and ticket purchases</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userTickets.slice(0, 3).map((ticket) => (
                    <div key={`${ticket.kioskAddress}-${ticket.ticketId}`} className="flex items-center space-x-4">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">Purchased {ticket.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTicketNumber(ticket.ticketNumber, ticket.totalTickets)} • {ticket.purchasePrice} SEI
                        </p>
                      </div>
                      <Badge variant="outline">
                        {new Date(ticket.purchaseTimestamp * 1000).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}

                  {userEvents.slice(0, 2).map((event: any) => (
                    <div key={event.id} className="flex items-center space-x-4">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">Created "{event.title}"</p>
                        <p className="text-sm text-muted-foreground">
                          {event.participants}/{event.maxParticipants} participants • {formatDate(event.date)}
                        </p>
                      </div>
                      <Badge variant={event.status === "live" ? "default" : "secondary"}>
                        {event.status}
                      </Badge>
                    </div>
                  ))}

                  {userTickets.length === 0 && userEvents.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Events</h2>
              <Button onClick={() => router.push("/event-factory")}>Create New Event</Button>
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
                  <Button onClick={() => router.push("/event-factory")}>Create Your First Event</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Tickets</h2>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={loadUserTickets} disabled={ticketsLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${ticketsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={() => router.push("/ticket-kiosk")}>Browse Events</Button>
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
                    const params = new URLSearchParams({
                      eventId: ticket.eventId.toString(),
                      ticketId: ticket.ticketId.toString(),
                      isCreator: 'false'
                    })
                    router.push(`/event-room?${params.toString()}`)
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
                        {/* Progressive ID Badge */}
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
                  <Button onClick={() => router.push("/ticket-kiosk")}>Browse Events</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your profile information and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Wallet Address</label>
                    <p className="text-sm text-muted-foreground font-mono">{userProfile.address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Username</label>
                    <p className="text-sm text-muted-foreground">{userProfile.displayName || userProfile.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Bio</label>
                    <p className="text-sm text-muted-foreground">{userProfile.bio || "No bio set"}</p>
                  </div>
                </div>
                <Button className="mt-6" variant="outline">
                  Edit Profile (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
