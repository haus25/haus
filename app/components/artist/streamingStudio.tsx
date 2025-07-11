"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { StreamingSession } from "../../services/streaming"
import { useToast } from "../../hooks/use-toast"

interface StreamingStudioProps {
  eventId: string
  eventTitle: string
  artistName: string
}

export default function StreamingStudio({ eventId, eventTitle, artistName }: StreamingStudioProps) {
  const [status, setStatus] = useState<"idle" | "initializing" | "live" | "error" | "completed">("idle")
  const [duration, setDuration] = useState(0)
  const [viewers, setViewers] = useState(0)
  const [tips, setTips] = useState(0)
  const streamingSessionRef = useRef<StreamingSession | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamingSessionRef.current) {
        streamingSessionRef.current.stopStreaming().catch(console.error)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Handle status changes
  const handleStatusChange = (newStatus: "initializing" | "live" | "error" | "completed") => {
    setStatus(newStatus)

    if (newStatus === "live" && !timerRef.current) {
      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } else if (newStatus === "completed" && timerRef.current) {
      // Stop duration timer
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // Start streaming
  const startStreaming = async () => {
    try {
      const session = new StreamingSession(eventId, eventTitle, artistName, handleStatusChange)

      await session.startStreaming()
      streamingSessionRef.current = session

      // Add preview to the DOM
      if (previewRef.current) {
        const previewElement = session.getPreviewElement()
        if (previewElement) {
          previewRef.current.innerHTML = ""
          previewRef.current.appendChild(previewElement)
        }
      }

      // Mock viewer count updates (in a real app, this would come from a backend)
      const mockViewerUpdates = setInterval(() => {
        setViewers((prev) => Math.min(prev + Math.floor(Math.random() * 3), 100))
        setTips((prev) => prev + Math.floor(Math.random() * 0.01 * 1e9) / 1e9)
      }, 5000)

      // Clean up mock updates when streaming ends
      return () => clearInterval(mockViewerUpdates)
    } catch (error) {
      console.error("Failed to start streaming:", error)
      toast({
        title: "Streaming Error",
        description: "Failed to start streaming. Please check your camera and microphone permissions.",
        variant: "destructive",
      })
      setStatus("error")
    }
  }

  // Stop streaming
  const stopStreaming = async () => {
    if (streamingSessionRef.current) {
      try {
        const manifestCid = await streamingSessionRef.current.stopStreaming()
        toast({
          title: "Stream Completed",
          description: `Your stream has been saved to IPFS with CID: ${manifestCid.substring(0, 8)}...`,
        })
      } catch (error) {
        console.error("Error stopping stream:", error)
        toast({
          title: "Error",
          description: "There was an error finalizing your stream.",
          variant: "destructive",
        })
      }
    }
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
          <CardTitle>Live Stream Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={previewRef}
            className="aspect-video bg-black rounded-md flex items-center justify-center text-white"
          >
            {status === "idle" && (
              <div className="text-center">
                <p>Your camera preview will appear here</p>
                <Button onClick={startStreaming} className="mt-4 bg-red-600 hover:bg-red-700">
                  Start Streaming
                </Button>
              </div>
            )}
          </div>
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
                {status === "initializing" && "Initializing..."}
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

            {status === "live" && (
              <Button onClick={stopStreaming} variant="destructive" className="w-full mt-4">
                End Stream
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
