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
  Send,
  Eye,
  X
} from "lucide-react"
import { toast } from "sonner"
import { fetchOnChainEvents, type OnChainEventData, createTicketPurchaseService, TicketService } from "../../services/tickets"
import { useAuth } from "../../contexts/auth"
import { useWalletClient } from 'wagmi'
import { 
  deployCurationContract, 
  getCurationScopes, 
  requestCurationPlan, 
  sendCurationMessage,
  hasCurationDeployed,
  getCurationPlanFromBlockchain,
  getAspectIterations,
  requestAspectRefinement,
  acceptCurationProposal,
  type CurationResult,
  // New promoter flow functions
  generatePromoterStrategy,
  refinePromoterStrategy,
  acceptPromoterStrategy,
  generateSocialContent,
  refineSocialContent,
  approveSocialContent,
  getContentLimits,
  
} from "../../services/curation"

// Import tab components
import DetailsTab from "./details"
import StrategyTab from "./strategy"
import ContentTab from "./content"

interface EventDetailPageProps {
  params: {
    id: string
  }
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const router = useRouter()
  const { userProfile, isConnected, isLoading: authLoading } = useAuth()
  const { data: walletClient } = useWalletClient()
  const [event, setEvent] = useState<OnChainEventData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isCurationExpanded, setIsCurationExpanded] = useState(false)
  const [selectedCuration, setSelectedCuration] = useState<'planner' | 'promoter' | 'producer' | null>(null)
  const [isPurchasing, setIsPurchasing] = useState(false)

  const [curationDeployed, setCurationDeployed] = useState(false)
  const [isDeployingCuration, setIsDeployingCuration] = useState(false)
  const [curationPlan, setCurationPlan] = useState<CurationResult | null>(null)
  const [expandedDiscussion, setExpandedDiscussion] = useState<string | null>(null)
  const [discussionMessages, setDiscussionMessages] = useState<Record<string, Array<{role: string, content: string}>>>({})
  const [isDiscussing, setIsDiscussing] = useState(false)
  const [isRequestingPlan, setIsRequestingPlan] = useState(false)
  const [externalBannerGenerating, setExternalBannerGenerating] = useState(false)
  const [planProgress, setPlanProgress] = useState<any | null>(null)
  const [agentStatus, setAgentStatus] = useState<Record<string, 'idle'|'running'|'done'|'error'>>({
    title: 'idle',
    description: 'idle',
    pricing: 'idle',
    schedule: 'idle',
    banner: 'idle'
  })
  const [isAcceptingPlan, setIsAcceptingPlan] = useState(false)
  const [selectedIterations, setSelectedIterations] = useState<Record<string, number>>({
    banner: 0,
    title: 0, 
    description: 0,
    schedule: 0,
    pricing: 0
  })

  // New promoter flow state
  const [currentTab, setCurrentTab] = useState<'details' | 'strategy' | 'content'>('details')
  const [promoterStrategy, setPromoterStrategy] = useState<any>(null)
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false)
  const [isAcceptingStrategy, setIsAcceptingStrategy] = useState(false)
  const [strategyAccepted, setStrategyAccepted] = useState(false)
  const [socialContent, setSocialContent] = useState<Record<string, any>>({})
  const [isGeneratingContent, setIsGeneratingContent] = useState<Record<string, boolean>>({})
  const [contentIterations, setContentIterations] = useState<Record<string, number>>({})
  const [approvedContent, setApprovedContent] = useState<Record<string, any>>({})
  const [contentLimits, setContentLimits] = useState<Record<string, { daily: number, total: number, used: { daily: number, total: number } }>>({
    x: { daily: 1, total: 999999, used: { daily: 0, total: 0 } },
    instagram: { daily: 1, total: 3, used: { daily: 0, total: 0 } },
    facebook: { daily: 999999, total: 1, used: { daily: 0, total: 0 } },
    eventbrite: { daily: 999999, total: 1, used: { daily: 0, total: 0 } }
  })
  const [expandedStrategyDiscussion, setExpandedStrategyDiscussion] = useState<string | null>(null)
  const [strategyDiscussionMessages, setStrategyDiscussionMessages] = useState<Record<string, Array<{role: string, content: string}>>>({})
  const [isDiscussingStrategy, setIsDiscussingStrategy] = useState(false)


  // Strategy iteration state (same pattern as planner)
  const [selectedStrategyIterations, setSelectedStrategyIterations] = useState<Record<string, number>>({
    generalStrategy: 0,
    platformStrategies: 0,
    timeline: 0
  })

  // Creator status persistence
  const [isCreatorConfirmed, setIsCreatorConfirmed] = useState<boolean | null>(null)

  // Check and persist creator status with improved stability
  useEffect(() => {
    const checkCreatorStatus = () => {
      if (!authLoading && userProfile && event) {
        const isCreator =
          Boolean(isConnected) &&
          typeof userProfile.address === 'string' &&
          typeof event.creatorAddress === 'string' &&
          event.creatorAddress.toLowerCase() === userProfile.address.toLowerCase();
        
        console.log('AUTH_PERSISTENCE: Checking creator status', { 
          isConnected, 
          userAddress: userProfile.address, 
          creatorAddress: event.creatorAddress,
          isCreator 
        })
        
        setIsCreatorConfirmed(isCreator ? true : false);

        // Persist creator status in localStorage for this event with timestamp
        const storageKey = `creator_${params.id}_${userProfile.address}`;
        if (isCreator) {
          const creatorData = {
            isCreator: true,
            timestamp: Date.now(),
            eventId: params.id,
            userAddress: userProfile.address,
            creatorAddress: event.creatorAddress
          }
          localStorage.setItem(storageKey, JSON.stringify(creatorData))
          console.log('AUTH_PERSISTENCE: Stored creator status', creatorData)
        } else {
          localStorage.removeItem(storageKey)
        }
      } else if (!authLoading && !isConnected && event) {
        // Check localStorage for creator status when not connected
        const storedKeys = Object.keys(localStorage).filter(key => key.startsWith(`creator_${params.id}_`))
        let hasValidCreatorStatus = false
        
        for (const key of storedKeys) {
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const creatorData = JSON.parse(stored)
              // Check if stored data is recent (within 24 hours) and valid
              if (creatorData.timestamp && 
                  Date.now() - creatorData.timestamp < 24 * 60 * 60 * 1000 &&
                  creatorData.eventId === params.id &&
                  creatorData.creatorAddress === event.creatorAddress) {
                hasValidCreatorStatus = true
                console.log('AUTH_PERSISTENCE: Found valid stored creator status', creatorData)
                break
              } else {
                // Remove stale data
                localStorage.removeItem(key)
              }
            }
          } catch (error) {
            console.error('AUTH_PERSISTENCE: Error parsing stored creator data', error)
            localStorage.removeItem(key)
          }
        }
        
        setIsCreatorConfirmed(hasValidCreatorStatus)
      }
    }

    // Initial check
    checkCreatorStatus()

    // Also check periodically to handle auth state changes
    const interval = setInterval(checkCreatorStatus, 3000)
    
    return () => clearInterval(interval)
  }, [authLoading, isConnected, userProfile, event, params.id])

  useEffect(() => {
    const loadEventData = async () => {
      try {
        console.log('TICKET_DETAIL: Loading event data for ID:', params.id)
        
        // Fetch all events and find the one matching the ID
        let targetEvent: OnChainEventData | undefined
        try {
          const events = await fetchOnChainEvents()
          targetEvent = events.find(e => e.contractEventId === parseInt(params.id))
        } catch (err) {
          console.warn('TICKET_DETAIL: Bulk events fetch failed, will fallback to single fetch', err)
        }
        
        // Fallback: try single event fetch to reduce RPC load (avoid 429)
        if (!targetEvent) {
          try {
            const svc = new TicketService()
            const ed = await svc.getEventDetails(parseInt(params.id))
            const ipfsHash = ed.metadataURI?.startsWith('ipfs://') ? ed.metadataURI.slice(7) : ed.metadataURI
            const metaUrl = ipfsHash ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsHash}` : ''
            const meta = metaUrl ? await (await fetch(metaUrl)).json() : {}
            targetEvent = {
              id: params.id,
              contractEventId: parseInt(params.id),
              title: meta.name || `Event #${params.id}`,
              description: meta.description || '',
              creator: ed.creator,
              creatorAddress: ed.creator,
              category: meta.category || 'performance-art',
              date: new Date(ed.startDate * 1000).toISOString(),
              duration: ed.eventDuration,
              reservePrice: Number(ed.reservePrice),
              ticketPrice: 0,
              maxParticipants: 0,
              participants: 0,
              image: meta.image ? meta.image.replace('ipfs://', `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/`) : '/placeholder.svg',
              status: 'upcoming',
              finalized: ed.finalized,
              ticketKioskAddress: ed.ticketKioskAddress,
              eventMetadataURI: ed.metadataURI
            }
          } catch (err2) {
            console.error('TICKET_DETAIL: Single event fallback failed:', err2)
          }
        }
        
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

  // Load curation plan from blockchain when user profile is available
  useEffect(() => {
    if (!userProfile?.address || !event) return
    
    const loadPlanFromBlockchain = async () => {
      console.log('CURATION_BLOCKCHAIN: Checking for on-chain plan...')
      try {
        const blockchainPlan = await getCurationPlanFromBlockchain(params.id, userProfile.address)
        if (blockchainPlan) {
          console.log('CURATION_BLOCKCHAIN: Found on-chain plan, loading iterations')
          setCurationPlan(blockchainPlan)
          
          // Load iteration counts for UI display
          const aspects = ['banner', 'title', 'description', 'schedule', 'pricing']
          const iterationCounts: Record<string, number> = {}
          
          for (const aspect of aspects) {
            const iterations = await getAspectIterations(params.id, aspect)
            const iterationNumbers = Object.keys(iterations).map(Number).filter(n => !isNaN(n))
            iterationCounts[aspect] = iterationNumbers.length > 0 ? Math.max(...iterationNumbers) : 0
          }
          
          setSelectedIterations(iterationCounts)
        }
      } catch (error) {
        console.error('CURATION_BLOCKCHAIN: Error loading plan from blockchain:', error)
      }
    }
    
    loadPlanFromBlockchain()
  }, [params.id, userProfile?.address, event])

  // Load promoter strategy via backend Pinata state (no blockchain)
  useEffect(() => {
    if (!userProfile?.address || !event || !curationDeployed || !curationPlan || curationPlan.status !== 'accepted') return
    let cancelled = false
    const load = async () => {
      try {
        const { getPromoterStrategyState } = await import('../../services/curation')
        const state = await getPromoterStrategyState(params.id, userProfile.address)
        if (!state || cancelled) return
        if (state.strategy) setPromoterStrategy(state.strategy)
        if (state.status === 'accepted') setStrategyAccepted(true)
      } catch (e) {
        console.error('STRATEGY_STATE: Failed to load strategy state:', e)
      }
    }
    load()
    return () => { cancelled = true }
  }, [params.id, userProfile?.address, event, curationDeployed, curationPlan])

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
      toast.loading("🎨 Generating curation plan...")
      setAgentStatus({ title: 'running', description: 'running', pricing: 'running', schedule: 'running', banner: 'running' })
      setExternalBannerGenerating(true)
      const startPayload = {
        eventId: params.id,
        title: event.title,
        category: event.category,
        description: event.description,
        duration: event.duration,
        currentSchedule: { date: new Date(event.date).getTime(), time: new Date(event.date).toLocaleTimeString() },
        currentPricing: { ticketPrice: event.ticketPrice, reservePrice: event.reservePrice }
      }
      const { startCurationPlan, streamCurationProgress, getCurationPlanFromBlockchain, requestCurationPlan: legacyRequestPlan } = await import('../../services/curation')
      let jobId: string | null = null
      try {
        const res = await startCurationPlan(params.id, userProfile.address, startPayload)
        jobId = res.jobId
      } catch (e: any) {
        console.warn('CURATION_PLAN: /plan/start unavailable, falling back to /plan', e)
      }

      if (!jobId) {
        // Fallback to legacy single-call plan
        const planResult = await legacyRequestPlan(params.id, userProfile.address, startPayload)
        setCurationPlan(planResult)
        if (planResult.curation?.iterations) {
          setSelectedIterations({ banner: 1, title: 1, description: 1, schedule: 1, pricing: 1 })
        }
        toast.dismiss()
        toast.success('🎨 Curation plan generated successfully!')
        setAgentStatus({ title: 'done', description: 'done', pricing: 'done', schedule: 'done', banner: 'done' })
        setExternalBannerGenerating(false)
        return
      }
      
      // Subscribe to progress stream
      const unsubscribe = streamCurationProgress(jobId, async (update: any) => {
        setPlanProgress(update)
        // Show banner overlay once banner stage is running or completed but not yet visible
        if (update?.steps?.banner === 'completed' && !getDisplayValue('banner')) {
          setExternalBannerGenerating(true)
        }
        const stageMap: Record<string,string> = { context: 'context', title: 'title', schedule: 'schedule', description: 'description', pricing: 'pricing', banner: 'banner' }
        if (update?.steps) {
          const newStatus = { ...agentStatus }
          for (const k of Object.keys(stageMap)) {
            const st = update.steps[k]
            if (st === 'completed' && (newStatus as any)[stageMap[k]] !== 'done') (newStatus as any)[stageMap[k]] = 'done'
          }
          setAgentStatus(newStatus)
        }
        // When all store_* steps done, fetch from chain
        const storeDone = ['store_title','store_description','store_pricing','store_schedule','store_banner']
          .every(k => update?.steps?.[k] === 'completed')
        if (update.status === 'completed' || storeDone) {
          try {
            const finalPlan = await getCurationPlanFromBlockchain(params.id, userProfile.address)
            if (finalPlan) {
              setCurationPlan(finalPlan)
              // Default to iteration #1 where available
              if (finalPlan.curation?.iterations) {
                setSelectedIterations({ banner: 1, title: 1, description: 1, schedule: 1, pricing: 1 })
              }
              toast.dismiss()
              toast.success('🎨 Curation plan ready!')
            }
          } finally {
            setAgentStatus({ title: 'done', description: 'done', pricing: 'done', schedule: 'done', banner: 'done' })
            setExternalBannerGenerating(false)
            unsubscribe()
          }
        }
      })

      // Safety net: Poll blockchain for iterations in case stream doesn’t arrive via proxy
      const pollStart = Date.now()
      const poll = async () => {
        try {
          const aspects: Array<keyof typeof agentStatus> = ['title','description','pricing','schedule','banner']
          const updates: Record<string,'idle'|'running'|'done'|'error'> = { ...agentStatus }
          for (const aspect of aspects) {
            if (updates[aspect] === 'done') continue
            const its = await getAspectIterations(params.id, aspect)
            const hasInitial = its && Object.keys(its).map(Number).includes(1)
            if (hasInitial) {
              setSelectedIterations(prev => ({ ...prev, [aspect]: 1 }))
              updates[aspect] = 'done'
            } else {
              updates[aspect] = 'running'
            }
          }
          setAgentStatus(updates)
          const allDone = Object.values(updates).every(v => v === 'done')
          if (allDone) {
            const finalPlan = await getCurationPlanFromBlockchain(params.id, userProfile.address)
            if (finalPlan) setCurationPlan(finalPlan)
            setExternalBannerGenerating(false)
            toast.dismiss()
            toast.success('🎨 Curation plan ready!')
            return
          }
        } catch (e) {
          // keep polling
        }
        if (Date.now() - pollStart < 180000) setTimeout(poll, 10000)
      }
      setTimeout(poll, 10000)
      
    } catch (error: any) {
      console.error("CURATION_REQUEST: Error:", error)
      toast.dismiss()
      toast.error(`Failed to request plan: ${error.message || 'Unknown error'}`)
    } finally {
      setIsRequestingPlan(false)
    }
  }

  const handleAcceptPlan = async () => {
    if (!curationPlan || !userProfile?.address) {
      toast.error("No curation plan to accept or wallet not connected")
      return
    }

    setIsAcceptingPlan(true)
    
    try {
      toast.loading("🎉 Accepting plan and updating blockchain...")
      
      // Accept the curation proposal - this will trigger blockchain update
      const result = await acceptCurationProposal(
        params.id,
        selectedIterations,
        userProfile.address
      )
      
      toast.dismiss()
      
      if (result.success) {
        toast.success(`✅ Plan accepted successfully!\n\n🔗 Tx: ${result.transactionHash?.slice(0, 8)}...\n📝 Metadata updated on-chain`)
        
        // Immediately update the curation plan status for UI responsiveness
              if (curationPlan) {
                setCurationPlan({
                  ...curationPlan,
                  status: 'accepted',
                  curation: {
                    ...curationPlan.curation,
                    iterations: undefined // Remove iterations after acceptance
                  }
                })
              }
        
        // Also refresh blockchain data in the background for consistency
        setTimeout(async () => {
          try {
            console.log('EVENT_UPDATE: Refreshing event data after plan acceptance...')
            const events = await fetchOnChainEvents()
            const updatedEvent = events.find(e => e.contractEventId === parseInt(params.id))
            if (updatedEvent) {
              setEvent(updatedEvent)
              console.log('EVENT_UPDATE: Event metadata updated after plan acceptance')
            }
          } catch (error) {
            console.error('EVENT_UPDATE: Failed to refresh event data:', error)
          }
        }, 3000) // Wait 3 seconds for blockchain update to propagate
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
    if (!userProfile?.address) {
      toast.error("Please connect your wallet")
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

      // Special handling for banner generation
      if (aspect === 'banner') {
        toast.loading(`🎨 Starting banner generation... up to 2-3 mins`, { duration: 8000 })
        setExternalBannerGenerating(true)
        
        // Start banner polling mechanism
        startBannerPolling(aspect, message)
      } else {
        toast.loading(`Discussing ${aspect} refinement...`)
      }
      
      const result = await requestAspectRefinement(
        params.id,
        aspect,
        message,
        userProfile.address
      )
      
      // Add agent response to local state
      setDiscussionMessages(prev => ({
        ...prev,
        [aspect]: [
          ...(prev[aspect] || []),
          { role: 'assistant', content: result.message || 'Refinement completed' }
        ]
      }))

      // Handle banner generation status
      if (aspect === 'banner' && result.status === 'generating') {
        toast.dismiss()
        toast.success(`🎨 Banner generation started! It may take up to 2-3 mins...`, { duration: 10000 })
        // Polling will handle the completion
        return
      }

      // For non-banner aspects or completed banner generation
      // Iteration is now stored on-chain via the backend
      // Reload the plan from blockchain to get updated iterations
      if (result.success && result.iterationNumber) {
        console.log(`ITERATION_UPDATE: New iteration ${result.iterationNumber} created for ${aspect}`)
        
        try {
          // Reload plan from blockchain to get updated iterations
          const updatedPlan = await getCurationPlanFromBlockchain(params.id, userProfile.address)
          if (updatedPlan) {
            setCurationPlan(updatedPlan)
            
            // Update selected iteration to the new one
            setSelectedIterations(prev => ({
              ...prev,
              [aspect]: result.iterationNumber
            }))
          }
        } catch (error) {
          console.error('ITERATION_UPDATE: Failed to reload plan from blockchain:', error)
        }
      }
      
      toast.dismiss()
      toast.success(`✨ ${aspect} refined successfully!`)
      
    } catch (error: any) {
      console.error(`DISCUSSION_${aspect.toUpperCase()}: Error:`, error)
      toast.dismiss()
      
      if (aspect === 'banner' && error.message?.includes('longer than expected')) {
        toast.success(`🎨 Banner generation continues in background. Please wait 2-3 minutes...`, { duration: 15000 })
        setExternalBannerGenerating(true)
        startBannerPolling(aspect, message)
      } else {
        toast.error(`Failed to refine ${aspect}: ${error.message || 'Unknown error'}`)
      }
    } finally {
      setIsDiscussing(false)
    }
  }

  // Banner polling mechanism
  const startBannerPolling = (aspect: string, message: string) => {
    if (!userProfile?.address) return
    
    const pollInterval = setInterval(async () => {
      try {
        const { pollForBannerCompletion } = await import('../../services/curation')
        const currentIteration = selectedIterations[aspect] || 1
        
        const result = await pollForBannerCompletion(params.id, userProfile.address, currentIteration)
        
        if (result.completed && result.newIteration) {
          clearInterval(pollInterval)
          setExternalBannerGenerating(false)
          
          // Update the plan with new iteration
          try {
            const updatedPlan = await getCurationPlanFromBlockchain(params.id, userProfile.address)
            if (updatedPlan) {
              setCurationPlan(updatedPlan)
              setSelectedIterations(prev => ({
                ...prev,
                [aspect]: result.newIteration.iterationNumber
              }))
            }
          } catch (error) {
            console.error('BANNER_POLL: Failed to reload plan:', error)
          }
          
          toast.dismiss()
          toast.success(`🎨 New banner generated successfully!`, { duration: 8000 })
          
          // Add completion message to discussion
          setDiscussionMessages(prev => ({
            ...prev,
            [aspect]: [
              ...(prev[aspect] || []),
              { role: 'assistant', content: 'Banner generation completed successfully!' }
            ]
          }))
        } else if (result.error) {
          console.error('BANNER_POLL: Polling error:', result.error)
        }
      } catch (error) {
        console.error('BANNER_POLL: Polling failed:', error)
      }
    }, 15000) // Poll every 15 seconds
    
    // Stop polling after 5 minutes maximum
    setTimeout(() => {
      clearInterval(pollInterval)
      if (externalBannerGenerating) {
        setExternalBannerGenerating(false)
        toast.error('Banner generation took too long. Please check back later or try again.')
      }
    }, 300000) // 5 minutes
  }

  const isCreator = isCreatorConfirmed === true
  const canShowCuration = isCreator && event?.status === 'upcoming'

  // NEW PROMOTER FLOW HANDLERS

  const handleGenerateStrategy = async () => {
    if (!isConnected || !userProfile || !event) {
      toast.error("Please connect your wallet")
      return
    }

    setIsGeneratingStrategy(true)
    
    try {
      toast.loading("🎯 Generating promotional strategy with AI agents...")
      
      const eventData = {
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
      
      const strategyResult = await generatePromoterStrategy(
        params.id,
        userProfile.address,
        eventData
      )
      
      setPromoterStrategy(strategyResult.strategy)
      
      toast.dismiss()
      toast.success("🎯 Promotional strategy generated successfully!")
      
    } catch (error: any) {
      console.error("STRATEGY_GENERATION: Error:", error)
      toast.dismiss()
      toast.error(`Failed to generate strategy: ${error.message || 'Unknown error'}`)
    } finally {
      setIsGeneratingStrategy(false)
    }
  }

  const handleAcceptStrategy = async () => {
    if (!promoterStrategy || !userProfile?.address) {
      toast.error("No strategy to accept or wallet not connected")
      return
    }

    setIsAcceptingStrategy(true)
    
    try {
      toast.loading("✅ Accepting strategy...")
      
      const result = await acceptPromoterStrategy(
        params.id,
        userProfile.address,
        promoterStrategy
      )
      
      setStrategyAccepted(true)
      toast.dismiss()
      toast.success("✅ Strategy accepted! Content tab is now available.")
      
    } catch (error: any) {
      console.error("STRATEGY_ACCEPT: Error:", error)
      toast.dismiss()
      toast.error(`Failed to accept strategy: ${error.message || 'Unknown error'}`)
    } finally {
      setIsAcceptingStrategy(false)
    }
  }

  const handleGenerateContent = async (platform: 'x' | 'facebook' | 'instagram' | 'eventbrite') => {
    if (!isConnected || !userProfile || !event || !promoterStrategy) {
      toast.error("Strategy must be accepted before generating content")
      return
    }

    setIsGeneratingContent(prev => ({ ...prev, [platform]: true }))
    
    try {
      toast.loading(`📱 Generating ${platform} content...`)
      
      const eventData = {
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
      
      const contentResult = await generateSocialContent(
        params.id,
        userProfile.address,
        platform,
        promoterStrategy,
        eventData
      )
      
      setSocialContent(prev => ({ ...prev, [platform]: contentResult.content }))
      setContentIterations(prev => ({ ...prev, [platform]: 1 }))
      
      toast.dismiss()
      toast.success(`📱 ${platform} content generated successfully!`)
      
    } catch (error: any) {
      console.error(`CONTENT_GENERATION_${platform.toUpperCase()}: Error:`, error)
      toast.dismiss()
      toast.error(`Failed to generate ${platform} content: ${error.message || 'Unknown error'}`)
    } finally {
      setIsGeneratingContent(prev => ({ ...prev, [platform]: false }))
    }
  }

  const handleRefineContent = async (platform: 'x' | 'facebook' | 'instagram' | 'eventbrite', feedback: string) => {
    if (!userProfile?.address) {
      toast.error("Please connect your wallet")
      return
    }

    try {
      toast.loading(`🔄 Refining ${platform} content...`)
      
      const result = await refineSocialContent(
        params.id,
        platform,
        feedback,
        userProfile.address
      )
      
      setSocialContent(prev => ({ ...prev, [platform]: result.refinedContent }))
      setContentIterations(prev => ({ ...prev, [platform]: (prev[platform] || 1) + 1 }))
      
      toast.dismiss()
      toast.success(`🔄 ${platform} content refined successfully!`)
      
    } catch (error: any) {
      console.error(`CONTENT_REFINEMENT_${platform.toUpperCase()}: Error:`, error)
      toast.dismiss()
      toast.error(`Failed to refine ${platform} content: ${error.message || 'Unknown error'}`)
    }
  }

  const handleApproveContent = async (platform: 'x' | 'facebook' | 'instagram' | 'eventbrite') => {
    if (!socialContent[platform] || !userProfile?.address) {
      toast.error("No content to approve or wallet not connected")
      return
    }

    try {
      toast.loading(`✅ Approving ${platform} content...`)
      
      // Approve content on backend (stores on Pinata)
      await approveSocialContent(params.id, platform, socialContent[platform], userProfile.address)
      
      // Update local state
      setApprovedContent(prev => ({ ...prev, [platform]: socialContent[platform] }))
      
      // Update content limits
      setContentLimits(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          used: {
            daily: prev[platform].used.daily + 1,
            total: prev[platform].used.total + 1
          }
        }
      }))
      
      // Clear current draft
      setSocialContent(prev => ({ ...prev, [platform]: null }))
      setContentIterations(prev => ({ ...prev, [platform]: 0 }))
      
      toast.dismiss()
      toast.success(`✅ ${platform} content approved and saved!`)
      
    } catch (error: any) {
      console.error(`CONTENT_APPROVAL_${platform.toUpperCase()}: Error:`, error)
      toast.dismiss()
      toast.error(`Failed to approve ${platform} content: ${error.message || 'Unknown error'}`)
    }
  }

  // Strategy refinement handler (same pattern as planner's handleDiscussion)
  const handleStrategyDiscussion = async (aspect: string, message: string) => {
    if (!userProfile?.address) {
      toast.error("Please connect your wallet")
      return
    }

    setIsDiscussingStrategy(true)
    
    try {
      // Add user message to local state immediately
      setStrategyDiscussionMessages(prev => ({
        ...prev,
        [aspect]: [
          ...(prev[aspect] || []),
          { role: 'user', content: message }
        ]
      }))

      toast.loading(`Discussing ${aspect} refinement...`)
      
      const result = await refinePromoterStrategy(
        params.id,
        aspect,
        message,
        userProfile.address,
        promoterStrategy
      )
      
      // Add agent response to local state
      setStrategyDiscussionMessages(prev => ({
        ...prev,
        [aspect]: [
          ...(prev[aspect] || []),
          { role: 'assistant', content: result.message || 'Refinement completed' }
        ]
      }))

      // Update strategy with refined data and iteration number (same pattern as planner)
      if (result.success && result.iterationNumber) {
        console.log(`STRATEGY_ITERATION_UPDATE: New iteration ${result.iterationNumber} created for ${aspect}`)
        
        // Update selected iteration to the new one
        setSelectedStrategyIterations(prev => ({
          ...prev,
          [aspect]: result.iterationNumber
        }))

        // Update the strategy with refined data (natural language result)
        if (result.result) {
          // Store the natural language result in the strategy iterations
          setPromoterStrategy((prev: typeof promoterStrategy) => ({
            ...prev,
            iterations: {
              ...prev.iterations,
              [aspect]: {
                ...prev.iterations?.[aspect],
                [result.iterationNumber]: result.result
              }
            }
          }))
        }
      }
      
      toast.dismiss()
      toast.success(`✨ ${aspect} refined successfully!`)
      
    } catch (error: any) {
      console.error(`STRATEGY_DISCUSSION_${aspect.toUpperCase()}: Error:`, error)
      toast.dismiss()
      toast.error(`Failed to refine ${aspect}: ${error.message || 'Unknown error'}`)
    } finally {
      setIsDiscussingStrategy(false)
    }
  }

  // Iteration Selector Component with on-chain data
  const IterationSelector = ({ aspect, title }: { aspect: string, title: string }) => {
    const [iterations, setIterations] = useState<Record<number, any>>({})
    const [loading, setLoading] = useState(false)
    
    // Load iterations for this aspect from blockchain
    useEffect(() => {
      if (!curationPlan) return
      
      const loadIterations = async () => {
        setLoading(true)
        try {
          const aspectIterations = await getAspectIterations(params.id, aspect)
          setIterations(aspectIterations)
          
          // If we have iterations from the blockchain, update the display
          if (Object.keys(aspectIterations).length > 0) {
            console.log(`[IterationSelector] Loaded ${Object.keys(aspectIterations).length} iterations for ${aspect}:`, aspectIterations)
          }
        } catch (error) {
          console.error(`Error loading ${aspect} iterations:`, error)
        } finally {
          setLoading(false)
        }
      }
      
      loadIterations()
    }, [aspect, curationPlan])
    
    // Also check if iterations exist in the curation plan
    const planIterations = curationPlan?.curation?.iterations?.[aspect] || {}
    const allIterations = { ...planIterations, ...iterations }
    const iterationNumbers = Object.keys(allIterations).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b)
    const selectedIteration = selectedIterations[aspect] || 0
    
    // Only show iteration selector if we have a curation plan and it's not accepted
    if (!curationPlan || curationPlan.status === 'accepted') return null
    
    // Ensure we always have at least #0 (original)
    const minIterations = [0]
    if (iterationNumbers.length === 0) {
      // If no iterations loaded yet, just show #0
      const displayIterations = minIterations
    } else {
      // Merge loaded iterations with minimum required iterations
      const allNumbers = [...new Set([...minIterations, ...iterationNumbers])].sort((a, b) => a - b)
    }
    const displayIterations = iterationNumbers.length > 0 ? 
      [...new Set([...minIterations, ...iterationNumbers])].sort((a, b) => a - b) : 
      minIterations
    
    return (
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-sm text-gray-600">{title} Options:</span>
        <div className="flex space-x-1">
          {displayIterations.map((iterationNum: number) => (
            <button
              key={iterationNum}
              onClick={() => {
                // Update selected iteration
                setSelectedIterations(prev => ({ ...prev, [aspect]: iterationNum }))
              }}
              className={`px-2 py-1 text-xs rounded font-medium ${
                iterationNum === selectedIteration 
                  ? 'bg-red-600 text-white shadow-md' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={loading}
              title={`${getIterationLabel(iterationNum)}: Click to preview this version`}
            >
              #{iterationNum}
            </button>
          ))}
        </div>
        {loading && <span className="text-xs text-gray-500">Loading...</span>}
        {selectedIteration !== undefined && (
          <span className="text-xs text-gray-500">
            Showing: {getIterationLabel(selectedIteration)}
          </span>
        )}
      </div>
    )
  }
  
  // Helper function to get iteration labels
  const getIterationLabel = (iterationNum: number): string => {
    switch (iterationNum) {
      case 0: return 'Original'
      case 1: return 'Initial Plan'
      default: return 'Feedback Iteration'
    }
  }

  // Helper function to get display value based on selected iteration
  const getDisplayValue = (aspect: string): any => {
    if (!curationPlan?.curation?.iterations) {
      // If plan is accepted, show accepted values from direct curation plan data
      // If no plan or iterations, fallback to original event data
      if (curationPlan?.status === 'accepted') {
        switch (aspect) {
          case 'title':
            return curationPlan?.curation?.title?.title
          case 'description':
            return curationPlan?.curation?.description?.description
          case 'banner':
            return curationPlan?.curation?.banner?.imageUrl
          case 'pricing':
            return curationPlan?.curation?.pricing
          case 'schedule':
            return curationPlan?.curation?.schedule
        }
      }
      // Fallback to original event data
      return null
    }
    
    const selectedIteration = selectedIterations[aspect] || 1 // Default to iteration #1 (AI plan)
    const iterations = curationPlan.curation.iterations[aspect]
    
    if (!iterations || !iterations[selectedIteration]) {
      // Fallback to iteration #0 (original) or #1 (AI plan)
      const fallbackIteration = iterations?.[1] || iterations?.[0]
      if (!fallbackIteration) return null
      
      switch (aspect) {
        case 'title':
          return fallbackIteration.title
        case 'description':
          return fallbackIteration.description
        case 'banner':
          return fallbackIteration.imageUrl
        case 'pricing':
          return fallbackIteration
        case 'schedule':
          return fallbackIteration
        default:
          return fallbackIteration
      }
    }
    
    const iterationData = iterations[selectedIteration]
    
    switch (aspect) {
      case 'title':
        return iterationData.title
      case 'description':
        return iterationData.description
      case 'banner':
        return iterationData.imageUrl
      case 'pricing':
        return iterationData
      case 'schedule':
        return iterationData
      default:
        return iterationData
    }
  }

  // Helper function to render social content in natural language
  const renderSocialContent = (content: any, platform: string): string => {
    if (!content) return 'No content available'
    
    // Handle natural language content from agents
    if (typeof content === 'string') {
      return content
    }
    
    // Handle structured content from different platforms
    switch (platform) {
      case 'x':
        // New structured format from social agent
        if (content.mainpost || content.thread) {
          const parts: string[] = []
          const main = content.mainpost?.content || content.mainpost?.text || content.content || content.text
          if (main) parts.push(main)
          const hashtags: string[] = content.mainpost?.hashtags || content.hashtags || []
          if (Array.isArray(hashtags) && hashtags.length) {
            parts.push(hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' '))
          }
          const tweets = content.thread?.tweets || content.tweets || []
          if (Array.isArray(tweets) && tweets.length) {
            const threadText = tweets.map((t: any, idx: number) => `Thread ${idx + 1}: ${(t?.content || t?.text || String(t)).trim()}`).join('\n')
            parts.push(threadText)
          }
          return parts.filter(Boolean).join('\n\n') || JSON.stringify(content, null, 2)
        }
        if (Array.isArray(content.tweets)) {
          return content.tweets.map((tweet: any, idx: number) => `Tweet ${idx + 1}: ${tweet.text || tweet.content || JSON.stringify(tweet)}`).join('\n\n')
        }
        return content.content || content.text || JSON.stringify(content, null, 2)
        
      case 'facebook':
        if (content.posts) {
          return content.posts.map((post: any, idx: number) => 
            `Post ${idx + 1}: ${post.text || post.content || JSON.stringify(post)}`
          ).join('\n\n')
        }
        return content.content || content.text || JSON.stringify(content, null, 2)
        
      case 'instagram':
        if (content.feedPosts) {
          return content.feedPosts.map((post: any, idx: number) => 
            `Feed Post ${idx + 1}: ${post.caption || post.content || JSON.stringify(post)}`
          ).join('\n\n')
        }
        return content.content || content.caption || JSON.stringify(content, null, 2)
        
      case 'eventbrite':
        if (content.listing) {
          return `Event Listing:\nTitle: ${content.listing.title || 'N/A'}\nDescription: ${content.listing.description || 'N/A'}`
        }
        return content.content || content.description || JSON.stringify(content, null, 2)
        
      default:
        return content.content || JSON.stringify(content, null, 2)
    }
  }

  // Helper function to get strategy display value based on selected iteration (same pattern as planner)
  const getStrategyDisplayValue = (aspect: string): any => {
    if (!promoterStrategy) return null
    
    if (strategyAccepted) {
      // If strategy is accepted, show accepted values
      switch (aspect) {
        case 'generalStrategy':
          return promoterStrategy.generalStrategy
        case 'platformStrategies':
          return promoterStrategy.platformStrategies
        case 'timeline':
          return promoterStrategy.timeline
        default:
          return null
      }
    }
    
    // If strategy has iterations, use selected iteration (same pattern as planner)
    if (promoterStrategy.iterations) {
      const selectedIteration = selectedStrategyIterations[aspect] || 1 // Default to iteration #1 (AI strategy)
      const iterations = promoterStrategy.iterations[aspect]
      
      if (iterations && iterations[selectedIteration]) {
        // Return the natural language result from the individual agent
        const iterationData = iterations[selectedIteration]
        
        // Handle natural language responses from individual agents
        if (aspect === 'generalStrategy' && iterationData.approach) {
          return iterationData // Return structured data if available
        } else if (iterationData.approach || iterationData.strategies || iterationData.timeline) {
          return iterationData // Return natural language content
        } else {
          return iterationData // Return whatever format the agent provided
        }
      }
      
      // Fallback to iteration #1 or #0
      const fallbackIteration = iterations?.[1] || iterations?.[0]
      if (fallbackIteration) return fallbackIteration
    }
    
    // Fallback to direct strategy data
    switch (aspect) {
      case 'generalStrategy':
        return promoterStrategy.generalStrategy
      case 'platformStrategies':
        return promoterStrategy.platformStrategies
      case 'timeline':
        return promoterStrategy.timeline
      default:
        return null
    }
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

  // Strategy Iteration Selector Component (same pattern as planner)
  const StrategyIterationSelector = ({ aspect, title }: { aspect: string, title: string }) => {
    const [iterations, setIterations] = useState<Record<number, any>>({})
    const [loading, setLoading] = useState(false)
    
    // Load iterations for this strategy aspect from blockchain
    useEffect(() => {
      if (!promoterStrategy) return
      
      const loadIterations = async () => {
        setLoading(true)
        try {
          // Load from blockchain first (same pattern as planner)
          const { getStrategyIterations } = await import('../../services/curation')
          const blockchainIterations = await getStrategyIterations(params.id, aspect)
          
          // Merge with local strategy iterations
          const localIterations = promoterStrategy.iterations?.[aspect] || {}
          const allIterations = { ...localIterations, ...blockchainIterations }
          
          setIterations(allIterations)
          
          if (Object.keys(allIterations).length > 0) {
            console.log(`[StrategyIterationSelector] Loaded ${Object.keys(allIterations).length} iterations for ${aspect}:`, allIterations)
          }
        } catch (error) {
          console.error(`Error loading ${aspect} strategy iterations:`, error)
          // Fallback to local iterations
          const localIterations = promoterStrategy.iterations?.[aspect] || {}
          setIterations(localIterations)
        } finally {
          setLoading(false)
        }
      }
      
      loadIterations()
    }, [aspect, promoterStrategy, params.id])
    
    const selectedIteration = selectedStrategyIterations[aspect] || 0
    const iterationNumbers = Object.keys(iterations).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b)
    
    // Only show iteration selector if we have a strategy and it's not accepted
    if (!promoterStrategy || strategyAccepted) return null
    
    // Ensure we always have at least #0 (original)
    const minIterations = [0]
    const displayIterations = iterationNumbers.length > 0 ? 
      [...new Set([...minIterations, ...iterationNumbers])].sort((a, b) => a - b) : 
      minIterations
    
    return (
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-sm text-gray-600">{title} Options:</span>
        <div className="flex space-x-1">
          {displayIterations.map((iterationNum: number) => (
            <button
              key={iterationNum}
              onClick={() => {
                setSelectedStrategyIterations(prev => ({ ...prev, [aspect]: iterationNum }))
              }}
              className={`px-2 py-1 text-xs rounded font-medium ${
                iterationNum === selectedIteration 
                  ? 'bg-red-600 text-white shadow-md' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={loading}
              title={`${getIterationLabel(iterationNum)}: Click to preview this version`}
            >
              #{iterationNum}
            </button>
          ))}
        </div>
        {loading && <span className="text-xs text-gray-500">Loading...</span>}
        {selectedIteration !== undefined && (
          <span className="text-xs text-gray-500">
            Showing: {getIterationLabel(selectedIteration)}
          </span>
        )}
      </div>
    )
  }

  // Strategy Discussion UI Component (same pattern as planner)
  const StrategyDiscussionBlock = ({ aspect, title }: { aspect: string, title: string }) => {
    const [message, setMessage] = useState('')
    const messages = strategyDiscussionMessages[aspect] || []
    const isExpanded = expandedStrategyDiscussion === aspect

    if (!isExpanded) return null

    return (
      <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm">Discuss {title}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedStrategyDiscussion(null)}
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
            disabled={isDiscussingStrategy}
          />
          <Button
            onClick={() => {
              if (message.trim()) {
                handleStrategyDiscussion(aspect, message.trim())
                setMessage('')
              }
            }}
            disabled={!message.trim() || isDiscussingStrategy}
            size="sm"
          >
            {isDiscussingStrategy ? (
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

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col texture-bg">
        <Navbar />
        <QuickAccess />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              {isLoading ? "Loading event details..." : "Loading authentication..."}
            </p>
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

        {planProgress && planProgress.status !== 'completed' && (
          <div className="mb-4 p-3 rounded border bg-white/60">
            <div className="text-sm font-medium mb-2">Plan generation in progress</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {['context','title','schedule','description','pricing','banner','store_title','store_description','store_pricing','store_schedule','store_banner'].map(k => (
                <span key={k} className={`px-2 py-1 rounded ${planProgress?.steps?.[k]==='completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {k.replace('store_','save ')}{planProgress?.steps?.[k]==='completed' ? ' ✓' : ' ...'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation - Show for creators with accepted curation plan */}
        {isCreator && curationDeployed && curationPlan && curationPlan.status === 'accepted' && (
          <div className="flex items-center space-x-1 mb-6 border-b">
            <Button
              variant={currentTab === 'details' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentTab('details')}
              className="rounded-b-none"
            >
              Details
            </Button>
            <Button
              variant={currentTab === 'strategy' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentTab('strategy')}
              className="rounded-b-none"
            >
              Strategy
            </Button>
            {strategyAccepted && (
              <Button
                variant={currentTab === 'content' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentTab('content')}
                className="rounded-b-none"
              >
                Content
              </Button>
            )}
          </div>
        )}

        <div className="space-y-6">
          {/* Details Tab - Always show for non-creators or when details tab is active */}
          {(!isCreator || !curationDeployed || !curationPlan || curationPlan.status !== 'accepted' || currentTab === 'details') && (
            <DetailsTab
              event={event}
              isCreator={isCreator}
              canShowCuration={canShowCuration}
              curationDeployed={curationDeployed}
              curationPlan={curationPlan}
              selectedCuration={selectedCuration}
              isCurationExpanded={isCurationExpanded}
              isDeployingCuration={isDeployingCuration}
              isPurchasing={isPurchasing}
              isFavorited={isFavorited}
              isRequestingPlan={isRequestingPlan}
              isAcceptingPlan={isAcceptingPlan}
              selectedIterations={selectedIterations}
              expandedDiscussion={expandedDiscussion}
              discussionMessages={discussionMessages}
              isDiscussing={isDiscussing}
              onCurationSelect={handleCurationSelect}
              onDeployCuration={handleDeployCuration}
              onRequestPlan={handleRequestPlan}
              onAcceptPlan={handleAcceptPlan}
              onPurchaseTicket={handlePurchaseTicket}
              onFavorite={handleFavorite}
              onShare={handleShare}
              onDiscussion={handleDiscussion}
              onSetCurationExpanded={setIsCurationExpanded}
              onSetExpandedDiscussion={setExpandedDiscussion}
              onSetSelectedIterations={setSelectedIterations}
              getDisplayValue={getDisplayValue}
              IterationSelector={IterationSelector}
              DiscussionBlock={DiscussionBlock}
              eventId={params.id}
              userAddress={userProfile?.address}
              externalBannerGenerating={externalBannerGenerating}
            />
          )}

          {/* Strategy Tab */}
          {isCreator && curationDeployed && curationPlan && curationPlan.status === 'accepted' && currentTab === 'strategy' && (
            <StrategyTab
              event={event}
              promoterStrategy={promoterStrategy}
              isGeneratingStrategy={isGeneratingStrategy}
              isAcceptingStrategy={isAcceptingStrategy}
              strategyAccepted={strategyAccepted}
              selectedStrategyIterations={selectedStrategyIterations}
              expandedStrategyDiscussion={expandedStrategyDiscussion}
              strategyDiscussionMessages={strategyDiscussionMessages}
              isDiscussingStrategy={isDiscussingStrategy}
              onGenerateStrategy={handleGenerateStrategy}
              onAcceptStrategy={handleAcceptStrategy}
              onSetPromoterStrategy={setPromoterStrategy}
              onSetExpandedStrategyDiscussion={setExpandedStrategyDiscussion}
              onStrategyDiscussion={handleStrategyDiscussion}
              getStrategyDisplayValue={getStrategyDisplayValue}
              StrategyIterationSelector={StrategyIterationSelector}
              StrategyDiscussionBlock={StrategyDiscussionBlock}
            />
          )}

          {/* Content Tab */}
          {isCreator && curationDeployed && curationPlan && curationPlan.status === 'accepted' && currentTab === 'content' && strategyAccepted && (
            <ContentTab
              event={event}
              socialContent={socialContent}
              isGeneratingContent={isGeneratingContent}
              contentIterations={contentIterations}
              approvedContent={approvedContent}
              contentLimits={contentLimits}
              onGenerateContent={handleGenerateContent}
              onRefineContent={handleRefineContent}
              onPreviewContent={() => {}} // Preview handled internally in ContentTab
              onApproveContent={handleApproveContent}
              renderSocialContent={renderSocialContent}
              bannerUrl={getDisplayValue('banner') || event.image}
            />
          )}
        </div>
      </main>


    </div>
  )
}
