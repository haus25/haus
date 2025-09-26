"use client"

import { createWalletClient, createPublicClient, custom, http } from 'viem'
import { seiTestnet } from '../lib/sei'

// Import contract addresses from constants
import { CONTRACT_ADDRESSES, EVENT_FACTORY_ABI } from '../lib/constants'

const CURATION_API_BASE = process.env.NEXT_PUBLIC_CURATION_URL || 'http://localhost:3001'

// Static cache for curation data
const curationCache = new Map<string, { data: any, timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL
}

// Types for curation data
export interface EventData {
  eventId: string
  title: string
  category: string
  description?: string
  duration?: number
  maxParticipants?: number
  currentSchedule?: {
    date: number
    time: string
  }
  currentPricing?: {
    ticketPrice: number
    reservePrice: number
  }
}

export interface CurationResult {
  success: boolean
  eventId: string
  metadataURI?: string
  curation: {
    description: any
    pricing: any
    schedule: any
    banner: any
    research?: any
    title?: any
    [key: string]: any // Allow dynamic aspect access
  }
  proxyAddress: string
  curationAddress?: string
  generatedAt: string
  status?: string // Status of the curation (pending, plan_ready, accepted)
}



/**
 * Deploy curation contract for an event
 * @param eventId Event ID to deploy curation for
 * @param scope Curation scope (1=planner, 2=promoter, 3=producer)
 * @param description Description of curation services
 * @returns Transaction hash and curation contract address
 */
export async function deployCurationContract(
  eventId: string,
  scope: number,
  description: string
): Promise<{ txHash: string; curationAddress: string }> {
  try {
    if (!window.ethereum) {
      throw new Error('Wallet not available')
    }

    const walletClient = createWalletClient({
      chain: seiTestnet,
      transport: custom(window.ethereum)
    })

    const publicClient = createPublicClient({
      chain: seiTestnet,
      transport: http(process.env.NEXT_PUBLIC_SEI_TESTNET_RPC)
    })

    const [account] = await walletClient.getAddresses()
    if (!account) {
      throw new Error('No wallet account available')
    }

    console.log('CURATION_SERVICE: Deploying curation contract for event', eventId)

    // Deploy curation contract
    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
      abi: EVENT_FACTORY_ABI,
      functionName: 'deployCurationForEvent',
      args: [BigInt(eventId), BigInt(scope), description],
      account
    })

    console.log('CURATION_SERVICE: Curation deployment transaction:', txHash)

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    console.log('CURATION_SERVICE: Transaction confirmed:', receipt)

    // Get the deployed curation contract address
    const curationAddress = await getCurationContractAddress(eventId)

    return {
      txHash,
      curationAddress
    }
  } catch (error) {
    console.error('CURATION_SERVICE: Error deploying curation contract:', error)
    throw error
  }
}

/**
 * Get curation contract address for an event
 * @param eventId Event ID to check
 * @returns Curation contract address or null if not deployed
 */
export async function getCurationContractAddress(eventId: string): Promise<string> {
  try {
    const publicClient = createPublicClient({
      chain: seiTestnet,
      transport: http(process.env.NEXT_PUBLIC_SEI_TESTNET_RPC)
    })

    const curationAddress = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
      abi: EVENT_FACTORY_ABI,
      functionName: 'getCurationContract',
      args: [BigInt(eventId)]
    }) as string

    return curationAddress
  } catch (error) {
    console.error('CURATION_SERVICE: Error getting curation contract address:', error)
    return '0x0000000000000000000000000000000000000000'
  }
}

/**
 * Check if event has curation deployed
 * @param eventId Event ID to check
 * @returns True if curation is deployed
 */
export async function hasCurationDeployed(eventId: string): Promise<boolean> {
  const curationAddress = await getCurationContractAddress(eventId)
  return curationAddress !== '0x0000000000000000000000000000000000000000'
}

/**
 * Request curation from the multi-agent system
 * @param eventData Event data to curate
 * @param userAddress User's wallet address
 * @returns Curation results
 */
