"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "../components/navbar"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Checkbox } from "../components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { ArtCategoryIcon } from "../components/categoryIcons"
import { Search, Calendar, Clock, Users, Ticket, ChevronDown, Loader2, Check } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdownMenu"
import { Breadcrumbs } from "../components/breadcrumbs"
import { RecentlyViewed } from "../components/recentlyViewed"
import { TooltipHelper } from "../components/tooltipHelper"
import { QuickAccess } from "../contexts/auth"
import { useEvents } from "../contexts/events"
import { useAuth } from "../contexts/auth"
import { useWalletClient } from 'wagmi'
import { toast } from "sonner"
import { createTicketPurchaseService } from "../services/tickets"
import { getCurationPlanFromBlockchain } from "../services/curation"

type Category =
  | "standup-comedy"
  | "performance-art"
  | "poetry-slam"
  | "improv"
  | "live-streaming"
  | "podcasting"

type SortOption = "date-earliest" | "date-latest" | "price-low-high" | "price-high-low"

export default function TicketKiosk() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isCurationModalOpen, setIsCurationModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])
  const [priceRange, setPriceRange] = useState({ min: 0, max: 50 })
  const [sortOption, setSortOption] = useState<SortOption>("date-earliest")
  const [showPastEvents, setShowPastEvents] = useState(false)
  const [purchasingTickets, setPurchasingTickets] = useState<Set<number>>(new Set())
  const [userOwnedTickets, setUserOwnedTickets] = useState<Set<number>>(new Set())
  const [curatedEvents, setCuratedEvents] = useState<Set<number>>(new Set())

  const { events, loading, refreshEvents } = useEvents()
  const { userProfile, isConnected } = useAuth()
  const { data: walletClient } = useWalletClient()

  // Clear purchasing states when wallet disconnects
  useEffect(() => {
    if (!isConnected || !walletClient) {
      setPurchasingTickets(new Set())
      setUserOwnedTickets(new Set())
      setCuratedEvents(new Set())
    }
  }, [isConnected, walletClient])

  // Check user's ticket ownership when events or user profile changes
  useEffect(() => {
    const checkUserTickets = async () => {
      if (!isConnected || !userProfile?.address || !walletClient || events.length === 0) {
        setUserOwnedTickets(new Set())
        return
      }

      try {
        console.log('OWNERSHIP_CHECK: Starting batch ticket ownership check for', events.length, 'events')
        const ticketService = createTicketPurchaseService(walletClient)

        // Use the new batch check function
        const ownedTicketEventIds = await ticketService.checkUserTicketsBatch(events, userProfile.address)

        console.log('OWNERSHIP_CHECK: Found', ownedTicketEventIds.size, 'owned tickets')
        setUserOwnedTickets(ownedTicketEventIds)
      } catch (error) {
        console.error('Error checking user ticket ownership:', error)
      }
    }

    // Debounce with delay to prevent rapid calls
    const timeoutId = setTimeout(checkUserTickets, 1000)
    return () => clearTimeout(timeoutId)
  }, [events, isConnected, userProfile?.address, walletClient])

  // Check curation status for user's events
  useEffect(() => {
    const checkCurationStatus = async () => {
      if (!isConnected || !userProfile?.address || events.length === 0) {
        setCuratedEvents(new Set())
        return
      }

      try {
        console.log('CURATION_CHECK: Checking curation status for user events')
        const curatedEventIds = new Set<number>()

        // Check only user's events for curation status, limit to first 5
        const userEvents = events.filter(event =>
          event.creatorAddress.toLowerCase() === userProfile.address.toLowerCase()
        ).slice(0, 5)

        for (const event of userEvents) {
          try {
            const curationPlan = await getCurationPlanFromBlockchain(event.contractEventId.toString(), userProfile.address)
            if (curationPlan && curationPlan.status === 'accepted') {
              curatedEventIds.add(event.contractEventId)
              console.log('CURATION_CHECK: Event', event.contractEventId, 'has been curated')
            }
          } catch (error) {
            // Skip events that can't be checked or don't have curation
            console.log(`Curation check skipped for event ${event.contractEventId}:`, error)
          }
        }

        setCuratedEvents(curatedEventIds)
        console.log('CURATION_CHECK: Found', curatedEventIds.size, 'curated events')
      } catch (error) {
        console.error('Error checking curation status:', error)
      }
    }

    // Add longer delay to reduce RPC load
    const timeoutId = setTimeout(checkCurationStatus, 3000)
    return () => clearTimeout(timeoutId)
  }, [events, isConnected, userProfile?.address])

  const handleBuyTicket = async (event: any) => {
    if (!isConnected || !userProfile) {
      toast.error("Please connect your wallet to purchase tickets")
      return
    }

    if (!walletClient) {
      toast.error("Wallet not available. Please try reconnecting your wallet.")
      return
    }

    // Check if we have the contractEventId
    if (typeof event.contractEventId !== 'number') {
      toast.error("Event data not properly loaded. Please refresh the page.")
      return
    }

    const eventId = event.contractEventId

    // Check if user already owns this ticket (prevent double purchase)
    if (userOwnedTickets.has(eventId)) {
      toast.error("You already have a ticket for this event!")
      return
    }

    // Set loading state for this specific ticket
    setPurchasingTickets(prev => new Set(prev).add(eventId))

    try {
      console.log("TICKET_PURCHASE: Starting ticket purchase flow")
      console.log("TICKET_PURCHASE: Event ID:", eventId)
      console.log("TICKET_PURCHASE: Event title:", event.title)
      console.log("TICKET_PURCHASE: User address:", userProfile.address)
      console.log("TICKET_PURCHASE: Wallet client available:", !!walletClient)

      toast.loading("Initializing ticket purchase...")

      // Create ticket purchase service
      console.log("TICKET_PURCHASE: Creating ticket service...")
      const ticketService = createTicketPurchaseService(walletClient)
      console.log("TICKET_PURCHASE: Ticket service created successfully")

      console.log("TICKET_PURCHASE: Using contract event ID:", eventId)

      // Check if user already has a ticket
      toast.loading("Checking ticket availability...")
      const alreadyHasTicket = await ticketService.userHasTicket(eventId, userProfile.address)

      if (alreadyHasTicket) {
        toast.error("You already have a ticket for this event!")
        return
      }

      // Get sales info to show user the current status
      const salesInfo = await ticketService.getTicketSalesInfo(eventId)

      if (salesInfo.remainingTickets <= 0) {
        toast.error("Sorry, this event is sold out!")
        return
      }

      console.log("TICKET_PURCHASE: Ticket price:", salesInfo.price, "SEI")
      console.log("TICKET_PURCHASE: Tickets remaining:", salesInfo.remainingTickets)

      // Show loading message with price info
      toast.loading(`Purchasing ticket for ${salesInfo.price} SEI...`)

      // Execute the purchase
      const purchaseResult = await ticketService.purchaseTicket(eventId, userProfile.address)

      console.log("TICKET_PURCHASE: Purchase completed successfully")
      console.log("TICKET_PURCHASE: Ticket ID:", purchaseResult.ticketId)
      console.log("TICKET_PURCHASE: Ticket name:", purchaseResult.ticketName)
      console.log("TICKET_PURCHASE: Transaction hash:", purchaseResult.txHash)

      // Clear any existing toasts
      toast.dismiss()

      // Show success message with action button
      toast.success(
        `🎫 Ticket purchased successfully!\n\nTicket: ${purchaseResult.ticketName}\nPrice: ${purchaseResult.purchasePrice} SEI\nTx: ${purchaseResult.txHash.slice(0, 8)}...`,
        {
          duration: 8000,
          action: {
            label: "View Tickets",
            onClick: () => router.push("/profile?tab=tickets")
          }
        }
      )

      // Immediately update the owned tickets state to reflect the purchase
      setUserOwnedTickets(prev => new Set(prev).add(eventId))

      // Refresh events after a delay to allow toast to display properly
      setTimeout(() => {
        refreshEvents().catch(console.error)
      }, 1000)

    } catch (error: any) {
      console.error("TICKET_PURCHASE: Error during ticket purchase:", error)
      toast.dismiss()  // Clear loading toasts

      // Parse common error messages
      let errorMessage = error.message || "Failed to purchase ticket"

      if (errorMessage.includes("insufficient")) {
        errorMessage = "Insufficient funds to purchase ticket"
      } else if (errorMessage.includes("sold out") || errorMessage.includes("All tickets sold")) {
        errorMessage = "This event is sold out"
      } else if (errorMessage.includes("already")) {
        errorMessage = "You already have a ticket for this event"
      } else if (errorMessage.includes("rejected") || errorMessage.includes("denied")) {
        errorMessage = "Transaction was cancelled"
      }

      toast.error(errorMessage)
    } finally {
      // Clear loading state for this specific ticket
      setPurchasingTickets(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventId)
        return newSet
      })
    }
  }

  const handleViewDetails = (event: any) => {
    router.push(`/kiosk/${event.contractEventId}`)
  }

  const openCurationModal = (event: any) => {
    setSelectedEvent(event)
    setIsCurationModalOpen(true)
  }

  const toggleCategory = (category: Category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category))
    } else {
      setSelectedCategories([...selectedCategories, category])
    }
  }

  const filteredEvents = events
    .filter((event) => {
      // Filter by search query
      const matchesSearch =
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.creator.toLowerCase().includes(searchQuery.toLowerCase())

      // Filter by selected categories
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(event.category as Category)

      // Filter by price range
      const matchesPrice = event.ticketPrice >= priceRange.min && event.ticketPrice <= priceRange.max

      // Filter by event status (show only upcoming events by default)
      const matchesStatus = showPastEvents || event.status === 'upcoming'

      return matchesSearch && matchesCategory && matchesPrice && matchesStatus
    })
    .sort((a, b) => {
      // Sort based on selected option
      switch (sortOption) {
        case "date-earliest":
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case "date-latest":
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case "price-low-high":
          return a.ticketPrice - b.ticketPrice
        case "price-high-low":
          return b.ticketPrice - a.ticketPrice
        default:
          return 0
      }
    })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case "date-earliest":
        return "Date (Earliest)"
      case "date-latest":
        return "Date (Latest)"
      case "price-low-high":
        return "Price (Low to High)"
      case "price-high-low":
        return "Price (High to Low)"
      default:
        return "Date (Earliest)"
    }
  }

  return (
    <div className="min-h-screen flex flex-col texture-bg">
      <Navbar />
      <QuickAccess />

      <main className="flex-1 container py-12">
        <Breadcrumbs items={[{ label: "Ticket Kiosk" }]} />

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Ticket Kiosk</h1>
          <p className="text-muted-foreground max-w-3xl">
            Discover and join upcoming live events. Purchase tickets to experience art in its creation and participate
            in the ownership of unique digital collectibles.
          </p>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="relative flex-1 max-w-3xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events, artists..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="ml-4 flex items-center gap-2">
            {loading && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading events...
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-past-events"
                checked={showPastEvents}
                onCheckedChange={(checked) => setShowPastEvents(checked === true)}
              />
              <label
                htmlFor="show-past-events"
                className="text-sm font-medium cursor-pointer"
              >
                Show past events
              </label>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={refreshEvents}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {getSortLabel(sortOption)} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortOption("date-earliest")}>Date (Earliest)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption("date-latest")}>Date (Latest)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption("price-low-high")}>Price (Low to High)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption("price-high-low")}>Price (High to Low)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <RecentlyViewed />

            <div className="bg-secondary/50 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-6">Filters</h2>

              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  Categories
                  <TooltipHelper content="Select one or more categories to filter events" className="ml-2" />
                </h3>
                <div className="space-y-2">
                  {[
                    { id: "standup-comedy", label: "Standup Comedy" },
                    { id: "performance-art", label: "Performance Art" },
                    { id: "poetry-slam", label: "Poetry Slam" },
                    { id: "improv", label: "Improv" },
                    { id: "live-streaming", label: "Live Streaming" },
                    { id: "podcasting", label: "Podcasting" },
                  ].map((category) => (
                    <div
                      key={category.id}
                      className={`group flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedCategories.includes(category.id as Category)
                          ? "bg-primary/10 border-l-2 border-primary"
                          : "hover:bg-secondary"
                        }`}
                      onClick={() => toggleCategory(category.id as Category)}
                    >
                      <ArtCategoryIcon
                        category={category.id as Category}
                        size="sm"
                        className={`mr-2 transition-colors ${selectedCategories.includes(category.id as Category)
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-contrast-foreground"
                          }`}
                      />
                      <span
                        className={`text-sm font-medium transition-colors ${selectedCategories.includes(category.id as Category)
                            ? "text-primary"
                            : "text-foreground group-hover:text-contrast-foreground"
                          }`}
                      >
                        {category.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  Price Range (SEI)
                  <TooltipHelper content="Set minimum and maximum ticket prices" className="ml-2" />
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="min-price" className="text-sm text-muted-foreground mb-1 block">
                      Min
                    </label>
                    <Input
                      id="min-price"
                      type="number"
                      min={0}
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: Number.parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label htmlFor="max-price" className="text-sm text-muted-foreground mb-1 block">
                      Max
                    </label>
                    <Input
                      id="max-price"
                      type="number"
                      min={0}
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: Number.parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Events Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">Loading Events</h3>
                <p className="text-muted-foreground">Fetching real-time events from the blockchain...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((event) => (
                    <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative h-48">
                        <img
                          src={event.image || "/placeholder.svg"}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-background/80 rounded-full p-1">
                          <ArtCategoryIcon category={event.category as any} size="sm" className="text-primary" />
                        </div>
                        {/* Status badge */}
                        <div className="absolute top-2 left-2 bg-background/80 rounded-full px-2 py-1">
                          <span className={`text-xs font-medium ${event.status === 'live' ? 'text-red-500' :
                              event.status === 'completed' ? 'text-gray-500' : 'text-green-500'
                            }`}>
                            {event.status.toUpperCase()}
                          </span>
                          {curatedEvents.has(event.contractEventId) && (
                            <span className="text-xs font-medium text-blue-600 ml-1">
                              • CURATED
                            </span>
                          )}
                        </div>
                        {/* Progressive ID Badge */}
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-mono">
                          #{event.contractEventId}
                        </div>
                      </div>
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <CardDescription>by {event.creator}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{event.duration} minutes</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="h-4 w-4 mr-2" />
                          <span>
                            {event.participants}/{event.maxParticipants} participants
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Ticket className="h-4 w-4 mr-2" />
                          <span>{event.ticketPrice} SEI</span>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex gap-2 w-full">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(event)} className="flex-1 min-w-0 text-xs sm:text-sm">
                          Details
                        </Button>
                        {isConnected && userProfile && event.creatorAddress.toLowerCase() === userProfile.address.toLowerCase() && event.status === 'upcoming' ? (
                          curatedEvents.has(event.contractEventId) ? (
                            <Button
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700 flex-1 min-w-0 text-xs sm:text-sm"
                              disabled
                            >
                              <Check className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                              <span className="truncate">Curated</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 min-w-0 text-xs sm:text-sm"
                              onClick={() => router.push(`/kiosk/${event.contractEventId}`)}
                            >
                              <span className="truncate">Curate</span>
                            </Button>
                          )
                        ) : (
                          <Button
                            size="sm"
                            className={`flex-1 min-w-0 text-xs sm:text-sm ${userOwnedTickets.has(event.contractEventId)
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                              }`}
                            onClick={() => handleBuyTicket(event)}
                            disabled={
                              event.status === 'completed' ||
                              event.participants >= event.maxParticipants ||
                              purchasingTickets.has(event.contractEventId) ||
                              userOwnedTickets.has(event.contractEventId)
                            }
                          >
                            {purchasingTickets.has(event.contractEventId) ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-1 sm:mr-2 flex-shrink-0" />
                                <span className="truncate">Purchasing...</span>
                              </>
                            ) : userOwnedTickets.has(event.contractEventId) ? (
                              <>
                                <Check className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                                <span className="truncate">Bought!</span>
                              </>
                            ) : (
                              <span className="truncate">
                                {event.participants >= event.maxParticipants ? 'Sold Out' : 'Buy Ticket'}
                              </span>
                            )}
                          </Button>
                        )}
                      </CardFooter>


                    </Card>
                  ))}
                </div>

                {!loading && filteredEvents.length === 0 && (
                  <div className="text-center py-12">
                    <h3 className="text-xl font-medium mb-2">No events found</h3>
                    <p className="text-muted-foreground mb-4">
                      {events.length === 0
                        ? "No events have been created yet. Be the first to create an event!"
                        : "Try adjusting your search or category filters"
                      }
                    </p>
                    {events.length === 0 && (
                      <Button onClick={() => router.push('/factory')}>
                        Create First Event
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
