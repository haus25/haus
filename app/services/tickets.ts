"use client"

import { createPublicClient, createWalletClient, custom, parseEther, formatEther, http, type WalletClient } from 'viem'
import { parseAbi, getContract } from 'viem'
import { seiTestnet, waitForTransaction } from '../lib/sei'
import { CONTRACT_ADDRESSES, EVENT_FACTORY_ABI } from '../lib/constants'
import TicketKioskABI from '../contracts/abis/TicketKioskABI.json'

// Enhanced ABI for ticket operations
const TICKET_KIOSK_ABI = parseAbi([
  // Purchase function
  'function purchaseTicket() external payable returns (uint256 ticketId)',
  // View functions
  'function getSalesInfo() external view returns (uint256 totalTickets, uint256 soldTickets, uint256 remainingTickets, uint256 price, string memory artCategory)',
  'function hasTicketForEvent(address user, uint256 eventId) external view returns (bool)',
  'function getUserTickets(address user) external view returns (uint256[] memory)',
  'function getTicketInfo(uint256 ticketId) external view returns (uint256 eventId, address owner, address originalOwner, uint256 purchasePrice, uint256 purchaseTimestamp, string memory name, string memory artCategory, string memory metadataURI)',
  'function isAvailable() external view returns (bool)',
  'function totalSupply() external view returns (uint256)',
  'function eventId() external view returns (uint256)',
  'function creator() external view returns (address)',
  'function ticketPrice() external view returns (uint256)',
  'function ticketsAmount() external view returns (uint256)',
  'function ticketsSold() external view returns (uint256)',
  'function artCategory() external view returns (string)',
  'function hasTicket(address) external view returns (bool)',
  // Events
  'event TicketMinted(uint256 indexed ticketId, address indexed buyer, string ticketName, string artCategory, uint256 price)'
])

/**
 * Convert IPFS URLs to use Pinata gateway
 */
const convertIPFSUrl = (url: string): string => {
  if (!url) return '/placeholder.svg'
  
  if (url.startsWith('http')) return url
  
  if (url.startsWith('ipfs://')) {
    const ipfsHash = url.slice(7)
    return `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsHash}`
  }
  
  if (url.match(/^[Qm][1-9A-HJ-NP-Za-km-z]{44,}$/)) {
    return `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${url}`
  }
  
  return url
}

// Type definitions
export interface WalletBalance {
  balance: string
  formattedBalance: string
  symbol: string
  decimals: number
}

export interface Transaction {
  hash: string
  from: string
  to: string | null
  value: string
  formattedValue: string
  blockNumber: number
  timestamp: number
  status: 'success' | 'failed' | 'pending'
  type: 'send' | 'receive' | 'contract'
}

export interface TicketInfo {
  ticketId: number
  eventId: number
  owner: string
  originalOwner: string
  purchasePrice: string
  purchaseTimestamp: number
  name: string
  artCategory: string
  metadataURI: string
}

export interface EventSalesInfo {
  totalTickets: number
  soldTickets: number
  remainingTickets: number
  price: string
  artCategory: string
}

export interface TicketPurchaseData {
  ticketId: number
  eventId: number
  ticketName: string
  purchasePrice: string
  ticketKioskAddress: string
  txHash: string
  creatorAddress: string
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

export interface UserTicket {
  ticketId: number
  eventId: number
  kioskAddress: string
  name: string
  artCategory: string
  purchasePrice: number
  purchaseTimestamp: number
  ticketNumber: number
  totalTickets: number
  metadataURI: string
}

export interface EventDetails {
  creator: string
  startDate: number
  eventDuration: number
  reservePrice: string
  metadataURI: string
  ticketKioskAddress: string
  finalized: boolean
}

/**
 * Comprehensive Ticket Service
 * Handles all ticket-related operations: purchasing, verification, fetching events, etc.
 */
export class TicketService {
  private publicClient: any
  private walletClient: any
  private provider: any
  private static eventCache = new Map<string, { data: any, timestamp: number }>()
  private static metadataCache = new Map<string, { data: any, timestamp: number }>()
  private static CACHE_TTL = 30000 // 30 seconds

  constructor(provider?: any) {
    console.log('TICKETS: Initializing TicketService')
    this.provider = provider
  }

  private static isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL
  }