export async function requestCuration(eventData: EventData, userAddress: string): Promise<CurationResult> {
  try {
    const response = await fetch(`${CURATION_API_BASE}/curate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: eventData.eventId,
        userAddress,
        category: eventData.category,
        title: eventData.title,
        description: eventData.description,
        duration: eventData.duration,
        maxParticipants: eventData.maxParticipants
      })
    })

    if (!response.ok) {
      throw new Error(`Curation request failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Error requesting curation:', error)
    throw error
  }
}

/**
 * Initialize interactive curation conversation
 * @param eventData Event data
 * @param userId User ID
 * @param scope Curation scope
 * @returns Conversation ID and initial message
 */
export async function initializeCuration(eventData: EventData, userId: string, scope: string = 'planner') {
  try {
    const response = await fetch(`${CURATION_API_BASE}/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: eventData.eventId,
        userId,
        scope,
        eventData: {
          title: eventData.title,
          category: eventData.category,
          description: eventData.description || '',
          duration: eventData.duration || 60,
          maxParticipants: eventData.maxParticipants || 100
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Curation initialization failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Error initializing curation:', error)
    throw error
  }
}



/**
 * Check curation service health
 * @returns Service health status
 */
export async function checkCurationHealth() {
  try {
    const response = await fetch(`${CURATION_API_BASE}/health`)
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Health check failed:', error)
    return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get available curation scopes
 * @returns Available curation scopes
 */
export async function getCurationScopes() {
  try {
    const response = await fetch(`${CURATION_API_BASE}/scopes`)
    if (!response.ok) {
      throw new Error(`Failed to get scopes: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Error getting scopes:', error)
    return {
      scopes: [
        {
          id: "planner",
          name: "Planner",
          fee: "3%",
          status: "active",
          services: [
            "Propose description",
            "Propose schedule", 
            "Propose new Reserve Price",
            "Create Banner"
          ]
        }
      ]
    }
  }
}

/**
 * Request initial curation plan after contract deployment
 * @param eventId Event ID to request plan for
 * @param userAddress User's wallet address
 * @param eventData Event data for context
 * @returns Complete curation plan result
 */
export async function requestCurationPlan(
  eventId: string,
  userAddress: string,
  eventData: EventData
): Promise<CurationResult> {
  try {
    // First check if we already have a plan on blockchain
    const blockchainPlan = await getCurationPlanFromBlockchain(eventId, userAddress)
    if (blockchainPlan) {
      console.log('CURATION_SERVICE: Using existing blockchain plan for event', eventId)
      return blockchainPlan
    }

    console.log('CURATION_SERVICE: Requesting new plan generation for event', eventId)

    // Remove timeout for plan generation since banner generation can take 2-3 minutes
    const response = await fetch(`${CURATION_API_BASE}/plan`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        userAddress,
        eventData
      })
    })

    if (!response.ok) {
      throw new Error(`Plan request failed: ${response.statusText}`)
    }

    const result = await response.json()
    
    // After plan generation, the backend stores iterations on-chain
    // Now fetch the complete plan with iterations from blockchain
    console.log('CURATION_SERVICE: Plan generated, loading from blockchain with iterations')
    
    // Wait a moment for the blockchain transaction to complete
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const finalPlan = await getCurationPlanFromBlockchain(eventId, userAddress)
    if (finalPlan) {
      console.log('CURATION_SERVICE: Loaded complete plan with iterations from blockchain')
      return finalPlan
    }
    
    // Fallback to backend response if blockchain fetch fails
    const planData = result.plan || {}
    
    const curationResult: CurationResult = {
      success: result.success || true,
      eventId,
      metadataURI: result.metadataURI,
      curation: planData,
      proxyAddress: planData.proxyAddress || '',
      curationAddress: result.curationAddress,
      generatedAt: planData.generatedAt || new Date().toISOString(),
      status: result.status || 'plan_ready'
    }

    console.log('CURATION_SERVICE: Using fallback plan structure')
    return curationResult
    
  } catch (error) {
    console.error('CURATION_SERVICE: Error requesting plan:', error)
    throw error
  }
}

