import { 
  publicClient, 
  formatSeiAmount, 
  parseSeiAmount, 
  validateSeiNetwork,
  getLiveTippingConfig,
  waitForTransaction
} from "../lib/sei"
import { 
  CONTRACT_ADDRESSES, 
  TICKET_KIOSK_ABI 
} from "../lib/constants"
import LiveTippingABI from "../contracts/abis/LiveTipping.json"
import { readContract, writeContract, watchContractEvent } from '@wagmi/core'
import { wagmiConfig } from '../lib/sei'
import type { WalletClient } from 'viem'

export interface TipData {
  eventId: string
  tipper: string
  amount: string // in SEI
  timestamp: number
  message?: string
  tipId?: number
}

export interface EventTippingData {
  creator: string
  startDate: number
  endDate: number
  reservePrice: string
  totalTips: string
  highestTipper: string
  highestTip: string
  active: boolean
  finalized: boolean
}

/**
 * Send a tip to an event
 * @param eventId The ID of the event
 * @param amount The tip amount in SEI
 * @param message Optional tip message
 * @param walletClient The connected wallet client
 * @returns Transaction hash
 */
export async function sendTip(
  eventId: string,
  amount: string,
  message: string = "",
  walletClient: WalletClient
): Promise<string> {
  console.log('TIPPING: sendTip called with:', { eventId, amount, message })
  
  if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
    console.error('TIPPING: Live Tipping contract address not configured')
    throw new Error('Live Tipping contract address not configured')
  }

  console.log('TIPPING: Using contract address:', CONTRACT_ADDRESSES.LIVE_TIPPING)

  // Validate network
  const chainId = await walletClient.getChainId()
  console.log('TIPPING: Wallet chain ID:', chainId)
  if (!validateSeiNetwork(Number(chainId))) {
    throw new Error('Please switch to Sei Testnet')
  }

  // Validate amount
  const tipAmount = parseFloat(amount)
  if (tipAmount <= 0) {
    throw new Error('Tip amount must be greater than 0')
  }

  // Convert amount to wei
  const tipAmountWei = parseSeiAmount(amount)
  console.log('TIPPING: Amount in wei:', tipAmountWei.toString())

  try {
    console.log('TIPPING: Sending tip transaction directly (contract will validate timing)...')

    // Send tip transaction directly - let contract handle all validation
    const hash = await writeContract(wagmiConfig, {
      ...getLiveTippingConfig(LiveTippingABI),
      functionName: 'sendTip',
      args: [BigInt(eventId), message],
      value: tipAmountWei,
    })
    
    console.log('TIPPING: Transaction sent, waiting for confirmation...', hash)
    
    // Wait for transaction confirmation
    await waitForTransaction(publicClient, hash)
    
    console.log(`TIPPING: Tip sent successfully: ${amount} SEI to event ${eventId}`)
    
    return hash
  } catch (error) {
    console.error("TIPPING: Error sending tip:", error)
    
    // Provide better error messages based on the contract error type
    if (error instanceof Error) {
      if (error.message.includes('EventNotRegistered')) {
        throw new Error('Event is not registered for tipping yet.')
      }
      if (error.message.includes('EventNotStarted')) {
        throw new Error('Event has not started yet. Tipping will be available when the event begins.')
      }
      if (error.message.includes('EventEnded')) {
        throw new Error('Event has ended. Tipping is no longer available.')
      }
      if (error.message.includes('InvalidTipAmount')) {
        throw new Error('Invalid tip amount.')
      }
      if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient SEI balance for this tip.')
      }
      if (error.message.includes('user rejected')) {
        throw new Error('Transaction was cancelled.')
      }
    }
    
    throw new Error(`Failed to send tip: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get event tipping data
 * @param eventId The ID of the event
 * @returns Event tipping data
 */
export async function getEventTippingData(eventId: string): Promise<EventTippingData> {
  if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
    throw new Error('Live Tipping contract address not configured')
  }

  try {
      const result = await readContract(wagmiConfig, {
    ...getLiveTippingConfig(LiveTippingABI),
    functionName: 'getEventTippingData',
    args: [BigInt(eventId)],
  }) as [string, bigint, bigint, bigint, bigint, string, bigint, boolean, boolean]

    return {
      creator: result[0],
      startDate: Number(result[1]),
      endDate: Number(result[2]),
      reservePrice: formatSeiAmount(result[3]),
      totalTips: formatSeiAmount(result[4]),
      highestTipper: result[5],
      highestTip: formatSeiAmount(result[6]),
      active: result[7],
      finalized: result[8],
    }
  } catch (error) {
    console.error("Error fetching event tipping data:", error)
    throw new Error('Failed to fetch event tipping data')
  }
}

/**
 * Get all tips for a specific event
 * @param eventId The ID of the event
 * @returns Array of tip data
 */
export async function getEventTips(eventId: string): Promise<TipData[]> {
  if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
    throw new Error('Live Tipping contract address not configured')
  }

  try {
    const result = await readContract(wagmiConfig, {
      ...getLiveTippingConfig(LiveTippingABI),
      functionName: 'getEventTips',
      args: [BigInt(eventId)],
    }) as Array<[string, bigint, bigint, string]>

    // Format tip data
    const tips: TipData[] = result.map((tip, index) => ({
      eventId,
      tipper: tip[0],
      amount: formatSeiAmount(tip[1]),
      timestamp: Number(tip[2]) * 1000, // Convert to milliseconds
      message: tip[3] || "",
      tipId: index
    }))

    // Sort by timestamp (newest first)
    return tips.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error("Error fetching event tips:", error)
    return []
  }
}

/**
 * Get tipper's total for an event
 * @param eventId The ID of the event
 * @param tipperAddress The address of the tipper
 * @returns Tipper's total tips and count
 */
export async function getTipperTotal(eventId: string, tipperAddress: string): Promise<{
  totalTips: string
  tipCount: number
}> {
  if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
    throw new Error('Live Tipping contract address not configured')
  }

  try {
    const result = await readContract(wagmiConfig, {
      ...getLiveTippingConfig(LiveTippingABI),
      functionName: 'getTipperTotal',
      args: [BigInt(eventId), tipperAddress as `0x${string}`],
    }) as [bigint, bigint]

    return {
      totalTips: formatSeiAmount(result[0]),
      tipCount: Number(result[1])
    }
  } catch (error) {
    console.error("Error fetching tipper total:", error)
    return {
      totalTips: "0",
      tipCount: 0
    }
  }
}

/**
 * Check if event is currently tippable
 * @param eventId The ID of the event
 * @returns Whether the event is tippable
 */
export async function isEventTippable(eventId: string): Promise<boolean> {
  if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
    throw new Error('Live Tipping contract address not configured')
  }

  try {
    const result = await readContract(wagmiConfig, {
      ...getLiveTippingConfig(LiveTippingABI),
      functionName: 'isEventTippable',
      args: [BigInt(eventId)],
    }) as boolean

    return result
  } catch (error) {
    console.error("Error checking if event is tippable:", error)
    return false
  }
}

/**
 * Check if user has a ticket for the event
 * @param eventId The ID of the event
 * @param userAddress The user's address
 * @param ticketKioskAddress The ticket kiosk address for the event
 * @returns Whether the user has a ticket
 */
export async function hasTicketForEvent(
  eventId: string, 
  userAddress: string, 
  ticketKioskAddress: string
): Promise<boolean> {
  try {
    const result = await readContract(wagmiConfig, {
      address: ticketKioskAddress as `0x${string}`,
      abi: TICKET_KIOSK_ABI,
      functionName: 'hasTicketForEvent',
      args: [userAddress as `0x${string}`, BigInt(eventId)],
    }) as boolean

    return result
  } catch (error) {
    console.error("Error checking ticket ownership:", error)
    return false
  }
}



/**
 * Subscribe to real-time tip events for an event
 * @param eventId The ID of the event
 * @param callback Function called when new tips arrive
 * @returns Cleanup function
 */
export function subscribeToEventTips(
  eventId: string,
  callback: (tip: TipData) => void
): () => void {
  if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
    throw new Error('Live Tipping contract address not configured')
  }

  try {
    // Watch for TipReceived events
    const unwatch = watchContractEvent(wagmiConfig, {
      ...getLiveTippingConfig(LiveTippingABI),
      eventName: 'TipReceived',
      args: { eventId: BigInt(eventId) },
      onLogs: (logs) => {
        logs.forEach((log: any) => {
          // The log is properly typed from wagmi with decoded event data
          if (log.eventName === 'TipReceived' && log.args) {
            const tipData: TipData = {
              eventId: log.args.eventId?.toString() || eventId,
              tipper: log.args.tipper || '',
              amount: formatSeiAmount(log.args.amount || BigInt(0)),
              timestamp: Date.now(),
              message: log.args.message || '',
              tipId: Number(log.args.tipId || BigInt(0))
            }
            callback(tipData)
          }
        })
      },
    })

    return unwatch
  } catch (error) {
    console.error("Error subscribing to tips:", error)
    return () => {} // Return empty cleanup function
  }
}

/**
 * Subscribe to highest tipper changes for an event
 * @param eventId The ID of the event
 * @param callback Function called when highest tipper changes
 * @returns Cleanup function
 */
export function subscribeToHighestTipper(
  eventId: string,
  callback: (data: { previousHighest: string; newHighest: string; amount: string }) => void
): () => void {
  if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
    throw new Error('Live Tipping contract address not configured')
  }

  try {
    // Watch for NewHighestTipper events
    const unwatch = watchContractEvent(wagmiConfig, {
      ...getLiveTippingConfig(LiveTippingABI),
      eventName: 'NewHighestTipper',
      args: { eventId: BigInt(eventId) },
      onLogs: (logs) => {
        logs.forEach((log: any) => {
          // The log is properly typed from wagmi with decoded event data
          if (log.eventName === 'NewHighestTipper' && log.args) {
            callback({
              previousHighest: log.args.previousHighest || '',
              newHighest: log.args.newHighest || '',
              amount: formatSeiAmount(log.args.amount || BigInt(0))
            })
          }
        })
      },
    })

    return unwatch
  } catch (error) {
    console.error("Error subscribing to highest tipper changes:", error)
    return () => {}
  }
}