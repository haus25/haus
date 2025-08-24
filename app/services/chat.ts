"use client"

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
 * Simple Chat Service (XMTP removed)
 * 
 * This service provides basic chat functionality with system messages
 * for event activities (tips, joins, etc.). Real-time messaging via XMTP 
 * has been removed to simplify the build.
 */
export class EventChatService {
  private messageCallbacks = new Map<string, (message: ChatMessage) => void>()
  private messageIdCounter = 1
  private eventMessages = new Map<string, ChatMessage[]>()

  constructor() {
    console.log('CHAT: Event chat service initialized')
  }

  /**
   * Initialize chat for an event room (simplified)
   * @param eventId - The event ID
   * @param walletClient - User's wallet client (unused in simplified version)
   * @param userAddress - User's wallet address
   * @param participantAddresses - List of all participants (unused in simplified version)
   * @param onMessage - Callback for new messages
   */
  async initializeEventChat(
    eventId: string,
    walletClient: any,
    userAddress: string,
    participantAddresses: string[],
    onMessage: (message: ChatMessage) => void
  ): Promise<ChatMessage[]> {
    console.log('CHAT: Initializing simplified chat for event:', eventId)
    
    try {
      // Store message callback
      this.messageCallbacks.set(eventId, onMessage)
      
      // Initialize empty message history for this event
      if (!this.eventMessages.has(eventId)) {
        this.eventMessages.set(eventId, [])
      }
      
      const history = this.eventMessages.get(eventId) || []
      
      console.log('CHAT: Simplified chat initialized with', history.length, 'messages')
      return history
      
    } catch (error) {
      console.error('CHAT: Error initializing event chat:', error)
      throw error
    }
  }

  /**
   * Send a message (simplified - no XMTP)
   */
  async sendMessage(content: string): Promise<void> {
    console.log('CHAT: Message sending disabled (XMTP removed)')
    // In simplified version, we don't actually send messages
    // This could be extended to use a different messaging system
  }

  /**
   * Add a system message
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
   * Handle new message and call callback
   */
  private handleNewMessage(eventId: string, message: ChatMessage): void {
    // Store message in event history
    const messages = this.eventMessages.get(eventId) || []
    messages.push(message)
    this.eventMessages.set(eventId, messages)
    
    // Call callback if available
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
    // Don't delete message history - keep it for re-connections
  }

  /**
   * Check if chat is ready (always true in simplified version)
   */
  isReady(): boolean {
    return true
  }
}

// Export singleton instance
export const eventChatService = new EventChatService()

// Legacy functions for system messages (used by tipping service)
export function addTipMessage(eventId: string, userAddress: string, amount: number): void {
  eventChatService.addTipMessage(eventId, userAddress, amount)
}