import { xmtpChatService, type XMTPMessage } from "./xmtp"
import { loadUserProfile } from "./profile"

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

/**
 * Enhanced Chat Service with XMTP Integration
 * 
 * This service combines XMTP for real wallet-based messaging with system messages
 * for event activities (tips, joins, etc.). It does NOT handle user verification -
 * that's already done by the room access control.
 */
export class EventChatService {
  private messageCallbacks = new Map<string, (message: ChatMessage) => void>()
  private messageIdCounter = 1

  constructor() {
    console.log('CHAT: Event chat service initialized with XMTP integration')
  }

  /**
   * Initialize chat for an event room
   * @param eventId - The event ID
   * @param walletClient - User's wallet client (from wagmi)
   * @param userAddress - User's wallet address
   * @param participantAddresses - List of all participants (creator + ticket holders)
   * @param onMessage - Callback for new messages
   */
  async initializeEventChat(
    eventId: string,
    walletClient: any,
    userAddress: string,
    participantAddresses: string[],
    onMessage: (message: ChatMessage) => void
  ): Promise<ChatMessage[]> {
    console.log('CHAT: Initializing event chat for event:', eventId)
    console.log('CHAT: Participants:', participantAddresses.length)
    
    try {
      // Store message callback
      this.messageCallbacks.set(eventId, onMessage)
      
      // Initialize XMTP client
      await xmtpChatService.initializeClient(walletClient, userAddress)
      
      // Set up message callback
      xmtpChatService.setMessageCallback((xmtpMessage: XMTPMessage) => {
        const chatMessage = this.formatXMTPMessage(xmtpMessage)
        this.handleNewMessage(eventId, chatMessage)
      })
      
      // Get or create conversation for this event
      await xmtpChatService.getEventConversation(eventId, participantAddresses)
      
      // Load message history
      const history = await xmtpChatService.loadMessageHistory()
      const formattedHistory = history.map(msg => this.formatXMTPMessage(msg))
      
      console.log('CHAT: Event chat initialized successfully with', formattedHistory.length, 'historical messages')
      return formattedHistory
      
    } catch (error) {
      console.error('CHAT: Error initializing event chat:', error)
      throw error
    }
  }

  /**
   * Send a message via XMTP
   */
  async sendMessage(content: string): Promise<void> {
    try {
      await xmtpChatService.sendMessage(content)
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

  /**
   * Format XMTP message to chat message
   */
  private formatXMTPMessage(xmtpMessage: XMTPMessage): ChatMessage {
    return {
      id: this.messageIdCounter++,
      user: xmtpMessage.sender,
      message: xmtpMessage.content,
      timestamp: new Date(xmtpMessage.timestamp).toISOString(),
      isSystem: false,
      isTip: false
    }
  }

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
    
    this.messageCallbacks.delete(eventId)
    await xmtpChatService.disconnect()
  }

  /**
   * Check if XMTP is ready
   */
  isReady(): boolean {
    return xmtpChatService.isReady()
  }
}

// Export singleton instance
export const eventChatService = new EventChatService()

// Legacy functions for system messages (used by tipping service)
export function addTipMessage(eventId: string, userAddress: string, amount: number): void {
  eventChatService.addTipMessage(eventId, userAddress, amount)
}
