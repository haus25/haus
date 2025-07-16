"use client"

import { createPublicClient, http } from 'viem'
import { seiTestnet } from '../lib/sei'
import EventFactoryABI from '../contracts/abis/EventFactoryABI.json'
import TicketKioskABI from '../contracts/abis/TicketKioskABI.json'

// Contract addresses from environment variables
const CONTRACT_ADDRESSES = {
  EventFactory: process.env.NEXT_PUBLIC_EVENT_FACTORY!,
} as const

/**
 * Convert IPFS URLs to use Pinata gateway
 */
const convertIPFSUrl = (url: string): string => {
  if (!url) return '/placeholder.svg'
  
  // If it's already a full URL, return as is
  if (url.startsWith('http')) return url
  
  // If it's an IPFS URL, convert to Pinata gateway
  if (url.startsWith('ipfs://')) {
    const ipfsHash = url.slice(7) // Remove 'ipfs://' prefix
    return `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsHash}`
  }
  
  // If it's just a hash, assume it's IPFS
  if (url.match(/^[Qm][1-9A-HJ-NP-Za-km-z]{44,}$/)) {
    return `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${url}`
  }
  
  // Otherwise return as is (could be relative URL like /placeholder.svg)
  return url
}

export interface OnChainEventData {
  id: string
  contractEventId: number
  title: string
  description: string
  creator: string
  creatorAddress: string
  category: string
  date: string
  duration: number
  reservePrice: number
  ticketPrice: number
  maxParticipants: number
  participants: number
  image: string
  status: 'upcoming' | 'live' | 'completed'
  finalized: boolean
  ticketKioskAddress: string
  eventMetadataURI: string
}

export interface TicketKioskData {
  eventId: number
  totalTickets: number
  soldTickets: number
  remainingTickets: number
  price: number
  artCategory: string
}

// Create public client for reading contract data (only on client side)
function createClient() {
  if (typeof window === 'undefined') {
    // Return null on server side
    return null
  }
  
  return createPublicClient({
    chain: seiTestnet,
    transport: http(process.env.NEXT_PUBLIC_SEI_TESTNET_RPC!)
  })
}

/**
 * Fetch all events from the EventFactory contract
 */
export async function fetchOnChainEvents(): Promise<OnChainEventData[]> {
  // Only run on client side
  if (typeof window === 'undefined') {
    console.log('FETCH_EVENTS: Server side, returning empty array')
    return []
  }

  const publicClient = createClient()
  if (!publicClient) {
    console.log('FETCH_EVENTS: No client available')
    return []
  }

  try {
    console.log('FETCH_EVENTS: Starting to fetch events from contract...')
    
    // Get total number of events
    const totalEvents = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
      abi: EventFactoryABI,
      functionName: 'totalEvents',
    }) as bigint

    console.log('FETCH_EVENTS: Total events:', totalEvents.toString())

    if (totalEvents === BigInt(0)) {
      console.log('FETCH_EVENTS: No events found')
      return []
    }

    // Get all events
    const events: OnChainEventData[] = []
    
    for (let i = 0; i < Number(totalEvents); i++) {
      try {
        // Get event data from EventFactory
        const eventData = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
          abi: EventFactoryABI,
          functionName: 'getEvent',
          args: [BigInt(i)],
        }) as any

        console.log(`FETCH_EVENTS: Event ${i} data:`, eventData)

        // Get TicketKiosk data
        const kioskData = await fetchTicketKioskData(eventData.KioskAddress)
        
        // Parse metadata URI to get title, description, and image
        let metadata: any = {}
        try {
          if (eventData.metadataURI) {
            // For IPFS URIs, fetch the metadata using Pinata gateway
            if (eventData.metadataURI.startsWith('ipfs://')) {
              const ipfsHash = eventData.metadataURI.slice(7) // Remove 'ipfs://' prefix
              const pinataGatewayUrl = `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsHash}`
              console.log(`FETCH_EVENTS: Fetching metadata from Pinata gateway: ${pinataGatewayUrl}`)
              const response = await fetch(pinataGatewayUrl)
              if (response.ok) {
                metadata = await response.json()
              } else {
                console.warn(`FETCH_EVENTS: Failed to fetch from Pinata gateway, trying public gateway`)
                // Fallback to public gateway if Pinata fails
                const publicUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
                const fallbackResponse = await fetch(publicUrl)
                if (fallbackResponse.ok) {
                  metadata = await fallbackResponse.json()
                }
              }
            } else if (eventData.metadataURI.startsWith('http')) {
              const response = await fetch(eventData.metadataURI)
              if (response.ok) {
                metadata = await response.json()
              }
            } else {
              // Try to parse as JSON
              metadata = JSON.parse(eventData.metadataURI)
            }
          }
        } catch (error) {
          console.warn(`FETCH_EVENTS: Failed to parse metadata for event ${i}:`, error)
          metadata = {
            name: `Event #${i}`,
            description: 'Event description not available',
            image: '/placeholder.svg'
          }
        }

        // Determine event status
        const now = Date.now()
        const startTime = Number(eventData.startDate) * 1000
        const endTime = startTime + (Number(eventData.eventDuration) * 60 * 1000)
        
        let status: 'upcoming' | 'live' | 'completed' = 'upcoming'
        if (now >= startTime && now <= endTime) {
          status = 'live'
        } else if (now > endTime) {
          status = 'completed'
        }

        const event: OnChainEventData = {
          id: i.toString(),
          contractEventId: i,
          title: metadata.name || metadata.title || `Event #${i}`,
          description: metadata.description || 'Event description not available',
          creator: eventData.creator,
          creatorAddress: eventData.creator,
          category: eventData.artCategory || 'standup-comedy',
          date: new Date(startTime).toISOString(),
          duration: Number(eventData.eventDuration),
          reservePrice: Number(eventData.reservePrice) / 1e18, // Convert from wei to ETH
          ticketPrice: kioskData.price / 1e18, // Convert from wei to ETH
          maxParticipants: kioskData.totalTickets,
          participants: kioskData.soldTickets,
          image: convertIPFSUrl(metadata.image || '/placeholder.svg'),
          status,
          finalized: eventData.finalized,
          ticketKioskAddress: eventData.KioskAddress,
          eventMetadataURI: eventData.metadataURI
        }

        events.push(event)
        console.log(`FETCH_EVENTS: Processed event ${i}:`, event.title)
        console.log(`FETCH_EVENTS: Event metadata:`, { name: metadata.name, title: metadata.title, image: metadata.image })

      } catch (error) {
        console.error(`FETCH_EVENTS: Error processing event ${i}:`, error)
        // Continue with next event
      }
    }

    console.log('FETCH_EVENTS: Successfully fetched', events.length, 'events')
    return events

  } catch (error) {
    console.error('FETCH_EVENTS: Error fetching events:', error)
    throw error
  }
}