// Start curation plan with streaming progress (SSE)
export async function startCurationPlan(
  eventId: string,
  userAddress: string,
  eventData: EventData
): Promise<{ jobId: string }> {
  const response = await fetch(`${CURATION_API_BASE}/plan/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, userAddress, eventData })
  })
  if (!response.ok) {
    throw new Error(`Failed to start plan: ${response.statusText}`)
  }
  return response.json()
}

export function streamCurationProgress(jobId: string, onUpdate: (u: any) => void): () => void {
  const url = `${CURATION_API_BASE}/plan/stream/${encodeURIComponent(jobId)}`
  const es = new EventSource(url)
  es.onmessage = (evt) => {
    try { onUpdate(JSON.parse(evt.data)) } catch {}
  }
  es.onerror = () => {
    // Let the caller decide retries; close to avoid stuck connections
    es.close()
  }
  return () => es.close()
}

/**
 * Send message to curation conversation
 * @param conversationId Conversation ID
 * @param message User message
 * @returns Agent response
 */
export async function sendCurationMessage(
  conversationId: string,
  message: string
): Promise<any> {
  try {
    const response = await fetch(`${CURATION_API_BASE}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        message
      })
    })

    if (!response.ok) {
      throw new Error(`Message sending failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Error sending message:', error)
    throw error
  }
}

/**
 * Get current curation plan from conversation
 * @param conversationId Conversation ID
 * @returns Current plan state
 */
export async function getCurationPlan(conversationId: string): Promise<any> {
  try {
    const response = await fetch(`${CURATION_API_BASE}/plan/${conversationId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get plan: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Error getting plan:', error)
    throw error
  }
}

/**
 * Request refinement for specific aspect (using on-chain storage)
 * @param eventId Event ID
 * @param aspect Aspect to refine (description, pricing, schedule, banner, title)
 * @param feedback User feedback for refinement
 * @param userAddress User's wallet address
 * @returns Updated aspect result with iteration number
 */
/**
 * Get iterations for an aspect directly from blockchain metadata (same pattern as kiosk/profile)
 * @param eventId Event ID
 * @param aspect Aspect to get iterations for
 * @returns Iterations object with numeric keys
 */
export async function getAspectIterations(eventId: string, aspect: string): Promise<Record<number, any>> {
  try {
    const publicClient = createPublicClient({
      chain: seiTestnet,
      transport: http(process.env.NEXT_PUBLIC_SEI_TESTNET_RPC)
    })

    // Use same EventFactory ABI as create.ts
    const eventFactoryABI = [
      {
        "type": "function",
        "name": "tokenURI",
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view"
      }
    ] as const

    // Get metadata URI from blockchain
    const metadataURI = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
      abi: eventFactoryABI,
      functionName: 'tokenURI',
      args: [BigInt(eventId)]
    }) as string

    if (!metadataURI || metadataURI === '') {
      return {}
    }

    // Fetch metadata from IPFS using same pattern as kiosk/profile
    const metadataUrl = metadataURI.replace('ipfs://', `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/`)
    const response = await fetch(`${metadataUrl}?t=${Date.now()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`)
    }

    const metadata = await response.json()
    const iterations = metadata.iterations?.[aspect] || {}
    if (aspect === 'banner') {
      for (const key of Object.keys(iterations)) {
        const it = iterations[key]
        if (it && it.imageUrl) {
          iterations[key] = { ...it, imageUrl: normalizeIpfsUrl(it.imageUrl) }
        }
      }
    }
    return iterations
  } catch (error) {
    console.error('CURATION_SERVICE: Error getting iterations:', error)
    return {}
  }
}

export async function requestAspectRefinement(
  eventId: string,
  aspect: string,
  feedback: string,
  userAddress: string
): Promise<any> {
  try {
    // Special handling for banner generation
    if (aspect === 'banner') {
      return await handleBannerRefinementWithPolling(eventId, aspect, feedback, userAddress)
    }

    // For non-banner aspects, remove timeout to prevent false failures
    const response = await fetch(`${CURATION_API_BASE}/iterate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        aspect,
        feedback,
        userAddress
      })
    })

    if (!response.ok) {
      throw new Error(`Refinement failed: ${response.statusText}`)
    }

    const result = await response.json()
    return {
      ...result,
      iterationNumber: result.iterationNumber || 2, // Default to iteration #2 for feedback
      aspect,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    console.error('CURATION_SERVICE: Error refining aspect:', error)
    throw error
  }
}

/**
 * Handle banner refinement with polling mechanism
 */
async function handleBannerRefinementWithPolling(
  eventId: string,
  aspect: string,
  feedback: string,
  userAddress: string
): Promise<any> {
  console.log('CURATION_SERVICE: Starting banner refinement with polling mechanism')
  
  // Start banner generation without timeout
  const startTime = Date.now()
  let generationStarted = false
  
  try {
    // Initiate banner generation (fire and forget)
    fetch(`${CURATION_API_BASE}/iterate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        aspect,
        feedback,
        userAddress
      })
    }).catch(error => {
      console.error('CURATION_SERVICE: Banner generation request failed:', error)
    })
    
    generationStarted = true
    console.log('CURATION_SERVICE: Banner generation request sent, starting polling...')
    
    // Return immediately with status indicating generation is in progress
    return {
      success: true,
      aspect: 'banner',
      message: 'Banner generation started. It may take up to 2-3 mins.',
      iterationNumber: 2, // Will be updated when generation completes
      timestamp: new Date().toISOString(),
      status: 'generating',
    }
    
  } catch (error: any) {
    console.error('CURATION_SERVICE: Error starting banner refinement:', error)
    throw error
  }
}

