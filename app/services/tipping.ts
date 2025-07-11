import { ethers } from "ethers"
import { 
  createEthersProvider, 
  createContract, 
  handleContractError,
  validateSeiNetwork,
  formatSeiAmount,
  parseSeiAmount
} from "../lib/sei"
import { 
  CONTRACT_ADDRESSES, 
  LIVE_TIPPING_ABI 
} from "../lib/constants"

export interface TipData {
  eventId: string
  tipper: string
  amount: string // in SEI
  timestamp: number
  message?: string
}

/**
 * Send a tip to an event creator
 * @param eventId The ID of the event
 * @param amount The tip amount in SEI
 * @param message Optional tip message
 * @param signer The connected wallet signer
 * @returns Transaction hash
 */
export async function sendTip(
  eventId: string,
  amount: string,
  message: string = "",
  signer: ethers.Signer
): Promise<string> {
  try {
    if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
      throw new Error('Live Tipping contract address not configured')
    }

    // Validate network
    const network = await signer.provider?.getNetwork()
    if (network && !validateSeiNetwork(network.chainId)) {
      throw new Error('Please switch to Sei Testnet')
    }

    // Validate amount
    const tipAmount = parseFloat(amount)
    if (tipAmount <= 0) {
      throw new Error('Tip amount must be greater than 0')
    }

    const liveTippingContract = createContract(
      CONTRACT_ADDRESSES.LIVE_TIPPING,
      LIVE_TIPPING_ABI,
      signer
    )

    // Convert amount to wei
    const tipAmountWei = parseSeiAmount(amount)

    // Send tip transaction
    const tx = await liveTippingContract.tipCreator(eventId, message, {
      value: tipAmountWei
    })
    
    // Wait for transaction confirmation
    const receipt = await tx.wait()
    
    console.log(`Tip sent successfully: ${amount} SEI to event ${eventId}`)
    
    return tx.hash
  } catch (error) {
    console.error("Error sending tip:", error)
    handleContractError(error)
  }
}

/**
 * Get all tips for a specific event
 * @param eventId The ID of the event
 * @returns Array of tip data
 */
export async function getEventTips(eventId: string): Promise<TipData[]> {
  try {
    if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
      throw new Error('Live Tipping contract address not configured')
    }

    const provider = createEthersProvider()
    const liveTippingContract = createContract(
      CONTRACT_ADDRESSES.LIVE_TIPPING,
      LIVE_TIPPING_ABI,
      provider
    )

    // Get tip events from contract logs
    const filter = liveTippingContract.filters.TipSent(eventId)
    const events = await liveTippingContract.queryFilter(filter)

    // Format tip data
    const tips: TipData[] = events.map((event) => {
      const args = event.args
      return {
        eventId: args.eventId,
        tipper: args.tipper,
        amount: formatSeiAmount(args.amount),
        timestamp: args.timestamp.toNumber() * 1000, // Convert to milliseconds
        message: args.message || ""
      }
    })

    // Sort by timestamp (newest first)
    return tips.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error("Error fetching event tips:", error)
    return []
  }
}

/**
 * Get tip statistics for an event
 * @param eventId The ID of the event
 * @returns Tip statistics
 */
export async function getEventTipStats(eventId: string): Promise<{
  totalTips: string
  tipCount: number
  highestTip: string
  highestTipper: string
  averageTip: string
}> {
  try {
    if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
      throw new Error('Live Tipping contract address not configured')
    }

    const provider = createEthersProvider()
    const liveTippingContract = createContract(
      CONTRACT_ADDRESSES.LIVE_TIPPING,
      LIVE_TIPPING_ABI,
      provider
    )

    // Get tip statistics from contract
    const stats = await liveTippingContract.getEventTipStats(eventId)

    return {
      totalTips: formatSeiAmount(stats.totalAmount),
      tipCount: stats.tipCount.toNumber(),
      highestTip: formatSeiAmount(stats.highestTip),
      highestTipper: stats.highestTipper,
      averageTip: stats.tipCount.gt(0) 
        ? formatSeiAmount(stats.totalAmount.div(stats.tipCount))
        : "0"
    }
  } catch (error) {
    console.error("Error fetching tip statistics:", error)
    return {
      totalTips: "0",
      tipCount: 0,
      highestTip: "0",
      highestTipper: ethers.constants.AddressZero,
      averageTip: "0"
    }
  }
}

