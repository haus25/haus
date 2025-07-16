"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth"
import { createPublicClient, custom, formatEther } from 'viem'
import { seiTestnet } from '../lib/sei'

// Define event type to match contract data structure
export interface Event {
  id: string
  contractEventId: number
  title: string
  creator: string
  creatorAddress: string
  category: string
  date: string
  duration: number
  participants: number
  maxParticipants: number
  ticketPrice: number
  description: string
  image: string
  status: "upcoming" | "live" | "completed"
  videoUrl?: string
  metadataURI?: string
  ticketKioskAddress?: string
  reservePrice?: number
  finalized?: boolean
}

interface EventsContextType {
  events: Event[]
  userEvents: Event[]
  loading: boolean
  addEvent: (event: Event) => void
  updateEvent: (updatedEvent: Event) => void
  getEventById: (id: string) => Event | undefined
  refreshEvents: () => Promise<void>
}

const EventsContext = createContext<EventsContextType | undefined>(undefined)

// Contract addresses and ABI
const CONTRACT_ADDRESSES = {
  EventFactory: process.env.NEXT_PUBLIC_EVENT_FACTORY!,
} as const

// EventFactory ABI
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
          {"name": "ticketKioskAddress", "type": "address", "internalType": "address"},
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

// TicketKiosk ABI for getting sales info
const TICKET_KIOSK_ABI = [
  {
    "type": "function",
    "name": "getSalesInfo",
    "inputs": [],
    "outputs": [
      {"name": "totalTickets", "type": "uint256", "internalType": "uint256"},
      {"name": "soldTickets", "type": "uint256", "internalType": "uint256"},
      {"name": "remainingTickets", "type": "uint256", "internalType": "uint256"},
      {"name": "price", "type": "uint256", "internalType": "uint256"},
      {"name": "artCategory", "type": "string", "internalType": "string"}
    ],
    "stateMutability": "view"
  }
] as const

