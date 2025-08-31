"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Avatar, AvatarFallback } from "../../components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Clock,
  Heart,
  Share2,
  Ticket,
  Loader2,
  Palette,
  Megaphone,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ArrowLeft
} from "lucide-react"
import { toast } from "sonner"
import type { OnChainEventData } from "../../services/tickets"
import type { CurationResult } from "../../services/curation"

interface DetailsTabProps {
  event: OnChainEventData
  isCreator: boolean
  canShowCuration: boolean
  curationDeployed: boolean
  curationPlan: CurationResult | null
  selectedCuration: 'planner' | 'promoter' | 'producer' | null
  isCurationExpanded: boolean
  isDeployingCuration: boolean
  isPurchasing: boolean
  isFavorited: boolean
  isRequestingPlan: boolean
  isAcceptingPlan: boolean
  selectedIterations: Record<string, number>
  expandedDiscussion: string | null
  discussionMessages: Record<string, Array<{role: string, content: string}>>
  isDiscussing: boolean
  onCurationSelect: (type: 'planner' | 'promoter' | 'producer') => void
  onDeployCuration: () => void
  onRequestPlan: () => void
  onAcceptPlan: () => void
  onPurchaseTicket: () => void
  onFavorite: () => void
  onShare: () => void
  onDiscussion: (aspect: string, message: string) => void
  onSetCurationExpanded: (expanded: boolean) => void
  onSetExpandedDiscussion: (aspect: string | null) => void
  onSetSelectedIterations: (iterations: Record<string, number>) => void
  getDisplayValue: (aspect: string) => any
  IterationSelector: React.ComponentType<{aspect: string, title: string}>
  DiscussionBlock: React.ComponentType<{aspect: string, title: string}>
  eventId: string
  userAddress?: string
  externalBannerGenerating?: boolean
}