/**
 * Get all tips sent by a specific user
 * @param userAddress The address of the user
 * @returns Array of tip data
 */
export async function getUserTips(userAddress: string): Promise<TipData[]> {
  try {
    if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
      throw new Error('Live Tipping contract address not configured')
    }

    const provider = createEthersProvider()
    const liveTippingContract = createContract(
      CONTRACT_ADDRESSES.LIVE_TIPPING,
      LIVE_TIPPING_ABI,
      provider
    )

    // Get tip events from contract logs for this user
    const filter = liveTippingContract.filters.TipSent(null, userAddress)
    const events = await liveTippingContract.queryFilter(filter)

    // Format tip data
    const tips: TipData[] = events.map((event) => {
      const args = event.args
      return {
        eventId: args.eventId,
        tipper: args.tipper,
        amount: formatSeiAmount(args.amount),
        timestamp: args.timestamp.toNumber() * 1000, // Convert to milliseconds
        message: args.message || ""
      }
    })

    // Sort by timestamp (newest first)
    return tips.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error("Error fetching user tips:", error)
    return []
  }
}

/**
 * Get real-time tip stream for an event (using WebSocket or polling)
 * @param eventId The ID of the event
 * @param callback Function called when new tips arrive
 * @returns Cleanup function
 */
export function subscribeToEventTips(
  eventId: string,
  callback: (tip: TipData) => void
): () => void {
  try {
    if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
      throw new Error('Live Tipping contract address not configured')
    }

    const provider = createEthersProvider()
    const liveTippingContract = createContract(
      CONTRACT_ADDRESSES.LIVE_TIPPING,
      LIVE_TIPPING_ABI,
      provider
    )

    // Listen for new tip events
    const filter = liveTippingContract.filters.TipSent(eventId)
    
    const handleTipEvent = (eventId: string, tipper: string, amount: ethers.BigNumber, timestamp: ethers.BigNumber, message: string) => {
      const tipData: TipData = {
        eventId,
        tipper,
        amount: formatSeiAmount(amount),
        timestamp: timestamp.toNumber() * 1000,
        message: message || ""
      }
      callback(tipData)
    }

    // Start listening
    liveTippingContract.on(filter, handleTipEvent)

    // Return cleanup function
    return () => {
      liveTippingContract.off(filter, handleTipEvent)
    }
  } catch (error) {
    console.error("Error subscribing to tips:", error)
    return () => {} // Return empty cleanup function
  }
}

/**
 * Withdraw accumulated tips (for event creators)
 * @param eventId The ID of the event
 * @param signer The connected wallet signer
 * @returns Transaction hash
 */
export async function withdrawTips(
  eventId: string,
  signer: ethers.Signer
): Promise<string> {
  try {
    if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
      throw new Error('Live Tipping contract address not configured')
    }

    // Validate network
    const network = await signer.provider?.getNetwork()
    if (network && !validateSeiNetwork(network.chainId)) {
      throw new Error('Please switch to Sei Testnet')
    }

    const liveTippingContract = createContract(
      CONTRACT_ADDRESSES.LIVE_TIPPING,
      LIVE_TIPPING_ABI,
      signer
    )

    // Withdraw tips for the event
    const tx = await liveTippingContract.withdrawTips(eventId)
    
    // Wait for transaction confirmation
    await tx.wait()
    
    console.log(`Tips withdrawn successfully for event ${eventId}`)
    
    return tx.hash
  } catch (error) {
    console.error("Error withdrawing tips:", error)
    handleContractError(error)
  }
}
