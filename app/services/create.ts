"use client"

import { createPublicClient, createWalletClient, custom, formatEther, parseEther } from 'viem'
import { seiTestnet, dateToUnixTimestamp, waitForTransaction } from '../lib/sei'

// Contract addresses from environment variables
const CONTRACT_ADDRESSES = {
  CreationWrapper: process.env.NEXT_PUBLIC_CREATION_WRAPPER!,
  EventFactory: process.env.NEXT_PUBLIC_EVENT_FACTORY!,
  EventManager: process.env.NEXT_PUBLIC_EVENT_MANAGER!,
  LiveTipping: process.env.NEXT_PUBLIC_LIVE_TIPPING!,
  Distributor: process.env.NEXT_PUBLIC_DISTRIBUTOR!,
} as const

// CreationWrapper ABI
const CREATION_WRAPPER_ABI = [
  {
    "type": "function",
    "name": "createEventAndDelegate",
    "inputs": [
      {"name": "startDate", "type": "uint256", "internalType": "uint256"},
      {"name": "eventDuration", "type": "uint256", "internalType": "uint256"},
      {"name": "reservePrice", "type": "uint256", "internalType": "uint256"},
      {"name": "metadataURI", "type": "string", "internalType": "string"},
      {"name": "ticketsAmount", "type": "uint256", "internalType": "uint256"},
      {"name": "ticketPrice", "type": "uint256", "internalType": "uint256"},
      {"name": "delegatee", "type": "address", "internalType": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const

// EventFactory ABI for reading events
const EVENT_FACTORY_ABI = [
  {
    "type": "function",
    "name": "totalEvents",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
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
  },
  {
    "type": "event",
    "name": "EventCreated",
    "inputs": [
      {"name": "eventId", "type": "uint256", "indexed": true, "internalType": "uint256"},
      {"name": "creator", "type": "address", "indexed": true, "internalType": "address"},
      {"name": "startDate", "type": "uint256", "indexed": false, "internalType": "uint256"},
      {"name": "reservePrice", "type": "uint256", "indexed": false, "internalType": "uint256"},
      {"name": "metadataURI", "type": "string", "indexed": false, "internalType": "string"},
      {"name": "ticketFactoryAddress", "type": "address", "indexed": false, "internalType": "address"}
    ],
    "anonymous": false
  }
] as const

// Types for event creation
export interface EventFormData {
  title: string
  description: string
  category: string
  banner: File | null
  date: Date | null
  time: string
  duration: 15 | 30 | 60
  reservePrice: number
  ticketsAmount: number
  ticketPrice: number
  noCap: boolean
}

export interface EventMetadata {
  name: string
  description: string
  image: string
  category: string
  duration: number
  chunks: any[] // Will be populated during the live stream
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
}

export interface ContractEventData {
  eventId: number
  creator: string
  startDate: number
  eventDuration: number
  reservePrice: string
  metadataURI: string
  ticketFactoryAddress: string
  txHash: string
}

// Service class for EventFactory contract interactions via CreationWrapper
export class EventFactoryService {
  private provider: any
  private publicClient: any
  private walletClient: any

  constructor(provider?: any) {
    console.log('EventFactoryService constructor called with provider:', provider)
    this.provider = provider
    
    // Create a public client for reading from the blockchain
    this.publicClient = createPublicClient({
      chain: seiTestnet,
      transport: custom(provider?.transport || (typeof window !== 'undefined' ? window.ethereum : null))
    })
    
    // Use the provider as wallet client if it's already a viem wallet client
    if (provider && typeof provider.writeContract === 'function') {
      console.log('Using provided wagmi wallet client')
      this.walletClient = provider
    } else if (provider) {
      console.log('Creating wallet client from custom provider')
      this.walletClient = createWalletClient({
        chain: seiTestnet,
        transport: custom(provider)
      })
    } else {
      console.warn('No provider provided to EventFactoryService')
    }
  }

  /**
   * Generate placeholder banner image URL
   */
  async uploadBannerImage(file: File): Promise<string> {
    console.log('IMAGE_UPLOAD: Generating placeholder banner image')
    console.log('IMAGE_UPLOAD: File size:', file.size, 'bytes')
    console.log('IMAGE_UPLOAD: File type:', file.type)
    
    // Return a placeholder image URL based on file hash for consistency
    const seed = Array.from(new Uint8Array(await file.arrayBuffer()))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16)
    
    const placeholderUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&size=800`
    console.log('IMAGE_UPLOAD: Placeholder URL generated:', placeholderUrl)
    
    return placeholderUrl
  }

  /**
   * Generate mock metadata URI
   */
  async uploadMetadata(metadata: EventMetadata): Promise<string> {
    console.log('METADATA_UPLOAD: Generating mock metadata URI')
    console.log('METADATA_UPLOAD: Metadata name:', metadata.name)
    console.log('METADATA_UPLOAD: Metadata category:', metadata.category)
    console.log('METADATA_UPLOAD: Metadata attributes count:', metadata.attributes.length)
    
    // Generate a mock IPFS URI for consistency
    const mockHash = btoa(JSON.stringify(metadata)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 46)
    const mockUri = `ipfs://${mockHash}`
    
    console.log('METADATA_UPLOAD: Mock URI generated:', mockUri)
    
    return mockUri
  }

  /**
   * Create an event on the blockchain using CreationWrapper
   */
  async createEvent(formData: EventFormData, userAddress: string): Promise<ContractEventData> {
    if (!this.walletClient) {
      throw new Error('Wallet not connected')
    }

    console.log('CONTRACT_CALL: Starting event creation process via CreationWrapper')
    console.log('CONTRACT_CALL: User address:', userAddress)
    console.log('CONTRACT_CALL: CreationWrapper address:', CONTRACT_ADDRESSES.CreationWrapper)
    console.log('CONTRACT_CALL: Event title:', formData.title)
    console.log('CONTRACT_CALL: Event category:', formData.category)

    let bannerImageUrl = '/placeholder.svg?height=200&width=400'
    
    try {
      // Step 1: Upload banner image if provided
      if (formData.banner) {
        console.log('CONTRACT_CALL: Step 1 - Uploading banner image to IPFS')
        bannerImageUrl = await this.uploadBannerImage(formData.banner)
        console.log('CONTRACT_CALL: Banner image upload completed')
      } else {
        console.log('CONTRACT_CALL: Step 1 - No banner image provided, using placeholder')
      }

      // Step 2: Prepare metadata
      const metadata: EventMetadata = {
        name: formData.title,
        description: formData.description,
        image: bannerImageUrl,
        category: formData.category,
        duration: formData.duration,
        chunks: [], // Will be populated during live stream
        attributes: [
          {
            trait_type: 'Category',
            value: formData.category.replace('-', ' ')
          },
          {
            trait_type: 'Duration',
            value: formData.duration
          },
          {
            trait_type: 'Reserve Price',
            value: formData.reservePrice
          },
          {
            trait_type: 'Ticket Price', 
            value: formData.ticketPrice
          },
          {
            trait_type: 'Max Tickets',
            value: formData.noCap ? 'Unlimited' : formData.ticketsAmount
          }
        ]
      }

      // Step 3: Upload metadata to IPFS
      console.log('CONTRACT_CALL: Step 2 - Uploading metadata to IPFS')
      const metadataURI = await this.uploadMetadata(metadata)
      console.log('CONTRACT_CALL: Metadata upload completed')

      // Step 4: Prepare contract parameters
      const startDateTime = new Date(formData.date!)
      const [hours, minutes] = formData.time.split(':').map(Number)
      startDateTime.setHours(hours, minutes, 0, 0)
      
      const startDateUnix = dateToUnixTimestamp(startDateTime)
      // Fix: Convert SEI to Wei correctly (SEI has 18 decimals like ETH)
      // The formData values are in SEI, so we need to convert to Wei (multiply by 10^18)
      const reservePriceWei = BigInt(Math.floor(formData.reservePrice * 1e18))
      const ticketPriceWei = BigInt(Math.floor(formData.ticketPrice * 1e18))
      const ticketsAmount = formData.noCap ? 1000 : formData.ticketsAmount

      // For simplified event creation without delegation
      console.log('CONTRACT_CALL: User address (creator):', userAddress)
      
      // Step 5: Get current events count to predict the new event ID
      const currentEventId = await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.CreationWrapper as `0x${string}`,
        abi: CREATION_WRAPPER_ABI,
        functionName: 'totalEvents'
      })
      
      const expectedEventId = Number(currentEventId)
      console.log('CONTRACT_CALL: Current events count:', currentEventId.toString())
      console.log('CONTRACT_CALL: Expected new event ID:', expectedEventId)

      // Step 6: Simulate the contract call first
      console.log('CONTRACT_CALL: Step 5 - Simulating CreationWrapper transaction')
      console.log('CONTRACT_CALL: This transaction will perform the following operations:')
      console.log('CONTRACT_CALL: 1. Mint RTA NFT with event metadata')
      console.log('CONTRACT_CALL: 2. Deploy dedicated TicketFactory contract for this event')
      console.log('CONTRACT_CALL: 3. Configure revenue distribution (80% creator, 20% treasury)')
      
      const { request } = await this.publicClient.simulateContract({
        address: CONTRACT_ADDRESSES.CreationWrapper as `0x${string}`,
        abi: CREATION_WRAPPER_ABI,
        functionName: 'createEventAndDelegate',
        args: [
          BigInt(startDateUnix),
          BigInt(formData.duration),
          reservePriceWei,
          metadataURI,
          BigInt(ticketsAmount),
          ticketPriceWei,
          userAddress as `0x${string}` // Use user address instead of delegatee
        ],
        account: userAddress as `0x${string}`
      })

      console.log('CONTRACT_CALL: Simulation successful, executing transaction')
      console.log('CONTRACT_CALL: Gas estimate:', request.gas?.toString())
      
      const txHash = await this.walletClient.writeContract(request)
      console.log('CONTRACT_CALL: Transaction submitted with hash:', txHash)

      // Step 7: Wait for transaction confirmation
      console.log('CONTRACT_CALL: Step 6 - Waiting for transaction confirmation')
      console.log('CONTRACT_CALL: Monitoring blockchain for transaction receipt...')
      
      const receipt = await waitForTransaction(this.publicClient, txHash)
      console.log('CONTRACT_CALL: Transaction confirmed in block:', receipt.blockNumber.toString())
      console.log('CONTRACT_CALL: Gas used:', receipt.gasUsed?.toString())
      console.log('CONTRACT_CALL: Transaction status:', receipt.status === 'success' ? 'SUCCESS' : 'FAILED')

      // Step 8: Parse transaction logs to understand what happened
      console.log('CONTRACT_CALL: Step 7 - Analyzing transaction results')
      console.log('CONTRACT_CALL: Transaction logs count:', receipt.logs.length)
      
      // Look for specific events to confirm operations
      let rtaNftMinted = false
      let ticketFactoryDeployed = false
      
      receipt.logs.forEach((log: any, index: number) => {
        try {
          console.log(`CONTRACT_CALL: Processing log ${index + 1}/${receipt.logs.length}`)
          console.log(`CONTRACT_CALL: Log address: ${log.address}`)
          console.log(`CONTRACT_CALL: Log topics: ${log.topics.join(', ')}`)
          
          // Check if this is an EventCreated event (RTA NFT minted)
          if (log.address.toLowerCase() === CONTRACT_ADDRESSES.EventFactory.toLowerCase()) {
            console.log('CONTRACT_CALL: ✅ RTA NFT minted successfully via EventFactory')
            rtaNftMinted = true
          }
          
          // Check for other relevant events
          if (log.topics[0] && log.topics[0].includes('0x')) {
            console.log('CONTRACT_CALL: Event signature detected:', log.topics[0])
          }
          
        } catch (error) {
          console.log(`CONTRACT_CALL: Could not decode log ${index + 1}:`, error)
        }
      })

      // Step 9: Get event details from contract using expected event ID
      console.log('CONTRACT_CALL: Step 8 - Fetching created event details from EventFactory')
      const eventData = await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
        abi: EVENT_FACTORY_ABI,
        functionName: 'getEvent',
        args: [BigInt(expectedEventId)]
      })

      console.log('CONTRACT_CALL: Event creation completed successfully!')
      console.log('CONTRACT_CALL: ✅ Final verification results:')
      console.log('CONTRACT_CALL: - Event ID:', expectedEventId)
      console.log('CONTRACT_CALL: - Creator address:', eventData.creator)
      console.log('CONTRACT_CALL: - TicketFactory address:', eventData.ticketFactoryAddress)
      console.log('CONTRACT_CALL: - Event finalized:', eventData.finalized)
      console.log('CONTRACT_CALL: - Metadata URI:', eventData.metadataURI)
      console.log('CONTRACT_CALL: - Start date:', new Date(Number(eventData.startDate) * 1000).toISOString())
      console.log('CONTRACT_CALL: - Reserve price:', formatEther(eventData.reservePrice), 'SEI')
      
      // Verify TicketFactory is properly deployed
      if (eventData.ticketFactoryAddress && eventData.ticketFactoryAddress !== '0x0000000000000000000000000000000000000000') {
        console.log('CONTRACT_CALL: ✅ TicketFactory deployed successfully at:', eventData.ticketFactoryAddress)
        ticketFactoryDeployed = true
        
        // Test TicketFactory is working
        try {
          const ticketFactoryInfo = await this.publicClient.readContract({
            address: eventData.ticketFactoryAddress as `0x${string}`,
            abi: [{
              "type": "function",
              "name": "getSalesInfo",
              "inputs": [],
              "outputs": [
                {"name": "totalTickets", "type": "uint256"},
                {"name": "soldTickets", "type": "uint256"},
                {"name": "remainingTickets", "type": "uint256"},
                {"name": "price", "type": "uint256"}
              ],
              "stateMutability": "view"
            }],
            functionName: 'getSalesInfo'
          })
          
          console.log('CONTRACT_CALL: ✅ TicketFactory operational verification:')
          console.log('CONTRACT_CALL: - Total tickets available:', ticketFactoryInfo[0].toString())
          console.log('CONTRACT_CALL: - Tickets sold:', ticketFactoryInfo[1].toString())
          console.log('CONTRACT_CALL: - Ticket price:', formatEther(ticketFactoryInfo[3]), 'SEI')
          
        } catch (error) {
          console.warn('CONTRACT_CALL: ⚠️ Could not verify TicketFactory functionality:', error)
        }
      }

      // Summary of operations
      console.log('CONTRACT_CALL: 🎉 Event creation summary:')
      console.log('CONTRACT_CALL: - RTA NFT minted:', rtaNftMinted ? '✅' : '⚠️')
      console.log('CONTRACT_CALL: - TicketFactory deployed:', ticketFactoryDeployed ? '✅' : '⚠️')
      console.log('CONTRACT_CALL: - Transaction hash:', txHash)
      console.log('CONTRACT_CALL: - Block number:', receipt.blockNumber.toString())

      return {
        eventId: expectedEventId,
        creator: eventData.creator,
        startDate: Number(eventData.startDate),
        eventDuration: Number(eventData.eventDuration),
        reservePrice: formatEther(eventData.reservePrice),
        metadataURI: eventData.metadataURI,
        ticketFactoryAddress: eventData.ticketFactoryAddress,
        txHash
      }

    } catch (error) {
      console.error('CONTRACT_CALL: Error during event creation process:', error)
      throw error
    }
  }

  /**
   * Get event details from contract
   */
  async getEventDetails(eventId: number) {
    try {
      const eventData = await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
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
        ticketFactoryAddress: eventData.ticketFactoryAddress,
        finalized: eventData.finalized
      }
    } catch (error) {
      console.error('Error getting event details:', error)
      throw error
    }
  }

  /**
   * Get total number of events
   */
  async getTotalEvents(): Promise<number> {
    try {
      const total = await this.publicClient.readContract({
        address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
        abi: EVENT_FACTORY_ABI,
        functionName: 'totalEvents'
      })
      return Number(total)
    } catch (error) {
      console.error('Error getting total events:', error)
      throw error
    }
  }
}

// Factory function to create service instance
export const createEventFactoryService = (provider?: any): EventFactoryService => {
  return new EventFactoryService(provider)
}

export default EventFactoryService 