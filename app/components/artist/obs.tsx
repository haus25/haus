"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { updateVideoManifest, type VideoManifest, type VideoChunk } from "../../utils/video-storage"
import { updateEventContent } from "../../services/event"

interface OBSStreamingStudioProps {
  eventId: string
  eventTitle: string
  artistName: string
}

export default function OBSStreamingStudio({ eventId, eventTitle, artistName }: OBSStreamingStudioProps) {
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "error" | "completed">("idle")
  const [streamKey, setStreamKey] = useState("")
  const [rtmpUrl, setRtmpUrl] = useState("")
  const [duration, setDuration] = useState(0)
  const [viewers, setViewers] = useState(0)
  const [tips, setTips] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const manifestRef = useRef<VideoManifest | null>(null)
  const chunkIndexRef = useRef(0)
  const { toast } = useToast()

  // Generate stream key on component mount
  useEffect(() => {
    // Generate a unique stream key based on event ID and a random string
    const randomString = Math.random().toString(36).substring(2, 15)
    const generatedKey = `event-${eventId}-${randomString}`
    setStreamKey(generatedKey)

    // Set RTMP URL (this would be your RTMP server endpoint)
    setRtmpUrl(`rtmp://streaming.haus.art/live`)

    // Initialize manifest
    manifestRef.current = {
      eventId,
      title: eventTitle,
      artist: artistName,
      chunks: [],
      status: "live",
      startedAt: Date.now(),
      updatedAt: Date.now(),
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [eventId, eventTitle, artistName])

  // Start streaming session
  const startStreaming = async () => {
    try {
      setStatus("connecting")

      // In a real implementation, this would connect to your RTMP server
      // and start receiving the stream from OBS

      // For demo purposes, we'll simulate a successful connection
      setTimeout(() => {
        setStatus("live")

        // Start duration timer
        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1)
        }, 1000)

        // Start mock chunk processing
        startMockChunkProcessing()

        // Mock viewer count updates
        const mockViewerUpdates = setInterval(() => {
          setViewers((prev) => Math.min(prev + Math.floor(Math.random() * 3), 100))
          setTips((prev) => prev + Math.floor(Math.random() * 0.01 * 1e9) / 1e9)
        }, 5000)

        toast({
          title: "Stream Started",
          description: "Your OBS stream is now live!",
        })
      }, 2000)
    } catch (error) {
      console.error("Failed to start streaming:", error)
      toast({
        title: "Streaming Error",
        description: "Failed to connect to streaming server.",
        variant: "destructive",
      })
      setStatus("error")
    }
  }

  // Stop streaming session
  const stopStreaming = async () => {
    try {
      // In a real implementation, this would disconnect from your RTMP server

      // Stop timers
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      // Update manifest status
      if (manifestRef.current) {
        manifestRef.current.status = "completed"
        manifestRef.current.updatedAt = Date.now()

        // Final manifest update
        const manifestCid = await updateVideoManifest(eventId, manifestRef.current)

        // Update event content on-chain
        await updateEventContent(eventId, manifestCid)

        toast({
          title: "Stream Completed",
          description: `Your stream has been saved to IPFS with CID: ${manifestCid.substring(0, 8)}...`,
        })
      }

      setStatus("completed")
    } catch (error) {
      console.error("Error stopping stream:", error)
      toast({
        title: "Error",
        description: "There was an error finalizing your stream.",
        variant: "destructive",
      })
    }
  }

  // Mock chunk processing (in a real implementation, this would process chunks from the RTMP stream)
  const startMockChunkProcessing = () => {
    const processInterval = setInterval(async () => {
      if (status !== "live" || !manifestRef.current) {
        clearInterval(processInterval)
        return
      }

      try {
        // In a real implementation, this would process a chunk from the RTMP stream
        // For demo purposes, we'll simulate a successful chunk upload
        const mockChunkCid = `mock-chunk-cid-${chunkIndexRef.current}`

        // Add to manifest
        const videoChunk: VideoChunk = {
          index: chunkIndexRef.current,
          cid: mockChunkCid,
          duration: 10,
          startTime: Date.now() - 10 * 1000,
        }

        manifestRef.current.chunks.push(videoChunk)
        manifestRef.current.updatedAt = Date.now()
        chunkIndexRef.current++

        // If we have accumulated several chunks, update the manifest on-chain
        if (chunkIndexRef.current % 3 === 0) {
          const manifestCid = await updateVideoManifest(eventId, manifestRef.current)
          await updateEventContent(eventId, manifestCid)
        }
      } catch (error) {
        console.error("Error processing video chunk:", error)
      }
    }, 10000) // Process a chunk every 10 seconds

    return () => clearInterval(processInterval)
  }

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>OBS Streaming Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="rtmp-url">RTMP URL</Label>
            <div className="flex mt-1">
              <Input id="rtmp-url" value={rtmpUrl} readOnly className="flex-1 font-mono text-sm" />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(rtmpUrl)
                  toast({ title: "Copied to clipboard" })
                }}
                className="ml-2"
              >
                Copy
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="stream-key">Stream Key</Label>
            <div className="flex mt-1">
              <Input id="stream-key" value={streamKey} readOnly type="password" className="flex-1 font-mono text-sm" />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(streamKey)
                  toast({ title: "Copied to clipboard" })
                }}
                className="ml-2"
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md mt-4">
            <h3 className="font-medium mb-2">OBS Setup Instructions:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Open OBS Studio on your computer</li>
              <li>Go to Settings → Stream</li>
              <li>Select "Custom..." as the service</li>
              <li>Copy and paste the RTMP URL above into the "Server" field</li>
              <li>Copy and paste the Stream Key above into the "Stream Key" field</li>
              <li>Click "OK" to save settings</li>
              <li>Set up your scenes and sources as desired</li>
              <li>Click "Start Streaming" in OBS</li>
              <li>Click "Start Streaming" below when OBS is streaming</li>
            </ol>
          </div>

          {status === "idle" && (
            <Button onClick={startStreaming} className="w-full mt-4 bg-red-600 hover:bg-red-700">
              Start Streaming
            </Button>
          )}

          {status === "connecting" && (
            <Button disabled className="w-full mt-4">
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Connecting...
            </Button>
          )}

          {status === "live" && (
            <Button onClick={stopStreaming} variant="destructive" className="w-full mt-4">
              End Stream
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stream Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Status</h3>
              <p className="text-2xl font-bold">
                {status === "idle" && "Ready"}
                {status === "connecting" && "Connecting..."}
                {status === "live" && (
                  <span className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                    Live
                  </span>
                )}
                {status === "error" && "Error"}
                {status === "completed" && "Completed"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium">Duration</h3>
              <p className="text-2xl font-bold">{formatDuration(duration)}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium">Viewers</h3>
              <p className="text-2xl font-bold">{viewers}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium">Tips Received</h3>
              <p className="text-2xl font-bold">{tips.toFixed(4)} SOL</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
