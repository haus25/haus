import { gql } from 'graphql-request'

// Use local API route to avoid CORS issues and protect API key
const SUBGRAPH_API_ENDPOINT = '/api/subgraph'

// Types matching the subgraph schema
export interface SubgraphEvent {
  id: string
  eventId: string
  creator: string
  startDate: string
  eventDuration: string
  reservePrice: string
  metadataURI: string
  artCategory: string
  kioskAddress: string
  finalized: boolean
  createdAtTimestamp: string
  ticketsSold: string
  totalRevenue: string
  highestTipper?: string
  finalizedAtTimestamp?: string
}

export interface SubgraphTicket {
  id: string
  ticketId: string
  eventId: string
  owner: string
  originalOwner: string
  purchasePrice: string
  purchaseTimestamp: string
  ticketName: string
  artCategory: string
  ticketNumber: string
  totalTickets: string
  mintedAtTimestamp: string
  transactionHash: string
  kioskAddress: {
    id: string
    address: string
  }
}

export interface SubgraphTicketKiosk {
  id: string
  address: string
  eventId: string
  creator: string
  ticketsAmount: string
  ticketPrice: string
  artCategory: string
  ticketsSold: string
  totalRevenue: string
  createdAtTimestamp: string
}

export interface SubgraphGlobalStats {
  id: string
  totalEvents: string
  totalTickets: string
  totalRevenue: string
  totalActiveEvents: string
  totalFinalizedEvents: string
  lastUpdatedTimestamp: string
}

// GraphQL Queries
const GET_EVENTS = gql`
  query GetEvents($first: Int = 100, $skip: Int = 0, $orderBy: String = "createdAtTimestamp", $orderDirection: String = "desc") {
    events(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      eventId
      creator
      startDate
      eventDuration
      reservePrice
      metadataURI
      artCategory
      kioskAddress
      finalized
      createdAtTimestamp
      ticketsSold
      totalRevenue
      highestTipper
      finalizedAtTimestamp
    }
  }
`

const GET_EVENT_BY_ID = gql`
  query GetEventById($eventId: String!) {
    events(where: { eventId: $eventId }) {
      id
      eventId
      creator
      startDate
      eventDuration
      reservePrice
      metadataURI
      artCategory
      kioskAddress
      finalized
      createdAtTimestamp
      ticketsSold
      totalRevenue
      highestTipper
      finalizedAtTimestamp
    }
  }
`

const GET_EVENTS_BY_CREATOR = gql`
  query GetEventsByCreator($creator: String!, $first: Int = 50) {
    events(
      where: { creator: $creator }
      first: $first
      orderBy: "createdAtTimestamp"
      orderDirection: "desc"
    ) {
      id
      eventId
      creator
      startDate
      eventDuration
      reservePrice
      metadataURI
      artCategory
      kioskAddress
      finalized
      createdAtTimestamp
      ticketsSold
      totalRevenue
      highestTipper
      finalizedAtTimestamp
    }
  }
`

const GET_TICKETS_BY_OWNER = gql`
  query GetTicketsByOwner($owner: String!, $first: Int = 50) {
    tickets(
      where: { owner: $owner }
      first: $first
      orderBy: "mintedAtTimestamp"
      orderDirection: "desc"
    ) {
      id
      ticketId
      eventId
      owner
      originalOwner
      purchasePrice
      purchaseTimestamp
      ticketName
      artCategory
      ticketNumber
      totalTickets
      mintedAtTimestamp
      transactionHash
      kioskAddress {
        id
        address
      }
    }
  }
`

const GET_TICKETS_BY_EVENT = gql`
  query GetTicketsByEvent($eventId: String!, $first: Int = 100) {
    tickets(
      where: { eventId: $eventId }
      first: $first
      orderBy: "mintedAtTimestamp"
      orderDirection: "asc"
    ) {
      id
      ticketId
      eventId
      owner
      originalOwner
      purchasePrice
      purchaseTimestamp
      ticketName
      artCategory
      ticketNumber
      totalTickets
      mintedAtTimestamp
      transactionHash
    }
  }
`

const GET_TICKET_KIOSKS = gql`
  query GetTicketKiosks($first: Int = 100) {
    ticketKiosks(
      first: $first
      orderBy: "createdAtTimestamp"
      orderDirection: "desc"
    ) {
      id
      address
      eventId
      creator
      ticketsAmount
      ticketPrice
      artCategory
      ticketsSold
      totalRevenue
      createdAtTimestamp
    }
  }
`

const GET_GLOBAL_STATS = gql`
  query GetGlobalStats {
    globalStats(first: 1) {
      id
      totalEvents
      totalTickets
      totalRevenue
      totalActiveEvents
      totalFinalizedEvents
      lastUpdatedTimestamp
    }
  }
`

// Helper function to query via local API route (avoids CORS issues)
async function querySubgraph<T>(query: string, variables?: any): Promise<T> {
  try {
    console.log('SUBGRAPH: Querying via local API route...')
    
    const response = await fetch(SUBGRAPH_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        // If we can't parse error response, use status text
      }
      console.error('SUBGRAPH: API route failed:', errorMessage)
      throw new Error(errorMessage)
    }

    const result = await response.json()
    
    if (result.error) {
      console.error('SUBGRAPH: API route returned error:', result.error)
      throw new Error(result.error)
    }

    if (!result.data) {
      console.error('SUBGRAPH: No data in API response:', result)
      throw new Error('No data returned from subgraph API')
    }

    console.log('SUBGRAPH: Local API query successful, source:', result.source)
    return result.data
  } catch (error: any) {
    console.error('SUBGRAPH: Local API query failed:', error.message)
    // Don't retry automatically - let calling code handle retries
    throw error
  }
}