/**
 * Poll for banner completion - called by UI components
 */
export async function pollForBannerCompletion(
  eventId: string,
  userAddress: string,
  lastIterationNumber: number = 1
): Promise<{ completed: boolean, newIteration?: any, error?: string }> {
  try {
    console.log('CURATION_SERVICE: Polling for banner completion...')
    
    // Get latest iterations from blockchain
    const iterations = await getAspectIterations(eventId, 'banner')
    const iterationNumbers = Object.keys(iterations).map(Number).filter(n => !isNaN(n))
    const maxIteration = iterationNumbers.length > 0 ? Math.max(...iterationNumbers) : 0
    
    if (maxIteration > lastIterationNumber) {
      console.log(`CURATION_SERVICE: New banner iteration ${maxIteration} found!`)
      return {
        completed: true,
        newIteration: {
          iterationNumber: maxIteration,
          result: iterations[maxIteration],
          aspect: 'banner',
          timestamp: new Date().toISOString()
        }
      }
    }
    
    return { completed: false }
  } catch (error: any) {
    console.error('CURATION_SERVICE: Error polling for banner completion:', error)
    return { completed: false, error: error.message }
  }
}

/**
 * Get curation scope information (fallback)
 * @returns Available curation scopes
 */
export function getCurationScopesStatic() {
  return [
    {
      id: 1,
      name: "Planner",
      fee: "3%",
      description: "Event planning and optimization",
      services: [
        "Propose description",
        "Propose schedule", 
        "Propose new Reserve Price",
        "Create Banner"
      ]
    },
    {
      id: 2,
      name: "Promoter", 
      fee: "3%",
      description: "Marketing and promotion",
      services: [
        "Event Plan (campaign)",
        "Social promotion: X",
        "+1 Social (IG, TikTok, Farcaster)",
        "+1 Event: max 3"
      ]
    },
    {
      id: 3,
      name: "Producer",
      fee: "10%", 
      description: "Production and content enhancement",
      services: [
        "No compression storage",
        "AI Video Enhancement",
        "Event Highlights + Booklet"
      ]
    }
  ]
}

/**
 * Accept curation proposal and execute blockchain transaction (using on-chain storage)
 * @param eventId Event ID
 * @param selectedIterations Selected iteration numbers for each aspect
 * @param userAddress User's wallet address
 * @returns Transaction result with metadataURI
 */
