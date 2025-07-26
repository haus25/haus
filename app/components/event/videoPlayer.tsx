"use client"

import { useState, useEffect, useRef } from "react"
import { streamingService } from "../../services/streaming"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Input } from "../ui/input"
import { Volume2, VolumeX, Maximize, Minimize, Crown, MessageSquare, Heart, Users, Video, Play, StopCircle, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

interface VideoPlayerProps {
  manifestCid: string // eventId for SRS streaming
  autoPlay?: boolean
  isCreator?: boolean
  hasAccess?: boolean
  isLive?: boolean
  viewerCount?: number
  onTip?: (amount: number) => void
  onToggleChat?: () => void
  chatVisible?: boolean
  highestTipper?: {
    address: string
    amount: string
    displayName?: string
  }
  reservePrice?: string
  currentProgress?: number
  isMinimized?: boolean
  onToggleMinimize?: () => void
}

export default function VideoPlayer({ 
  manifestCid, // This is actually the eventId for SRS streaming
  autoPlay = false, 
  isCreator = false,
  hasAccess = false,
  isLive = false,
  viewerCount = 0,
  onTip,
  onToggleChat,
  chatVisible = true,
  highestTipper,
  reservePrice,
  currentProgress = 0,
  isMinimized = false,
  onToggleMinimize
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Video state
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null)
  
  // SRS streaming state
  const [isConnected, setIsConnected] = useState(false)
  const [streamUrls, setStreamUrls] = useState<any>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isStartingStream, setIsStartingStream] = useState(false)
  const [streamingError, setStreamingError] = useState<string | null>(null)

  // Custom tip state
  const [showCustomTip, setShowCustomTip] = useState(false)
  const [customTipAmount, setCustomTipAmount] = useState("")

  const eventId = manifestCid // manifestCid is actually eventId for live streaming

  // Initialize SRS streaming
  useEffect(() => {
    const initializeStreaming = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Get stream URLs and info from SRS
        const streamInfo = await streamingService.getStreamInfo(eventId)
        setStreamUrls(streamInfo.streamUrls)
        
        console.log('VIDEO_PLAYER: Stream info loaded:', streamInfo)
        
      } catch (error) {
        console.error('VIDEO_PLAYER: Error initializing streaming:', error)
        setError('Failed to initialize video stream')
      } finally {
        setIsLoading(false)
      }
    }

    if (eventId) {
      initializeStreaming()
    }
  }, [eventId])

  // Mouse and cursor handling with proper auto-hide
  const resetControlsTimeout = () => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout)
    }
    
    if (isFullscreen) {
      const timeout = setTimeout(() => {
        setIsHovering(false)
      }, 3000) // Hide after 3 seconds in fullscreen
      setControlsTimeout(timeout)
    }
  }

  const handleMouseMove = () => {
    setIsHovering(true)
    resetControlsTimeout()
  }

  const handleMouseLeave = () => {
    if (!isFullscreen) {
      setIsHovering(false)
    }
  }

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout)
      }
    }
  }, [controlsTimeout])

  // Monitor fullscreen state for proper transparency handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = !!document.fullscreenElement
      setIsFullscreen(isFS)
      
      if (isFS) {
        setIsHovering(true)
        resetControlsTimeout()
      } else {
        if (controlsTimeout) {
          clearTimeout(controlsTimeout)
        }
        setIsHovering(false)
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Quick tip handler
  const handleQuickTip = (amount: number) => {
    if (onTip) {
      onTip(amount)
    }
  }

  // Custom tip handler
  const handleCustomTip = () => {
    const amount = parseFloat(customTipAmount)
    if (amount > 0 && onTip) {
      onTip(amount)
      setCustomTipAmount("")
      setShowCustomTip(false)
    } else {
      toast.error("Please enter a valid tip amount")
    }
  }

  // SRS Streaming functions
  const handleStartStream = async () => {
    try {
      setIsStartingStream(true)
      setStreamingError(null)
      
      // Use SRS WebRTC (WHIP) for publishing
      const streamSession = await streamingService.startPublishing(eventId, {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: { ideal: 48000 }
        }
      })
      
      setIsStreaming(true)
      setIsConnected(true)
      
      // Show creator's own stream in video element for preview
      const currentStream = streamingService.getCurrentStream()
      if (videoRef.current && currentStream) {
        videoRef.current.srcObject = currentStream
      }
      
      console.log('VIDEO_PLAYER: Stream started successfully')
      toast.success('Stream started successfully!')
      
    } catch (error) {
      console.error('VIDEO_PLAYER: Error starting stream:', error)
      setStreamingError(error instanceof Error ? error.message : 'Failed to start stream')
      toast.error('Failed to start stream')
    } finally {
      setIsStartingStream(false)
    }
  }

  const handleStopStream = async () => {
    try {
      await streamingService.stopStreaming()
      setIsStreaming(false)
      setIsConnected(false)
      
      console.log('VIDEO_PLAYER: Stream stopped')
      toast.success('Stream stopped')
      
    } catch (error) {
      console.error('VIDEO_PLAYER: Error stopping stream:', error)
      toast.error('Failed to stop stream')
    }
  }

  const handleJoinStream = async () => {
    try {
      setIsStartingStream(true)
      setStreamingError(null)
      
      if (!videoRef.current) {
        throw new Error('Video element not available')
      }
      
      // Use SRS WebRTC (WHEP) for low-latency viewing
      await streamingService.startPlaying(eventId, videoRef.current)
      
      setIsStreaming(true)
      setIsConnected(true)
      
      console.log('VIDEO_PLAYER: Joined stream successfully')
      toast.success('Connected to live stream')
      
    } catch (error) {
      console.error('VIDEO_PLAYER: Error joining stream:', error)
      setStreamingError(error instanceof Error ? error.message : 'Failed to join stream')
    } finally {
      setIsStartingStream(false)
    }
  }

  // Volume controls
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Video control functions for creators
  const toggleVideo = () => {
    if (isCreator && isStreaming) {
      const videoTracks = streamingService.getCurrentStream()?.getVideoTracks() || []
      const isVideoEnabled = videoTracks[0]?.enabled
      streamingService.toggleVideo(!isVideoEnabled)
      toast.success(isVideoEnabled ? 'Video disabled' : 'Video enabled')
    }
  }

  const toggleAudio = () => {
    if (isCreator && isStreaming) {
      const audioTracks = streamingService.getCurrentStream()?.getAudioTracks() || []
      const isAudioEnabled = audioTracks[0]?.enabled
      streamingService.toggleAudio(!isAudioEnabled)
      toast.success(isAudioEnabled ? 'Audio muted' : 'Audio unmuted')
    }
  }

  // Fullscreen controls
  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      containerRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamingService.stopStreaming().catch(console.error)
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className="relative bg-black rounded-lg overflow-hidden group aspect-video h-full w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Loading Spinner */}
      {(isLoading || isStartingStream) && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
          <div className="text-center text-white">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">
              {isLoading ? 'Initializing...' : 
               isStartingStream ? (isCreator ? 'Starting stream...' : 'Joining stream...') : 
               'Loading...'}
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {(error || streamingError) && (
        <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-75 z-10">
          <div className="text-center">
            <p className="text-xl">{error || streamingError}</p>
            <Button onClick={() => window.location.reload()} className="mt-4 bg-primary text-primary-foreground">
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Video Element */}
      <video 
        ref={videoRef} 
        className="w-full h-full object-cover" 
        playsInline 
        autoPlay={autoPlay}
        muted={isMuted}
        controls={false}
      />

      {/* Top Overlays - Always on player */}
      <div className="absolute top-4 left-4 right-4 z-20">
        <div className="flex items-center justify-between">
          {/* Left - Live Stream indicator */}
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
            <span className="text-white text-sm font-medium">Live Stream</span>
          </div>
          
          {/* Right - Live indicator and viewer count/controls */}
          <div className="flex items-center gap-3">
            {isLive && isStreaming && (
              <Badge className="bg-red-500 text-white animate-pulse border-0">
                <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                LIVE
              </Badge>
            )}
            
            {/* Viewer count overlay on player */}
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1">
              <div className="flex items-center text-white text-sm">
                <Users className="h-4 w-4 mr-2" />
                {viewerCount}
              </div>
            </div>
            
            {/* Minimize/Maximize button overlay on player */}
            {onToggleMinimize && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 bg-black/60 backdrop-blur-sm"
                onClick={onToggleMinimize}
              >
                {isMinimized ? <Maximize className="h-4 w-4" /> : <Minimize className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stream Connected + Tipping row (for reduced view) */}
      {isMinimized && (
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <div className="flex items-center justify-between">
            {/* Left - Stream Connected status */}
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="flex items-center text-white text-sm space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Stream Connected</span>
                {reservePrice && (
                  <>
                    <Crown className="h-4 w-4 ml-4 text-primary" />
                    <span>{currentProgress.toFixed(1)}% to goal</span>
                  </>
                )}
              </div>
            </div>

            {/* Right - Tip button for reduced view */}
            {!isCreator && hasAccess && isStreaming && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-primary/90 bg-primary/80 backdrop-blur-sm border border-primary"
                  onClick={() => setShowCustomTip(!showCustomTip)}
                >
                  <Heart className="h-3 w-3 mr-1" />
                  Tip
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Video Controls Overlay (only when not minimized) */}
      <div className={`absolute inset-0 transition-all duration-300 ${
        !isMinimized && (isHovering || !isFullscreen) 
          ? 'opacity-100' 
          : isFullscreen 
            ? 'opacity-0 pointer-events-none' 
            : 'opacity-0'
      }`}>
        
        {/* Bottom Controls */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <div className="flex items-center justify-between">
            
            {/* Left Controls */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className={`text-white hover:bg-white/20 ${
                  isFullscreen ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm'
                }`}
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className={`text-white hover:bg-white/20 ${
                  isFullscreen ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm'
                }`}
                onClick={toggleFullscreen}
              >
                <Maximize size={20} />
              </Button>
              
              {/* Chat Toggle Button */}
              {!isCreator && onToggleChat && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`text-white hover:bg-white/20 ${
                    isFullscreen ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm'
                  }`}
                  onClick={onToggleChat}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              )}

              {/* Creator Stream Controls */}
              {isCreator && isStreaming && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`text-white hover:bg-white/20 ${
                      isFullscreen ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm'
                    }`}
                    onClick={toggleVideo}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`text-white hover:bg-white/20 ${
                      isFullscreen ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm'
                    }`}
                    onClick={toggleAudio}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Center - Stream Info */}
            <div className={`${
              isFullscreen ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm'
            } rounded-lg px-4 py-2`}>
              <div className="flex items-center text-white text-sm space-x-4">
                <div className="flex items-center">
                  <Video className="h-4 w-4 mr-2" />
                  <span>
                    {isStreaming ? (isCreator ? 'Broadcasting' : 'Live') : 
                     isConnected ? 'Connected' : 'Offline'}
                  </span>
                </div>
                {reservePrice && (
                  <div className="flex items-center">
                    <Crown className="h-4 w-4 mr-2 text-primary" />
                    <span>{currentProgress.toFixed(1)}% to goal</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Controls - Quick Tips or Creator Stop Button */}
            <div className="flex items-center space-x-2">
              {isCreator && isStreaming ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-red-500/90 bg-red-500/80 backdrop-blur-sm border border-red-500"
                  onClick={handleStopStream}
                >
                  <StopCircle className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              ) : !isCreator && hasAccess && isStreaming && (
                <>
                  {[2, 5, 10].map((amount) => (
                    <Button
                      key={amount}
                      variant="ghost"
                      size="sm"
                      className={`text-white hover:bg-primary/90 ${
                        isFullscreen ? 'bg-primary/60 backdrop-blur-sm' : 'bg-primary/80 backdrop-blur-sm'
                      } border border-primary`}
                      onClick={() => handleQuickTip(amount)}
                    >
                      <Heart className="h-3 w-3 mr-1" />
                      {amount}
                    </Button>
                  ))}
                  
                  {/* Custom Tip Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-white hover:bg-primary/90 ${
                      isFullscreen ? 'bg-primary/60 backdrop-blur-sm' : 'bg-primary/80 backdrop-blur-sm'
                    } border border-primary`}
                    onClick={() => setShowCustomTip(!showCustomTip)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Custom
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Tip Input Overlay */}
      {showCustomTip && !isCreator && hasAccess && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className={`${
            isFullscreen ? 'bg-black/60 backdrop-blur-md' : 'bg-black/80 backdrop-blur-sm'
          } rounded-lg p-6 text-white max-w-sm w-full mx-4`}>
            <h3 className="text-lg font-medium mb-4">Send Custom Tip</h3>
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="Amount in SEI"
                value={customTipAmount}
                onChange={(e) => setCustomTipAmount(e.target.value)}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/50"
                min="0"
                step="0.1"
              />
              <Button
                onClick={handleCustomTip}
                className="bg-primary hover:bg-primary/90"
                disabled={!customTipAmount || parseFloat(customTipAmount) <= 0}
              >
                <Heart className="h-4 w-4 mr-1" />
                Tip
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomTip(false)}
              className="mt-3 w-full text-white/70 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Creator Info Overlay - Only in full view */}
      {!isMinimized && (
        <div className="absolute top-16 left-4 z-20">
          <div className={`flex items-center space-x-3 ${
            isFullscreen ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm'
          } rounded-lg px-3 py-2 transition-opacity duration-300 ${
            isFullscreen && !isHovering ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}>
            <Avatar className="h-8 w-8 border-2 border-primary">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {eventId?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium text-sm">
                Event #{eventId}
              </p>
              <p className="text-white/70 text-xs">
                {isStreaming ? (isCreator ? 'Broadcasting' : 'Watching Live') : 
                 isLive ? 'Live' : 'Starting Soon'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Creator Ready to Stream */}
      {isCreator && !isStreaming && !isStartingStream && !isLoading && !error && !streamingError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="text-center text-white">
            <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Ready to stream</h3>
            <p className="text-white/70 mb-4">Click to start broadcasting to your audience</p>
            <Button 
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleStartStream}
              disabled={isStartingStream}
            >
              <Play className="h-5 w-5 mr-2" />
              Start Stream
            </Button>
          </div>
        </div>
      )}

      {/* Viewer Ready to Join */}
      {!isCreator && hasAccess && !isStreaming && !isStartingStream && isLive && !isLoading && !error && !streamingError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="text-center text-white">
            <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Stream Available</h3>
            <p className="text-white/70 mb-4">Click to join the live stream</p>
            <Button 
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleJoinStream}
              disabled={isStartingStream}
            >
              <Play className="h-5 w-5 mr-2" />
              Join Stream
            </Button>
          </div>
        </div>
      )}

      {/* Waiting for Stream (when offline but has access) */}
      {!isCreator && hasAccess && !isLive && !isLoading && !error && !streamingError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="text-center text-white">
            <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Waiting for stream</h3>
            <p className="text-white/70">The creator will start streaming soon...</p>
          </div>
        </div>
      )}

      {/* King of the Room Display (only in minimized view) */}
      {highestTipper && !isCreator && isMinimized && (
        <div className="absolute bottom-16 right-4 z-20">
          <div className="bg-primary/90 backdrop-blur-sm rounded-lg px-3 py-2">
            <div className="flex items-center text-white text-sm">
              <Crown className="h-4 w-4 mr-2" />
              <Avatar className="h-5 w-5 mr-2">
                <AvatarFallback className="text-xs bg-white text-primary">
                  {highestTipper.displayName?.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{highestTipper.displayName}</span>
              <span className="ml-2 font-bold">{highestTipper.amount} SEI</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

