"use client"

import { createWalletClient, createPublicClient, custom, http } from 'viem'
import { seiTestnet } from '../lib/sei'

// Contract addresses from environment variables
const CONTRACT_ADDRESSES = {
  EVENT_FACTORY: process.env.NEXT_PUBLIC_EVENT_FACTORY!,
  // Note: Curation contracts are deployed per-event, not global
} as const

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
  }
  proxyAddress: string
  curationAddress?: string
  generatedAt: string
}

// EventFactory ABI for curation deployment
const EVENT_FACTORY_ABI = [
  {
    "type": "function",
    "name": "deployCurationForEvent",
    "inputs": [
      {"name": "eventId", "type": "uint256", "internalType": "uint256"},
      {"name": "scope", "type": "uint256", "internalType": "uint256"},
      {"name": "description", "type": "string", "internalType": "string"}
    ],
    "outputs": [{"name": "curationAddress", "type": "address", "internalType": "address"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getCurationContract",
    "inputs": [{"name": "eventId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "address", "internalType": "address"}],
    "stateMutability": "view"
  }
] as const

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
    const response = await fetch(`${CURATION_API_BASE}/request-plan`, {
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
    
    // The API returns the complete plan data directly
    const planData = result.plan || {}
    
    return {
      success: result.success || true,
      eventId,
      metadataURI: result.metadataURI,
      curation: planData,
      proxyAddress: planData.proxyAddress || '',
      generatedAt: planData.generatedAt || new Date().toISOString()
    }
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
 * Request refinement for specific aspect
 * @param conversationId Conversation ID  
 * @param aspect Aspect to refine (description, pricing, schedule, banner)
 * @param feedback User feedback for refinement
 * @returns Updated aspect result
 */
export async function requestAspectRefinement(
  conversationId: string,
  aspect: string,
  feedback: string
): Promise<any> {
  try {
    const response = await fetch(`${CURATION_API_BASE}/refine-aspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        aspect,
        feedback
      })
    })

    if (!response.ok) {
      throw new Error(`Refinement failed: ${response.statusText}`)
    }

    return await response.json()
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
 * Accept curation proposal and execute blockchain transaction
 * @param conversationId Conversation ID 
 * @param finalCuration Final curation data approved by user
 * @returns Transaction result
 */
export async function acceptCurationProposal(
  conversationId: string,
  finalCuration: any
): Promise<any> {
  try {
    const response = await fetch(`${CURATION_API_BASE}/accept-proposal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        finalCuration
      })
    })

    if (!response.ok) {
      throw new Error(`Proposal acceptance failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('CURATION_SERVICE: Error accepting proposal:', error)
    throw error
  }
}