export async function acceptCurationProposal(
  eventId: string,
  selectedIterations: Record<string, number>,
  userAddress: string
): Promise<any> {
  try {
    const response = await fetch(`${CURATION_API_BASE}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        selectedIterations,
        userAddress
      })
    })

    if (!response.ok) {
      throw new Error(`Proposal acceptance failed: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Clear cached plan after acceptance since iterations are removed on-chain
    clearCachedCurationPlan(eventId)
    
    return {
      ...result,
      success: true,
      transactionHash: result.transactionHash,
      metadataURI: result.metadataURI,
      finalMetadata: result.finalMetadata
    }
  } catch (error) {
    console.error('CURATION_SERVICE: Error accepting proposal:', error)
    throw error
  }
}

/**
 * Get curation plan directly from blockchain metadata (same pattern as kiosk/profile)
 * @param eventId Event ID
 * @param userAddress User's wallet address  
 * @returns Current plan state with iterations from on-chain metadata
 */
export async function getCurationPlanFromBlockchain(eventId: string, userAddress: string): Promise<CurationResult | null> {
  // Check cache first
  const cacheKey = `curation_plan_${eventId}_${userAddress}`
  const cached = curationCache.get(cacheKey)
  if (cached && isCacheValid(cached.timestamp)) {
    console.log('CURATION_SERVICE: Returning cached plan for event', eventId)
    return cached.data
  }

  try {
    const publicClient = createPublicClient({
      chain: seiTestnet,
      transport: http(process.env.NEXT_PUBLIC_SEI_TESTNET_RPC)
    })

    // Use same EventFactory ABI as create.ts
    const eventFactoryABI = [
      {
        "type": "function",
        "name": "tokenURI",
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view"
      }
    ] as const

    // Get metadata URI from blockchain
    const metadataURI = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
      abi: eventFactoryABI,
      functionName: 'tokenURI',
      args: [BigInt(eventId)]
    }) as string

    if (!metadataURI || metadataURI === '') {
      console.log('CURATION_SERVICE: No metadata URI found for event', eventId)
      return null
    }

    // Fetch metadata from IPFS using same pattern as kiosk/profile
    const metadataUrl2 = metadataURI.replace('ipfs://', `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/`)
    const response = await fetch(`${metadataUrl2}?t=${Date.now()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`)
    }

    const metadata = await response.json()
    
    // Check if this metadata has iterations (curation in progress) OR is already accepted
    const hasIterations = metadata.iterations && Object.keys(metadata.iterations).length > 0
    const isAccepted = metadata.status === 'accepted'
    
    if (!hasIterations && !isAccepted) {
      console.log('CURATION_SERVICE: No curation data found in metadata for event', eventId)
      return null
    }

    // Convert blockchain metadata to CurationResult format
          // Normalize banner URLs inside iterations if present
          if (metadata.iterations?.banner) {
            for (const key of Object.keys(metadata.iterations.banner)) {
              const it = metadata.iterations.banner[key]
              if (it && it.imageUrl) {
                metadata.iterations.banner[key] = { ...it, imageUrl: normalizeIpfsUrl(it.imageUrl) }
              }
            }
          }

          const curationResult: CurationResult = {
            success: true,
            eventId,
      metadataURI,
      curation: {
        // Extract current values from metadata or iterations
        banner: metadata.banner || { imageUrl: normalizeIpfsUrl(metadata.image), alt: metadata.name },
        title: metadata.title || metadata.name,
        description: metadata.description,
        schedule: extractScheduleFromMetadata(metadata),
        pricing: extractPricingFromMetadata(metadata),
        // Include all iterations for UI selection
        iterations: metadata.iterations
      },
      proxyAddress: metadata.proxyAddress || '',
      curationAddress: metadata.curationAddress || '',
      generatedAt: metadata.generatedAt || new Date().toISOString(),
      status: metadata.status || 'plan_ready'
    }

    console.log('CURATION_SERVICE: Retrieved curation plan from blockchain for event', eventId)
    
    // Cache the result
    curationCache.set(cacheKey, { data: curationResult, timestamp: Date.now() })
    return curationResult
  } catch (error) {
    console.error('CURATION_SERVICE: Error getting plan from blockchain:', error)
    return null
  }
}

/**
 * Extract schedule data from metadata for compatibility
 */
function extractScheduleFromMetadata(metadata: any): any {
  // Look for schedule in iterations or attributes
  const scheduleAttr = metadata.attributes?.find((attr: any) => attr.trait_type === 'Recommended Date') 
  const timeAttr = metadata.attributes?.find((attr: any) => attr.trait_type === 'Recommended Time')
  
  return {
    recommendedDate: scheduleAttr?.value || '',
    recommendedTime: timeAttr?.value || ''
  }
}

/**
 * Extract pricing data from metadata for compatibility
 */
function extractPricingFromMetadata(metadata: any): any {
  const ticketPriceAttr = metadata.attributes?.find((attr: any) => attr.trait_type === 'Recommended Ticket Price')
  const reservePriceAttr = metadata.attributes?.find((attr: any) => attr.trait_type === 'Recommended Reserve Price')
  
  return {
    ticketPrice: ticketPriceAttr?.value || '',
    reservePrice: reservePriceAttr?.value || ''
  }
}

/**
 * Simple cache clearing for event (removes any localStorage cache)
 */
export function clearCachedCurationPlan(eventId: string): void {
  try {
    // Remove any legacy cache keys
    const cacheKey = `curation_plan_${eventId}`
    localStorage.removeItem(cacheKey)
    console.log('CURATION_SERVICE: Cleared legacy cache for event', eventId)
  } catch (error) {
    console.error('CURATION_SERVICE: Failed to clear cache:', error)
  }
}

// NEW PROMOTER FLOW FUNCTIONS

/**
 * Generate promotional strategy (step 4 after planner plan acceptance)
 */
