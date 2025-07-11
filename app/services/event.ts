import { ethers } from "ethers"
import { 
  createEthersProvider, 
  createContract, 
  handleContractError,
  validateSeiNetwork 
} from "../lib/sei"
import { 
  CONTRACT_ADDRESSES, 
  EVENT_FACTORY_ABI, 
  TICKET_FACTORY_ABI 
} from "../lib/constants"

/**
 * Fetches an event from the Sei blockchain
 * @param eventId The ID of the event to fetch
 * @returns The event data
 */
export async function fetchEvent(eventId: string): Promise<any> {
  try {
    if (!CONTRACT_ADDRESSES.EVENT_FACTORY) {
      throw new Error('Event Factory contract address not configured')
    }

    const provider = createEthersProvider()
    const eventFactoryContract = createContract(
      CONTRACT_ADDRESSES.EVENT_FACTORY,
      EVENT_FACTORY_ABI,
      provider
    )

    // Call the contract to get event data
    const eventData = await eventFactoryContract.getEvent(eventId)
    
    // Format the event data to match expected interface
    return {
      id: eventId,
      name: eventData.title,
      description: eventData.description,
      category: eventData.category || "general",
      artist: eventData.creator,
      status: getEventStatusFromContract(eventData.status),
      ticketPrice: parseFloat(ethers.utils.formatEther(eventData.ticketPrice)),
      ticketsAmount: eventData.maxTickets?.toNumber() || 0,
      ticketsSold: eventData.ticketsSold?.toNumber() || 0,
      startTime: eventData.startTime?.toNumber() * 1000, // Convert to milliseconds
      duration: eventData.duration?.toNumber() || 0,
      totalTips: parseFloat(ethers.utils.formatEther(eventData.totalTips || 0)),
      highestTipper: eventData.highestTipper || ethers.constants.AddressZero,
      highestTipAmount: parseFloat(ethers.utils.formatEther(eventData.highestTipAmount || 0)),
      contentUri: eventData.metadataURI || null,
    }
  } catch (error) {
    console.error("Error fetching event:", error)
    handleContractError(error)
  }
}

/**
 * Verifies if a user has a ticket for an event
 * @param eventId The ID of the event
 * @param userAddress The address of the user
 * @returns True if the user has a ticket, false otherwise
 */
export async function verifyTicket(eventId: string, userAddress: string): Promise<boolean> {
  try {
    if (!CONTRACT_ADDRESSES.TICKET_FACTORY) {
      throw new Error('Ticket Factory contract address not configured')
    }

    const provider = createEthersProvider()
    const ticketFactoryContract = createContract(
      CONTRACT_ADDRESSES.TICKET_FACTORY,
      TICKET_FACTORY_ABI,
      provider
    )

    // Check if user has a valid ticket for this event
    const hasTicket = await ticketFactoryContract.hasValidTicket(eventId, userAddress)
    return hasTicket
  } catch (error) {
    console.error("Error verifying ticket:", error)
    return false
  }
}

/**
 * Updates the content URI for an event (requires event creator)
 * @param eventId The ID of the event
 * @param contentUri The new content URI (IPFS hash)
 * @param signer The connected wallet signer
 * @returns Transaction hash
 */
export async function updateEventContent(
  eventId: string, 
  contentUri: string, 
  signer: ethers.Signer
): Promise<string> {
  try {
    if (!CONTRACT_ADDRESSES.EVENT_FACTORY) {
      throw new Error('Event Factory contract address not configured')
    }

    // Validate network
    const network = await signer.provider?.getNetwork()
    if (network && !validateSeiNetwork(network.chainId)) {
      throw new Error('Please switch to Sei Testnet')
    }

    const eventFactoryContract = createContract(
      CONTRACT_ADDRESSES.EVENT_FACTORY,
      EVENT_FACTORY_ABI,
      signer
    )

    // Format URI with IPFS prefix if needed
    const formattedUri = contentUri.startsWith('ipfs://') 
      ? contentUri 
      : `ipfs://${contentUri}`

    // Call updateEventContent function
    const tx = await eventFactoryContract.updateEventContent(eventId, formattedUri)
    
    // Wait for transaction confirmation
    await tx.wait()
    
    return tx.hash
  } catch (error) {
    console.error("Error updating event content:", error)
    handleContractError(error)
  }
}

