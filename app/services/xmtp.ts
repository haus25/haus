"use client"

import { loadUserProfile } from "./profile"

// Types for XMTP messaging
export interface XMTPMessage {
  id: string
  sender: string
  senderAddress: string
  content: string
  timestamp: number
  isSelf: boolean
}

export interface XMTPChatParticipant {
  address: string
  username: string
  displayName?: string
  avatar?: string
}

/**
 * Simplified XMTP-Compatible Chat Service
 * 
 * Due to XMTP Browser SDK limitations (database conflicts, signature requirements),
 * this implements a minimal wallet-based chat that's compatible with XMTP but
 * works within browser constraints. The service can be easily upgraded to full
 * XMTP when browser support improves.
 */
export class XMTPChatService {
  private isInitialized = false
  private messageCallback: ((message: XMTPMessage) => void) | null = null
  private participantsCache = new Map<string, XMTPChatParticipant>()
  private currentEventId: string | null = null
  private userAddress: string | null = null
  private messageIdCounter = 1

  constructor() {
    console.log('XMTP: Simplified chat service initialized')
  }

  /**
   * Initialize simplified chat client (no signatures required)
   */
  async initializeClient(walletClient: any, userAddress: string): Promise<void> {
    try {
      console.log('XMTP: Initializing simplified chat for address:', userAddress)
      
      // Store user info without requiring additional signatures
      this.userAddress = userAddress.toLowerCase()
      this.isInitialized = true
      
      console.log('XMTP: Simplified chat initialized successfully')
      
    } catch (error) {
      console.error('XMTP: Failed to initialize chat:', error)
      throw new Error(`Failed to initialize chat: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Setup event conversation (simplified implementation)
   */
  async getEventConversation(eventId: string, participantAddresses: string[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Chat service not initialized')
    }

    try {
      console.log('XMTP: Setting up event conversation for eventId:', eventId)
      
      // Store event context
      this.currentEventId = eventId
      
      // Cache participant info for display
      for (const address of participantAddresses) {
        if (!this.participantsCache.has(address.toLowerCase())) {
          const participant = await this.getParticipantInfo(address.toLowerCase())
          this.participantsCache.set(address.toLowerCase(), participant)
        }
      }
      
      console.log('XMTP: Event conversation ready with', participantAddresses.length, 'participants')
      
    } catch (error) {
      console.error('XMTP: Error setting up event conversation:', error)
      throw error
    }
  }

  /**
   * Format message for display (simplified)
   */
  private async formatMessage(senderAddress: string, content: string, timestamp?: number): Promise<XMTPMessage> {
    const isSelf = this.userAddress === senderAddress.toLowerCase()
    
    // Get participant info from cache or fetch from profile
    let participant = this.participantsCache.get(senderAddress.toLowerCase())
    if (!participant) {
      participant = await this.getParticipantInfo(senderAddress.toLowerCase())
      this.participantsCache.set(senderAddress.toLowerCase(), participant)
    }
    
    return {
      id: `msg-${this.messageIdCounter++}-${Date.now()}`,
      sender: participant.username,
      senderAddress: senderAddress.toLowerCase(),
      content,
      timestamp: timestamp || Date.now(),
      isSelf
    }
  }

  /**
   * Get participant information (username from profile or wallet address)
   */
  private async getParticipantInfo(address: string): Promise<XMTPChatParticipant> {
    try {
      // Try to load user profile from Pinata IPFS
      const profile = await loadUserProfile(address)
      
      if (profile) {
        return {
          address,
          username: profile.displayName || profile.name,
          displayName: profile.displayName,
          avatar: profile.avatar || undefined
        }
      }
    } catch (error) {
      console.warn('XMTP: Could not load profile for address:', address)
    }
    
    // Fallback to shortened wallet address
    return {
      address,
      username: `${address.slice(0, 6)}...${address.slice(-4)}`
    }
  }

  /**
   * Send a message (simplified - broadcasts to local listeners)
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.isInitialized || !this.userAddress) {
      throw new Error('Chat service not initialized')
    }
    
    try {
      console.log('XMTP: Sending message:', content)
      
      // Format and broadcast message locally
      const message = await this.formatMessage(this.userAddress, content)
      
      if (this.messageCallback) {
        this.messageCallback(message)
      }
      
      console.log('XMTP: Message sent successfully')
      
      // TODO: In a full implementation, this would send via XMTP network
      // For now, this demonstrates the structure and works for local testing
      
    } catch (error) {
      console.error('XMTP: Error sending message:', error)
      throw error
    }
  }

  /**
   * Load message history (simplified - returns empty for now)
   */
  async loadMessageHistory(): Promise<XMTPMessage[]> {
    try {
      console.log('XMTP: Loading message history (simplified)')
      
      // In a full XMTP implementation, this would fetch from XMTP network
      // For now, return empty array as this is handled by system messages
      return []
      
    } catch (error) {
      console.error('XMTP: Error loading message history:', error)
      return []
    }
  }

  /**
   * Set callback for new messages
   */
  setMessageCallback(callback: (message: XMTPMessage) => void): void {
    this.messageCallback = callback
  }

  /**
   * Disconnect from chat
   */
  async disconnect(): Promise<void> {
    try {
      console.log('XMTP: Disconnecting chat service')
      
      this.messageCallback = null
      this.currentEventId = null
      this.userAddress = null
      this.participantsCache.clear()
      this.isInitialized = false
      
      console.log('XMTP: Disconnected successfully')
      
    } catch (error) {
      console.error('XMTP: Error during disconnect:', error)
    }
  }

  /**
   * Check if client is ready
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Get user address (instead of inbox ID)
   */
  getInboxId(): string | null {
    return this.userAddress
  }
}

// Export singleton instance
export const xmtpChatService = new XMTPChatService()
