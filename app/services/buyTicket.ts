"use client"

import { createPublicClient, createWalletClient, custom, parseEther, formatEther } from 'viem'
import { seiTestnet, waitForTransaction } from '../lib/sei'

// Contract addresses from environment variables
const CONTRACT_ADDRESSES = {
  EventFactory: process.env.NEXT_PUBLIC_EVENT_FACTORY!,
  TreasuryReceiver: process.env.TREASURY_RECEIVER!,
} as const

// TicketFactory ABI for ticket purchases
const TICKET_FACTORY_ABI = [
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
      {"name": "price", "type": "uint256", "internalType": "uint256"}
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
          {"name": "ticketFactoryAddress", "type": "address", "internalType": "address"},
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
  ticketFactoryAddress: string
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
  ticketFactoryAddress: string
}

export class TicketPurchaseService {
  private publicClient: any
  private walletClient: any

  constructor(provider?: any) {
    console.log('TICKET_PURCHASE: Initializing TicketPurchaseService')
    
    // Create a public client for reading from the blockchain
    this.publicClient = createPublicClient({
      chain: seiTestnet,
      transport: custom(provider?.transport || (typeof window !== 'undefined' ? window.ethereum : null))
    })
    
    // Use the provider as wallet client if it's already a viem wallet client
    if (provider && typeof provider.writeContract === 'function') {
      console.log('TICKET_PURCHASE: Using provided wagmi wallet client')
      this.walletClient = provider
    } else if (provider) {
      console.log('TICKET_PURCHASE: Creating wallet client from custom provider')
      this.walletClient = createWalletClient({
        chain: seiTestnet,
        transport: custom(provider)
      })
    } else {
      console.warn('TICKET_PURCHASE: No provider provided to TicketPurchaseService')
    }
  }

  /**
   * Get event details and ticket factory address
   */
  async getEventDetails(eventId: number) {
    console.log('TICKET_PURCHASE: Fetching event details for event ID:', eventId)
    
    try {
      const eventData = await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
        abi: EVENT_FACTORY_ABI,
        functionName: 'getEvent',
        args: [BigInt(eventId)]
      })

      console.log('TICKET_PURCHASE: Event details retrieved')
      console.log('TICKET_PURCHASE: Creator:', eventData.creator)
      console.log('TICKET_PURCHASE: TicketFactory address:', eventData.ticketFactoryAddress)

