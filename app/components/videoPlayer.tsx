"use client"

import type React from "react"

import { useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Volume2, VolumeX, Maximize, Minimize, Settings, Clock, Users, MessageSquare } from "lucide-react"

interface EventVideoPlayerProps {
  videoSource: string
  isFullscreen: boolean
  isMuted: boolean
  showChat: boolean
  participantsCount: number
  timeRemaining: number
  eventTitle?: string
  creatorName?: string
  showTitle?: boolean
  onToggleFullscreen: () => void
  onToggleMute: () => void
  onToggleChat: () => void
  onOpenTip?: () => void
  children?: React.ReactNode
}

export function EventVideoPlayer({
  videoSource,
  isFullscreen,
  isMuted,
  showChat,
  participantsCount,
  timeRemaining,
  eventTitle,
  creatorName,
  showTitle = true,
  onToggleFullscreen,
  onToggleMute,
  onToggleChat,
  onOpenTip,
  children,
}: EventVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Apply mute state to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoSource}
        className="w-full h-full object-contain"
        autoPlay
        loop
        muted={isMuted}
        playsInline
        poster="/placeholder.svg?height=400&width=600"
      />

      {/* Overlay content (ticket verification, etc.) */}
      {children}

      {/* Video Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onToggleMute}>
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => {
                /* Open quality settings */
              }}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenTip && (
              <Button
                variant="default"
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={onOpenTip}
              >
                Tip
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onToggleFullscreen}>
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Event Info Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        {/* Left side: viewers count and timer */}
        <div className="flex flex-col space-y-2">
          {/* Viewers count */}
          <div className="bg-black/60 rounded-lg p-2 text-white flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span>{participantsCount}</span>
          </div>

          {/* Countdown Timer */}
          <div className="bg-black/60 rounded-lg px-3 py-1 text-white flex items-center">
            <Clock className="h-4 w-4 mr-2 text-primary" />
            <div className="text-lg font-bold">{formatTime(timeRemaining)}</div>
          </div>
        </div>

        {/* Title in fullscreen mode */}
        {isFullscreen && showTitle && eventTitle && (
          <div className="bg-black/60 rounded-lg p-2 text-white mx-auto">
            <h2 className="text-lg font-bold">{eventTitle}</h2>
            {creatorName && <p className="text-sm">by {creatorName}</p>}
          </div>
        )}

        {/* Right side: chat toggle */}
        <div className="bg-black/60 rounded-lg p-2 text-white">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
            onClick={onToggleChat}
          >
            <MessageSquare className={`h-5 w-5 ${showChat ? "text-primary" : ""}`} />
          </Button>
        </div>
      </div>
    </div>
  )
}