/**
 * Creates a new event on the Sei blockchain
 * @param eventParams Event creation parameters
 * @param signer The connected wallet signer
 * @returns Transaction hash
 */
export async function createEvent(
  eventParams: {
    title: string
    description: string
    startTime: Date
    duration: number // in seconds
    maxTickets: number
    ticketPrice: string // in SEI
    metadataURI?: string
  },
  signer: ethers.Signer
): Promise<string> {
  try {
    if (!CONTRACT_ADDRESSES.EVENT_FACTORY) {
      throw new Error('Event Factory contract address not configured')
    }

    // Validate network
    const network = await signer.provider?.getNetwork()
    if (network && !validateSeiNetwork(network.chainId)) {
      throw new Error('Please switch to Sei Testnet')
    }

    const eventFactoryContract = createContract(
      CONTRACT_ADDRESSES.EVENT_FACTORY,
      EVENT_FACTORY_ABI,
      signer
    )

    // Convert parameters to contract format
    const startTimeUnix = Math.floor(eventParams.startTime.getTime() / 1000)
    const ticketPriceWei = ethers.utils.parseEther(eventParams.ticketPrice)

    // Call createEvent function
    const tx = await eventFactoryContract.createEvent(
      eventParams.title,
      eventParams.description,
      startTimeUnix,
      eventParams.duration,
      eventParams.maxTickets,
      ticketPriceWei,
      eventParams.metadataURI || ""
    )
    
    // Wait for transaction confirmation
    await tx.wait()
    
    return tx.hash
  } catch (error) {
    console.error("Error creating event:", error)
    handleContractError(error)
  }
}

/**
 * Buys a ticket for an event
 * @param eventId The ID of the event
 * @param signer The connected wallet signer
 * @returns Transaction hash
 */
export async function buyTicket(
  eventId: string,
  signer: ethers.Signer
): Promise<string> {
  try {
    if (!CONTRACT_ADDRESSES.TICKET_FACTORY) {
      throw new Error('Ticket Factory contract address not configured')
    }

    // Validate network
    const network = await signer.provider?.getNetwork()
    if (network && !validateSeiNetwork(network.chainId)) {
      throw new Error('Please switch to Sei Testnet')
    }

    // First get the ticket price from the event
    const eventData = await fetchEvent(eventId)
    if (!eventData) {
      throw new Error('Event not found')
    }

    const ticketFactoryContract = createContract(
      CONTRACT_ADDRESSES.TICKET_FACTORY,
      TICKET_FACTORY_ABI,
      signer
    )

    // Call buyTicket function with payment
    const ticketPriceWei = ethers.utils.parseEther(eventData.ticketPrice.toString())
    const tx = await ticketFactoryContract.buyTicket(eventId, {
      value: ticketPriceWei
    })
    
    // Wait for transaction confirmation
    await tx.wait()
    
    return tx.hash
  } catch (error) {
    console.error("Error buying ticket:", error)
    handleContractError(error)
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
    if (!CONTRACT_ADDRESSES.EVENT_FACTORY) {
      throw new Error('Event Factory contract address not configured')
    }

    const provider = createEthersProvider()
    const eventFactoryContract = createContract(
      CONTRACT_ADDRESSES.EVENT_FACTORY,
      EVENT_FACTORY_ABI,
      provider
    )

    // Get total event count
    const totalEvents = await eventFactoryContract.getTotalEvents()
    const total = totalEvents.toNumber()

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
        console.warn(`Failed to fetch event ${i}:`, error)
      }
    }

    return events
  } catch (error) {
    console.error("Error fetching all events:", error)
    return []
  }
}