      return {
        creator: eventData.creator,
        startDate: Number(eventData.startDate),
        eventDuration: Number(eventData.eventDuration),
        reservePrice: formatEther(eventData.reservePrice),
        metadataURI: eventData.metadataURI,
        ticketFactoryAddress: eventData.ticketFactoryAddress,
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
      
      const salesInfo = await this.publicClient.readContract({
        address: eventDetails.ticketFactoryAddress as `0x${string}`,
        abi: TICKET_FACTORY_ABI,
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
        ticketFactoryAddress: eventDetails.ticketFactoryAddress
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
      
      const hasTicket = await this.publicClient.readContract({
        address: eventDetails.ticketFactoryAddress as `0x${string}`,
        abi: TICKET_FACTORY_ABI,
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
    if (!this.walletClient) {
      throw new Error('Wallet not connected')
    }

    console.log('TICKET_PURCHASE: Starting ticket purchase process')
    console.log('TICKET_PURCHASE: Event ID:', eventId)
    console.log('TICKET_PURCHASE: User address:', userAddress)

    try {
      // Step 1: Get event details and ticket factory
      console.log('TICKET_PURCHASE: Step 1 - Getting event details')
      const eventDetails = await this.getEventDetails(eventId)
      const ticketFactoryAddress = eventDetails.ticketFactoryAddress

      console.log('TICKET_PURCHASE: TicketFactory address:', ticketFactoryAddress)
      console.log('TICKET_PURCHASE: Event creator:', eventDetails.creator)

      // Step 2: Get sales info to know the ticket price
      console.log('TICKET_PURCHASE: Step 2 - Getting ticket sales info')
      const salesInfo = await this.getTicketSalesInfo(eventId)
      
      if (salesInfo.remainingTickets <= 0) {
        throw new Error('No tickets available - event is sold out')
      }

      console.log('TICKET_PURCHASE: Ticket price:', salesInfo.price, 'SEI')
      console.log('TICKET_PURCHASE: Remaining tickets:', salesInfo.remainingTickets)

      // Step 3: Check if user already has a ticket
      console.log('TICKET_PURCHASE: Step 3 - Checking if user already has ticket')
      const alreadyHasTicket = await this.userHasTicket(eventId, userAddress)
      
      if (alreadyHasTicket) {
        throw new Error('You already have a ticket for this event')
      }

      // Step 4: Calculate payment amount
      const ticketPriceWei = parseEther(salesInfo.price)
      console.log('TICKET_PURCHASE: Step 4 - Payment amount:', formatEther(ticketPriceWei), 'SEI')

      // Step 5: Simulate the ticket purchase
      console.log('TICKET_PURCHASE: Step 5 - Simulating ticket purchase transaction')
      const { request } = await this.publicClient.simulateContract({
        address: ticketFactoryAddress as `0x${string}`,
        abi: TICKET_FACTORY_ABI,
        functionName: 'purchaseTicket',
        value: ticketPriceWei,
        account: userAddress as `0x${string}`
      })

      // Step 6: Execute the transaction
      console.log('TICKET_PURCHASE: Step 6 - Executing ticket purchase transaction')
      const txHash = await this.walletClient.writeContract(request)
      console.log('TICKET_PURCHASE: Transaction submitted with hash:', txHash)

      // Step 7: Wait for confirmation
      console.log('TICKET_PURCHASE: Step 7 - Waiting for transaction confirmation')
      const receipt = await waitForTransaction(this.publicClient, txHash)
      console.log('TICKET_PURCHASE: Transaction confirmed in block:', receipt.blockNumber.toString())
      console.log('TICKET_PURCHASE: Gas used:', receipt.gasUsed?.toString())

      // Step 8: Parse the TicketMinted event to get ticket ID
      console.log('TICKET_PURCHASE: Step 8 - Parsing transaction logs for ticket ID')
      const ticketMintedLog = receipt.logs.find((log: any) => {
        try {
          const decoded = this.publicClient.decodeEventLog({
            abi: TICKET_FACTORY_ABI,
            data: log.data,
            topics: log.topics
          })
          return decoded.eventName === 'TicketMinted'
        } catch {
          return false
        }
      })

      let ticketId = 1 // fallback
      let ticketName = `rta${eventId}_ticket${ticketId}`

      if (ticketMintedLog) {
        try {
          const decoded = this.publicClient.decodeEventLog({
            abi: TICKET_FACTORY_ABI,
            data: ticketMintedLog.data,
            topics: ticketMintedLog.topics
          })
          ticketId = Number(decoded.args.ticketId)
          ticketName = decoded.args.ticketName
          console.log('TICKET_PURCHASE: Ticket minted successfully')
          console.log('TICKET_PURCHASE: Ticket ID:', ticketId)
          console.log('TICKET_PURCHASE: Ticket name:', ticketName)
        } catch (error) {
          console.warn('TICKET_PURCHASE: Could not decode TicketMinted event, using fallback values')
        }
      }

      // Note: Revenue distribution (80% creator, 20% treasury) is handled automatically
      // by the TicketFactory contract's purchaseTicket function
      console.log('TICKET_PURCHASE: Revenue distribution completed automatically by contract')
      console.log('TICKET_PURCHASE: - 80% to creator:', eventDetails.creator)
      console.log('TICKET_PURCHASE: - 20% to treasury:', CONTRACT_ADDRESSES.TreasuryReceiver)

      console.log('TICKET_PURCHASE: Ticket purchase completed successfully')

      return {
        ticketId,
        eventId,
        ticketName,
        purchasePrice: salesInfo.price,
        ticketFactoryAddress,
        txHash,
        creatorAddress: eventDetails.creator
      }

    } catch (error) {
      console.error('TICKET_PURCHASE: Error during ticket purchase process:', error)
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
      
      const ticketIds = await this.publicClient.readContract({
        address: eventDetails.ticketFactoryAddress as `0x${string}`,
        abi: TICKET_FACTORY_ABI,
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
      
      const ticketData = await this.publicClient.readContract({
        address: eventDetails.ticketFactoryAddress as `0x${string}`,
        abi: TICKET_FACTORY_ABI,
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
        metadataURI: ticketData[6]
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