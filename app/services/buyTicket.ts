"use client"

import { createPublicClient, createWalletClient, custom, parseEther, formatEther } from 'viem'
import { seiTestnet, waitForTransaction } from '../lib/sei'

// Contract addresses from environment variables
const CONTRACT_ADDRESSES = {
  EventFactory: process.env.NEXT_PUBLIC_EVENT_FACTORY!,
  TreasuryReceiver: process.env.TREASURY_RECEIVER!,
} as const

// Ticket Kiosk ABI for ticket purchases
const TICKET_KIOSK_ABI = [
  {
    "type": "function",
    "name": "purchaseTicket",
    "inputs": [],
    "outputs": [{"name": "ticketId", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "payable"
  },
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
  },
  {
    "type": "function",
    "name": "hasTicketForEvent",
    "inputs": [
      {"name": "user", "type": "address", "internalType": "address"},
      {"name": "_eventId", "type": "uint256", "internalType": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserTickets",
    "inputs": [{"name": "user", "type": "address", "internalType": "address"}],
    "outputs": [{"name": "", "type": "uint256[]", "internalType": "uint256[]"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTicketInfo",
    "inputs": [{"name": "ticketId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [
      {"name": "eventId_", "type": "uint256", "internalType": "uint256"},
      {"name": "owner", "type": "address", "internalType": "address"},
      {"name": "originalOwner", "type": "address", "internalType": "address"},
      {"name": "purchasePrice", "type": "uint256", "internalType": "uint256"},
      {"name": "purchaseTimestamp", "type": "uint256", "internalType": "uint256"},
      {"name": "name", "type": "string", "internalType": "string"},
      {"name": "artCategory", "type": "string", "internalType": "string"},
      {"name": "metadataURI", "type": "string", "internalType": "string"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "eventId",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "creator",
    "inputs": [],
    "outputs": [{"name": "", "type": "address", "internalType": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "TicketMinted",
    "inputs": [
      {"name": "ticketId", "type": "uint256", "indexed": true, "internalType": "uint256"},
      {"name": "buyer", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "ticketName", "type": "string", "indexed": false, "internalType": "string"},
      {"name": "price", "type": "uint256", "indexed": false, "internalType": "uint256"}
    ],
    "anonymous": false
  }
] as const

// EventFactory ABI for getting event details - matches deployed contract
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
  }
] as const

export interface TicketPurchaseData {
  ticketId: number
  eventId: number
  ticketName: string
  purchasePrice: string
  ticketKioskAddress: string
  txHash: string
  creatorAddress: string
}

export interface TicketInfo {
  eventId: number
  owner: string
  originalOwner: string
  purchasePrice: string
  purchaseTimestamp: number
  name: string
  metadataURI: string
}

export interface EventTicketSales {
  totalTickets: number
  soldTickets: number
  remainingTickets: number
  price: string
  eventId: number
  ticketKioskAddress: string
}

export class TicketPurchaseService {
  private publicClient: any
  private walletClient: any
  private provider: any

  constructor(provider?: any) {
    console.log('TICKET_PURCHASE: Initializing TicketPurchaseService')
    this.provider = provider
    // Don't create clients during construction to avoid SSR issues
  }

  private getPublicClient() {
    if (!this.publicClient && typeof window !== 'undefined') {
      this.publicClient = createPublicClient({
        chain: seiTestnet,
        transport: custom(this.provider?.transport || window.ethereum || {} as any)
      })
    }
    return this.publicClient
  }

  private getWalletClient() {
    if (!this.walletClient && this.provider) {
      // Use the provider as wallet client if it's already a viem wallet client
      if (typeof this.provider.writeContract === 'function') {
        console.log('TICKET_PURCHASE: Using provided wagmi wallet client')
        this.walletClient = this.provider
      } else {
        console.log('TICKET_PURCHASE: Creating wallet client from custom provider')
        this.walletClient = createWalletClient({
          chain: seiTestnet,
          transport: custom(this.provider)
        })
      }
    }
    return this.walletClient
  }

  /**
   * Get event details and ticket kiosk address
   */
  async getEventDetails(eventId: number) {
    console.log('TICKET_PURCHASE: Fetching event details for event ID:', eventId)
    
    try {
      const eventData = await this.getPublicClient().readContract({
        address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
        abi: EVENT_FACTORY_ABI,
        functionName: 'getEvent',
        args: [BigInt(eventId)]
      })

      console.log('TICKET_PURCHASE: Event details retrieved')
      console.log('TICKET_PURCHASE: Creator:', eventData.creator)
      console.log('TICKET_PURCHASE: TicketKiosk address:', eventData.ticketKioskAddress)

      return {
        creator: eventData.creator,
        startDate: Number(eventData.startDate),
        eventDuration: Number(eventData.eventDuration),
        reservePrice: formatEther(eventData.reservePrice),
        metadataURI: eventData.metadataURI,
        ticketKioskAddress: eventData.ticketKioskAddress,
        finalized: eventData.finalized
      }
    } catch (error) {
      console.error('TICKET_PURCHASE: Error getting event details:', error)
      throw error
    }
  }

  /**
   * Get ticket sales information for an event
   */
  async getTicketSalesInfo(eventId: number): Promise<EventTicketSales> {
    console.log('TICKET_PURCHASE: Getting ticket sales info for event ID:', eventId)
    
    try {
      const eventDetails = await this.getEventDetails(eventId)
      
      const salesInfo = await this.getPublicClient().readContract({
        address: eventDetails.ticketKioskAddress as `0x${string}`,
        abi: TICKET_KIOSK_ABI,
        functionName: 'getSalesInfo'
      })

      console.log('TICKET_PURCHASE: Sales info retrieved')
      console.log('TICKET_PURCHASE: Total tickets:', salesInfo[0].toString())
      console.log('TICKET_PURCHASE: Sold tickets:', salesInfo[1].toString())
      console.log('TICKET_PURCHASE: Price per ticket:', formatEther(salesInfo[3]), 'SEI')

      return {
        totalTickets: Number(salesInfo[0]),
        soldTickets: Number(salesInfo[1]),
        remainingTickets: Number(salesInfo[2]),
        price: formatEther(salesInfo[3]),
        eventId,
        ticketKioskAddress: eventDetails.ticketKioskAddress
      }
    } catch (error) {
      console.error('TICKET_PURCHASE: Error getting sales info:', error)
      throw error
    }
  }

  /**
   * Check if user has a ticket for an event
   */
  async userHasTicket(eventId: number, userAddress: string): Promise<boolean> {
    console.log('TICKET_PURCHASE: Checking if user has ticket for event ID:', eventId)
    
    try {
      const eventDetails = await this.getEventDetails(eventId)
      
      const hasTicket = await this.getPublicClient().readContract({
        address: eventDetails.ticketKioskAddress as `0x${string}`,
        abi: TICKET_KIOSK_ABI,
        functionName: 'hasTicketForEvent',
        args: [userAddress as `0x${string}`, BigInt(eventId)]
      })

      console.log('TICKET_PURCHASE: User has ticket:', hasTicket)
      return hasTicket
    } catch (error) {
      console.error('TICKET_PURCHASE: Error checking user ticket:', error)
      return false
    }
  }

  /**
   * Purchase a ticket for an event
   * Includes automatic revenue distribution: 80% to creator, 20% to treasury
   */
  async purchaseTicket(eventId: number, userAddress: string): Promise<TicketPurchaseData> {
    if (!this.getWalletClient()) {
      throw new Error('Wallet not connected')
    }

    console.log('TICKET_PURCHASE: Starting optimized ticket purchase process')
    console.log('TICKET_PURCHASE: Event ID:', eventId)
    console.log('TICKET_PURCHASE: User address:', userAddress)

    try {
      // Step 1: Get event details and validate ticket kiosk exists
      console.log('TICKET_PURCHASE: Step 1 - Getting event details')
      const eventDetails = await this.getEventDetails(eventId)
      const ticketKioskAddress = eventDetails.ticketKioskAddress

      if (!ticketKioskAddress || ticketKioskAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('TicketKiosk not deployed for this event')
      }

      console.log('TICKET_PURCHASE: TicketKiosk address:', ticketKioskAddress)

      // Step 2: Get sales info in a single call
      console.log('TICKET_PURCHASE: Step 2 - Getting sales info and validating availability')
      const salesInfo = await this.getTicketSalesInfo(eventId)
      
      if (salesInfo.remainingTickets <= 0) {
        throw new Error('No tickets available - event is sold out')
      }

      const ticketPriceWei = parseEther(salesInfo.price)
      console.log('TICKET_PURCHASE: Ticket price:', salesInfo.price, 'SEI')
      console.log('TICKET_PURCHASE: Remaining tickets:', salesInfo.remainingTickets)

      // Step 3: Execute purchase directly with minimal pre-checks
      // The contract will handle validation (duplicate ticket, sold out, etc.)
      console.log('TICKET_PURCHASE: Step 3 - Executing purchase transaction')
      console.log('TICKET_PURCHASE: Payment amount:', formatEther(ticketPriceWei), 'SEI')

      // Execute purchase without simulation to reduce RPC calls
      const txHash = await this.getWalletClient().writeContract({
        address: ticketKioskAddress as `0x${string}`,
        abi: TICKET_KIOSK_ABI,
        functionName: 'purchaseTicket',
        value: ticketPriceWei,
        account: userAddress as `0x${string}`
      })
      
      console.log('TICKET_PURCHASE: Transaction submitted with hash:', txHash)

      // Step 4: Wait for confirmation
      console.log('TICKET_PURCHASE: Step 4 - Waiting for transaction confirmation')
      const receipt = await waitForTransaction(this.getPublicClient(), txHash)
      console.log('TICKET_PURCHASE: Transaction confirmed in block:', receipt.blockNumber.toString())

      // Step 5: Parse ticket details from transaction logs
      console.log('TICKET_PURCHASE: Step 5 - Parsing transaction logs for ticket details')
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
          console.log('TICKET_PURCHASE: Ticket minted - ID:', ticketId, 'Name:', ticketName)
        }
      } catch (error) {
        console.warn('TICKET_PURCHASE: Could not parse ticket details from logs, using defaults')
      }

      console.log('TICKET_PURCHASE: Purchase completed successfully')
      console.log('TICKET_PURCHASE: Revenue distribution handled by contract (80% creator, 20% treasury)')

      return {
        ticketId,
        eventId,
        ticketName,
        purchasePrice: salesInfo.price,
        ticketKioskAddress,
        txHash,
        creatorAddress: eventDetails.creator
      }

    } catch (error) {
      console.error('TICKET_PURCHASE: Error during ticket purchase:', error)
      throw error
    }
  }

  /**
   * Get user's tickets for an event
   */
  async getUserTickets(eventId: number, userAddress: string): Promise<number[]> {
    console.log('TICKET_PURCHASE: Getting user tickets for event ID:', eventId)
    
    try {
      const eventDetails = await this.getEventDetails(eventId)
      
      const ticketIds = await this.getPublicClient().readContract({
        address: eventDetails.ticketKioskAddress as `0x${string}`,
        abi: TICKET_KIOSK_ABI,
        functionName: 'getUserTickets',
        args: [userAddress as `0x${string}`]
      })

      console.log('TICKET_PURCHASE: User has', ticketIds.length, 'tickets')
      return ticketIds.map((id: bigint) => Number(id))
    } catch (error) {
      console.error('TICKET_PURCHASE: Error getting user tickets:', error)
      return []
    }
  }

  /**
   * Get detailed ticket information
   */
  async getTicketInfo(eventId: number, ticketId: number): Promise<TicketInfo> {
    console.log('TICKET_PURCHASE: Getting ticket info for ticket ID:', ticketId)
    
    try {
      const eventDetails = await this.getEventDetails(eventId)
      
      const ticketData = await this.getPublicClient().readContract({
        address: eventDetails.ticketKioskAddress as `0x${string}`,
        abi: TICKET_KIOSK_ABI,
        functionName: 'getTicketInfo',
        args: [BigInt(ticketId)]
      })

      return {
        eventId: Number(ticketData[0]),
        owner: ticketData[1],
        originalOwner: ticketData[2],
        purchasePrice: formatEther(ticketData[3]),
        purchaseTimestamp: Number(ticketData[4]),
        name: ticketData[5],
        metadataURI: ticketData[7]
      }
    } catch (error) {
      console.error('TICKET_PURCHASE: Error getting ticket info:', error)
      throw error
    }
  }
}

// Factory function to create service instance
export const createTicketPurchaseService = (provider?: any): TicketPurchaseService => {
  return new TicketPurchaseService(provider)
}

export default TicketPurchaseService 