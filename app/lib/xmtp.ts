"use client"

import { Client, type Signer, type Identifier, ConsentState } from "@xmtp/browser-sdk"
import type { WalletClient } from "viem"

// STORAGE FOR CREATOR'S GROUPS - ONLY CREATORS MANAGE GROUPS
const CREATOR_GROUPS = new Map<string, any>() // eventId -> group (created by creator)
const GROUP_METADATA = new Map<string, any>() // eventId -> { groupId, creatorInboxId, eventId }

// XMTP MANAGER - PROPER GROUP CHAT IMPLEMENTATION
class XMTPManager {
  private static instance: XMTPManager
  private clients: Map<string, Client> = new Map() // userAddress -> client
  private messageCallbacks: Map<string, (message: any) => void> = new Map()

  static getInstance(): XMTPManager {
    if (!XMTPManager.instance) {
      XMTPManager.instance = new XMTPManager()
    }
    return XMTPManager.instance
  }

  /**
   * Get or create XMTP client for user
   */
  private async getClientForUser(walletClient: WalletClient, userAddress: string): Promise<Client> {
    const normalizedAddress = userAddress.toLowerCase()
    
    // Check if we already have a client for this user
    if (this.clients.has(normalizedAddress)) {
      console.log('XMTP: Using existing client for user:', userAddress)
      return this.clients.get(normalizedAddress)!
    }

    console.log('XMTP: 🚀 Creating new client for user:', userAddress)

    const identifier: Identifier = {
      identifier: normalizedAddress,
      identifierKind: "Ethereum"
    }

    const signer: Signer = {
      type: "EOA",
      getIdentifier: () => identifier,
      signMessage: async (message: string): Promise<Uint8Array> => {
        const signature = await walletClient.signMessage({
          account: userAddress as `0x${string}`,
          message
        })
        
        const hex = signature.startsWith('0x') ? signature.slice(2) : signature
        const bytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
        }
        return bytes
      }
    }

    // Use stable DB configuration to reduce worker spam
    const clientOptions = {
      env: "dev" as const,
      appVersion: "haus/1.0.0",
      // Use stable dbPath per wallet to avoid database conflicts
      dbPath: `xmtp-${userAddress.toLowerCase()}`
    }

    let client: Client
    try {
      client = await Client.build(identifier, clientOptions)
      console.log('XMTP: ✅ Built existing client for user:', userAddress)
    } catch {
      client = await Client.create(signer, clientOptions)
      console.log('XMTP: ✅ CREATED NEW CLIENT FOR USER:', userAddress, 'INBOX ID:', client.inboxId)
    }

    // Ensure client is fully initialized before proceeding
    try {
      // Give the client a moment to complete initialization
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch {
      // Non-fatal
    }

    // Store client for this user
    this.clients.set(normalizedAddress, client)
    console.log('XMTP: User', userAddress, 'now has inbox ID:', client.inboxId)

    return client
  }

  /**
   * Initialize XMTP client (for creator at minting)
   */
  async initializeClient(walletClient: WalletClient, userAddress: string): Promise<void> {
    await this.getClientForUser(walletClient, userAddress)
  }

  /**
   * Initialize XMTP client for user at ticket purchase
   */
  async initializeClientForUser(walletClient: WalletClient, userAddress: string): Promise<void> {
    console.log('XMTP: 🎫 Initializing XMTP for user at ticket purchase:', userAddress)
    await this.getClientForUser(walletClient, userAddress)
  }

  // REMOVED: Message stream - will be handled per user

