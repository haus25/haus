"use client"

import { createWalletClient, createPublicClient, custom, http } from 'viem'
import { seiTestnet } from '../lib/sei'

// Import contract addresses from constants
import { CONTRACT_ADDRESSES, EVENT_FACTORY_ABI } from '../lib/constants'

const CURATION_API_BASE = process.env.NEXT_PUBLIC_CURATION_URL || 'http://localhost:3001'

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

    const response = await fetch(`${CURATION_API_BASE}/plan`, {
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
    if (!window.ethereum) {
      throw new Error('Wallet not available')
    }

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
    const response = await fetch(metadataUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`)
    }

    const metadata = await response.json()
    return metadata.iterations?.[aspect] || {}
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
  } catch (error) {
    console.error('CURATION_SERVICE: Error refining aspect:', error)
    throw error
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
      fee: "4%", 
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
  try {
    if (!window.ethereum) {
      throw new Error('Wallet not available')
    }

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
    const metadataUrl = metadataURI.replace('ipfs://', `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/`)
    const response = await fetch(metadataUrl)
    
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
          const curationResult: CurationResult = {
            success: true,
            eventId,
      metadataURI,
      curation: {
        // Extract current values from metadata or iterations
        banner: metadata.banner || { imageUrl: metadata.image, alt: metadata.name },
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

    const response = await fetch(`${CURATION_API_BASE}/promoter/strategy`, {
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
 * Refine promotional strategy based on feedback
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

    const response = await fetch(`${CURATION_API_BASE}/promoter/strategy/iterate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        aspect,
        feedback,
        userAddress,
        currentStrategy
      })
    })

    if (!response.ok) {
      throw new Error(`Strategy refinement failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Error refining promoter strategy:', error)
    throw error
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

    const response = await fetch(`${CURATION_API_BASE}/promoter/strategy/accept`, {
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
  platform: 'x' | 'facebook' | 'eventbrite',
  strategy: any,
  eventData: EventData
): Promise<any> {
  try {
    console.log('CURATION_SERVICE: Generating', platform, 'content for event', eventId)

    const response = await fetch(`${CURATION_API_BASE}/promoter/content/generate`, {
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
  platform: 'x' | 'facebook' | 'eventbrite',
  feedback: string,
  userAddress: string
): Promise<any> {
  try {
    console.log('CURATION_SERVICE: Refining', platform, 'content for event', eventId)

    const response = await fetch(`${CURATION_API_BASE}/promoter/content/iterate`, {
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
  } catch (error) {
    console.error('CURATION_SERVICE: Error refining social content:', error)
    throw error
  }
}