  private async processEventData(eventIndex: number, eventData: any, tokenURI: any, publicClient: any): Promise<OnChainEventData | null> {
    try {
      // Get kiosk data
      const kioskData = await this.getTicketKioskData(eventData.KioskAddress)
      
      // Get metadata with caching
      const metadata = await this.getCachedMetadata(tokenURI, eventData.metadataURI, eventIndex)
      
      // Determine status
      const now = Date.now()
      const startTime = Number(eventData.startDate) * 1000
      const endTime = startTime + (Number(eventData.eventDuration) * 60 * 1000)
      
      let status: 'upcoming' | 'live' | 'completed' = 'upcoming'
      if (now >= startTime && now <= endTime) {
        status = 'live'
      } else if (now > endTime) {
        status = 'completed'
      }

      return {
        id: eventIndex.toString(),
        contractEventId: eventIndex,
        title: metadata.name || metadata.title || `Event #${eventIndex}`,
        description: metadata.description || 'Event description not available',
        creator: eventData.creator,
        creatorAddress: eventData.creator,
        category: eventData.artCategory || 'standup-comedy',
        date: new Date(startTime).toISOString(),
        duration: Number(eventData.eventDuration),
        reservePrice: Number(eventData.reservePrice) / 1e18,
        ticketPrice: kioskData.price / 1e18,
        maxParticipants: kioskData.totalTickets,
        participants: kioskData.soldTickets,
        image: convertIPFSUrl(metadata.image || '/placeholder.svg'),
        status,
        finalized: eventData.finalized,
        ticketKioskAddress: eventData.KioskAddress,
        eventMetadataURI: eventData.metadataURI
      }
    } catch (error) {
      console.error(`TICKETS: Error processing event ${eventIndex}:`, error)
      return null
    }
  }

  private async getCachedMetadata(tokenURI: any, metadataURI: any, eventIndex: number): Promise<any> {
    let finalTokenURI = tokenURI
    
    // Fallback to metadataURI if tokenURI failed
    if (!finalTokenURI && metadataURI && 
        !metadataURI.includes('TEST') && 
        !metadataURI.includes('FIXED')) {
      finalTokenURI = metadataURI
    }

    if (!finalTokenURI) {
      return {
        name: `Event #${eventIndex}`,
        description: 'Event description not available',
        image: '/placeholder.svg'
      }
    }

    // Check cache first
    const cacheKey = `metadata_${finalTokenURI}`
    const cached = TicketService.metadataCache.get(cacheKey)
    if (cached && TicketService.isCacheValid(cached.timestamp)) {
      return cached.data
    }

    try {
      let metadata
      if (finalTokenURI.startsWith('ipfs://')) {
        const ipfsHash = finalTokenURI.slice(7)
        if (ipfsHash && ipfsHash.match(/^[A-Za-z0-9]{44,59}$/) && !ipfsHash.includes('TEST') && !ipfsHash.includes('FIXED')) {
          const pinataGatewayUrl = `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsHash}`
          const response = await fetch(pinataGatewayUrl)
          if (response.ok) {
            metadata = await response.json()
          }
        }
      } else if (finalTokenURI.startsWith('http')) {
        const response = await fetch(finalTokenURI)
        if (response.ok) {
          metadata = await response.json()
        }
      } else {
        metadata = JSON.parse(finalTokenURI)
      }

      if (metadata) {
        // Cache the result
        TicketService.metadataCache.set(cacheKey, { data: metadata, timestamp: Date.now() })
        return metadata
      }
    } catch (error) {
      console.warn(`Failed to parse metadata for event ${eventIndex}:`, error)
    }
    
    return {
      name: `Event #${eventIndex}`,
      description: 'Event description not available',
      image: '/placeholder.svg'
    }
  }

  private getPublicClient() {
    if (!this.publicClient) {
      if (typeof window !== 'undefined') {
        if (this.provider?.transport) {
          // Use wallet transport when available (avoids CORS to RPC)
          this.publicClient = createPublicClient({
            chain: seiTestnet,
            transport: custom(this.provider.transport)
          })
        } else {
          this.publicClient = createPublicClient({
            chain: seiTestnet,
            transport: http(process.env.NEXT_PUBLIC_SEI_TESTNET_RPC!)
          })
        }
      }
      return this.publicClient
    }
    return this.publicClient
  }