  /**
   * 1. CREATE OPTIMISTIC GROUP AT EVENT CREATION (CREATOR ONLY)
   * Uses proper XMTP optimistic group creation pattern
   */
  async createEventGroup(eventId: string, creatorWallet: WalletClient, creatorAddress: string): Promise<{ groupId: string }> {
    try {
      console.log('XMTP: 🏭 CREATING OPTIMISTIC GROUP FOR EVENT:', eventId, 'BY CREATOR:', creatorAddress)
      
      // Get creator's client
      const creatorClient = await this.getClientForUser(creatorWallet, creatorAddress)
      const groupName = `haus-event-${eventId}`
      
      // Check if group already exists for this creator
      if (CREATOR_GROUPS.has(eventId)) {
        console.log('XMTP: Group already exists for event:', eventId)
        const existingGroup = CREATOR_GROUPS.get(eventId)
        return { groupId: existingGroup.id }
      }

      // Create OPTIMISTIC group (stays local until members added)
      // This is the proper XMTP pattern for event-based groups
      const group = await creatorClient.conversations.newGroupOptimistic({
        name: groupName,
        description: `Event #${eventId} Chat`
      })

      console.log('XMTP: ✅ OPTIMISTIC GROUP CREATED FOR EVENT:', eventId, 'GROUP ID:', group.id)
      await group.updateConsentState(ConsentState.Allowed)

      // Store in creator's storage only (proper XMTP pattern)
      CREATOR_GROUPS.set(eventId, group)
      GROUP_METADATA.set(eventId, {
        eventId,
        groupId: group.id,
        groupName,
        creatorAddress,
        creatorInboxId: creatorClient.inboxId
      })

      // Persist for creator's session
      localStorage.setItem(`xmtp-creator-group-${eventId}`, JSON.stringify({
        eventId,
        groupId: group.id,
        groupName,
        creatorAddress,
        creatorInboxId: creatorClient.inboxId
      }))

      console.log('XMTP: 🎉 OPTIMISTIC GROUP READY FOR EVENT:', eventId)

      return { groupId: group.id }

    } catch (error) {
      console.error('XMTP: ❌ ERROR CREATING OPTIMISTIC GROUP FOR EVENT:', eventId, error)
      throw error
    }
  }

  /**
   * 2. ADD PARTICIPANT TO GROUP (CREATOR ONLY - CALLED FROM CREATOR'S CONTEXT)
   * This method should ONLY be called from the creator's client/context
   * Includes proper inbox ID resolution and retry logic
   */
  async addParticipantToGroup(eventId: string, buyerAddress: string): Promise<boolean> {
    try {
      console.log('XMTP: 🎫 ADDING PARTICIPANT TO GROUP:', eventId, 'PARTICIPANT:', buyerAddress)

      // Get creator client by address saved in GROUP_METADATA when the group was created
      const meta = GROUP_METADATA.get(eventId)
      if (!meta?.creatorAddress) throw new Error('group_not_local')
      
      const creatorClient = this.clients.get(meta.creatorAddress.toLowerCase())
      if (!creatorClient) throw new Error('group_not_local') // creator must have joined once

      const groupId = await this.getGroupIdFromChain(eventId)
      if (!groupId) throw new Error('no_chat_registered')

      // Get group by ID (proper XMTP pattern)
      const group = await creatorClient.conversations.getConversationById(groupId)
      if (!group) throw new Error('group_not_local') // ensure creator joined/opened it once

      console.log('XMTP: Found group for adding participant:', group.id)

      console.log('XMTP: Resolving inbox ID for participant:', buyerAddress)

      // Check if participant is reachable on XMTP first
      const canMessageMap = await Client.canMessage([{
        identifier: buyerAddress,
        identifierKind: 'Ethereum'
      }])
      
      const canMessage = canMessageMap.get(buyerAddress)
      if (!canMessage) {
        console.warn('XMTP: ⚠️ Participant not reachable on XMTP yet, retry later:', buyerAddress)
        return false // not on XMTP yet; retry later
      }

      console.log('XMTP: Participant is reachable, resolving inbox ID...')

      // Resolve inbox ID using proper XMTP API
      const map = await (creatorClient as any).findInboxIdByIdentities([
        { identifier: buyerAddress, identifierKind: 'Ethereum' }
      ])
      const inboxId = map.get(buyerAddress)
      if (!inboxId) {
        console.warn('XMTP: ⚠️ Could not resolve inbox ID for participant:', buyerAddress)
        return false // not on XMTP yet; retry later
      }

      console.log('XMTP: Adding participant inbox ID to group:', inboxId)

      // Add member using proper XMTP addMembers API
      await (group as any).addMembers([inboxId])
      console.log('XMTP: ✅ Successfully added participant to group')
      
      console.log('XMTP: ✅ PARTICIPANT ADDED TO GROUP FOR EVENT:', eventId)
      console.log('XMTP: Group is now synced to network (no longer optimistic)')
      
      return true

    } catch (error) {
      console.error('XMTP: ❌ ERROR ADDING PARTICIPANT TO GROUP:', eventId, error)
      throw error
    }
  }