export async function generatePromoterStrategy(
  eventId: string,
  userAddress: string,
  eventData: EventData
): Promise<any> {
  try {
    console.log('CURATION_SERVICE: Generating promoter strategy for event', eventId)

    const response = await fetch(`${CURATION_API_BASE}/strategy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        userAddress,
        eventData
      })
    })

    if (!response.ok) {
      throw new Error(`Strategy generation failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Error generating promoter strategy:', error)
    throw error
  }
}

/**
 * Refine promotional strategy based on feedback (same pattern as planner)
 */
export async function refinePromoterStrategy(
  eventId: string,
  aspect: string,
  feedback: string,
  userAddress: string,
  currentStrategy?: any
): Promise<any> {
  try {
    console.log('CURATION_SERVICE: Refining promoter strategy aspect:', aspect)

    // Create AbortController for timeout handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minutes timeout for strategy refinement

    const response = await fetch(`${CURATION_API_BASE}/strategy/iterate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        eventId,
        aspect,
        feedback,
        userAddress,
        currentStrategy
      })
    })

    clearTimeout(timeoutId) // Clear timeout on successful response

    if (!response.ok) {
      throw new Error(`Strategy refinement failed: ${response.statusText}`)
    }

    const result = await response.json()
    return {
      ...result,
      iterationNumber: result.iterationNumber || 2, // Default to iteration #2 for feedback
      aspect,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('CURATION_SERVICE: Strategy refinement timed out after 2 minutes')
      throw new Error(`${aspect} strategy refinement is taking longer than expected. The process is still running in the background.`)
    }
    console.error('CURATION_SERVICE: Error refining promoter strategy:', error)
    throw error
  }
}

/**
 * Get strategy iterations for an aspect directly from blockchain metadata (same pattern as planner)
 * @param eventId Event ID
 * @param aspect Strategy aspect to get iterations for (generalStrategy, platformStrategies, timeline)
 * @returns Iterations object with numeric keys
 */
export async function getStrategyIterations(eventId: string, aspect: string): Promise<Record<number, any>> {
  try {
    const publicClient = createPublicClient({
      chain: seiTestnet,
      transport: http(process.env.NEXT_PUBLIC_SEI_TESTNET_RPC)
    })

    // Use same EventFactory ABI as planner
    const eventFactoryABI = [
      {
        "type": "function",
        "name": "tokenURI",
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view"
      }
    ] as const

    // Get metadata URI from blockchain
    const metadataURI = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
      abi: eventFactoryABI,
      functionName: 'tokenURI',
      args: [BigInt(eventId)]
    }) as string

    if (!metadataURI || metadataURI === '') {
      return {}
    }

    // Fetch metadata from IPFS using same pattern as planner
    const metadataUrl = metadataURI.replace('ipfs://', `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/`)
    const response = await fetch(`${metadataUrl}?t=${Date.now()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`)
    }

    const metadata = await response.json()
    return metadata.strategyIterations?.[aspect] || {}
  } catch (error) {
    console.error('CURATION_SERVICE: Error getting strategy iterations:', error)
    return {}
  }
}

/**
 * Get complete promoter strategy from Pinata metadata
 * @param eventId Event ID
 * @param userAddress User's wallet address  
 * @returns Current strategy state with iterations from Pinata metadata
 */
export async function getPromoterStrategyFromPinata(eventId: string, userAddress: string): Promise<any | null> {
  try {
    const publicClient = createPublicClient({
      chain: seiTestnet,
      transport: http(process.env.NEXT_PUBLIC_SEI_TESTNET_RPC)
    })

    // Use same EventFactory ABI as getCurationPlanFromBlockchain
    const eventFactoryABI = [
      {
        "type": "function",
        "name": "tokenURI",
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view"
      }
    ] as const

    // Get metadata URI from blockchain
    const metadataURI = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
      abi: eventFactoryABI,
      functionName: 'tokenURI',
      args: [BigInt(eventId)]
    }) as string

    if (!metadataURI || metadataURI === '') {
      console.log('STRATEGY_SERVICE: No metadata URI found for event', eventId)
      return null
    }

    // Fetch metadata from IPFS
    const metadataUrl = metadataURI.replace('ipfs://', `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/`)
    const response = await fetch(metadataUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`)
    }

    const metadata = await response.json()
    
    // Check for strategy-specific iterations in the metadata
    const hasStrategyIterations = metadata.iterations && 
      (metadata.iterations.strategy_generalStrategy || 
       metadata.iterations.strategy_platformStrategies || 
       metadata.iterations.strategy_timeline ||
       metadata.iterations.strategy_status)
    
    // Check for accepted strategy data
    const hasAcceptedStrategy = metadata.iterations &&
      (metadata.iterations.strategy_accepted_generalStrategy ||
       metadata.iterations.strategy_accepted_platformStrategies ||
       metadata.iterations.strategy_accepted_timeline)
    
    if (!hasStrategyIterations && !hasAcceptedStrategy) {
      console.log('STRATEGY_SERVICE: No strategy data found in metadata for event', eventId)
      return null
    }

    console.log('STRATEGY_SERVICE: Found strategy data in metadata for event', eventId)

    // Build strategy object from iterations (same pattern as getCurationPlanFromBlockchain)
    const strategyData: any = {
      eventId,
      userAddress,
      status: 'pending'
    }

    // Check if strategy is accepted
    if (metadata.iterations.strategy_status && metadata.iterations.strategy_status[0] === 'accepted') {
      strategyData.status = 'accepted'
      
      // Load accepted strategy data
      if (metadata.iterations.strategy_accepted_generalStrategy) {
        strategyData.generalStrategy = metadata.iterations.strategy_accepted_generalStrategy[0]
      }
      if (metadata.iterations.strategy_accepted_platformStrategies) {
        strategyData.platformStrategies = metadata.iterations.strategy_accepted_platformStrategies[0]
      }
      if (metadata.iterations.strategy_accepted_timeline) {
        strategyData.timeline = metadata.iterations.strategy_accepted_timeline[0]
      }
    } else {
      // Load strategy iterations for refinement
      strategyData.iterations = {}
      
      if (metadata.iterations.strategy_generalStrategy) {
        strategyData.iterations.generalStrategy = metadata.iterations.strategy_generalStrategy
      }
      if (metadata.iterations.strategy_platformStrategies) {
        strategyData.iterations.platformStrategies = metadata.iterations.strategy_platformStrategies
      }
      if (metadata.iterations.strategy_timeline) {
        strategyData.iterations.timeline = metadata.iterations.strategy_timeline
      }
      
      // Set current strategy values from iteration #1 (initial strategy)
      if (strategyData.iterations.generalStrategy && strategyData.iterations.generalStrategy[1]) {
        strategyData.generalStrategy = strategyData.iterations.generalStrategy[1]
      }
      if (strategyData.iterations.platformStrategies && strategyData.iterations.platformStrategies[1]) {
        strategyData.platformStrategies = strategyData.iterations.platformStrategies[1]
      }
      if (strategyData.iterations.timeline && strategyData.iterations.timeline[1]) {
        strategyData.timeline = strategyData.iterations.timeline[1]
      }
    }

    return strategyData

  } catch (error) {
    console.error('STRATEGY_SERVICE: Error loading strategy from Pinata:', error)
    return null
  }
}

// --- Utilities ---
function normalizeIpfsUrl(url?: string | null): string | null {
  if (!url) return url ?? null
  if (url.startsWith('http')) return url
  if (url.startsWith('ipfs://')) {
    const ipfsHash = url.slice(7)
    return `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsHash}`
  }
  // Rough CID check
  if (/^[A-Za-z0-9]{46,}$/.test(url)) {
    return `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${url}`
  }
  return url
}

/**
 * Get complete promoter strategy from blockchain metadata (same pattern as planner)
 * @param eventId Event ID
 * @param userAddress User's wallet address  
 * @returns Current strategy state with iterations from on-chain metadata
 */
export async function getPromoterStrategyFromBlockchain(eventId: string, userAddress: string): Promise<any | null> {
  try {
    const publicClient = createPublicClient({
      chain: seiTestnet,
      transport: http(process.env.NEXT_PUBLIC_SEI_TESTNET_RPC)
    })

    // Use same EventFactory ABI as planner
    const eventFactoryABI = [
      {
        "type": "function",
        "name": "tokenURI",
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view"
      }
    ] as const

    // Get metadata URI from blockchain
    const metadataURI = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
      abi: eventFactoryABI,
      functionName: 'tokenURI',
      args: [BigInt(eventId)]
    }) as string

    if (!metadataURI || metadataURI === '') {
      console.log('CURATION_SERVICE: No metadata URI found for event', eventId)
      return null
    }

    // Fetch metadata from IPFS using same pattern as planner
    const metadataUrl = metadataURI.replace('ipfs://', `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/`)
    const response = await fetch(metadataUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`)
    }

    const metadata = await response.json()
    
    // Check if this metadata has strategy iterations (strategy in progress) OR is already accepted
    const hasStrategyIterations = metadata.strategyIterations && Object.keys(metadata.strategyIterations).length > 0
    const isStrategyAccepted = metadata.strategyStatus === 'accepted'
    
    if (!hasStrategyIterations && !isStrategyAccepted) {
      console.log('CURATION_SERVICE: No strategy data found in metadata for event', eventId)
      return null
    }

    // Convert blockchain metadata to strategy format
    const strategy = {
      generalStrategy: metadata.strategy?.generalStrategy || metadata.generalStrategy,
      platformStrategies: metadata.strategy?.platformStrategies || metadata.platformStrategies,
      timeline: metadata.strategy?.timeline || metadata.timeline,
      // Include all iterations for UI selection
      iterations: metadata.strategyIterations,
      status: metadata.strategyStatus || 'strategy_ready'
    }

    console.log('CURATION_SERVICE: Retrieved promoter strategy from blockchain for event', eventId)
    return strategy
  } catch (error) {
    console.error('CURATION_SERVICE: Error getting strategy from blockchain:', error)
    return null
  }
}

// Pinata-only: get promoter strategy state (accepted or latest draft)
export async function getPromoterStrategyState(eventId: string, userAddress: string): Promise<any | null> {
  try {
    const resp = await fetch(`${CURATION_API_BASE}/strategy/state/${eventId}/${userAddress}`)
    if (!resp.ok) return null
    return await resp.json()
  } catch (e) {
    console.error('CURATION_SERVICE: Error getting promoter strategy state:', e)
    return null
  }
}

/**
 * Accept promotional strategy (enables Content tab)
 */
export async function acceptPromoterStrategy(
  eventId: string,
  userAddress: string,
  strategy: any
): Promise<any> {
  try {
    console.log('CURATION_SERVICE: Accepting promoter strategy for event', eventId)

    const response = await fetch(`${CURATION_API_BASE}/strategy/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        userAddress,
        strategy
      })
    })

    if (!response.ok) {
      throw new Error(`Strategy acceptance failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Error accepting promoter strategy:', error)
    throw error
  }
}

/**
 * Generate social media content for specific platform
 */
export async function generateSocialContent(
  eventId: string,
  userAddress: string,
  platform: 'x' | 'facebook' | 'instagram' | 'eventbrite',
  strategy: any,
  eventData: EventData
): Promise<any> {
  try {
    console.log('CURATION_SERVICE: Generating', platform, 'content for event', eventId)
    const response = await fetch(`${CURATION_API_BASE}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        userAddress,
        platform,
        strategy,
        eventData
      })
    })

    if (!response.ok) {
      throw new Error(`Content generation failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Error generating social content:', error)
    throw error
  }
}

/**
 * Refine social media content based on feedback
 */
export async function refineSocialContent(
  eventId: string,
  platform: 'x' | 'facebook' | 'instagram' | 'eventbrite',
  feedback: string,
  userAddress: string
): Promise<any> {
  try {
    console.log('CURATION_SERVICE: Refining', platform, 'content for event', eventId)

    const response = await fetch(`${CURATION_API_BASE}/content/iterate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        platform,
        feedback,
        userAddress
      })
    })

    if (!response.ok) {
      throw new Error(`Content refinement failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error: any) {
    console.error('CURATION_SERVICE: Error refining social content:', error)
    throw error
  }
}

/**
 * Approve social media content (stores on Pinata)
 */
export async function approveSocialContent(
  eventId: string,
  platform: 'x' | 'facebook' | 'instagram' | 'eventbrite',
  content: any,
  userAddress: string
): Promise<any> {
  try {
    console.log('CURATION_SERVICE: Approving', platform, 'content for event', eventId)

    const response = await fetch(`${CURATION_API_BASE}/content/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        platform,
        content,
        userAddress
      })
    })

    if (!response.ok) {
      throw new Error(`Content approval failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Error approving social content:', error)
    throw error
  }
}

/**
 * Get content limits for platform
 */
export async function getContentLimits(
  eventId: string,
  platform: string,
  userAddress: string
): Promise<any> {
  try {
    console.log('CURATION_SERVICE: Getting content limits for', platform, 'in event', eventId)

    const response = await fetch(`${CURATION_API_BASE}/content/limits/${eventId}/${platform}/${userAddress}`)

    if (!response.ok) {
      throw new Error(`Failed to get content limits: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Error getting content limits:', error)
    throw error
  }
}
