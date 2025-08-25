"use client"

import { io, Socket } from 'socket.io-client'
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
  userRole?: 'creator' | 'participant' | 'admin'
  userAvatar?: string
}

// Types for system events
export interface SystemEvent {
  type: "user_joined" | "user_left" | "tip_sent" | "reserve_hit" | "stream_started" | "stream_ended"
  eventId: string
  userAddress?: string
  data: any
}

/**
 * Real-time Chat Service using WebSocket
 * 
 * Connects to the Node.js chat server for real-time messaging
 * Integrates with room system for event-based chat rooms
 */
export class EventChatService {
  private socket: Socket | null = null
  private messageCallbacks = new Map<string, (message: ChatMessage) => void>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private isConnecting = false

  constructor() {
    console.log('CHAT: Real-time chat service initialized')
  }

  /**
   * Connect to WebSocket server and initialize chat for event room
   * @param eventId - The event ID from create.ts
   * @param walletClient - User's wallet client 
   * @param userAddress - User's wallet address
   * @param isCreator - Whether user is the event creator (from create.ts)
   * @param startDate - Event start timestamp (from create.ts)
   * @param endDate - Event end timestamp (startDate + duration from create.ts)
   * @param creatorAddress - Event creator address (from create.ts)
   * @param onMessage - Callback for new messages
   */
  async initializeEventChat(
    eventId: string,
    walletClient: any,
    userAddress: string,
    isCreator: boolean,
    startDate: number,
    endDate: number,
    creatorAddress: string,
    onMessage: (message: ChatMessage) => void
  ): Promise<ChatMessage[]> {
    console.log('CHAT: Initializing WebSocket chat for event:', eventId)
    console.log('CHAT: User role:', isCreator ? 'creator' : 'participant')
    console.log('CHAT: Event timing:', { startDate, endDate })
    
    try {
      // Store message callback
      this.messageCallbacks.set(eventId, onMessage)
      
      // Connect to WebSocket server
      await this.connectToServer(eventId, userAddress, isCreator, startDate, endDate, creatorAddress)
      
      // Return empty array - messages will come via WebSocket
      return []
      
    } catch (error) {
      console.error('CHAT: Error initializing WebSocket chat:', error)
      throw error
    }
  }

  /**
   * Connect to the WebSocket chat server
   */
  private async connectToServer(
    eventId: string,
    userAddress: string,
    isCreator: boolean,
    startDate: number,
    endDate: number,
    creatorAddress: string
  ): Promise<void> {
    if (this.isConnecting || this.socket?.connected) {
      console.log('CHAT: Already connecting or connected')
      return
    }

    this.isConnecting = true
    const chatServerUrl = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL || 'https://chat.haus25.live'
    
    console.log('CHAT: Connecting to server:', chatServerUrl)
    
    this.socket = io(chatServerUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: false
    })

    this.socket.on('connect', () => {
      console.log('CHAT: Connected to WebSocket server')
      this.reconnectAttempts = 0
      this.isConnecting = false
      
      // Join the event room
      this.socket!.emit('join_room', {
        eventId,
        userAddress,
        isCreator,
        startDate,
        endDate,
        creatorAddress
      })
    })

    this.socket.on('disconnect', () => {
      console.log('CHAT: Disconnected from WebSocket server')
      this.isConnecting = false
      this.handleReconnect(eventId, userAddress, isCreator, startDate, endDate, creatorAddress)
    })

    this.socket.on('error', (error) => {
      console.error('CHAT: WebSocket error:', error)
      this.isConnecting = false
    })

    this.socket.on('joined_room', (data) => {
      console.log('CHAT: Successfully joined room:', data)
    })

    this.socket.on('new_message', async (data: any) => {
      console.log('CHAT: New message received:', data)
      
      // Convert server message to ChatMessage format with full profile data
      const userProfile = await this.loadFullUserProfile(data.userAddress)
      const chatMessage: ChatMessage = {
        id: Date.now(), // Convert string ID to number
        user: userProfile.displayName,
        message: data.message,
        timestamp: data.timestamp,
        isSystem: false,
        userRole: data.isCreator ? 'creator' : 'participant',
        userAvatar: userProfile.avatar
      }
      
      const callback = this.messageCallbacks.get(eventId)
      if (callback) {
        callback(chatMessage)
      }
    })
  }

  /**
   * Handle WebSocket reconnection
   */
  private handleReconnect(
    eventId: string,
    userAddress: string,
    isCreator: boolean,
    startDate: number,
    endDate: number,
    creatorAddress: string
  ): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('CHAT: Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)
    
    console.log(`CHAT: Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      this.connectToServer(eventId, userAddress, isCreator, startDate, endDate, creatorAddress)
    }, delay)
  }

  /**
   * Send a message via WebSocket
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      console.error('CHAT: Not connected to WebSocket server')
      throw new Error('Not connected to chat server')
    }

    if (!content || content.trim().length === 0) {
      return
    }

    console.log('CHAT: Sending message via WebSocket:', content)
    this.socket.emit('send_message', { message: content.trim() })
  }

  /**
   * Add a system message
   */
  addSystemMessage(eventId: string, message: string, type?: "tip" | "join" | "reserve"): void {
    const systemMessage: ChatMessage = {
      id: Date.now(),
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
    this.loadFullUserProfile(userAddress).then(userProfile => {
      this.addSystemMessage(eventId, `${userProfile.displayName} joined the room`, "join")
    })
  }

  /**
   * Add system message for tip
   */
  addTipMessage(eventId: string, userAddress: string, amount: number): void {
    this.loadFullUserProfile(userAddress).then(userProfile => {
      this.addSystemMessage(eventId, `${userProfile.displayName} tipped ${amount} SEI`, "tip")
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
    const callback = this.messageCallbacks.get(eventId)
    if (callback) {
      callback(message)
    }
  }

  /**
   * Load full user profile data from Pinata IPFS
   */
  private async loadFullUserProfile(address: string): Promise<{
    displayName: string
    avatar?: string
  }> {
    try {
      const profile = await loadUserProfile(address)
      if (profile) {
        return {
          displayName: profile.displayName || profile.name,
          avatar: profile.avatar || undefined
        }
      }
    } catch (error) {
      console.warn('CHAT: Could not load profile for:', address)
    }
    
    // Fallback to shortened wallet address with no avatar
    return {
      displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
      avatar: undefined
    }
  }

  /**
   * Load user display name from profile or use wallet address
   */
  private async loadUserDisplayName(address: string): Promise<string> {
    const profileData = await this.loadFullUserProfile(address)
    return profileData.displayName
  }

  /**
   * Disconnect from event chat
   */
  async disconnect(eventId: string): Promise<void> {
    console.log('CHAT: Disconnecting from event chat:', eventId)
    
    this.messageCallbacks.delete(eventId)
    
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  /**
   * Check if chat is ready
   */
  isReady(): boolean {
    return this.socket?.connected || false
  }
}

// Export singleton instance
export const eventChatService = new EventChatService()

// Legacy functions for system messages (used by tipping service)
export function addTipMessage(eventId: string, userAddress: string, amount: number): void {
  eventChatService.addTipMessage(eventId, userAddress, amount)
}