  /**
   * Initialize participant's XMTP client (called during ticket purchase)
   */
  async initializeParticipantForEvent(participantWallet: WalletClient, participantAddress: string): Promise<void> {
    try {
      console.log('XMTP: 🎫 Initializing participant XMTP client:', participantAddress)
      
      // This ensures participant has an inbox ID for group invitation
      await this.getClientForUser(participantWallet, participantAddress)
      
      console.log('XMTP: ✅ Participant XMTP client initialized:', participantAddress)
    } catch (error) {
      console.error('XMTP: ❌ Error initializing participant XMTP client:', error)
      throw error
    }
  }

  /**
   * Get group ID from Pinata metadata (via on-chain metadataURI) with caching
   */
  private async getGroupIdFromChain(eventId: string): Promise<string> {
    try {
      // Check cache first to avoid repeated IPFS fetches
      const cached = GROUP_METADATA.get(eventId)?.groupId
      if (cached) {
        console.log('XMTP: 📦 Using cached group ID for event:', eventId, cached)
        return cached
      }

      console.log('XMTP: 🔍 Getting group ID from event metadata for event:', eventId)

      // Import viem to read from blockchain
      const { createPublicClient, http } = await import('viem')
      const { seiTestnet } = await import('../lib/sei')
      const { CONTRACT_ADDRESSES, EVENT_FACTORY_ABI } = await import('../lib/constants')
      
      const publicClient = createPublicClient({
        chain: seiTestnet,
        transport: http(process.env.NEXT_PUBLIC_SEI_TESTNET_RPC!)
      })

      // Get event details from EventFactory to get metadataURI
      const eventData = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.EVENT_FACTORY as `0x${string}`,
        abi: EVENT_FACTORY_ABI,
        functionName: 'getEvent',
        args: [BigInt(eventId)]
      }) as any

      if (!eventData.metadataURI) {
        console.error('XMTP: No metadata URI found for event:', eventId)
        throw new Error('no_chat_registered')
      }

      console.log('XMTP: Found metadata URI:', eventData.metadataURI)

      // Fetch metadata from Pinata IPFS
      let metadataUrl = eventData.metadataURI
      if (metadataUrl.startsWith('ipfs://')) {
        const ipfsHash = metadataUrl.slice(7)
        metadataUrl = `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsHash}`
      }

      const response = await fetch(metadataUrl)
      if (!response.ok) {
        console.error('XMTP: Failed to fetch metadata from:', metadataUrl)
        throw new Error('no_chat_registered')
      }

      const metadata = await response.json()
      const groupId = metadata.xmtpGroupId

      if (!groupId) {
        console.error('XMTP: No xmtpGroupId found in metadata for event:', eventId)
        throw new Error('no_chat_registered')
      }

      console.log('XMTP: ✅ Found group ID from metadata:', groupId)
      
      // Cache the groupId to avoid repeated IPFS fetches
      GROUP_METADATA.set(eventId, { ...(GROUP_METADATA.get(eventId) || {}), groupId })
      