export default function DetailsTab({
  event,
  isCreator,
  canShowCuration,
  curationDeployed,
  curationPlan,
  selectedCuration,
  isCurationExpanded,
  isDeployingCuration,
  isPurchasing,
  isFavorited,
  isRequestingPlan,
  isAcceptingPlan,
  selectedIterations,
  expandedDiscussion,
  discussionMessages,
  isDiscussing,
  onCurationSelect,
  onDeployCuration,
  onRequestPlan,
  onAcceptPlan,
  onPurchaseTicket,
  onFavorite,
  onShare,
  onDiscussion,
  onSetCurationExpanded,
  onSetExpandedDiscussion,
  onSetSelectedIterations,
  getDisplayValue,
  IterationSelector,
  DiscussionBlock,
  eventId,
  userAddress
}: DetailsTabProps) {
  
  // Banner polling state
  const [isBannerGenerating, setIsBannerGenerating] = useState(false)
  const [lastBannerCheck, setLastBannerCheck] = useState<number>(0)

  // Poll for banner updates when generation is in progress
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null

    const pollForBannerUpdate = async () => {
      if (!isBannerGenerating || !eventId || !userAddress) return

      try {
        // Import the function dynamically to avoid circular dependencies
        const { getCurationPlanFromBlockchain } = await import('../../services/curation')
        const updatedPlan = await getCurationPlanFromBlockchain(eventId, userAddress)
        
        if (updatedPlan?.curation?.banner?.imageUrl && updatedPlan.curation.banner.imageUrl !== getDisplayValue('banner')) {
          console.log('BANNER_POLL: New banner detected:', updatedPlan.curation.banner.imageUrl)
          setIsBannerGenerating(false)
          setLastBannerCheck(Date.now())
          // The parent component will handle the state update through getDisplayValue
        }
      } catch (error) {
        console.error('BANNER_POLL: Error checking for banner updates:', error)
      }
    }

    if (isBannerGenerating) {
      // Poll every 3 seconds when banner is generating
      pollInterval = setInterval(pollForBannerUpdate, 3000)
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [isBannerGenerating, eventId, userAddress, getDisplayValue])

  // External trigger for banner generation overlay (e.g., during initial plan)
  useEffect(() => {
    if (externalBannerGenerating && !isBannerGenerating) {
      setIsBannerGenerating(true)
    }
  }, [externalBannerGenerating, isBannerGenerating])

  // Listen for discussion activity to start banner polling
  useEffect(() => {
    // Check if a banner discussion was just started
    if (expandedDiscussion === 'banner' && !isBannerGenerating) {
      // Wait a bit to see if a discussion message gets sent
      const checkTimer = setTimeout(() => {
        if (discussionMessages.banner && discussionMessages.banner.length > 0) {
          const lastMessage = discussionMessages.banner[discussionMessages.banner.length - 1]
          if (lastMessage.role === 'user' && Date.now() - lastBannerCheck > 5000) {
            console.log('BANNER_POLL: Starting banner generation polling')
            setIsBannerGenerating(true)
          }
        }
      }, 1000)
      
      return () => clearTimeout(checkTimer)
    }
  }, [expandedDiscussion, discussionMessages.banner, isBannerGenerating, lastBannerCheck])

  return (
    <>
      {/* Consolidated Event Details */}
      <Card>
        <CardContent className="p-0">
          <div className="aspect-video rounded-t-lg overflow-hidden relative group">
            <img
              src={getDisplayValue('banner') || event.image}
              alt={event.title}
              className={`w-full h-full object-cover transition-all duration-500 ${
                isBannerGenerating ? 'blur-sm opacity-75' : ''
              }`}
            />
            {isBannerGenerating && (
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <div className="bg-white bg-opacity-90 px-4 py-2 rounded-lg shadow-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    <span className="text-sm font-medium text-gray-800">Generating banner...</span>
                  </div>
                </div>
              </div>
            )}
            {curationPlan && curationPlan.status !== 'accepted' && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="h-8 w-8 p-0"
                  onClick={() => onSetExpandedDiscussion(expandedDiscussion === 'banner' ? null : 'banner')}
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
            {/* Header Section with Title and Action Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold truncate">
                    {getDisplayValue('title') || event.title}
                  </h1>
                  {curationPlan && curationPlan.status !== 'accepted' && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 flex-shrink-0"
                      onClick={() => onSetExpandedDiscussion(expandedDiscussion === 'title' ? null : 'title')}
                      title="Discuss Title"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <IterationSelector aspect="title" title="Title" />
                <DiscussionBlock aspect="title" title="Title" />
              </div>
              <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:space-x-2">
                {/* Accept Plan Button - Only show when curation plan exists and is not accepted */}
                {curationPlan && curationPlan.status !== 'accepted' && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm flex-shrink-0"
                    onClick={onAcceptPlan}
                    disabled={isAcceptingPlan}
                  >
                    {isAcceptingPlan ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin flex-shrink-0" />
                        <span className="hidden sm:inline">Accepting...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">✓ Accept Plan</span>
                        <span className="sm:hidden">✓ Accept</span>
                      </>
                    )}
                  </Button>
                )}
                {/* Show accepted status if plan is accepted */}
                {curationPlan && curationPlan.status === 'accepted' && (
                  <div className="px-3 py-1 text-xs sm:text-sm bg-green-100 text-green-800 rounded-full flex-shrink-0">
                    ✓ Plan Accepted
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onFavorite}
                  className={`flex-shrink-0 ${isFavorited ? "text-red-500" : ""}`}
                >
                  <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShare}
                  className="flex-shrink-0"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Badge variant="secondary" className="capitalize">
                {event.category.replace('-', ' ')}
              </Badge>
              <Badge variant="outline">
                {event.status}
              </Badge>
            </div>

            {/* Event Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Left Column: Event Details */}
              <div className="lg:col-span-2 space-y-4">
                {/* Schedule and Basic Info */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-muted-foreground text-sm">
                  <div className="flex items-center gap-1 min-w-0">
                    <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">
                      {getDisplayValue('schedule')?.recommendedDate 
                        ? new Date(getDisplayValue('schedule').recommendedDate).toLocaleDateString()
                        : new Date(event.date).toLocaleDateString()}
                    </span>
                    {curationPlan && curationPlan.status !== 'accepted' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-4 w-4 p-0 text-blue-600 hover:text-blue-700 ml-1 flex-shrink-0"
                        onClick={() => onSetExpandedDiscussion(expandedDiscussion === 'schedule' ? null : 'schedule')}
                        title="Discuss Schedule"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">
                      {getDisplayValue('schedule')?.recommendedTime 
                        ? getDisplayValue('schedule').recommendedTime
                        : new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="flex items-center min-w-0">
                    <Users className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{event.participants}/{event.maxParticipants} attendees</span>
                  </div>
                </div>
                <IterationSelector aspect="schedule" title="Schedule" />
                <DiscussionBlock aspect="schedule" title="Schedule" />

                {/* About Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">About This Event</h3>
                    {curationPlan && curationPlan.status !== 'accepted' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                        onClick={() => onSetExpandedDiscussion(expandedDiscussion === 'description' ? null : 'description')}
                        title="Discuss Description"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {getDisplayValue('description') || event.description}
                  </p>
                  <IterationSelector aspect="description" title="Description" />
                  <DiscussionBlock aspect="description" title="Description" />
                </div>

                {/* Creator Info - Compact */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-2">Event Creator</h4>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{event.creator.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{event.creator.slice(0, 8)}...{event.creator.slice(-6)}</span>
                        <Badge variant="default" className="text-xs">Creator</Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs px-2 py-1">
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Ticket Purchase & Stats */}
              <div className="space-y-4">
                {/* Ticket Purchase Section */}
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center mb-3">
                    <Ticket className="h-4 w-4 mr-2" />
                    <h3 className="font-semibold">Get Your Ticket</h3>
                  </div>
                  
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="text-2xl font-bold">
                        {getDisplayValue('pricing')?.ticketPrice 
                          ? getDisplayValue('pricing').ticketPrice
                          : event.ticketPrice} SEI
                      </div>
                      {curationPlan && curationPlan.status !== 'accepted' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                          onClick={() => onSetExpandedDiscussion(expandedDiscussion === 'pricing' ? null : 'pricing')}
                          title="Discuss Pricing"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">per ticket</p>
                  </div>
                  <IterationSelector aspect="pricing" title="Pricing" />
                  <DiscussionBlock aspect="pricing" title="Pricing" />

                  {/* Availability Progress */}
                  <div className="space-y-2 mb-4">
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

                  {/* Purchase Button */}
                  <Button 
                    className="w-full mb-3" 
                    size="sm"
                    onClick={onPurchaseTicket}
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
                </div>

                {/* Quick Stats */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Event Stats</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-2 text-muted-foreground" />
                        <span>Attendees</span>
                      </div>
                      <span className="font-medium">{event.participants}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-2 text-muted-foreground" />
                        <span>Price</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {getDisplayValue('pricing')?.ticketPrice 
                            ? getDisplayValue('pricing').ticketPrice
                            : event.ticketPrice} SEI
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-2 text-muted-foreground" />
                        <span>Duration</span>
                      </div>
                      <span className="font-medium">{event.duration} min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Curation Section - Only visible to creator for upcoming events */}
      {canShowCuration && !curationDeployed && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Event Curation</h3>
              <p className="text-sm text-muted-foreground">
                Enhance your event with professional curation services
              </p>
            </div>
            {!isCurationExpanded ? (
              <Button 
                onClick={() => onSetCurationExpanded(true)}
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
                    onClick={() => onSetCurationExpanded(false)}
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
                    onClick={() => onCurationSelect('planner')}
                  >
                    <div className="text-center p-4">
                      <div className="mx-auto mb-2 p-3 rounded-full bg-blue-100 w-fit">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <h4 className="text-lg font-semibold">Planner</h4>
                      <div className="text-2xl font-bold text-primary">3%</div>
                      <ul className="text-sm space-y-1 text-muted-foreground mt-2">
                        <li>• Propose description</li>
                        <li>• Propose schedule</li>
                        <li>• Propose new Reserve Price</li>
                        <li>• Create Banner</li>
                      </ul>
                    </div>
                  </Card>

                  {/* Promoter Card */}
                  <Card 
                    className={`cursor-pointer transition-all border-2 ${
                      selectedCuration === 'promoter' 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => onCurationSelect('promoter')}
                  >
                    <div className="text-center p-4">
                      <div className="mx-auto mb-2 p-3 rounded-full bg-green-100 w-fit">
                        <Megaphone className="h-6 w-6 text-green-600" />
                      </div>
                      <h4 className="text-lg font-semibold">Promoter</h4>
                      <div className="text-2xl font-bold text-primary">7%</div>
                      <ul className="text-sm space-y-1 text-muted-foreground mt-2">
                        <li>• Event Plan (campaign)</li>
                        <li>• Social promotion: X</li>
                        <li>• +1 Social (IG, TikTok, Farcaster)</li>
                        <li>• +1 Event: max 3</li>
                      </ul>
                    </div>
                  </Card>

                  {/* Producer Card */}
                  <Card 
                    className={`cursor-pointer transition-all border-2 ${
                      selectedCuration === 'producer' 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => onCurationSelect('producer')}
                  >
                    <div className="text-center p-4">
                      <div className="mx-auto mb-2 p-3 rounded-full bg-purple-100 w-fit">
                        <PlayCircle className="h-6 w-6 text-purple-600" />
                      </div>
                      <h4 className="text-lg font-semibold">Producer</h4>
                      <div className="text-2xl font-bold text-primary">10%</div>
                      <ul className="text-sm space-y-1 text-muted-foreground mt-2">
                        <li>• No compression storage</li>
                        <li>• AI Video Enhancement</li>
                        <li>• Event Highlights + Booklet</li>
                      </ul>
                    </div>
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
                        onClick={onDeployCuration}
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
      {canShowCuration && curationDeployed && !curationPlan && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Event Curation Active</h3>
              <p className="text-sm text-muted-foreground">
                Your curation contract has been deployed. Ready to analyze and optimize your event.
              </p>
            </div>
            <Button 
              onClick={onRequestPlan}
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
    </>
  )
}
