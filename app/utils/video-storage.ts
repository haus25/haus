import axios from "axios"

// Constants
const CHUNK_DURATION = 10 // seconds
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_URL

// Types
export interface VideoChunk {
  index: number
  cid: string
  duration: number
  startTime: number
}

export interface VideoManifest {
  eventId: string
  title: string
  artist: string
  chunks: VideoChunk[]
  status: "live" | "completed"
  startedAt: number
  updatedAt: number
}

/**
 * Uploads a video chunk to IPFS via Pinata
 */
export async function uploadVideoChunk(chunk: Blob, eventId: string, chunkIndex: number): Promise<string> {
  try {
    const formData = new FormData()
    formData.append("file", chunk, `event-${eventId}-chunk-${chunkIndex}.mp4`)

    // Add metadata
    const metadata = JSON.stringify({
      name: `Event ${eventId} - Chunk ${chunkIndex}`,
      keyvalues: {
        eventId,
        chunkIndex,
        timestamp: Date.now(),
      },
    })
    formData.append("pinataMetadata", metadata)

    // Set pinning options
    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    })
    formData.append("pinataOptions", pinataOptions)

    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        "Content-Type": "multipart/form-data",
      },
    })

    return response.data.IpfsHash
  } catch (error) {
    console.error("Error uploading chunk to IPFS:", error)
    throw new Error("Failed to upload video chunk")
  }
}

/**
 * Creates or updates the video manifest for an event
 */
export async function updateVideoManifest(eventId: string, manifest: VideoManifest): Promise<string> {
  try {
    const response = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", manifest, {
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        "Content-Type": "application/json",
      },
    })

    return response.data.IpfsHash
  } catch (error) {
    console.error("Error updating manifest on IPFS:", error)
    throw new Error("Failed to update video manifest")
  }
}

/**
 * Fetches a video manifest from IPFS
 */
export async function fetchVideoManifest(manifestCid: string): Promise<VideoManifest> {
  try {
    const response = await axios.get(`${PINATA_GATEWAY}${manifestCid}`)
    return response.data as VideoManifest
  } catch (error) {
    console.error("Error fetching manifest from IPFS:", error)
    throw new Error("Failed to fetch video manifest")
  }
}

/**
 * Generates an HLS playlist (m3u8) from a video manifest
 */
export function generateHlsPlaylist(manifest: VideoManifest): string {
  let playlist = "#EXTM3U\n"
  playlist += "#EXT-X-VERSION:3\n"
  playlist += `#EXT-X-TARGETDURATION:${CHUNK_DURATION}\n`
  playlist += `#EXT-X-MEDIA-SEQUENCE:0\n`

  manifest.chunks.forEach((chunk) => {
    playlist += `#EXTINF:${chunk.duration.toFixed(3)},\n`
    playlist += `${PINATA_GATEWAY}${chunk.cid}\n`
  })

  if (manifest.status === "completed") {
    playlist += "#EXT-X-ENDLIST\n"
  }

  return playlist
}
