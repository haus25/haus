import { uploadVideoChunk, updateVideoManifest, type VideoManifest, type VideoChunk } from "../utils/video-storage"
import { updateEventContent } from "./event"

// Define the chunk duration (in seconds)
const CHUNK_DURATION = 5

export class StreamingSession {
  private eventId: string
  private manifest: VideoManifest
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunkIndex = 0
  private isStreaming = false
  private manifestUpdateInterval: NodeJS.Timeout | null = null
  private onStatusChange: (status: "initializing" | "live" | "error" | "completed") => void

  constructor(
    eventId: string,
    title: string,
    artist: string,
    onStatusChange: (status: "initializing" | "live" | "error" | "completed") => void,
  ) {
    this.eventId = eventId
    this.onStatusChange = onStatusChange

    // Initialize manifest
    this.manifest = {
      eventId,
      title,
      artist,
      chunks: [],
      status: "live",
      startedAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  /**
   * Start streaming from the user's camera and microphone
   */
  async startStreaming(): Promise<void> {
    try {
      this.onStatusChange("initializing")

      // Get user media
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      })

      // Create media recorder
      const options = { mimeType: "video/webm; codecs=vp9,opus" }
      this.mediaRecorder = new MediaRecorder(this.stream, options)

      // Set up event handlers
      this.mediaRecorder.ondataavailable = this.handleDataAvailable.bind(this)

      // Start recording in chunks
      this.mediaRecorder.start(CHUNK_DURATION * 1000)
      this.isStreaming = true

      // Start periodic manifest updates
      this.manifestUpdateInterval = setInterval(
        this.updateManifestOnChain.bind(this),
        30000, // Update every 30 seconds
      )

      this.onStatusChange("live")
    } catch (error) {
      console.error("Error starting stream:", error)
      this.onStatusChange("error")
      throw new Error("Failed to start streaming")
    }
  }

  /**
   * Stop the streaming session
   */
  async stopStreaming(): Promise<string> {
    if (!this.isStreaming) return ""

    // Stop recording
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop()
    }

    // Stop all tracks in the stream
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
    }

    // Clear interval
    if (this.manifestUpdateInterval) {
      clearInterval(this.manifestUpdateInterval)
    }

    // Update manifest status
    this.manifest.status = "completed"
    this.manifest.updatedAt = Date.now()

    // Final manifest update
    const finalManifestCid = await this.updateManifestOnChain()

    this.isStreaming = false
    this.onStatusChange("completed")

    return finalManifestCid
  }

  /**
   * Handle data available event from MediaRecorder
   */
  private async handleDataAvailable(event: BlobEvent): Promise<void> {
    if (event.data && event.data.size > 0) {
      try {
        // Convert to MP4 format (in a production app, you'd use a proper transcoding service)
        const chunk = event.data

        // Upload chunk to IPFS
        const chunkCid = await uploadVideoChunk(chunk, this.eventId, this.chunkIndex)

        // Add to manifest
        const videoChunk: VideoChunk = {
          index: this.chunkIndex,
          cid: chunkCid,
          duration: CHUNK_DURATION,
          startTime: Date.now() - CHUNK_DURATION * 1000,
        }

        this.manifest.chunks.push(videoChunk)
        this.manifest.updatedAt = Date.now()
        this.chunkIndex++

        // If we have accumulated several chunks, update the manifest on-chain
        if (this.chunkIndex % 3 === 0) {
          await this.updateManifestOnChain()
        }
      } catch (error) {
        console.error("Error processing video chunk:", error)
      }
    }
  }

  /**
   * Update the manifest on IPFS and update the event content on-chain
   */
  private async updateManifestOnChain(): Promise<string> {
    try {
      // Upload updated manifest to IPFS
      const manifestCid = await updateVideoManifest(this.eventId, this.manifest)

      // Update the event content on-chain with the new manifest CID
      await updateEventContent(this.eventId, manifestCid)

      return manifestCid
    } catch (error) {
      console.error("Error updating manifest on-chain:", error)
      throw new Error("Failed to update manifest on-chain")
    }
  }

  /**
   * Get the video element for preview
   */
  getPreviewElement(): HTMLVideoElement | null {
    if (!this.stream) return null

    const videoElement = document.createElement("video")
    videoElement.srcObject = this.stream
    videoElement.autoplay = true
    videoElement.muted = true // Mute to prevent feedback

    return videoElement
  }
}
