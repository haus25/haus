"use client"

import { createPublicClient, http, formatEther } from 'viem'
import { seiTestnet } from '../lib/sei'

// Contract addresses from environment variables
const CONTRACT_ADDRESSES = {
  EVENT_FACTORY: process.env.NEXT_PUBLIC_EVENT_FACTORY!,
} as const

// EventFactory ABI for getting event details
const EVENT_FACTORY_ABI = [
  {
    "type": "function",
    "name": "getEvent",
    "inputs": [{"name": "eventId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IEventFactory.EventData", 
        "components": [
          {"name": "creator", "type": "address", "internalType": "address"},
          {"name": "startDate", "type": "uint256", "internalType": "uint256"},
          {"name": "eventDuration", "type": "uint256", "internalType": "uint256"},
          {"name": "reservePrice", "type": "uint256", "internalType": "uint256"},
          {"name": "metadataURI", "type": "string", "internalType": "string"},
          {"name": "artCategory", "type": "string", "internalType": "string"},
          {"name": "KioskAddress", "type": "address", "internalType": "address"},
          {"name": "finalized", "type": "bool", "internalType": "bool"}
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalEvents",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  }
] as const

/**
 * Create a public client for blockchain interactions
 */
function createClient() {
  return createPublicClient({
    chain: seiTestnet,
    transport: http(process.env.NEXT_PUBLIC_SEI_TESTNET_RPC)
  })
}

/**
 * Fetches an event from the Sei blockchain using viem
 * @param eventId The ID of the event to fetch
 * @returns The event data
 */
export async function fetchEvent(eventId: string): Promise<any> {
  const publicClient = createClient()
  
  try {
    if (!CONTRACT_ADDRESSES.EVENT_FACTORY) {
      throw new Error('Event Factory contract address not configured')
    }

    console.log('EVENT_SERVICE: Fetching event', eventId, 'from contract', CONTRACT_ADDRESSES.EVENT_FACTORY)

    // Call the contract to get event data
    const eventData = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
      abi: EVENT_FACTORY_ABI,
      functionName: 'getEvent',
      args: [BigInt(eventId)]
    }) as any
    
    console.log('EVENT_SERVICE: Event data retrieved:', eventData)
    
    // Format the event data to match expected interface
    return {
      id: eventId,
      name: eventData.metadataURI ? 'Loading...' : `Event #${eventId}`,
      description: eventData.metadataURI ? 'Loading description...' : 'No description available',
      category: eventData.artCategory || "general",
      artist: eventData.creator,
      status: eventData.finalized ? 'completed' : 'upcoming',
      ticketPrice: formatEther(BigInt(eventData.reservePrice.toString())),
      ticketsAmount: 100, // Default, would need to query TicketKiosk for actual value
      ticketsSold: 0, // Default, would need to query TicketKiosk for actual value
      startTime: Number(eventData.startDate) * 1000, // Convert to milliseconds
      duration: Number(eventData.eventDuration), // in minutes
      reservePrice: formatEther(BigInt(eventData.reservePrice.toString())),
      creator: eventData.creator,
      ticketKioskAddress: eventData.KioskAddress,
      contentUri: eventData.metadataURI || null,
      finalized: eventData.finalized
    }
  } catch (error) {
    console.error("EVENT_SERVICE: Error fetching event:", error)
    throw error
  }
}

/**
 * Gets total number of events from the EventFactory
 * @returns Total number of events
 */
export async function getTotalEvents(): Promise<number> {
  const publicClient = createClient()
  
  try {
    if (!CONTRACT_ADDRESSES.EVENT_FACTORY) {
      throw new Error('Event Factory contract address not configured')
    }

    const total = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
      abi: EVENT_FACTORY_ABI,
      functionName: 'totalEvents'
    })

    return Number(total)
  } catch (error) {
    console.error("EVENT_SERVICE: Error getting total events:", error)
    return 0
  }
}

/**
 * Gets all events (with pagination support)
 * @param page Page number (0-indexed)
 * @param limit Number of events per page
 * @returns Array of events
 */
export async function getAllEvents(
  page: number = 0, 
  limit: number = 20
): Promise<any[]> {
  try {
    // Get total event count
    const total = await getTotalEvents()

    // Calculate pagination
    const start = page * limit
    const end = Math.min(start + limit, total)
    
    if (start >= total) {
      return []
    }

    // Fetch events in range
    const events = []
    for (let i = start; i < end; i++) {
      try {
        const event = await fetchEvent(i.toString())
        if (event) {
          events.push(event)
        }
      } catch (error) {
        console.warn(`EVENT_SERVICE: Failed to fetch event ${i}:`, error)
      }
    }

    return events
  } catch (error) {
    console.error("EVENT_SERVICE: Error fetching all events:", error)
    return []
  }
}

/**
 * Helper function to convert contract event status to string
 */
function getEventStatusFromContract(status: number): string {
  switch (status) {
    case 0: return "created"
    case 1: return "live"
    case 2: return "completed"
    case 3: return "finalized"
    default: return "unknown"
  }
}
