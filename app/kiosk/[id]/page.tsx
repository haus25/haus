"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "../../components/navbar"
import { Breadcrumbs } from "../../components/breadcrumbs"
import { QuickAccess } from "../../contexts/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Clock,
  Heart,
  Share2,
  Ticket,
  ArrowLeft,
  Loader2,
  Palette,
  Megaphone,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Edit,
  Send
} from "lucide-react"
import { toast } from "sonner"
import { fetchOnChainEvents, type OnChainEventData, createTicketPurchaseService } from "../../services/tickets"
import { useAuth } from "../../contexts/auth"
import { useWalletClient } from 'wagmi'
import { 
  deployCurationContract, 
  getCurationScopes, 
  requestCurationPlan, 
  sendCurationMessage,
  hasCurationDeployed,
  getCachedCurationPlan,
  getCachedConversationId,
  getConversationDetails,
  requestAspectRefinement,
  acceptCurationProposal,
  type CurationResult
} from "../../services/curation"

interface EventDetailPageProps {
  params: {
    id: string
  }
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const router = useRouter()
  const { userProfile, isConnected } = useAuth()
  const { data: walletClient } = useWalletClient()
  const [event, setEvent] = useState<OnChainEventData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isCurationExpanded, setIsCurationExpanded] = useState(false)
  const [selectedCuration, setSelectedCuration] = useState<'planner' | 'promoter' | 'producer' | null>(null)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [curationConversationId, setCurationConversationId] = useState<string | null>(null)
  const [curationDeployed, setCurationDeployed] = useState(false)
  const [isDeployingCuration, setIsDeployingCuration] = useState(false)
  const [curationPlan, setCurationPlan] = useState<CurationResult | null>(null)
  const [expandedDiscussion, setExpandedDiscussion] = useState<string | null>(null)
  const [discussionMessages, setDiscussionMessages] = useState<Record<string, Array<{role: string, content: string}>>>({})
  const [isDiscussing, setIsDiscussing] = useState(false)
  const [isRequestingPlan, setIsRequestingPlan] = useState(false)
  const [isAcceptingPlan, setIsAcceptingPlan] = useState(false)
  const [selectedIterations, setSelectedIterations] = useState<Record<string, number>>({
    banner: 0,
    title: 0, 
    description: 0,
    schedule: 0,
    pricing: 0
  })

  useEffect(() => {
    const loadEventData = async () => {
      try {
        console.log('TICKET_DETAIL: Loading event data for ID:', params.id)
        
        // Fetch all events and find the one matching the ID
        const events = await fetchOnChainEvents()
        const targetEvent = events.find(e => e.contractEventId === parseInt(params.id))
        
        if (targetEvent) {
          setEvent(targetEvent)
          console.log('TICKET_DETAIL: Event found:', targetEvent.title)
          
          // Check if curation is already deployed
          const hasCuration = await hasCurationDeployed(params.id)
          setCurationDeployed(hasCuration)
          
        } else {
          console.error('TICKET_DETAIL: Event not found for ID:', params.id)
          toast.error('Event not found')
        }
      } catch (error) {
        console.error('TICKET_DETAIL: Error loading event:', error)
        toast.error('Failed to load event details')
      } finally {
        setIsLoading(false)
      }
    }

    loadEventData()
  }, [params.id])

  // Load cached curation plan when user profile is available
  useEffect(() => {
    if (!userProfile?.address || !event) return
    
    const loadCachedPlan = async () => {
      console.log('CURATION_CACHE: Checking for cached plan...')
      const cachedPlan = await getCachedCurationPlan(params.id, userProfile.address)
      if (cachedPlan) {
        console.log('CURATION_CACHE: Found cached plan, restoring state')
        setCurationPlan(cachedPlan)
        
        const conversationId = getCachedConversationId(params.id, userProfile.address)
        if (conversationId) {
          setCurationConversationId(conversationId)
          
          // Also try to restore detailed conversation data including iterations
          const conversationDetails = await getConversationDetails(params.id, userProfile.address)
          if (conversationDetails?.iterations) {
            console.log('CURATION_CACHE: Restoring iteration counts:', conversationDetails.iterations)
            // Store iterations in local state for UI display
            setSelectedIterations(prev => ({
              ...prev,
              ...conversationDetails.iterations
            }))
          }
        }
      }
    }
    
    loadCachedPlan()
  }, [params.id, userProfile?.address, event])

  const handlePurchaseTicket = async () => {
    if (!isConnected || !userProfile || !event) {
      toast.error("Please connect your wallet to purchase tickets")
      return
    }

    if (!walletClient) {
      toast.error("Wallet not available. Please try reconnecting your wallet.")
      return
    }

    setIsPurchasing(true)

    try {
      console.log("TICKET_PURCHASE: Starting ticket purchase flow for event", event.contractEventId)
      console.log("TICKET_PURCHASE: Wallet client available:", !!walletClient)
      toast.loading("Initializing ticket purchase...")

      // Create ticket purchase service
      console.log("TICKET_PURCHASE: Creating ticket service...")
      const ticketService = createTicketPurchaseService(walletClient)
      console.log("TICKET_PURCHASE: Ticket service created successfully")

      // Check if user already has a ticket
      const alreadyHasTicket = await ticketService.userHasTicket(event.contractEventId, userProfile.address)
      
      if (alreadyHasTicket) {
        toast.error("You already have a ticket for this event!")
        return
      }

      // Get sales info to show user the current status
      const salesInfo = await ticketService.getTicketSalesInfo(event.contractEventId)
      
      if (salesInfo.remainingTickets <= 0) {
        toast.error("Sorry, this event is sold out!")
        return
      }

      toast.loading(`Purchasing ticket for ${salesInfo.price} SEI...`)

      // Execute the purchase
      const purchaseResult = await ticketService.purchaseTicket(event.contractEventId, userProfile.address)

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



    } catch (error: any) {
      console.error("TICKET_PURCHASE: Error during ticket purchase:", error)
      toast.dismiss()  // Clear loading toasts
      
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
      setIsPurchasing(false)
    }
  }

  const handleFavorite = () => {
    setIsFavorited(!isFavorited)
    toast.success(isFavorited ? "Removed from favorites" : "Added to favorites")
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("Event link copied to clipboard")
  }

  const handleCurationSelect = (type: 'planner' | 'promoter' | 'producer') => {
    setSelectedCuration(type)
  }

  const handleDeployCuration = async () => {
    if (!isConnected || !userProfile || !event || !selectedCuration || !walletClient) {
      toast.error("Please connect your wallet and select a curation scope")
      return
    }

    setIsDeployingCuration(true)
    
    try {
      const scopeMap = { 'planner': 1, 'promoter': 2, 'producer': 3 }
      const scope = scopeMap[selectedCuration]
      
      toast.loading("Deploying curation contract...")
      
      const result = await deployCurationContract(
        params.id,
        scope,
        `${selectedCuration} curation for ${event.title}`
      )
      
      toast.dismiss()
      toast.success(`🎨 Curation contract deployed successfully!\n\nTx: ${result.txHash.slice(0, 8)}...`)
      
      setCurationDeployed(true)
      setIsCurationExpanded(false)
      
    } catch (error: any) {
      console.error("CURATION_DEPLOY: Error:", error)
      toast.dismiss()
      toast.error(`Failed to deploy curation: ${error.message || 'Unknown error'}`)
    } finally {
      setIsDeployingCuration(false)
    }
  }

  const handleRequestPlan = async () => {
    if (!isConnected || !userProfile || !event) {
      toast.error("Please connect your wallet")
      return
    }

    setIsRequestingPlan(true)
    
    try {
      toast.loading("🎨 Generating curation plan with AI agents...")
      
      const planResult = await requestCurationPlan(
        params.id,
        userProfile.address,
        {
          eventId: params.id,
          title: event.title,
          category: event.category,
          description: event.description,
          duration: event.duration,
          currentSchedule: {
            date: new Date(event.date).getTime(),
            time: new Date(event.date).toLocaleTimeString()
          },
          currentPricing: {
            ticketPrice: event.ticketPrice,
            reservePrice: event.reservePrice
          }
        }
      )
      
      // Store the complete plan result for display
      setCurationPlan(planResult)
      setCurationConversationId(planResult.eventId) // Use eventId as identifier
      
      toast.dismiss()
      toast.success("🎨 Curation plan generated successfully!")
      
    } catch (error: any) {
      console.error("CURATION_REQUEST: Error:", error)
      toast.dismiss()
      toast.error(`Failed to request plan: ${error.message || 'Unknown error'}`)
    } finally {
      setIsRequestingPlan(false)
    }
  }

  const handleAcceptPlan = async () => {
    if (!curationPlan || !curationConversationId) {
      toast.error("No curation plan to accept")
      return
    }

    setIsAcceptingPlan(true)
    
    try {
      toast.loading("🎉 Accepting plan and updating blockchain...")
      
      // Accept the curation proposal - this will trigger blockchain update
      const result = await acceptCurationProposal(
        curationConversationId,
        curationPlan.curation
      )
      
      toast.dismiss()
      
      if (result.success) {
        toast.success(`✅ Plan accepted successfully!\n\n🔗 Tx: ${result.transactionHash?.slice(0, 8)}...\n📝 Metadata updated on-chain`)
        
        // Update plan status to accepted instead of clearing
        if (curationPlan) {
          setCurationPlan({
            ...curationPlan,
            status: 'accepted'
          })
        }
        
        // Refresh event data to show updated metadata
        window.location.reload()
      } else {
        throw new Error(result.error || 'Failed to accept plan')
      }
      
    } catch (error: any) {
      console.error("ACCEPT_PLAN: Error:", error)
      toast.dismiss()
      toast.error(`Failed to accept plan: ${error.message || 'Unknown error'}`)
    } finally {
      setIsAcceptingPlan(false)
    }
  }

  const handleDiscussion = async (aspect: string, message: string) => {
    if (!curationConversationId) {
      toast.error("No active curation session")
      return
    }

    setIsDiscussing(true)
    
    try {
      // Add user message to local state immediately
      setDiscussionMessages(prev => ({
        ...prev,
        [aspect]: [
          ...(prev[aspect] || []),
          { role: 'user', content: message }
        ]
      }))

      toast.loading(`Discussing ${aspect} refinement...`)
      
      const result = await requestAspectRefinement(
        curationConversationId,
        aspect,
        message
      )
      
      // Add agent response to local state
      setDiscussionMessages(prev => ({
        ...prev,
        [aspect]: [
          ...(prev[aspect] || []),
          { role: 'assistant', content: result.message || 'Refinement completed' }
        ]
      }))

      // Update the curation plan with the new result
      if (curationPlan && result.result) {
        const updatedPlan = { ...curationPlan }
        if (updatedPlan.curation) {
          // Type-safe update for known aspects
          const curation = updatedPlan.curation as any
          
          // Store this as a new iteration for the aspect
          if (!curation[`${aspect}_iterations`]) {
            curation[`${aspect}_iterations`] = [curation[aspect]] // Store original as iteration 0
          }
          curation[`${aspect}_iterations`].push(result.result) // Add new iteration
          
          // Update the current aspect to the latest iteration
          curation[aspect] = result.result
          
          // Update selected iteration to the latest one
          setSelectedIterations(prev => ({
            ...prev,
            [aspect]: curation[`${aspect}_iterations`].length - 1
          }))
        }
        setCurationPlan(updatedPlan)
      }
      
      toast.dismiss()
      toast.success(`✨ ${aspect} refined successfully!`)
      
    } catch (error: any) {
      console.error(`DISCUSSION_${aspect.toUpperCase()}: Error:`, error)
      toast.dismiss()
      toast.error(`Failed to refine ${aspect}: ${error.message || 'Unknown error'}`)
    } finally {
      setIsDiscussing(false)
    }
  }

  const isCreator = isConnected && userProfile && event && event.creatorAddress.toLowerCase() === userProfile.address.toLowerCase()
  const canShowCuration = isCreator && event?.status === 'upcoming'

  // Iteration Selector Component
  const IterationSelector = ({ aspect, title }: { aspect: string, title: string }) => {
    if (!curationPlan?.curation) return null
    
    const iterations = curationPlan.curation[`${aspect}_iterations`] || []
    const selectedIteration = selectedIterations[aspect] || 0
    
    if (iterations.length <= 1) return null // Only show if there are multiple iterations
    
    return (
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-sm text-gray-600">{title} Iterations:</span>
        <div className="flex space-x-1">
          {iterations.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => {
                // Update selected iteration
                setSelectedIterations(prev => ({ ...prev, [aspect]: index }))
                
                // Update the curation plan to show this iteration
                const updatedPlan = { ...curationPlan }
                const curation = updatedPlan.curation as any
                curation[aspect] = iterations[index]
                setCurationPlan(updatedPlan)
              }}
              className={`px-2 py-1 text-xs rounded ${
                index === selectedIteration 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              #{index + 1}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Discussion UI Component
  const DiscussionBlock = ({ aspect, title }: { aspect: string, title: string }) => {
    const [message, setMessage] = useState('')
    const messages = discussionMessages[aspect] || []
    const isExpanded = expandedDiscussion === aspect

    if (!isExpanded) return null

    return (
      <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm">Discuss {title}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedDiscussion(null)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Message History */}
        {messages.length > 0 && (
          <div className="mb-3 max-h-40 overflow-y-auto space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={`p-2 rounded text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-100 dark:bg-blue-900 ml-4' 
                  : 'bg-green-100 dark:bg-green-900 mr-4'
              }`}>
                <div className="font-medium text-xs text-gray-600 dark:text-gray-400">
                  {msg.role === 'user' ? 'You' : 'Agent'}
                </div>
                {msg.content}
              </div>
            ))}
          </div>
        )}
        
        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            placeholder={`Provide feedback for ${title.toLowerCase()}...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 min-h-[60px]"
            disabled={isDiscussing}
          />
          <Button
            onClick={() => {
              if (message.trim()) {
                handleDiscussion(aspect, message.trim())
                setMessage('')
              }
            }}
            disabled={!message.trim() || isDiscussing}
            size="sm"
          >
            {isDiscussing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          {messages.length >= 4 ? 'Maximum iterations reached' : `${Math.max(0, 2 - Math.floor(messages.length / 2))} iterations remaining`}
        </p>
      </div>
    )
  }

  // Clear purchasing state when wallet disconnects
  useEffect(() => {
    if (!isConnected || !walletClient) {
      setIsPurchasing(false)
    }
  }, [isConnected, walletClient])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col texture-bg">
        <Navbar />
        <QuickAccess />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading event details...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col texture-bg">
        <Navbar />
        <QuickAccess />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The event you're looking for doesn't exist or has been removed.
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

  return (
    <div className="min-h-screen flex flex-col texture-bg">
      <Navbar />
      <QuickAccess />

      <main className="flex-1 container py-12">
        <Breadcrumbs items={[
          { label: "", href: "/kiosk" },
          { label: event.title }
        ]} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Header */}
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video rounded-t-lg overflow-hidden relative group">
                  <img
                    src={curationPlan?.curation?.banner?.imageUrl || event.image}
                    alt={curationPlan?.curation?.banner?.alt || event.title}
                    className="w-full h-full object-cover"
                  />
                  {curationPlan && curationPlan.status !== 'accepted' && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-8 w-8 p-0"
                        onClick={() => setExpandedDiscussion(expandedDiscussion === 'banner' ? null : 'banner')}
                        title="Discuss Banner"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <IterationSelector aspect="banner" title="Banner" />
                <DiscussionBlock aspect="banner" title="Banner" />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-3xl font-bold">
                          {event.title}
                        </h1>
                        {curationPlan && curationPlan.status !== 'accepted' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                            onClick={() => setExpandedDiscussion(expandedDiscussion === 'title' ? null : 'title')}
                            title="Discuss Title"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <IterationSelector aspect="title" title="Title" />
                      <DiscussionBlock aspect="title" title="Title" />
                      <div className="flex items-center space-x-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          {curationPlan?.curation?.schedule?.recommendedDate 
                            ? new Date(curationPlan.curation.schedule.recommendedDate).toLocaleDateString()
                            : new Date(event.date).toLocaleDateString()}
                          {curationPlan && curationPlan.status !== 'accepted' && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-4 w-4 p-0 text-blue-600 hover:text-blue-700 ml-1"
                              onClick={() => setExpandedDiscussion(expandedDiscussion === 'schedule' ? null : 'schedule')}
                              title="Discuss Schedule"
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {curationPlan?.curation?.schedule?.recommendedTime 
                            ? curationPlan.curation.schedule.recommendedTime
                            : new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {event.participants}/{event.maxParticipants} attendees
                        </div>
                        <IterationSelector aspect="schedule" title="Schedule" />
                        <DiscussionBlock aspect="schedule" title="Schedule" />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {/* Accept Plan Button - Only show when curation plan exists and is not accepted */}
                      {curationPlan && curationPlan.status !== 'accepted' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={handleAcceptPlan}
                          disabled={isAcceptingPlan}
                        >
                          {isAcceptingPlan ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Accepting...
                            </>
                          ) : (
                            "✓ Accept Plan"
                          )}
                        </Button>
                      )}
                      {/* Show accepted status if plan is accepted */}
                      {curationPlan && curationPlan.status === 'accepted' && (
                        <div className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
                          ✓ Plan Accepted
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleFavorite}
                        className={isFavorited ? "text-red-500" : ""}
                      >
                        <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShare}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge variant="secondary" className="capitalize">
                      {event.category.replace('-', ' ')}
                    </Badge>
                    <Badge variant="outline">
                      {event.status}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">About This Event</h3>
                      {curationPlan && curationPlan.status !== 'accepted' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                          onClick={() => setExpandedDiscussion(expandedDiscussion === 'description' ? null : 'description')}
                          title="Discuss Description"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {curationPlan?.curation?.description?.description || event.description}
                    </p>
                    <IterationSelector aspect="description" title="Description" />
                    <DiscussionBlock aspect="description" title="Description" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Curation Section - Only visible to creator for upcoming events */}
            {canShowCuration && !curationDeployed && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Curation</CardTitle>
                  <CardDescription>
                    Enhance your event with professional curation services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!isCurationExpanded ? (
                    <Button 
                      onClick={() => setIsCurationExpanded(true)}
                      className="w-full animate-pulse"
                      size="lg"
                    >
                      <Palette className="h-4 w-4 mr-2" />
                      Curate This Event
                    </Button>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Select Curation Package</h3>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setIsCurationExpanded(false)}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Planner Card */}
                        <Card 
                          className={`cursor-pointer transition-all border-2 ${
                            selectedCuration === 'planner' 
                              ? 'border-primary bg-primary/5 shadow-md' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleCurationSelect('planner')}
                        >
                          <CardHeader className="text-center pb-2">
                            <div className="mx-auto mb-2 p-3 rounded-full bg-blue-100 w-fit">
                              <Calendar className="h-6 w-6 text-blue-600" />
                            </div>
                            <CardTitle className="text-lg">Planner</CardTitle>
                            <div className="text-2xl font-bold text-primary">3%</div>
                          </CardHeader>
                          <CardContent className="text-center space-y-2">
                            <ul className="text-sm space-y-1 text-muted-foreground">
                              <li>• Propose description</li>
                              <li>• Propose schedule</li>
                              <li>• Propose new Reserve Price</li>
                              <li>• Create Banner</li>
                            </ul>
                          </CardContent>
                        </Card>

                        {/* Promoter Card */}
                        <Card 
                          className={`cursor-pointer transition-all border-2 ${
                            selectedCuration === 'promoter' 
                              ? 'border-primary bg-primary/5 shadow-md' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleCurationSelect('promoter')}
                        >
                          <CardHeader className="text-center pb-2">
                            <div className="mx-auto mb-2 p-3 rounded-full bg-green-100 w-fit">
                              <Megaphone className="h-6 w-6 text-green-600" />
                            </div>
                            <CardTitle className="text-lg">Promoter</CardTitle>
                            <div className="text-2xl font-bold text-primary">3%</div>
                          </CardHeader>
                          <CardContent className="text-center space-y-2">
                            <ul className="text-sm space-y-1 text-muted-foreground">
                              <li>• Event Plan (campaign)</li>
                              <li>• Social promotion: X</li>
                              <li>• +1 Social (IG, TikTok, Farcaster)</li>
                              <li>• +1 Event: max 3</li>
                            </ul>
                          </CardContent>
                        </Card>

                        {/* Producer Card */}
                        <Card 
                          className={`cursor-pointer transition-all border-2 ${
                            selectedCuration === 'producer' 
                              ? 'border-primary bg-primary/5 shadow-md' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleCurationSelect('producer')}
                        >
                          <CardHeader className="text-center pb-2">
                            <div className="mx-auto mb-2 p-3 rounded-full bg-purple-100 w-fit">
                              <PlayCircle className="h-6 w-6 text-purple-600" />
                            </div>
                            <CardTitle className="text-lg">Producer</CardTitle>
                            <div className="text-2xl font-bold text-primary">4%</div>
                          </CardHeader>
                          <CardContent className="text-center space-y-2">
                            <ul className="text-sm space-y-1 text-muted-foreground">
                              <li>• No compression storage</li>
                              <li>• AI Video Enhancement</li>
                              <li>• Event Highlights + Booklet</li>
                            </ul>
                          </CardContent>
                        </Card>
                      </div>

                      {selectedCuration && (
                        <div className="pt-4 border-t">
                          <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                              You selected <span className="font-semibold capitalize">{selectedCuration}</span> curation
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {selectedCuration === 'producer' ? '4%' : '3%'} of your event revenues will be shared with the curator
                            </p>
                            <Button 
                              className="mt-4" 
                              onClick={handleDeployCuration}
                              disabled={isDeployingCuration}
                            >
                              {isDeployingCuration ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Deploying...
                                </>
                              ) : (
                                `Deploy ${selectedCuration.charAt(0).toUpperCase() + selectedCuration.slice(1)} Curation`
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Request Plan Section - Visible after curation is deployed */}
            {canShowCuration && curationDeployed && !curationConversationId && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Curation Active</CardTitle>
                  <CardDescription>
                    Your curation contract has been deployed. Ready to analyze and optimize your event.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleRequestPlan}
                    className={`w-full bg-red-600 hover:bg-red-700 ${!isRequestingPlan ? 'animate-pulse' : ''}`}
                    size="lg"
                    disabled={isRequestingPlan}
                  >
                    {isRequestingPlan ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Plan...
                      </>
                    ) : (
                      <>
                        <Palette className="h-4 w-4 mr-2" />
                        Request Plan
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}


          </div>

          {/* Creator Info */}
            <Card>
              <CardHeader>
                <CardTitle>Event Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{event.creator.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{event.creator.slice(0, 8)}...{event.creator.slice(-6)}</h4>
                      <Badge variant="default" className="text-xs">Creator</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Event organizer
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Purchase */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ticket className="h-5 w-5 mr-2" />
                  Get Your Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-3xl font-bold">
                      {curationPlan?.curation?.pricing?.ticketPrice 
                        ? curationPlan.curation.pricing.ticketPrice
                        : event.ticketPrice} SEI
                    </div>
                    {curationPlan && curationPlan.status !== 'accepted' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                        onClick={() => setExpandedDiscussion(expandedDiscussion === 'pricing' ? null : 'pricing')}
                        title="Discuss Pricing"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">per ticket</p>
                </div>
                <IterationSelector aspect="pricing" title="Pricing" />
                <DiscussionBlock aspect="pricing" title="Pricing" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Available:</span>
                    <span>{event.maxParticipants - event.participants} / {event.maxParticipants}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(event.participants / event.maxParticipants) * 100}%` }}
                    />
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handlePurchaseTicket}
                  disabled={event.participants >= event.maxParticipants || event.status === 'completed' || isPurchasing}
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Purchasing...
                    </>
                  ) : (
                    <>
                      <Ticket className="h-4 w-4 mr-2" />
                      {event.participants >= event.maxParticipants ? 'Sold Out' : 'Purchase Ticket'}
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Secure payment powered by SEI blockchain
                </p>
              </CardContent>
            </Card>

            {/* Event Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Event Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Attendees</span>
                  </div>
                  <span className="font-medium">{event.participants}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Price</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">
                      {curationPlan?.curation?.pricing?.ticketPrice 
                        ? curationPlan.curation.pricing.ticketPrice
                        : event.ticketPrice} SEI
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Duration</span>
                  </div>
                  <span className="font-medium text-right">{event.duration} minutes</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}