  private getWalletClient() {
    if (!this.walletClient && this.provider) {
      if (typeof this.provider.writeContract === 'function') {
        this.walletClient = this.provider
      } else {
        this.walletClient = createWalletClient({
          chain: seiTestnet,
          transport: custom(this.provider)
        })
      }
    }
    return this.walletClient
  }

  /**
   * Get TicketKiosk contract instance
   */
  private getTicketKioskContract(ticketKioskAddress: string) {
    return getContract({
      address: ticketKioskAddress as `0x${string}`,
      abi: TICKET_KIOSK_ABI,
      client: this.getWalletClient() || this.getPublicClient()
    })
  }

  // ==================== EVENT OPERATIONS ====================

  /**
   * Get event details from EventFactory with timing validation
   */
  async getEventDetails(eventId: number): Promise<EventDetails> {
    console.log('TICKETS: Fetching event details for event ID:', eventId)
    
    try {
      const eventData = await this.getPublicClient().readContract({
        address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
        abi: EVENT_FACTORY_ABI,
        functionName: 'getEvent',
        args: [BigInt(eventId)]
      })

      return {
        creator: eventData.creator,
        startDate: Number(eventData.startDate),
        eventDuration: Number(eventData.eventDuration),
        reservePrice: formatEther(eventData.reservePrice),
        metadataURI: eventData.metadataURI,
        ticketKioskAddress: eventData.KioskAddress, // Use KioskAddress from ABI
        finalized: eventData.finalized
      }
    } catch (error) {
      console.error('TICKETS: Error getting event details:', error)
      throw error
    }
  }

  /**
   * Validate event timing against blockchain data
   */
  async validateEventTiming(eventId: number): Promise<{
    isValid: boolean
    status: 'upcoming' | 'live' | 'ended'
    startTime: Date
    endTime: Date
    remainingTime?: number
  }> {
    try {
      const eventDetails = await this.getEventDetails(eventId)
      const now = new Date()
      const startTime = new Date(eventDetails.startDate * 1000) // Convert from Unix timestamp
      const endTime = new Date(startTime.getTime() + eventDetails.eventDuration * 60 * 1000) // duration in minutes
      
      let status: 'upcoming' | 'live' | 'ended'
      let remainingTime: number | undefined
      
      if (now < startTime) {
        status = 'upcoming'
        remainingTime = startTime.getTime() - now.getTime()
      } else if (now <= endTime) {
        status = 'live'
        remainingTime = endTime.getTime() - now.getTime()
      } else {
        status = 'ended'
      }
      
      console.log('TICKETS: Event timing validation:', {
        eventId,
        status,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        remainingTime
      })
      
      return {
        isValid: true,
        status,
        startTime,
        endTime,
        remainingTime
      }
    } catch (error) {
      console.error('TICKETS: Error validating event timing:', error)
      return {
        isValid: false,
        status: 'ended',
        startTime: new Date(),
        endTime: new Date()
      }
    }
  }

  /**
   * Fetch all events from the EventFactory contract with caching
   */
  async fetchAllEvents(): Promise<OnChainEventData[]> {
    if (typeof window === 'undefined') {
      return []
    }

    const publicClient = this.getPublicClient()
    if (!publicClient) {
      return []
    }

    // Check cache first
    const cacheKey = 'all_events'
    const cached = TicketService.eventCache.get(cacheKey)
    if (cached && TicketService.isCacheValid(cached.timestamp)) {
      console.log('TICKETS: Returning cached events')
      return cached.data
    }

    try {
      console.log('TICKETS: Fetching all events from contract...')
      
      const totalEvents = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
        abi: EVENT_FACTORY_ABI,
        functionName: 'totalEvents',
      }) as bigint

      if (totalEvents === BigInt(0)) {
        return []
      }

      const eventCount = Number(totalEvents)
      console.log(`TICKETS: Found ${eventCount} events, fetching data with smart batching...`)

      // Batch size to prevent RPC overload
      const BATCH_SIZE = 5
      const events: OnChainEventData[] = []

      for (let i = 0; i < eventCount; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, eventCount)
        const batchIndices = Array.from({ length: batchEnd - i }, (_, idx) => i + idx)

