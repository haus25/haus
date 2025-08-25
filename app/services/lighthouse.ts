"use client"

import { create } from 'zustand'

// Types for Lighthouse storage integration (aligned with backend)
export interface ChunkInfo {
  chunkId: string
  cid: string
  size: number
  filcdnUrl: string
  backupUrls: string[]
  duration?: number        // Extracted from metadata
  chunkIndex?: number      // Derived from chunk order
  timestamp?: number       // Optional client-side field
  pdpVerified?: boolean    // Optional Filecoin verification status
  dealCount?: number       // Optional Filecoin deal count
  metadata?: any          // Full metadata from backend
}

export interface EventStorageStatus {
  found: boolean
  eventId: string
  status: 'active' | 'completed' | 'failed'
  totalChunks: number
  uploadedChunks: number
  uploadProgress: number
  totalSizeMB: number
  duration: number
  startTime?: number
  lastChunkTime?: number
  chunks: ChunkInfo[]
  playbackUrls: {
    chunks: Array<{
      chunkId: string
      cid: string
      url: string
      backupUrls: string[]
      duration: number
      size: number
    }>
    manifestUrl?: string
  }
}

export interface CIDTableData {
  eventId: string
  totalChunks: number
  cidTable: ChunkInfo[]
  metadata: any
  isComplete: boolean
}

export interface LighthouseServiceState {
  // Connection status
  isConnected: boolean
  connectionError: string | null
  
  // Event storage tracking
  activeEvents: Map<string, EventStorageStatus>
  
  // Service methods
  startLivestreamStorage: (eventId: string, creator: string) => Promise<boolean>
  stopLivestreamStorage: (eventId: string) => Promise<boolean>
  getEventStorageStatus: (eventId: string) => Promise<EventStorageStatus | null>
  getCIDTable: (eventId: string) => Promise<CIDTableData | null>
  
  // Internal methods
  checkConnection: () => Promise<boolean>
  setConnectionStatus: (connected: boolean, error?: string) => void
  updateEventStatus: (eventId: string, status: Partial<EventStorageStatus>) => void
}

// Storage service URL from environment
const STORAGE_SERVICE_URL = process.env.NEXT_PUBLIC_STORE_SERVICE_URL || 'https://store.haus25.live'

