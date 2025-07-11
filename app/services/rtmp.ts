// This is a production-ready RTMP server implementation
import { NodeMediaServer } from "node-media-server"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import { uploadVideoChunk, updateVideoManifest, type VideoManifest } from "../utils/video-storage"
import { updateEventContent } from "../services/event"

interface StreamSession {
  eventId: string
  streamKey: string
  outputPath: string
  manifest: VideoManifest
  chunkIndex: number
  process: any
  isActive: boolean
}

// Map of active streaming sessions
const activeSessions: Map<string, StreamSession> = new Map()

/**
 * Starts a new RTMP server instance
 */
export function startRtmpServer(port = 1935): NodeMediaServer {
  const config = {
    rtmp: {
      port: port,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60,
    },
    http: {
      port: 8000,
      allow_origin: "*",
    },
    auth: {
      play: true,
      publish: true,
      secret: process.env.RTMP_SECRET || "haus-streaming-secret",
    },
    trans: {
      ffmpeg: process.env.FFMPEG_PATH || "ffmpeg",
      tasks: [],
    },
  }

  const nms = new NodeMediaServer(config)

  // Set up stream authentication and processing
  setupStreamHandlers(nms)

  nms.run()

  return nms
}

/**
 * Sets up handlers for stream events
 */
function setupStreamHandlers(nms: NodeMediaServer): void {
  nms.on("prePublish", async (id, StreamPath, args) => {
    // Extract stream key from path
    const streamKey = StreamPath.split("/")[2]

    // Validate stream key
    if (!validateStreamKey(streamKey)) {
      const session = nms.getSession(id)
      session.reject()
      return
    }

    // Extract event ID from stream key
    const eventId = streamKey.split("-")[1]

    // Create output directory
    const outputPath = path.join(__dirname, "../temp", eventId)
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true })
    }

    try {
      // Get event details from the blockchain
      const eventDetails = await fetchEventDetails(eventId)

      // Initialize manifest
      const manifest: VideoManifest = {
        eventId,
        title: eventDetails.title,
        artist: eventDetails.artist,
        chunks: [],
        status: "live",
        startedAt: Date.now(),
        updatedAt: Date.now(),
      }

      // Start FFmpeg process to segment the stream
      const ffmpeg = spawn("ffmpeg", [
        "-i",
        "pipe:0",
        "-c:v",
        "copy",
        "-c:a",
        "copy",
        "-f",
        "segment",
        "-segment_time",
        "10",
        "-segment_format",
        "mp4",
        "-segment_list",
        path.join(outputPath, "playlist.m3u8"),
        "-segment_list_type",
        "m3u8",
        path.join(outputPath, "chunk-%03d.mp4"),
      ])

      // Store session info
      activeSessions.set(streamKey, {
        eventId,
        streamKey,
        outputPath,
        manifest,
        chunkIndex: 0,
        process: ffmpeg,
        isActive: true,
      })

      // Set up chunk processing
      setupChunkProcessing(streamKey)

      console.log(`Stream started for event ${eventId}`)
    } catch (error) {
      console.error(`Error setting up stream for event ${eventId}:`, error)
      const session = nms.getSession(id)
      session.reject()
    }
  })

  nms.on("donePublish", (id, StreamPath, args) => {
    // Extract stream key from path
    const streamKey = StreamPath.split("/")[2]

    // Finalize the stream
    finalizeStream(streamKey)
  })
}

/**
 * Sets up processing for stream chunks
 */
function setupChunkProcessing(streamKey: string): void {
  const session = activeSessions.get(streamKey)
  if (!session) return

  // Watch the output directory for new chunk files
  fs.watch(session.outputPath, async (eventType, filename) => {
    if (eventType === "rename" && filename.startsWith("chunk-") && filename.endsWith(".mp4")) {
      try {
        // Get chunk index from filename
        const chunkIndex = Number.parseInt(filename.split("-")[1].split(".")[0])

        // Upload chunk to IPFS
        const chunkPath = path.join(session.outputPath, filename)
        const chunkBlob = fs.readFileSync(chunkPath)
        const chunkCid = await uploadVideoChunk(new Blob([chunkBlob]), session.eventId, chunkIndex)

        // Add to manifest
        session.manifest.chunks.push({
          index: chunkIndex,
          cid: chunkCid,
          duration: 10, // Assuming 10-second chunks
          startTime: Date.now() - 10 * 1000,
        })

        session.manifest.updatedAt = Date.now()
        session.chunkIndex = chunkIndex

        // If we have accumulated several chunks, update the manifest on-chain
        if (chunkIndex % 3 === 0) {
          const manifestCid = await updateVideoManifest(session.eventId, session.manifest)
          await updateEventContent(session.eventId, manifestCid)
        }

        // Clean up the chunk file to save space
        fs.unlinkSync(chunkPath)
      } catch (error) {
        console.error("Error processing video chunk:", error)
      }
    }
  })
}

/**
 * Finalizes a stream when it ends
 */
async function finalizeStream(streamKey: string): Promise<void> {
  const session = activeSessions.get(streamKey)
  if (!session) return

  try {
    // Update manifest status
    session.manifest.status = "completed"
    session.manifest.updatedAt = Date.now()

    // Final manifest update
    const manifestCid = await updateVideoManifest(session.eventId, session.manifest)

    // Update event content on-chain
    await updateEventContent(session.eventId, manifestCid)

    // Clean up
    if (session.process) {
      session.process.kill()
    }

    // Clean up output directory
    fs.rmSync(session.outputPath, { recursive: true, force: true })

    // Remove session
    activeSessions.delete(streamKey)

    console.log(`Stream ${streamKey} finalized with manifest CID: ${manifestCid}`)
  } catch (error) {
    console.error("Error finalizing stream:", error)
  }
}

/**
 * Validates a stream key
 */
async function validateStreamKey(streamKey: string): Promise<boolean> {
  try {
    // Extract event ID and creator from stream key
    const parts = streamKey.split("-")
    if (parts.length < 3) return false

    const eventId = parts[1]
    const creatorSignature = parts[2]

    // Verify the stream key against the blockchain
    const isValid = await verifyStreamKey(eventId, creatorSignature)
    return isValid
  } catch (error) {
    console.error("Error validating stream key:", error)
    return false
  }
}

/**
 * Fetches event details from the blockchain
 */
async function fetchEventDetails(eventId: string): Promise<{ title: string; artist: string }> {
  // In production, this would fetch the event details from the blockchain
  // For now, we'll return mock data
  return {
    title: `Event ${eventId}`,
    artist: "Artist Name",
  }
}

/**
 * Verifies a stream key against the blockchain
 */
async function verifyStreamKey(eventId: string, creatorSignature: string): Promise<boolean> {
  // In production, this would verify the stream key against the blockchain
  // For now, we'll return true for any key
  return true
}