// Service functions
export const subgraphService = {
  // Get all events with pagination
  async getEvents(options: {
    first?: number
    skip?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
  } = {}): Promise<SubgraphEvent[]> {
    try {
      const { first = 100, skip = 0, orderBy = 'createdAtTimestamp', orderDirection = 'desc' } = options
      console.log('SUBGRAPH: Querying events with options:', options)
      
      const data = await querySubgraph<{ events: SubgraphEvent[] }>(GET_EVENTS, {
        first,
        skip,
        orderBy,
        orderDirection
      })
      
      const events = data?.events || []
      console.log('SUBGRAPH: Retrieved', events.length, 'events from subgraph')
      
      if (events.length === 0) {
        console.log('SUBGRAPH: No events found - subgraph may still be indexing or no events exist on chain')
      }
      
      return events
    } catch (error) {
      console.error('SUBGRAPH: Error fetching events:', error)
      return []
    }
  },

  // Get a specific event by ID
  async getEventById(eventId: string): Promise<SubgraphEvent | null> {
    try {
      const data = await querySubgraph<{ events: SubgraphEvent[] }>(GET_EVENT_BY_ID, { eventId })
      return data.events[0] || null
    } catch (error) {
      console.error('SUBGRAPH: Error fetching event by ID:', error)
      return null
    }
  },

  // Get events created by a specific creator
  async getEventsByCreator(creator: string, first: number = 50): Promise<SubgraphEvent[]> {
    try {
      const data = await querySubgraph<{ events: SubgraphEvent[] }>(GET_EVENTS_BY_CREATOR, {
        creator: creator.toLowerCase(),
        first
      })
      return data.events
    } catch (error) {
      console.error('SUBGRAPH: Error fetching events by creator:', error)
      return []
    }
  },

  // Get tickets owned by a specific address
  async getTicketsByOwner(owner: string, first: number = 50): Promise<SubgraphTicket[]> {
    try {
      const data = await querySubgraph<{ tickets: SubgraphTicket[] }>(GET_TICKETS_BY_OWNER, {
        owner: owner.toLowerCase(),
        first
      })
      return data.tickets
    } catch (error) {
      console.error('SUBGRAPH: Error fetching tickets by owner:', error)
      return []
    }
  },

  // Get all tickets for a specific event
  async getTicketsByEvent(eventId: string, first: number = 100): Promise<SubgraphTicket[]> {
    try {
      const data = await querySubgraph<{ tickets: SubgraphTicket[] }>(GET_TICKETS_BY_EVENT, {
        eventId,
        first
      })
      return data.tickets
    } catch (error) {
      console.error('SUBGRAPH: Error fetching tickets by event:', error)
      return []
    }
  },

  // Get all ticket kiosks
  async getTicketKiosks(first: number = 100): Promise<SubgraphTicketKiosk[]> {
    try {
      const data = await querySubgraph<{ ticketKiosks: SubgraphTicketKiosk[] }>(GET_TICKET_KIOSKS, { first })
      return data.ticketKiosks
    } catch (error) {
      console.error('SUBGRAPH: Error fetching ticket kiosks:', error)
      return []
    }
  },

  // Get global platform statistics
  async getGlobalStats(): Promise<SubgraphGlobalStats | null> {
    try {
      const data = await querySubgraph<{ globalStats: SubgraphGlobalStats[] }>(GET_GLOBAL_STATS)
      return data.globalStats[0] || null
    } catch (error) {
      console.error('SUBGRAPH: Error fetching global stats:', error)
      return null
    }
  },

  // Health check - test if subgraph is accessible
  async healthCheck(): Promise<boolean> {
    try {
      const data = await querySubgraph<{ _meta: { block: { number: number } } }>(`
        query HealthCheck {
          _meta {
            block {
              number
            }
          }
        }
      `)
      console.log('SUBGRAPH: Health check passed, latest block:', data._meta.block.number)
      return true
    } catch (error) {
      console.error('SUBGRAPH: Health check failed:', error)
      return false
    }
  },

  // Health check function using local API route
  checkHealth
}

// Utility functions for data transformation
export const subgraphUtils = {
  // Convert BigInt strings to numbers for display
  formatBigIntString(value: string): number {
    return parseInt(value) || 0
  },

  // Convert timestamp to Date
  timestampToDate(timestamp: string): Date {
    return new Date(parseInt(timestamp) * 1000)
  },

  // Format Wei to SEI (18 decimals)
  weiToSei(wei: string): string {
    const value = BigInt(wei || '0')
    return (Number(value) / 1e18).toFixed(6)
  },

  // Check if event is live (started but not finalized)
  isEventLive(event: SubgraphEvent): boolean {
    const now = Date.now() / 1000
    const startTime = parseInt(event.startDate)
    const duration = parseInt(event.eventDuration)
    const endTime = startTime + duration
    
    return startTime <= now && now <= endTime && !event.finalized
  },

  // Check if event is upcoming
  isEventUpcoming(event: SubgraphEvent): boolean {
    const now = Date.now() / 1000
    const startTime = parseInt(event.startDate)
    
    return startTime > now
  },

  // Check if event is completed
  isEventCompleted(event: SubgraphEvent): boolean {
    const now = Date.now() / 1000
    const startTime = parseInt(event.startDate)
    const duration = parseInt(event.eventDuration)
    const endTime = startTime + duration
    
    return now > endTime || event.finalized
  }
}

// Health check function
async function checkHealth(): Promise<{ healthy: boolean; source?: string; blockNumber?: number; error?: string }> {
  try {
    const response = await fetch(SUBGRAPH_API_ENDPOINT, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { healthy: false, error: errorData.error || `HTTP ${response.status}` }
    }

    const result = await response.json()
    return result
  } catch (error: any) {
    return { healthy: false, error: error.message }
  }
}