        // Batch 1: Event data + tokenURI
        const batchPromises = batchIndices.flatMap(eventIndex => [
          publicClient.readContract({
            address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
            abi: EVENT_FACTORY_ABI,
            functionName: 'getEvent',
            args: [BigInt(eventIndex)],
          }).catch(() => null),
          publicClient.readContract({
            address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
            abi: EVENT_FACTORY_ABI,
            functionName: 'tokenURI',
            args: [BigInt(eventIndex)],
          }).catch(() => null)
        ])

        const batchResults = await Promise.all(batchPromises)
        
        // Process batch results
        for (let j = 0; j < batchIndices.length; j++) {
          const eventIndex = batchIndices[j]
          const eventData = batchResults[j * 2]
          const tokenURI = batchResults[j * 2 + 1]
          
          if (!eventData) continue

          try {
            const event = await this.processEventData(eventIndex, eventData, tokenURI, publicClient)
            if (event) events.push(event)
          } catch (error) {
            console.error(`TICKETS: Error processing event ${eventIndex}:`, error)
          }
        }

        // Rate limit between batches
        if (batchEnd < eventCount) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      const sortedEvents = events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      // Cache the results
      TicketService.eventCache.set(cacheKey, { data: sortedEvents, timestamp: Date.now() })
      console.log('TICKETS: Successfully fetched and cached', sortedEvents.length, 'events')
      return sortedEvents
    } catch (error) {
      console.error('TICKETS: Error fetching events:', error)
      throw error
    }
  }

  /**
   * Get ticket kiosk data
   */
  async getTicketKioskData(kioskAddress: string): Promise<{
    eventId: number
    totalTickets: number
    soldTickets: number
    remainingTickets: number
    price: number
    artCategory: string
  }> {
    if (typeof window === 'undefined' || !kioskAddress) {
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
      const publicClient = this.getPublicClient()
      
      // Parallelize both calls to the kiosk contract
      const [salesInfo, eventId] = await Promise.all([
        publicClient.readContract({
          address: kioskAddress as `0x${string}`,
          abi: TicketKioskABI,
          functionName: 'getSalesInfo',
        }) as Promise<any>,
        publicClient.readContract({
          address: kioskAddress as `0x${string}`,
          abi: TicketKioskABI,
          functionName: 'eventId',
        }) as Promise<bigint>
      ])

      return {
        eventId: Number(eventId),
        totalTickets: Number(salesInfo[0]),
        soldTickets: Number(salesInfo[1]),
        remainingTickets: Number(salesInfo[2]),
        price: Number(salesInfo[3]),
        artCategory: salesInfo[4],
      }
    } catch (error) {
      console.error('TICKETS: Error fetching kiosk data:', error)
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

  // ==================== TICKET PURCHASE OPERATIONS ====================

  /**
   * Get ticket sales information for an event
   */
  async getTicketSalesInfo(eventId: number): Promise<{
    totalTickets: number
    soldTickets: number
    remainingTickets: number
    price: string
    eventId: number
    ticketKioskAddress: string
  }> {
    console.log('TICKETS: Getting ticket sales info for event ID:', eventId)
    
    try {
      const eventDetails = await this.getEventDetails(eventId)
      
      const salesInfo = await this.getPublicClient().readContract({
        address: eventDetails.ticketKioskAddress as `0x${string}`,
        abi: TICKET_KIOSK_ABI,
        functionName: 'getSalesInfo'
      })

      return {
        totalTickets: Number(salesInfo[0]),
        soldTickets: Number(salesInfo[1]),
        remainingTickets: Number(salesInfo[2]),
        price: formatEther(salesInfo[3]),
        eventId,
        ticketKioskAddress: eventDetails.ticketKioskAddress
      }
    } catch (error) {
      console.error('TICKETS: Error getting sales info:', error)
      throw error
    }
  }

  /**
   * Check if user has a ticket for an event
   */
  async userHasTicket(eventId: number, userAddress: string): Promise<boolean> {
    console.log('TICKETS: Checking if user has ticket for event ID:', eventId)
    
    try {
      const eventDetails = await this.getEventDetails(eventId)
      
      const hasTicket = await this.getPublicClient().readContract({
        address: eventDetails.ticketKioskAddress as `0x${string}`,
        abi: TICKET_KIOSK_ABI,
        functionName: 'hasTicketForEvent',
        args: [userAddress as `0x${string}`, BigInt(eventId)]
      })

      return hasTicket
    } catch (error) {
      console.error('TICKETS: Error checking user ticket:', error)
      return false
    }
  }

  /**
   * Purchase a ticket for an event
   */
  async purchaseTicket(eventId: number, userAddress: string): Promise<TicketPurchaseData> {
    if (!this.getWalletClient()) {
      throw new Error('Wallet not connected')
    }

    console.log('TICKETS: Starting ticket purchase process')
    
    try {
      const eventDetails = await this.getEventDetails(eventId)
      const salesInfo = await this.getTicketSalesInfo(eventId)
      
      if (salesInfo.remainingTickets <= 0) {
        throw new Error('No tickets available - event is sold out')
      }

      const ticketPriceWei = parseEther(salesInfo.price)
      
      const txHash = await this.getWalletClient().writeContract({
        address: eventDetails.ticketKioskAddress as `0x${string}`,
        abi: TICKET_KIOSK_ABI,
        functionName: 'purchaseTicket',
        value: ticketPriceWei,
        account: userAddress as `0x${string}`
      })
      
      const receipt = await waitForTransaction(this.getPublicClient(), txHash)
      
      // Parse ticket details from logs
      let ticketId = 1
      let ticketName = `rta${eventId}_ticket${ticketId}`

      try {
        const ticketMintedLog = receipt.logs.find((log: any) => {
          try {
            const decoded = this.getPublicClient().decodeEventLog({
              abi: TICKET_KIOSK_ABI,
              data: log.data,
              topics: log.topics
            })
            return decoded.eventName === 'TicketMinted'
          } catch {
            return false
          }
        })

        if (ticketMintedLog) {
          const decoded = this.getPublicClient().decodeEventLog({
            abi: TICKET_KIOSK_ABI,
            data: ticketMintedLog.data,
            topics: ticketMintedLog.topics
          })
          ticketId = Number(decoded.args.ticketId)
          ticketName = decoded.args.ticketName as string
        }
      } catch (error) {
        console.warn('TICKETS: Could not parse ticket details from logs')
      }

      return {
        ticketId,
        eventId,
        ticketName,
        purchasePrice: salesInfo.price,
        ticketKioskAddress: eventDetails.ticketKioskAddress,
        txHash,
        creatorAddress: eventDetails.creator
      }

    } catch (error) {
      console.error('TICKETS: Error during ticket purchase:', error)
      throw error
    }
  }

  // ==================== TICKET VERIFICATION OPERATIONS ====================

  /**
   * Verify if user has access to an event
   */
  async verifyEventAccess(
    ticketKioskAddress: string,
    userAddress: string,
    eventId: number
  ): Promise<{
    hasAccess: boolean
    userTickets: number[]
    eventInfo: any
    reason?: string
  }> {
    try {
      console.log('TICKETS: Verifying event access for user:', userAddress)

      const hasTicket = await this.getPublicClient().readContract({
        address: ticketKioskAddress as `0x${string}`,
        abi: TICKET_KIOSK_ABI,
        functionName: 'hasTicketForEvent',
        args: [userAddress as `0x${string}`, BigInt(eventId)]
      })

      if (!hasTicket) {
        return {
          hasAccess: false,
          userTickets: [],
          eventInfo: null,
          reason: 'No valid ticket found for this event'
        }
      }

      const userTickets = await this.getPublicClient().readContract({
        address: ticketKioskAddress as `0x${string}`,
        abi: TICKET_KIOSK_ABI,
        functionName: 'getUserTickets',
        args: [userAddress as `0x${string}`]
      })

      return {
        hasAccess: true,
        userTickets: userTickets.map((id: bigint) => Number(id)),
        eventInfo: null,
        reason: 'Valid ticket verified'
      }

    } catch (error) {
      console.error('TICKETS: Error during access verification:', error)
      return {
        hasAccess: false,
        userTickets: [],
        eventInfo: null,
        reason: 'Verification failed due to technical error'
      }
    }
  }

  // ==================== USER TICKET OPERATIONS ====================

  /**
   * Get user's tickets for an event
   */
  async getUserTicketsForEvent(eventId: number, userAddress: string): Promise<number[]> {
    try {
      const eventDetails = await this.getEventDetails(eventId)
      
      const ticketIds = await this.getPublicClient().readContract({
        address: eventDetails.ticketKioskAddress as `0x${string}`,
        abi: TICKET_KIOSK_ABI,
        functionName: 'getUserTickets',
        args: [userAddress as `0x${string}`]
      })

      return ticketIds.map((id: bigint) => Number(id))
    } catch (error) {
      console.error('TICKETS: Error getting user tickets:', error)
      return []
    }
  }

  /**
   * Get detailed ticket information
   */
  async getTicketInfo(eventId: number, ticketId: number): Promise<TicketInfo> {
    try {
      const eventDetails = await this.getEventDetails(eventId)
      
      const ticketData = await this.getPublicClient().readContract({
        address: eventDetails.ticketKioskAddress as `0x${string}`,
        abi: TICKET_KIOSK_ABI,
        functionName: 'getTicketInfo',
        args: [BigInt(ticketId)]
      })

      return {
        ticketId,
        eventId: Number(ticketData[0]),
        owner: ticketData[1],
        originalOwner: ticketData[2],
        purchasePrice: formatEther(ticketData[3]),
        purchaseTimestamp: Number(ticketData[4]),
        name: ticketData[5],
        artCategory: ticketData[6],
        metadataURI: ticketData[7]
      }
    } catch (error) {
      console.error('TICKETS: Error getting ticket info:', error)
      throw error
    }
  }

  /**
   * Fetch user's tickets across all events
   */
  async fetchUserTickets(userAddress: string): Promise<UserTicket[]> {
    if (typeof window === 'undefined') {
      return []
    }

    try {
      console.log('TICKETS: Fetching tickets for user:', userAddress)
      
      const kioskData = await this.getPublicClient().readContract({
        address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
        abi: EVENT_FACTORY_ABI,
        functionName: 'getAllTicketKiosks',
      }) as [bigint[], string[]]

      const [eventIds, kioskAddresses] = kioskData
      const userTickets: UserTicket[] = []

      for (let i = 0; i < kioskAddresses.length; i++) {
        try {
          const kioskAddress = kioskAddresses[i]
          const eventId = Number(eventIds[i])
          
          const userTicketIds = await this.getPublicClient().readContract({
            address: kioskAddress as `0x${string}`,
            abi: TicketKioskABI,
            functionName: 'getUserTickets',
            args: [userAddress],
          }) as bigint[]

          for (const ticketId of userTicketIds) {
            const ticketInfo = await this.getPublicClient().readContract({
              address: kioskAddress as `0x${string}`,
              abi: TicketKioskABI,
              functionName: 'getTicketInfo',
              args: [ticketId],
            }) as any

            const ticket: UserTicket = {
              ticketId: Number(ticketId),
              eventId,
              kioskAddress,
              name: ticketInfo[5],
              artCategory: ticketInfo[6],
              purchasePrice: Number(ticketInfo[3]) / 1e18,
              purchaseTimestamp: Number(ticketInfo[4]),
              ticketNumber: Number(ticketInfo[8]) || 1,
              totalTickets: Number(ticketInfo[9]) || 1,
              metadataURI: ticketInfo[7],
            }

            userTickets.push(ticket)
          }
        } catch (error) {
          console.error(`TICKETS: Error processing kiosk ${i}:`, error)
        }
      }

      return userTickets
    } catch (error) {
      console.error('TICKETS: Error fetching user tickets:', error)
      return []
    }
  }
}

// Factory functions
export const createTicketService = (provider?: any): TicketService => {
  return new TicketService(provider)
}

export const createTicketPurchaseService = (provider?: any): TicketService => {
  return new TicketService(provider)
}

export const createTicketVerificationService = (walletClient: WalletClient): TicketService => {
  return new TicketService(walletClient)
}

// Legacy function exports for compatibility
export const fetchOnChainEvents = async (): Promise<OnChainEventData[]> => {
  const service = createTicketService()
  return service.fetchAllEvents()
}

export const fetchUserTickets = async (userAddress: string): Promise<UserTicket[]> => {
  const service = createTicketService()
  return service.fetchUserTickets(userAddress)
}

export const fetchTicketKioskData = async (kioskAddress: string) => {
  const service = createTicketService()
  return service.getTicketKioskData(kioskAddress)
}

export default TicketService 
