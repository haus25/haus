/**
 * VIDEO STORAGE UTILITIES
 * 
 * Utilities for working with video manifests and HLS playlists
 * from the backend video chunk storage service.
 */

export interface VideoManifest {
  event_id: string
  creator: string
  content_type: 'video'
  upload_timestamp: number
  compilation_timestamp: number
  chunks_count: number
  total_duration_seconds: number
  total_size_bytes: number
  filcdn_base: string
  network: 'calibration'
  status: 'live' | 'completed'
  chunks: {
    sequence: number
    chunk_id: string
    cid: string
    size: number
    duration: number
    resolution: string
    filcdn_url: string
    root_id: string
    synapse_confirmed: boolean
  }[]
  schema_version: string
  generated_by: string
}

/**
 * Fetch video manifest from IPFS via Pinata
 */
export async function fetchVideoManifest(manifestCid: string): Promise<VideoManifest> {
  const gatewayUrls = [
    `https://gateway.pinata.cloud/ipfs/${manifestCid}`,
    `https://haus.mypinata.cloud/ipfs/${manifestCid}`,
    `https://ipfs.io/ipfs/${manifestCid}`
  ]

  for (const url of gatewayUrls) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const manifest = await response.json()
      
      // Validate manifest structure
      if (!manifest.event_id || !manifest.chunks || !Array.isArray(manifest.chunks)) {
        throw new Error('Invalid manifest structure')
      }

      // Add status field if missing (for backward compatibility)
      if (!manifest.status) {
        manifest.status = 'completed'
      }

      console.log(`✅ Video manifest fetched: ${manifest.chunks_count} chunks, ${manifest.total_duration_seconds}s`)
      return manifest

    } catch (error) {
      console.warn(`⚠️ Failed to fetch manifest from ${url}:`, error)
      continue
    }
  }

  throw new Error('Failed to fetch video manifest from all gateways')
}

/**
 * Generate HLS playlist from video manifest
 */
export function generateHlsPlaylist(manifest: VideoManifest): string {
  // Sort chunks by sequence
  const sortedChunks = [...manifest.chunks].sort((a, b) => a.sequence - b.sequence)
  
  // Calculate target duration (use the longest chunk duration)
  const targetDuration = Math.max(...sortedChunks.map(chunk => chunk.duration || 60))
  
  let playlist = '#EXTM3U\n'
  playlist += '#EXT-X-VERSION:3\n'
  playlist += `#EXT-X-TARGETDURATION:${Math.ceil(targetDuration)}\n`
  playlist += '#EXT-X-MEDIA-SEQUENCE:0\n'
  
  // Add chunks
  for (const chunk of sortedChunks) {
    playlist += `#EXTINF:${chunk.duration || 60}.0,\n`
    playlist += `${chunk.filcdn_url}\n`
  }
  
  // End list for completed videos, keep open for live streams
  if (manifest.status === 'completed') {
    playlist += '#EXT-X-ENDLIST\n'
  }
  
  return playlist
}

/**
 * Calculate video stats from manifest
 */
export function calculateVideoStats(manifest: VideoManifest): {
  totalDuration: string
  totalSize: string
  averageChunkSize: string
  resolution: string
  chunksCount: number
  compressionRatio?: number
} {
  const totalDurationSeconds = manifest.total_duration_seconds
  const totalSizeBytes = manifest.total_size_bytes
  const chunksCount = manifest.chunks_count

  // Format duration as HH:MM:SS
  const hours = Math.floor(totalDurationSeconds / 3600)
  const minutes = Math.floor((totalDurationSeconds % 3600) / 60)
  const seconds = totalDurationSeconds % 60
  const totalDuration = hours > 0 
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Format file sizes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const totalSize = formatBytes(totalSizeBytes)
  const averageChunkSize = formatBytes(totalSizeBytes / chunksCount)

  // Get resolution from first chunk
  const resolution = manifest.chunks[0]?.resolution || '1920x1080'

  return {
    totalDuration,
    totalSize,
    averageChunkSize,
    resolution,
    chunksCount
  }
}

/**
 * Validate manifest CID format
 */
export function isValidManifestCid(cid: string): boolean {
  // Basic CID validation (IPFS v1 CID format)
  return /^baf[a-z0-9]{56}$/.test(cid) || /^Qm[a-zA-Z0-9]{44}$/.test(cid)
}

/**
 * Extract event ID from manifest filename or CID
 */
export function extractEventIdFromManifest(manifest: VideoManifest): string {
  return manifest.event_id
}

/**
 * Check if video is still live/being recorded
 */
export function isVideoLive(manifest: VideoManifest): boolean {
  return manifest.status === 'live'
}

/**
 * Get video thumbnail URL (uses first chunk as thumbnail)
 */
export function getVideoThumbnailUrl(manifest: VideoManifest): string | null {
  if (manifest.chunks.length === 0) return null
  
  // Return the first chunk URL as thumbnail
  const firstChunk = manifest.chunks.find(c => c.sequence === 0) || manifest.chunks[0]
  return firstChunk.filcdn_url
}

/**
 * Format manifest for display
 */
export function formatManifestForDisplay(manifest: VideoManifest): {
  title: string
  duration: string
  size: string
  chunks: number
  creator: string
  created: string
  network: string
  status: string
} {
  const stats = calculateVideoStats(manifest)
  
  return {
    title: `Event #${manifest.event_id}`,
    duration: stats.totalDuration,
    size: stats.totalSize,
    chunks: stats.chunksCount,
    creator: manifest.creator.slice(0, 6) + '...' + manifest.creator.slice(-4),
    created: new Date(manifest.compilation_timestamp).toLocaleDateString(),
    network: manifest.network,
    status: manifest.status
  }
} 