export function EventsProvider({ children }: { children: ReactNode }) {
  const { userProfile, isConnected } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  // Create public client for reading from blockchain (only on client side)
  const publicClient = typeof window !== 'undefined' ? createPublicClient({
    chain: seiTestnet,
    transport: custom(window.ethereum || {} as any)
  }) : null

  // Function to fetch events from contract
  const fetchEventsFromContract = async (): Promise<Event[]> => {
    if (!CONTRACT_ADDRESSES.EventFactory || !publicClient) {
      console.warn("EventFactory contract address not configured or client not available")
      return []
    }

    try {
      console.log("EVENTS_CONTEXT: Fetching events from contract:", CONTRACT_ADDRESSES.EventFactory)

      // Get total events count
      const totalEvents = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
        abi: EVENT_FACTORY_ABI,
        functionName: 'totalEvents'
      })

      const totalCount = Number(totalEvents)
      console.log("EVENTS_CONTEXT: Total events in contract:", totalCount)

      const contractEvents: Event[] = []

      // Fetch each event
      for (let i = 0; i < totalCount; i++) {
        try {
          console.log(`EVENTS_CONTEXT: Fetching event ${i}`)

          const eventData = await publicClient!.readContract({
            address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
            abi: EVENT_FACTORY_ABI,
            functionName: 'getEvent',
            args: [BigInt(i)]
          })

          // Get ticket sales info from TicketKiosk
          let ticketPrice = 0
          let maxParticipants = 0
          let participants = 0

          if (eventData.ticketKioskAddress && eventData.ticketKioskAddress !== '0x0000000000000000000000000000000000000000' && publicClient) {
            try {
              const salesInfo = await publicClient.readContract({
                address: eventData.ticketKioskAddress as `0x${string}`,
                abi: TICKET_KIOSK_ABI,
                functionName: 'getSalesInfo'
              })

              ticketPrice = parseFloat(formatEther(salesInfo[3]))
              maxParticipants = Number(salesInfo[0])
              participants = Number(salesInfo[1])
            } catch (error) {
              console.warn(`EVENTS_CONTEXT: Could not fetch sales info for event ${i}:`, error)
            }
          }

          // Parse metadata URI to get title, description, image
          let title = `Event ${i}`
          let description = "Real-time art event"
          let image = "/placeholder.svg"

          if (eventData.metadataURI) {
            try {
              // Convert IPFS URI to gateway URL for fetching - EXACT same pattern as profile service
              const ipfsHash = eventData.metadataURI.startsWith('ipfs://') ? eventData.metadataURI.slice(7) : eventData.metadataURI
              const gatewayUrl = `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsHash}`
              
              console.log(`EVENTS_CONTEXT: Fetching metadata for event ${i} from gateway:`, gatewayUrl)
              
              const response = await fetch(gatewayUrl)
              if (!response.ok) {
                console.warn(`EVENTS_CONTEXT: Failed to fetch metadata for event ${i}, status:`, response.status)
              } else {
                const metadata = await response.json()
                
                title = metadata.name || metadata.title || title
                description = metadata.description || description
                
                // Handle image URL - use same pattern for consistency
                if (metadata.image) {
                  const imageHash = metadata.image.startsWith('ipfs://') ? metadata.image.slice(7) : metadata.image
                  image = `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${imageHash}`
                }
                
                console.log(`EVENTS_CONTEXT: Successfully loaded metadata for event ${i}:`, { title, description })
              }
            } catch (error) {
              console.error(`EVENTS_CONTEXT: Failed to load metadata for event ${i}:`, error)
            }
          }

          // Convert startDate from Unix timestamp to ISO string
          const startDate = new Date(Number(eventData.startDate) * 1000).toISOString()

          const event: Event = {
            id: i.toString(),
            contractEventId: i,
            title,
            creator: eventData.creator.toLowerCase(),
            creatorAddress: eventData.creator.toLowerCase(),
            category: eventData.artCategory || "performance-art",
            date: startDate,
            duration: Number(eventData.eventDuration) / 60, // Convert seconds to minutes
            participants,
            maxParticipants,
            ticketPrice,
            description,
            image,
            status: eventData.finalized ? "completed" : (Date.now() > Number(eventData.startDate) * 1000 ? "live" : "upcoming"),
            metadataURI: eventData.metadataURI,
            ticketKioskAddress: eventData.ticketKioskAddress,
            reservePrice: parseFloat(formatEther(eventData.reservePrice)),
            finalized: eventData.finalized
          }

          contractEvents.push(event)
          console.log(`EVENTS_CONTEXT: Successfully loaded event ${i}:`, event.title)

      } catch (error) {
          console.warn(`EVENTS_CONTEXT: Failed to fetch event ${i}:`, error)
        }
      }

      console.log("EVENTS_CONTEXT: Successfully loaded", contractEvents.length, "events from contract")
      return contractEvents

    } catch (error) {
      console.error("EVENTS_CONTEXT: Error fetching events from contract:", error)
      return []
    }
  }

  // Refresh events function
  const refreshEvents = async () => {
    setLoading(true)
    try {
      const contractEvents = await fetchEventsFromContract()
      setEvents(contractEvents)
    } catch (error) {
      console.error("EVENTS_CONTEXT: Error refreshing events:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load events on mount (only on client side)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      refreshEvents()
    }
  }, [])

  // Filter events created by the current user
  const userEvents = isConnected && userProfile
    ? events.filter((event) => event.creatorAddress.toLowerCase() === userProfile.address.toLowerCase())
      : []

  // Add a new event (for when user creates an event)
  const addEvent = (event: Event) => {
    setEvents((prev) => [...prev, event])
  }

  // Update an existing event
  const updateEvent = (updatedEvent: Event) => {
    setEvents((prev) => prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)))
  }

  // Get an event by ID
  const getEventById = (id: string) => {
    return events.find((event) => event.id === id)
  }

  return (
    <EventsContext.Provider
      value={{
        events,
        userEvents,
        loading,
        addEvent,
        updateEvent,
        getEventById,
        refreshEvents,
      }}
    >
      {children}
    </EventsContext.Provider>
  )
}

// Custom hook to use the events context
export function useEvents() {
  const context = useContext(EventsContext)
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider")
  }
  return context
}
