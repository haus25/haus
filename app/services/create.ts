"use client"

import { createPublicClient, createWalletClient, custom, formatEther, parseEther } from 'viem'
import { seiTestnet, dateToUnixTimestamp, waitForTransaction } from '../lib/sei'
import { getPinataService } from './pinata'
import { streamingService } from './streaming'
import { XMTP } from '../lib/xmtp'

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
      {"name": "artCategory", "type": "string", "internalType": "string"},
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
          {"name": "KioskAddress", "type": "address", "internalType": "address"},
          {"name": "curationAddress", "type": "address", "internalType": "address"},
          {"name": "startDate", "type": "uint96", "internalType": "uint96"},
          {"name": "eventDuration", "type": "uint96", "internalType": "uint96"},
          {"name": "reservePrice", "type": "uint96", "internalType": "uint96"},
          {"name": "finalized", "type": "bool", "internalType": "bool"},
          {"name": "metadataURI", "type": "string", "internalType": "string"},
          {"name": "artCategory", "type": "string", "internalType": "string"}
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
      {"name": "artCategory", "type": "string", "indexed": false, "internalType": "string"},
      {"name": "ticketKioskAddress", "type": "address", "indexed": false, "internalType": "address"}
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
  xmtpGroupId?: string // XMTP group ID for chat discovery
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
  artCategory: string
  ticketKioskAddress: string
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
        console.log('Using provided wagmi wallet client')
        this.walletClient = this.provider
      } else {
        console.log('Creating wallet client from custom provider')
        this.walletClient = createWalletClient({
          chain: seiTestnet,
          transport: custom(this.provider)
        })
      }
    }
    return this.walletClient
  }

  /**
   * Upload banner image to Pinata IPFS
   */
  async uploadBannerImage(file: File): Promise<string> {
    console.log('IMAGE_UPLOAD: Uploading banner image to Pinata IPFS')
    console.log('IMAGE_UPLOAD: File size:', file.size, 'bytes')
    console.log('IMAGE_UPLOAD: File type:', file.type)
    
    try {
      const pinataService = getPinataService()
      const imageUrl = await pinataService.uploadImage(file, {
        name: `RTA-Banner-${Date.now()}`,
        keyvalues: {
          category: 'event-banner',
          uploadType: 'event-creation'
        }
      })
      
      console.log('IMAGE_UPLOAD: Banner image uploaded successfully:', imageUrl)
      return imageUrl
      
    } catch (error) {
      console.error('IMAGE_UPLOAD: Failed to upload banner image:', error)
      throw new Error(`Failed to upload banner image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upload event metadata JSON to Pinata IPFS
   */
  async uploadMetadata(metadata: EventMetadata): Promise<string> {
    console.log('METADATA_UPLOAD: Uploading metadata JSON to Pinata IPFS')
    console.log('METADATA_UPLOAD: Metadata name:', metadata.name)
    console.log('METADATA_UPLOAD: Metadata category:', metadata.category)
    console.log('METADATA_UPLOAD: Metadata attributes count:', metadata.attributes.length)
    
    try {
      const pinataService = getPinataService()
      const metadataUri = await pinataService.uploadJSON(metadata, {
        name: `RTA-Event-Metadata-${metadata.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
        keyvalues: {
          category: metadata.category,
          eventName: metadata.name,
          duration: metadata.duration.toString(),
          uploadType: 'event-metadata'
        }
      })
      
      console.log('METADATA_UPLOAD: Metadata uploaded successfully:', metadataUri)
      return metadataUri
      
    } catch (error) {
      console.error('METADATA_UPLOAD: Failed to upload metadata:', error)
      throw new Error(`Failed to upload metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create an event on the blockchain using CreationWrapper
   */
  async createEvent(formData: EventFormData, userAddress: string): Promise<ContractEventData> {
    if (!this.getWalletClient()) {
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

      // Step 2: Get expected event ID early (needed for XMTP group creation)
      const currentEventId = await this.getPublicClient().readContract({
        address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
        abi: EVENT_FACTORY_ABI,
        functionName: 'totalEvents'
      })
      
      const expectedEventId = Number(currentEventId)
      console.log('CONTRACT_CALL: Current events count:', currentEventId.toString())
      console.log('CONTRACT_CALL: Expected new event ID:', expectedEventId)

      // Step 3: Create XMTP group BEFORE metadata upload (so we can include groupId)
      let xmtpGroupId = ''
      console.log('CONTRACT_CALL: Step 3 - Creating XMTP optimistic group for event chat')
      try {
        // Initialize creator's XMTP client
        console.log('CONTRACT_CALL: Initializing creator XMTP client...')
        await XMTP.initializeClient(this.getWalletClient(), userAddress)

        // Create optimistic group and get groupId - FAIL FAST if this fails
        const { groupId } = await XMTP.createEventGroup(expectedEventId.toString(), this.getWalletClient(), userAddress)
        xmtpGroupId = groupId
        console.log('CONTRACT_CALL: ✅ XMTP optimistic group created, ID:', xmtpGroupId)
        
      } catch (xmtpError) {
        console.error('CONTRACT_CALL: ❌ XMTP group creation failed:', xmtpError)
        // Fail fast - don't create event without chat capability
        throw new Error('Could not initialize chat. Please try creating the event again.')
      }

      // Step 4: Prepare metadata with XMTP group ID
      const metadata: EventMetadata = {
        name: formData.title,
        description: formData.description,
        image: bannerImageUrl,
        category: formData.category,
        duration: formData.duration,
        chunks: [], // Will be populated during live stream
        xmtpGroupId, // Include XMTP group ID for discovery
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

      // Step 5: Upload metadata to IPFS (now includes XMTP group ID)
      console.log('CONTRACT_CALL: Step 5 - Uploading metadata with XMTP group ID to IPFS')
      const metadataURI = await this.uploadMetadata(metadata)
      console.log('CONTRACT_CALL: Metadata upload completed with XMTP group ID')

      // Step 6: Prepare contract parameters
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

      // Step 6: Simulate the contract call first
      console.log('CONTRACT_CALL: Step 5 - Simulating CreationWrapper transaction')
      console.log('CONTRACT_CALL: This transaction will perform the following operations:')
      console.log('CONTRACT_CALL: 1. Mint RTA NFT with event metadata')
      console.log('CONTRACT_CALL: 2. Deploy dedicated TicketKiosk contract for this event')
      console.log('CONTRACT_CALL: 3. Configure revenue distribution (80% creator, 20% treasury)')
      
      const { request } = await this.getPublicClient().simulateContract({
        address: CONTRACT_ADDRESSES.CreationWrapper as `0x${string}`,
        abi: CREATION_WRAPPER_ABI,
        functionName: 'createEventAndDelegate',
        args: [
          BigInt(startDateUnix),
          BigInt(formData.duration),
          reservePriceWei,
          metadataURI,
          formData.category,
          BigInt(ticketsAmount),
          ticketPriceWei,
          userAddress as `0x${string}` // Use user address instead of delegatee
        ],
        account: userAddress as `0x${string}`
      })

      console.log('CONTRACT_CALL: Simulation successful, executing transaction')
      console.log('CONTRACT_CALL: Gas estimate:', request.gas?.toString())
      
      const txHash = await this.getWalletClient().writeContract(request)
      console.log('CONTRACT_CALL: Transaction submitted with hash:', txHash)

      // Step 7: Wait for transaction confirmation
      console.log('CONTRACT_CALL: Step 6 - Waiting for transaction confirmation')
      console.log('CONTRACT_CALL: Monitoring blockchain for transaction receipt...')
      
      const receipt = await waitForTransaction(this.getPublicClient(), txHash)
      console.log('CONTRACT_CALL: Transaction confirmed in block:', receipt.blockNumber.toString())
      console.log('CONTRACT_CALL: Gas used:', receipt.gasUsed?.toString())
      console.log('CONTRACT_CALL: Transaction status:', receipt.status === 'success' ? 'SUCCESS' : 'FAILED')

      // Step 8: Parse transaction logs to understand what happened
      console.log('CONTRACT_CALL: Step 7 - Analyzing transaction results')
      console.log('CONTRACT_CALL: Transaction logs count:', receipt.logs.length)
      
      // Look for specific events to confirm operations
      let rtaNftMinted = false
      let ticketKioskDeployed = false
      
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
      const eventData = await this.getPublicClient().readContract({
        address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
        abi: EVENT_FACTORY_ABI,
        functionName: 'getEvent',
        args: [BigInt(expectedEventId)]
      })

      console.log('CONTRACT_CALL: Event creation completed successfully!')
      console.log('CONTRACT_CALL: ✅ Final verification results:')
      console.log('CONTRACT_CALL: - Event ID:', expectedEventId)
      console.log('CONTRACT_CALL: - Creator address:', eventData.creator)
      console.log('CONTRACT_CALL: - TicketKiosk address:', eventData.KioskAddress)
      console.log('CONTRACT_CALL: - Event finalized:', eventData.finalized)
      console.log('CONTRACT_CALL: - Metadata URI:', eventData.metadataURI)
      console.log('CONTRACT_CALL: - Start date:', new Date(Number(eventData.startDate) * 1000).toISOString())
      console.log('CONTRACT_CALL: - Reserve price:', formatEther(eventData.reservePrice), 'SEI')
      
      // Verify TicketKiosk is properly deployed
      if (eventData.KioskAddress && eventData.KioskAddress !== '0x0000000000000000000000000000000000000000') {
        console.log('CONTRACT_CALL: ✅ TicketKiosk deployed successfully at:', eventData.KioskAddress)
        ticketKioskDeployed = true
        
        // Test TicketKiosk is working
        try {
          const ticketKioskInfo = await this.getPublicClient().readContract({
            address: eventData.KioskAddress as `0x${string}`,
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
          
          console.log('CONTRACT_CALL: ✅ TicketKiosk operational verification:')
          console.log('CONTRACT_CALL: - Total tickets available:', ticketKioskInfo[0].toString())
          console.log('CONTRACT_CALL: - Tickets sold:', ticketKioskInfo[1].toString())
          console.log('CONTRACT_CALL: - Ticket price:', formatEther(ticketKioskInfo[3]), 'SEI')
          
        } catch (error) {
          console.warn('CONTRACT_CALL: ⚠️ Could not verify TicketKiosk functionality:', error)
        }
      }

              // Step 4: Generate streaming URLs directly (no backend needed)
        console.log('CONTRACT_CALL: Step 4 - Generating streaming URLs directly')
        
        const streamUrls = streamingService.generateStreamUrls(expectedEventId.toString())
        const roomUrl = streamingService.generateRoomUrl(expectedEventId.toString())

        console.log('CONTRACT_CALL: Stream URLs generated:', streamUrls)
        console.log('CONTRACT_CALL: Event room accessible at:', roomUrl)

        // Step 5: XMTP group already created and included in metadata above
        console.log('CONTRACT_CALL: Step 5 - XMTP group ID included in metadata:', xmtpGroupId || 'none')

        // Summary of operations
        console.log('CONTRACT_CALL: 🎉 Event creation summary:')
        console.log('CONTRACT_CALL: - RTA NFT minted:', rtaNftMinted ? '✅' : '⚠️')
        console.log('CONTRACT_CALL: - TicketKiosk deployed:', ticketKioskDeployed ? '✅' : '⚠️')
        console.log('CONTRACT_CALL: - Event room URL:', roomUrl)
        console.log('CONTRACT_CALL: - Transaction hash:', txHash)
        console.log('CONTRACT_CALL: - Block number:', receipt.blockNumber.toString())

        return {
          eventId: expectedEventId,
          creator: eventData.creator,
          startDate: Number(eventData.startDate),
          eventDuration: Number(eventData.eventDuration),
          reservePrice: formatEther(BigInt(eventData.reservePrice.toString())),
          metadataURI: eventData.metadataURI,
          artCategory: eventData.artCategory,
          ticketKioskAddress: eventData.KioskAddress, // Note: property name is KioskAddress, not ticketKioskAddress
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
      const eventData = await this.getPublicClient().readContract({
        address: CONTRACT_ADDRESSES.EventFactory as `0x${string}`,
        abi: EVENT_FACTORY_ABI,
        functionName: 'getEvent',
        args: [BigInt(eventId)]
      }) as any

      return {
        creator: eventData.creator,
        startDate: Number(eventData.startDate),
        eventDuration: Number(eventData.eventDuration),
        reservePrice: formatEther(BigInt(eventData.reservePrice.toString())),
        metadataURI: eventData.metadataURI,
        artCategory: eventData.artCategory,
        ticketKioskAddress: eventData.KioskAddress, // Use correct property name
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
      const total = await this.getPublicClient().readContract({
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