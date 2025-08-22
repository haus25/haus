import { loadUserProfile } from "./profile"
import { XMTP } from "../lib/xmtp"
import { TicketGateError } from "./tickets"
import type { WalletClient } from "viem"

// Types for chat messages - matches EventChat component interface
export interface ChatMessage {
  id: number
  user: string
  message: string
  timestamp: string
  isSystem?: boolean
  isTip?: boolean
  tipAmount?: number
}

// Types for system events
export interface SystemEvent {
  type: "user_joined" | "tip_sent" | "reserve_hit" | "stream_started" | "stream_ended"
  eventId: string
  data: any
}

// Stream management
let streams: Record<string, { stop: () => void }> = {}

/**
 * Chat Service with Proper XMTP Streaming Pattern
 * 
 * Uses joinEventGroup with getConversationById and real-time streaming
 */
export class EventChatService {
  private messageCallbacks = new Map<string, (message: ChatMessage) => void>()
  private messageIdCounter = 1

  constructor() {
    console.log('Chat service initialized with proper XMTP streaming')
  }

  /**
   * Initialize event chat using proper XMTP joinEventGroup pattern
   */
  async initializeEventChat(
    eventId: string,
    wallet: WalletClient,
    userAddress: string,
    isCreator: boolean,
    onMessage: (message: ChatMessage) => void,
    ticketKioskAddress?: string
  ): Promise<ChatMessage[]> {
    console.log('CHAT: 🗨️ Initializing event chat with proper XMTP pattern')
    console.log('CHAT: Event ID:', eventId)
    console.log('CHAT: User address:', userAddress)
    console.log('CHAT: User role:', isCreator ? 'Creator' : 'Participant')
    
    try {
      // Store message callback for system messages
      this.messageCallbacks.set(eventId, onMessage)
      
      // Use proper XMTP joinEventGroup pattern
      const { group, stop } = await XMTP.joinEventGroup(
        eventId,
        wallet,
        userAddress,
        (msg) => {
          const chatMessage = this.formatXMTPMessage(msg)
          this.handleNewMessage(eventId, chatMessage)
        }
      )

      console.log('CHAT: ✅ Successfully joined group and started streaming')

      // Load message history (last 50 messages) with proper BigInt
      const history: ChatMessage[] = []
      try {
        // Use XMTP.getMessages with BigInt limit to avoid BigInt conversion error
        const messages = await XMTP.getMessages(eventId, userAddress, { limit: BigInt(50) })
        for (const m of messages) {
          history.push(this.formatXMTPMessage(m))
        }
        history.reverse() // Show oldest first
        console.log('CHAT: 📜 Loaded', history.length, 'historical messages')
      } catch (historyError) {
        console.warn('CHAT: Could not load message history:', historyError)
      }

      // Store stream stopper to clean up on unmount
      streams[eventId]?.stop?.()
      streams[eventId] = { stop }

      console.log('CHAT: 🎉 Event chat initialized successfully with streaming!')
      return history
      
    } catch (error) {
      console.error('CHAT: 🚫 ERROR initializing event chat:', error)
      
      // Differentiate real ticket failures from runtime errors
      if (error instanceof Error) {
        if (error.message === 'no_chat_registered') {
          throw new Error('Event chat not yet available - creator needs to start the stream first')
        } else if (error.message === 'not_invited_yet') {
          // This is a genuine ticket gating issue
          throw new TicketGateError('You need a valid ticket to join this event chat')
        } else if (error.message.includes('client')) {
          throw new Error('Chat service initialization failed - please refresh and try again')
        }
      }
      
      // Bubble the real error so we can see what actually broke
      throw new Error(`Event chat failed: ${error instanceof Error ? error.message : error}`)
    }
  }

  /**
   * Send a message via XMTP (uses the already-joined group)
   */
  async sendMessage(content: string, userAddress?: string): Promise<void> {
    try {
      // Find the current event ID (assuming single active chat)
      const eventId = Array.from(this.messageCallbacks.keys())[0]
      if (!eventId) {
        console.error('CHAT: No active event chat found')
        return
      }

      // Get the group from the active stream
      const stream = streams[eventId]
      if (!stream) {
        console.error('CHAT: No active stream found for event:', eventId)
        return
      }

      // Send via XMTP (this will use the joined group)
      await XMTP.sendMessage(eventId, content, userAddress || '')
      console.log('CHAT: ✅ Message sent successfully')
      
    } catch (error) {
      console.error('CHAT: Error sending message:', error)
      throw error
    }
  }

  /**
   * Add a system message (not sent via XMTP)
   */
  addSystemMessage(eventId: string, message: string, type?: "tip" | "join" | "reserve"): void {
    const systemMessage: ChatMessage = {
      id: this.messageIdCounter++,
      user: "System",
      message,
      timestamp: new Date().toISOString(),
      isSystem: true,
      isTip: type === "tip"
    }
    
    this.handleNewMessage(eventId, systemMessage)
  }

  /**
   * Add system message for user joining
   */
  addUserJoinedMessage(eventId: string, userAddress: string): void {
    this.loadUserDisplayName(userAddress).then(displayName => {
      this.addSystemMessage(eventId, `${displayName} joined the room`, "join")
    })
  }

  /**
   * Add system message for tip
   */
  addTipMessage(eventId: string, userAddress: string, amount: number): void {
    this.loadUserDisplayName(userAddress).then(displayName => {
      this.addSystemMessage(eventId, `${displayName} tipped ${amount} SEI`, "tip")
    })
  }

  /**
   * Add system message for reserve price hit
   */
  addReservePriceHitMessage(eventId: string): void {
    this.addSystemMessage(eventId, "🎉 Reserve price reached! Event is now live!", "reserve")
  }

  // REMOVED: Duplicate formatXMTPMessage function

  /**
   * Handle new message and call callback
   */
  private handleNewMessage(eventId: string, message: ChatMessage): void {
    const callback = this.messageCallbacks.get(eventId)
    if (callback) {
      callback(message)
    }
  }

  /**
   * Load user display name from profile or use wallet address
   */
  private async loadUserDisplayName(address: string): Promise<string> {
    try {
      const profile = await loadUserProfile(address)
      if (profile) {
        return profile.displayName || profile.name
      }
    } catch (error) {
      console.warn('CHAT: Could not load profile for:', address)
    }
    
    // Fallback to shortened wallet address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  /**
   * Disconnect from event chat
   */
  async disconnect(eventId: string): Promise<void> {
    console.log('CHAT: Disconnecting from event chat:', eventId)
    
    // Stop the stream
    streams[eventId]?.stop?.()
    delete streams[eventId]
    
    // Clear message callback
    this.messageCallbacks.delete(eventId)
  }

  /**
   * Check if XMTP is ready
   */
  isReady(): boolean {
    return XMTP.isReady()
  }

  /**
   * Format XMTP message to chat message
   */
  private formatXMTPMessage(xmtpMessage: any): ChatMessage {
    return {
      id: this.messageIdCounter++,
      user: xmtpMessage.senderAddress || 'Unknown',
      message: xmtpMessage.content || '',
      timestamp: new Date(xmtpMessage.sentAt || Date.now()).toISOString(),
      isSystem: false,
      isTip: false
    }
  }
}

// Export singleton instance
export const eventChatService = new EventChatService()

// Legacy functions for system messages (used by tipping service)
export function addTipMessage(eventId: string, userAddress: string, amount: number): void {
  eventChatService.addTipMessage(eventId, userAddress, amount)
}
