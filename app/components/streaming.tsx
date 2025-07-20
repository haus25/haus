"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  StopCircle, 
  PlayCircle,
  Loader2,
  AlertCircle,
  CheckCircle,
  Users,
  Radio,
  Crown
} from 'lucide-react'
import { streamingService, type StreamSession } from '../services/streaming'
import { createTicketVerificationService } from '../services/tickets'
import { useWalletClient } from 'wagmi'
import { useAuth } from '../contexts/auth'
import { toast } from 'sonner'

interface StreamingProps {
  eventId: string
  isCreator: boolean
  ticketKioskAddress?: string
  eventStartTime: string
  eventDuration: number
  onStreamStatusChange?: (status: {
    isLive: boolean
    viewerCount: number
    hasAccess: boolean
  }) => void
}

export const Streaming: React.FC<StreamingProps> = ({
  eventId,
  isCreator,
  ticketKioskAddress,
  eventStartTime,
  eventDuration,
  onStreamStatusChange
}) => {
  const { userProfile } = useAuth()
  const { data: walletClient } = useWalletClient()
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const [streamSession, setStreamSession] = useState<StreamSession | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [isVerifyingAccess, setIsVerifyingAccess] = useState(true)
  const [streamError, setStreamError] = useState<string | null>(null)
  
  // Creator controls
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  
  // Stream status
  const [viewerCount, setViewerCount] = useState(0)
  const [streamStatus, setStreamStatus] = useState<'offline' | 'connecting' | 'live'>('offline')

  // Check access permissions
  useEffect(() => {
    const checkAccess = async () => {
      if (!userProfile?.address || !walletClient) return

      if (isCreator) {
        // Creators always have access
        setHasAccess(true)
        setIsVerifyingAccess(false)
        return
      }

      if (!ticketKioskAddress) {
        setHasAccess(false)
        setIsVerifyingAccess(false)
        return
      }

      try {
        const ticketService = createTicketVerificationService(walletClient)
        const verification = await ticketService.verifyEventAccess(
          ticketKioskAddress,
          userProfile.address,
          parseInt(eventId)
        )

        setHasAccess(verification.hasAccess)
        
        if (!verification.hasAccess) {
          setStreamError(verification.reason || 'Access denied')
        }

      } catch (error) {
        console.error('Access verification failed:', error)
        setHasAccess(false)
        setStreamError('Failed to verify access')
      } finally {
        setIsVerifyingAccess(false)
      }
    }

    checkAccess()
  }, [eventId, ticketKioskAddress, isCreator, userProfile, walletClient])

  // Update stream status callback
  useEffect(() => {
    if (onStreamStatusChange) {
      onStreamStatusChange({
        isLive: streamStatus === 'live',
        viewerCount,
        hasAccess
      })
    }
  }, [streamStatus, viewerCount, hasAccess, onStreamStatusChange])

    // Optional: Minimal status check and viewer count updates
  useEffect(() => {
    if (streamStatus === 'live') {
      const interval = setInterval(async () => {
        try {
          // Get viewer count for display
          const currentViewerCount = await streamingService.getViewerCount(eventId)
          setViewerCount(currentViewerCount)
          
          // Check WebRTC connection state
          const status = await streamingService.checkStreamStatus(eventId)
          
          // Only update if connection is actually lost
          if (!status.isLive && streamStatus === 'live') {
            console.log('STREAMING_UI: WebRTC connection lost, updating status')
            setStreamStatus('offline')
            if (!isCreator) {
              setIsStreaming(false)
            }
          }
        } catch (error) {
          console.warn('STREAMING: Error checking connection status:', error)
        }
      }, 15000) // Check every 15 seconds for viewer count

      return () => clearInterval(interval)
    }
  }, [streamStatus, eventId, isCreator])

  // Start streaming (Creator mode)
  const startStreaming = async () => {
    if (!isCreator || !userProfile) return

    try {
      setIsConnecting(true)
      setStreamError(null)
      setStreamStatus('connecting')

      console.log('STREAMING: Starting stream for event', eventId)

      const session = await streamingService.startPublishing(eventId, {
        video: isCameraOn ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: isMicOn ? {
          echoCancellation: true,
          noiseSuppression: true
        } : false
      })

      setStreamSession(session)
      setIsStreaming(true)
      setStreamStatus('live')
      
      // Set video preview for creator (show their own stream)
      if (videoRef.current) {
        const stream = streamingService.getCurrentStream()
        if (stream) {
          videoRef.current.srcObject = stream
        }
      }
      
      toast.success('Stream started successfully!')
      console.log('STREAMING: Stream started:', session)

    } catch (error) {
      console.error('STREAMING: Failed to start stream:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to start stream'
      setStreamError(errorMessage)
      setStreamStatus('offline')
      toast.error(errorMessage)
    } finally {
      setIsConnecting(false)
    }
  }

  // Stop streaming (Creator mode)
  const stopStreaming = async () => {
    try {
      setIsConnecting(true)
      
      await streamingService.stopStreaming()
      
      setStreamSession(null)
      setIsStreaming(false)
      setStreamStatus('offline')
      
      // Clear video preview
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      
      toast.success('Stream stopped')
      console.log('STREAMING: Stream stopped')

    } catch (error) {
      console.error('STREAMING: Failed to stop stream:', error)
      toast.error('Failed to stop stream')
    } finally {
      setIsConnecting(false)
    }
  }

  // Start viewing (Viewer mode) 
  const startViewing = async () => {
    if (isCreator || !videoRef.current) return

    try {
      setIsConnecting(true)
      setStreamError(null)
      setStreamStatus('connecting')

      console.log('STREAMING: Starting viewer for event', eventId)

      const session = await streamingService.startPlaying(eventId, videoRef.current)
      
      setStreamSession(session)
      setIsStreaming(true)
      setStreamStatus('live')
      
      console.log('STREAMING: Viewing started:', session)

    } catch (error) {
      console.error('STREAMING: Failed to start viewing:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to stream'
      setStreamError(errorMessage)
      setStreamStatus('offline')
      setIsStreaming(false)
    } finally {
      setIsConnecting(false)
    }
  }



  // Toggle camera
  const toggleCamera = () => {
    streamingService.toggleVideo(!isCameraOn)
    setIsCameraOn(!isCameraOn)
  }

  // Toggle microphone
  const toggleMicrophone = () => {
    streamingService.toggleAudio(!isMicOn)
    setIsMicOn(!isMicOn)
  }

  // Check if event has started
  const hasEventStarted = () => {
    return new Date() >= new Date(eventStartTime)
  }

  // Check if event has ended
  const hasEventEnded = () => {
    const endTime = new Date(new Date(eventStartTime).getTime() + eventDuration * 60 * 1000)
    return new Date() >= endTime
  }

  // Loading access verification
  if (isVerifyingAccess) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying access...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Access denied
  if (!hasAccess) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              {streamError || 'You need a valid ticket to access this stream'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Event not started
  if (!hasEventStarted()) {
    const timeUntilStart = Math.max(0, new Date(eventStartTime).getTime() - new Date().getTime())
    const hours = Math.floor(timeUntilStart / (1000 * 60 * 60))
    const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60))

    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Radio className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Event Not Started</h3>
            <p className="text-muted-foreground">
              Stream will begin in {hours > 0 ? `${hours}h ` : ''}{minutes}m
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Event ended
  if (hasEventEnded()) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <StopCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Event Ended</h3>
            <p className="text-muted-foreground">This event has concluded</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {isCreator ? 'Stream Control' : 'Live Stream'}
            {isCreator && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                <Crown className="h-3 w-3 mr-1" />
                Creator
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={streamStatus === 'live' ? 'default' : 'secondary'} className={streamStatus === 'live' ? 'bg-red-500 text-white animate-pulse' : ''}>
              {streamStatus === 'live' && <Radio className="h-3 w-3 mr-1 animate-pulse" />}
              {streamStatus.toUpperCase()}
            </Badge>
            {streamStatus === 'live' && (
              <Badge variant="outline">
                <Users className="h-3 w-3 mr-1" />
                {viewerCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Video Display */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted={isCreator} // Mute own stream to prevent feedback
            playsInline
          />
          
          {streamError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center text-white">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>{streamError}</p>
              </div>
            </div>
          )}
          
          {!isStreaming && !isConnecting && !streamError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <PlayCircle className="h-12 w-12 mx-auto mb-4" />
                <p>{isCreator ? 'Ready to stream' : 'Waiting for stream'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Creator Controls */}
        {isCreator && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Stream Controls</h4>
              <div className="flex gap-2">
                {!isStreaming ? (
                  <Button 
                    onClick={startStreaming} 
                    disabled={isConnecting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <PlayCircle className="h-4 w-4 mr-2" />
                    )}
                    Start Stream
                  </Button>
                ) : (
                  <Button 
                    onClick={stopStreaming} 
                    disabled={isConnecting}
                    variant="destructive"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <StopCircle className="h-4 w-4 mr-2" />
                    )}
                    Stop Stream
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="camera">Camera</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleCamera}
                    disabled={!isStreaming}
                  >
                    {isCameraOn ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <VideoOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Switch
                    id="camera"
                    checked={isCameraOn}
                    onCheckedChange={toggleCamera}
                    disabled={!isStreaming}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="microphone">Microphone</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMicrophone}
                    disabled={!isStreaming}
                  >
                    {isMicOn ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Switch
                    id="microphone"
                    checked={isMicOn}
                    onCheckedChange={toggleMicrophone}
                    disabled={!isStreaming}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Viewer Controls */}
        {!isCreator && hasAccess && !isStreaming && (
          <div className="flex justify-center">
            <Button 
              onClick={startViewing} 
              disabled={isConnecting}
              size="lg"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Join Stream
            </Button>
          </div>
        )}

        {/* Stream Info */}
        {streamSession && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Stream Connected</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Session: {streamSession.sessionId.slice(-8)}</div>
              <div>Event ID: {eventId}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 