/**
 * Fetch ticket kiosk data for a specific event
 */
export async function fetchTicketKioskData(kioskAddress: string): Promise<TicketKioskData> {
  // Only run on client side
  if (typeof window === 'undefined') {
    return {
      eventId: 0,
      totalTickets: 0,
      soldTickets: 0,
      remainingTickets: 0,
      price: 0,
      artCategory: 'standup-comedy',
    }
  }

  const publicClient = createClient()
  if (!publicClient) {
    return {
      eventId: 0,
      totalTickets: 0,
      soldTickets: 0,
      remainingTickets: 0,
      price: 0,
      artCategory: 'standup-comedy',
    }
  }

  try {
    const salesInfo = await publicClient.readContract({
      address: kioskAddress as `0x${string}`,
      abi: TicketKioskABI,
      functionName: 'getSalesInfo',
    }) as any

    const eventId = await publicClient.readContract({
      address: kioskAddress as `0x${string}`,
      abi: TicketKioskABI,
      functionName: 'eventId',
    }) as bigint

    return {
      eventId: Number(eventId),
      totalTickets: Number(salesInfo[0]),
      soldTickets: Number(salesInfo[1]),
      remainingTickets: Number(salesInfo[2]),
      price: Number(salesInfo[3]),
      artCategory: salesInfo[4],
    }
  } catch (error) {
    console.error('FETCH_KIOSK: Error fetching kiosk data:', error)
    // Return default data
    return {
      eventId: 0,
      totalTickets: 0,
      soldTickets: 0,
      remainingTickets: 0,
      price: 0,
      artCategory: 'standup-comedy',
    }
  }
}

/**
 * Fetch user's tickets across all events
 */
export async function fetchUserTickets(userAddress: string): Promise<any[]> {
  // Only run on client side
  if (typeof window === 'undefined') {
    return []
  }

  const publicClient = createClient()
  if (!publicClient) {
    return []
  }

  try {
    console.log('FETCH_TICKETS: Fetching tickets for user:', userAddress)
    
    // Get all ticket kiosk addresses
    const kioskData = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
      abi: EventFactoryABI,
      functionName: 'getAllTicketKiosks',
    }) as [bigint[], string[]]

    const [eventIds, kioskAddresses] = kioskData
    const userTickets: any[] = []

    // Check each kiosk for user's tickets
    for (let i = 0; i < kioskAddresses.length; i++) {
      try {
        const kioskAddress = kioskAddresses[i]
        const eventId = Number(eventIds[i])
        
        // Get user's tickets for this event
        const userTicketIds = await publicClient.readContract({
          address: kioskAddress as `0x${string}`,
          abi: TicketKioskABI,
          functionName: 'getUserTickets',
          args: [userAddress],
        }) as bigint[]

        // Get detailed info for each ticket
        for (const ticketId of userTicketIds) {
          const ticketInfo = await publicClient.readContract({
            address: kioskAddress as `0x${string}`,
            abi: TicketKioskABI,
            functionName: 'getTicketInfo',
            args: [ticketId],
          }) as any

          const ticket = {
            ticketId: Number(ticketId),
            eventId,
            kioskAddress,
            name: ticketInfo[5], // ticket name
            artCategory: ticketInfo[6], // art category
            purchasePrice: Number(ticketInfo[3]) / 1e18, // convert from wei
            purchaseTimestamp: Number(ticketInfo[4]),
            ticketNumber: Number(ticketInfo[8]), // new field: ticket number
            totalTickets: Number(ticketInfo[9]), // new field: total tickets
            metadataURI: ticketInfo[7],
          }

          userTickets.push(ticket)
        }
      } catch (error) {
        console.error(`FETCH_TICKETS: Error processing kiosk ${i}:`, error)
      }
    }

    console.log('FETCH_TICKETS: Found', userTickets.length, 'tickets for user')
    return userTickets

  } catch (error) {
    console.error('FETCH_TICKETS: Error fetching user tickets:', error)
    return []
  }
} 