      return groupId

    } catch (error) {
      console.error('XMTP: Error getting group ID from metadata:', error)
      throw new Error('no_chat_registered')
    }
  }

  /**
   * Join event group by on-chain groupId and start streaming (PROPER XMTP PATTERN)
   */
  async joinEventGroup(
    eventId: string,
    wallet: WalletClient,
    address: string,
    onMessage: (m: any) => void
  ): Promise<{ group: any; stop: () => void }> {
    try {
      console.log('XMTP: 🔍 JOINING EVENT GROUP BY GROUP ID:', eventId, 'USER:', address)

      const client = await this.getClientForUser(wallet, address)

      const groupId = await this.getGroupIdFromChain(eventId)
      if (!groupId) throw new Error('no_chat_registered')

      console.log('XMTP: Found group ID from chain:', groupId)

      // Get conversation by ID (proper XMTP pattern)
      const group = await client.conversations.getConversationById(groupId)
      if (!group) throw new Error('not_invited_yet') // creator/agent hasn't added you

      console.log('XMTP: ✅ FOUND GROUP BY ID:', group.id)

      // Update consent and sync
      await group.updateConsentState(ConsentState.Allowed)
      await client.conversations.syncAll([ConsentState.Allowed])
      await group.sync()

      // Start streaming messages (proper XMTP pattern)
      const controller = await client.conversations.streamAllMessages({
        consentStates: [ConsentState.Allowed],
        onValue: (msg) => {
          if (msg.conversationId === groupId) {
            console.log('XMTP: 📨 Received message for event:', eventId)
            onMessage(msg)
          }
        },
        onError: (error) => {
          console.error('XMTP: ❌ Stream error:', error)
        }
      })

      console.log('XMTP: 🎉 Successfully joined group and started streaming')

      return {
        group,
        stop: () => {
          try {
            // Support stream cleanup - check for return method
            if (typeof controller?.return === 'function') {
              controller.return()
            }
            console.log('XMTP: 🛑 Stream stopped for event:', eventId)
          } catch (error) {
            console.error('XMTP: Error stopping stream:', error)
          }
        }
      }

    } catch (error) {
      console.error('XMTP: ❌ ERROR JOINING EVENT GROUP:', eventId, error)
      throw error
    }
  }

  /**
   * Send message to event group (works for both creator and participants)
   */
  async sendMessage(eventId: string, content: string, userAddress: string): Promise<void> {
    try {
      console.log('XMTP: 📤 Sending message to event:', eventId, 'from user:', userAddress)

      const client = this.clients.get(userAddress.toLowerCase())
      if (!client) throw new Error('User client not initialized')
      
      const groupId = await this.getGroupIdFromChain(eventId)
      const group = await client.conversations.getConversationById(groupId)
      if (!group) throw new Error('not_invited_yet') // not added yet

      await group.send(content)
      console.log('XMTP: ✅ Message sent to event:', eventId)
    } catch (error) {
      console.error('XMTP: ❌ Error sending message:', error)
      throw error
    }
  }

  /**
   * Get messages from event group
   */
  async getMessages(
    eventId: string, 
    userAddress: string, 
    opts?: { limit?: number | bigint; cursor?: bigint }
  ): Promise<any[]> {
    try {
      console.log('XMTP: 📜 Getting messages for event:', eventId, 'user:', userAddress)

      const client = this.clients.get(userAddress.toLowerCase())
      if (!client) {
        console.warn('XMTP: User client not initialized:', userAddress)
        return []
      }
      
      const groupId = await this.getGroupIdFromChain(eventId)
      const group = await client.conversations.getConversationById(groupId)
      if (!group) {
        console.warn('XMTP: Group not found or user not invited yet for event:', eventId)
        return []
      }

      // Coerce into bigint – XMTP MLS WASM expects u64 (bigint) here
      const limit: bigint = opts?.limit !== undefined
        ? (typeof opts.limit === 'bigint' ? opts.limit : BigInt(opts.limit))
        : BigInt(50)

      // Sync before reading messages
      try {
        if ('sync' in group && typeof (group as any).sync === 'function') {
          await (group as any).sync()
        }
      } catch {
        // Non-fatal sync error
      }

      // Call messages with proper BigInt parameters (only limit is supported)
      return await group.messages({ limit })
    } catch (error) {
      console.error('XMTP: ❌ Error getting messages:', error)
      return []
    }
  }

  /**
   * Set message callback
   */
  setMessageCallback(eventId: string, callback: (message: any) => void): void {
    this.messageCallbacks.set(eventId, callback)
  }

  /**
   * Check if ready
   */
  isReady(): boolean {
    return this.clients.size > 0
  }

  /**
   * Get inbox ID for user
   */
  getInboxId(userAddress?: string): string | null {
    if (userAddress) {
      const client = this.clients.get(userAddress.toLowerCase())
      return client?.inboxId || null
    }
    // Return first client's inbox ID if no specific user
    const firstClient = Array.from(this.clients.values())[0]
    return firstClient?.inboxId || null
  }
}

// Export singleton
export const XMTP = XMTPManager.getInstance()