// Lighthouse storage service
export const useLighthouseService = create<LighthouseServiceState>((set, get) => ({
  // Initial state
  isConnected: false,
  connectionError: null,
  activeEvents: new Map(),

  // Start livestream storage monitoring
  startLivestreamStorage: async (eventId: string, creator: string): Promise<boolean> => {
    try {
      console.log(`🎬 Starting Lighthouse storage for event: ${eventId}`)
      
      const response = await fetch(`${STORAGE_SERVICE_URL}/api/livestream/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          creator,
          startTime: Date.now(),
          resolution: '1920x1080',
          bitrate: '2000k'
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Storage service error: ${error}`)
      }

      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Lighthouse storage started for ${eventId}`)
        
        // Initialize event status
        const initialStatus: EventStorageStatus = {
          found: true,
          eventId,
          status: 'active',
          totalChunks: 0,
          uploadedChunks: 0,
          uploadProgress: 0,
          totalSizeMB: 0,
          duration: 0,
          startTime: Date.now(),
          chunks: [],
          playbackUrls: {
            chunks: []
          }
        }
        
        get().updateEventStatus(eventId, initialStatus)
        return true
      } else {
        throw new Error(result.error || 'Unknown error')
      }
      
    } catch (error) {
      console.error(`❌ Failed to start storage for ${eventId}:`, error)
      get().setConnectionStatus(false, error instanceof Error ? error.message : 'Connection failed')
      return false
    }
  },

  // Stop livestream storage monitoring
  stopLivestreamStorage: async (eventId: string): Promise<boolean> => {
    try {
      console.log(`🛑 Stopping Lighthouse storage for event: ${eventId}`)
      
      const response = await fetch(`${STORAGE_SERVICE_URL}/api/livestream/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId })
      })

      if (!response.ok) {
        throw new Error(`Storage service error: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Lighthouse storage stopped for ${eventId}`)
        
        // Update event status to completed
        get().updateEventStatus(eventId, { 
          status: 'completed',
          lastChunkTime: Date.now()
        })
        return true
      } else {
        throw new Error(result.error || 'Unknown error')
      }
      
    } catch (error) {
      console.error(`❌ Failed to stop storage for ${eventId}:`, error)
      return false
    }
  },

  // Get event storage status
  getEventStorageStatus: async (eventId: string): Promise<EventStorageStatus | null> => {
    try {
      const response = await fetch(`${STORAGE_SERVICE_URL}/api/livestream/${eventId}/status`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Storage service error: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // Process chunks to match frontend interface
        const processedChunks: ChunkInfo[] = (result.chunks || []).map((chunk: any, index: number) => ({
          chunkId: chunk.chunkId,
          cid: chunk.cid,
          size: chunk.size,
          filcdnUrl: chunk.filcdnUrl,
          backupUrls: chunk.backupUrls || [],
          duration: chunk.metadata?.duration || chunk.duration || 60,
          chunkIndex: index,
          timestamp: chunk.timestamp || Date.now(),
          pdpVerified: chunk.pdpVerified || false,
          dealCount: chunk.dealCount || 0,
          metadata: chunk.metadata
        }))

        const status: EventStorageStatus = {
          found: result.found,
          eventId: result.eventId,
          status: result.status,
          totalChunks: result.totalChunks,
          uploadedChunks: result.uploadedChunks,
          uploadProgress: result.uploadProgress,
          totalSizeMB: result.totalSizeMB,
          duration: result.duration,
          startTime: result.startTime,
          lastChunkTime: result.lastChunkTime,
          chunks: processedChunks,
          playbackUrls: {
            chunks: processedChunks.map(chunk => ({
              chunkId: chunk.chunkId,
              cid: chunk.cid,
              url: chunk.filcdnUrl,
              backupUrls: chunk.backupUrls,
              duration: chunk.duration || 60,
              size: chunk.size
            })),
            manifestUrl: result.playbackUrls?.manifestUrl
          }
        }
        
        // Update local state
        get().updateEventStatus(eventId, status)
        get().setConnectionStatus(true)
        
        return status
      } else {
        return null
      }
      
    } catch (error) {
      console.error(`❌ Failed to get storage status for ${eventId}:`, error)
      get().setConnectionStatus(false, error instanceof Error ? error.message : 'Connection failed')
      return null
    }
  },

  // Get CID table for an event
  getCIDTable: async (eventId: string): Promise<CIDTableData | null> => {
    try {
      const response = await fetch(`${STORAGE_SERVICE_URL}/api/event/${eventId}/cid-table`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Storage service error: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // Process CID table chunks to match frontend interface
        const processedCidTable: ChunkInfo[] = (result.cidTable || []).map((chunk: any, index: number) => ({
          chunkId: chunk.chunkId,
          cid: chunk.cid,
          size: chunk.size,
          filcdnUrl: chunk.filcdnUrl,
          backupUrls: chunk.backupUrls || [],
          duration: chunk.metadata?.duration || chunk.duration || 60,
          chunkIndex: index,
          timestamp: chunk.timestamp || Date.now(),
          pdpVerified: chunk.pdpVerified || false,
          dealCount: chunk.dealCount || 0,
          metadata: chunk.metadata
        }))

        return {
          eventId: result.eventId,
          totalChunks: result.totalChunks,
          cidTable: processedCidTable,
          metadata: result.metadata,
          isComplete: result.isComplete
        }
      } else {
        return null
      }
      
    } catch (error) {
      console.error(`❌ Failed to get CID table for ${eventId}:`, error)
      return null
    }
  },

  // Check connection to storage service
  checkConnection: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${STORAGE_SERVICE_URL}/health`)
      
      if (response.ok) {
        const result = await response.json()
        const connected = result.status === 'healthy'
        get().setConnectionStatus(connected)
        return connected
      } else {
        get().setConnectionStatus(false, `Service returned ${response.status}`)
        return false
      }
      
    } catch (error) {
      console.error('❌ Storage service connection check failed:', error)
      get().setConnectionStatus(false, error instanceof Error ? error.message : 'Connection failed')
      return false
    }
  },

  // Set connection status
  setConnectionStatus: (connected: boolean, error?: string) => {
    set(state => ({
      isConnected: connected,
      connectionError: error || null
    }))
  },

  // Update event status
  updateEventStatus: (eventId: string, status: Partial<EventStorageStatus>) => {
    set(state => {
      const newActiveEvents = new Map(state.activeEvents)
      const existing = newActiveEvents.get(eventId)
      
      if (existing) {
        newActiveEvents.set(eventId, { ...existing, ...status })
      } else if (status.found !== false) {
        // Only create new entry if it's not a "not found" status
        newActiveEvents.set(eventId, status as EventStorageStatus)
      }
      
      return { activeEvents: newActiveEvents }
    })
  }
}))

// Polling service for active events
export class LighthousePollingService {
  private static instance: LighthousePollingService
  private pollingInterval: NodeJS.Timeout | null = null
  private pollingIntervalMs = 10000 // 10 seconds

  static getInstance(): LighthousePollingService {
    if (!LighthousePollingService.instance) {
      LighthousePollingService.instance = new LighthousePollingService()
    }
    return LighthousePollingService.instance
  }

  startPolling(): void {
    if (this.pollingInterval) {
      return // Already polling
    }

    console.log('📡 Starting Lighthouse storage polling service')
    
    this.pollingInterval = setInterval(async () => {
      const { activeEvents, getEventStorageStatus } = useLighthouseService.getState()
      
      // Poll status for all active events
      for (const [eventId, eventStatus] of activeEvents.entries()) {
        if (eventStatus.status === 'active') {
          try {
            await getEventStorageStatus(eventId)
          } catch (error) {
            console.warn(`⚠️ Failed to poll status for ${eventId}:`, error)
          }
        }
      }
    }, this.pollingIntervalMs)
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
      console.log('🛑 Stopped Lighthouse storage polling service')
    }
  }

  updatePollingInterval(intervalMs: number): void {
    this.pollingIntervalMs = intervalMs
    
    if (this.pollingInterval) {
      this.stopPolling()
      this.startPolling()
    }
  }
}

// Hook for easy access to polling service
export const useLighthousePolling = () => {
  const pollingService = LighthousePollingService.getInstance()
  
  return {
    startPolling: () => pollingService.startPolling(),
    stopPolling: () => pollingService.stopPolling(),
    updateInterval: (intervalMs: number) => pollingService.updatePollingInterval(intervalMs)
  }
}

// Utility functions
export const formatStorageSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

export const getPlaybackUrls = (chunks: ChunkInfo[]): string[] => {
  return chunks
    .sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0))
    .map(chunk => chunk.filcdnUrl)
    .filter(url => url) // Filter out any undefined URLs
}

export default useLighthouseService
