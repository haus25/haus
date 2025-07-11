"use client"

import { useState, useEffect, useRef } from "react"
import { fetchVideoManifest, generateHlsPlaylist, type VideoManifest } from "../../utils/video-storage"
import Hls from "hls.js"
import { Button } from "../ui/button"
import { Slider } from "../ui/slider"
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react"

interface VideoPlayerProps {
  manifestCid: string
  autoPlay?: boolean
  onTip?: (amount: number) => void
}

export default function VideoPlayer({ manifestCid, autoPlay = false, onTip }: VideoPlayerProps) {
  const [manifest, setManifest] = useState<VideoManifest | null>(null)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const playlistBlobUrlRef = useRef<string | null>(null)
  const manifestRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load manifest and set up HLS player
  useEffect(() => {
    let isMounted = true

    const loadManifest = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch manifest from IPFS
        const videoManifest = await fetchVideoManifest(manifestCid)
        if (!isMounted) return

        setManifest(videoManifest)
        setIsLive(videoManifest.status === "live")

        // Generate HLS playlist
        const playlist = generateHlsPlaylist(videoManifest)

        // Create blob URL for the playlist
        const blob = new Blob([playlist], { type: "application/vnd.apple.mpegurl" })
        const playlistUrl = URL.createObjectURL(blob)

        // Store for cleanup
        if (playlistBlobUrlRef.current) {
          URL.revokeObjectURL(playlistBlobUrlRef.current)
        }
        playlistBlobUrlRef.current = playlistUrl

        // Set up HLS.js if supported
        if (Hls.isSupported() && videoRef.current) {
          if (hlsRef.current) {
            hlsRef.current.destroy()
          }

          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: videoManifest.status === "live",
            backBufferLength: 90,
          })

          hls.loadSource(playlistUrl)
          hls.attachMedia(videoRef.current)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (isMounted) {
              setIsLoading(false)
              if (autoPlay && videoRef.current) {
                videoRef.current.play().catch(console.error)
              }
            }
          })

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error("Network error:", data)
                  hls.startLoad()
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error("Media error:", data)
                  hls.recoverMediaError()
                  break
                default:
                  if (isMounted) {
                    setError("Failed to load video")
                  }
                  hls.destroy()
                  break
              }
            }
          })

          hlsRef.current = hls
        } else if (videoRef.current && videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
          // For Safari which has built-in HLS support
          videoRef.current.src = playlistUrl
          setIsLoading(false)
        } else {
          setError("HLS playback not supported in this browser")
        }

        // Set up periodic refresh for live streams
        if (videoManifest.status === "live" && !manifestRefreshIntervalRef.current) {
          manifestRefreshIntervalRef.current = setInterval(loadManifest, 10000)
        } else if (videoManifest.status !== "live" && manifestRefreshIntervalRef.current) {
          clearInterval(manifestRefreshIntervalRef.current)
          manifestRefreshIntervalRef.current = null
        }
      } catch (err) {
        console.error("Error loading video:", err)
        if (isMounted) {
          setError("Failed to load video")
          setIsLoading(false)
        }
      }
    }

    loadManifest()

    return () => {
      isMounted = false
      if (manifestRefreshIntervalRef.current) {
        clearInterval(manifestRefreshIntervalRef.current)
      }
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
      if (playlistBlobUrlRef.current) {
        URL.revokeObjectURL(playlistBlobUrlRef.current)
      }
    }
  }, [manifestCid, autoPlay])

  // Handle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch(console.error)
      }
    }
  }

  // Handle mute/unmute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
  }

  // Handle seeking
  const handleSeek = (value: number[]) => {
    const newTime = value[0]
    setCurrentTime(newTime)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }
  }

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error)
    } else {
      document.exitFullscreen().catch(console.error)
    }
  }

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Handle video events
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => setCurrentTime(videoElement.currentTime)
    const handleDurationChange = () => setDuration(videoElement.duration)
    const handleVolumeChange = () => {
      setVolume(videoElement.volume)
      setIsMuted(videoElement.muted)
    }

    videoElement.addEventListener("play", handlePlay)
    videoElement.addEventListener("pause", handlePause)
    videoElement.addEventListener("timeupdate", handleTimeUpdate)
    videoElement.addEventListener("durationchange", handleDurationChange)
    videoElement.addEventListener("volumechange", handleVolumeChange)

    return () => {
      videoElement.removeEventListener("play", handlePlay)
      videoElement.removeEventListener("pause", handlePause)
      videoElement.removeEventListener("timeupdate", handleTimeUpdate)
      videoElement.removeEventListener("durationchange", handleDurationChange)
      videoElement.removeEventListener("volumechange", handleVolumeChange)
    }
  }, [])

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Handle tipping
  const handleTip = (amount: number) => {
    if (onTip) {
      onTip(amount)
    }
  }

  return (
    <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-75">
          <div className="text-center">
            <p className="text-xl">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      )}

      <video ref={videoRef} className="w-full aspect-video" playsInline onClick={togglePlay} />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={togglePlay}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </Button>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={toggleMute}>
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </Button>

              <div className="w-24 hidden sm:block">
                <Slider value={[volume]} min={0} max={1} step={0.01} onValueChange={handleVolumeChange} />
              </div>
            </div>

            {!isLive && (
              <div className="hidden sm:flex items-center space-x-2">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            )}

            {isLive && (
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                <span>LIVE</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {onTip && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white border-white hover:bg-white/20"
                  onClick={() => handleTip(0.1)}
                >
                  Tip 0.1 SOL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white border-white hover:bg-white/20"
                  onClick={() => handleTip(1)}
                >
                  Tip 1 SOL
                </Button>
              </div>
            )}

            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={toggleFullscreen}>
              <Maximize size={20} />
            </Button>
          </div>
        </div>

        {!isLive && (
          <div className="mt-2">
            <Slider value={[currentTime]} min={0} max={duration || 100} step={1} onValueChange={handleSeek} />
          </div>
        )}
      </div>
    </div>
  )
}
