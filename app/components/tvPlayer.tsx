"use client"

import type React from "react"

import { useState, useEffect, useRef, memo } from "react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { ArtCategoryIcon } from "./categoryIcons"
import { getRandomEventByCategory } from "../data/mock-events"
import { Play, Pause, Volume2, VolumeX, Tv, RefreshCw, Film, ArrowRight } from "lucide-react"

// Replace the RELIABLE_VIDEOS object with these new URLs from Vercel Blob storage
const RELIABLE_VIDEOS = {
  "standup-comedy":
    "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/mixkit-youtuber-vlogging-in-his-studio-41272-hd-ready-0rsj4lJ7mNHJy2Rv7BAlcJI31a8l9X.mp4",
  "performance-art":
    "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/1817-360-4J7GucopM3hE57hZjSwWqko3n5ULym.mp4",
  "poetry-slam": "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/2955-360-xLAcPRAAEvhA4gJV8bHULqhHaftej1.mp4",
  "open-mic": "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/29983-360-yI0kgZpZ7Bj7QUbZQGPxKmmKefwLav.mp4",
  "live-painting": "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/443-360-kRKFI1NVe7SieGyQKFPiKQin2dY8LV.mp4",
  "creative-workshop":
    "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/40367-360-LovhxrX7kcdSINyPAu7xLgWlCNmTBJ.mp4",
}

// Add a fallback video in case any of the above fail
const FALLBACK_VIDEO =
  "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/785-360-ykiufcPxRiluXzB1DWwD0VvDyM9efz.mp4"

type Category =
  | "standup-comedy"
  | "performance-art"
  | "poetry-slam"
  | "open-mic"
  | "live-painting"
  | "creative-workshop"

// Define destination paths for each category
const CATEGORY_DESTINATIONS = {
  "standup-comedy": "/ticket-kiosk?category=standup-comedy",
  "performance-art": "/ticket-kiosk?category=performance-art",
  "poetry-slam": "/ticket-kiosk?category=poetry-slam",
  "open-mic": "/ticket-kiosk?category=open-mic",
  "live-painting": "/ticket-kiosk?category=live-painting",
  "creative-workshop": "/ticket-kiosk?category=creative-workshop",
}

// Memoize the component to prevent unnecessary re-renders
export const TvPlayer = memo(function TvPlayer({ onConnect }: { onConnect: (redirectPath?: string) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<Category>("standup-comedy")
  const [currentEvent, setCurrentEvent] = useState(getRandomEventByCategory(selectedCategory))
  const [isPlaying, setIsPlaying] = useState(false) // Start with false to avoid auto-play issues
  const [isMuted, setIsMuted] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(30) // Changed from 60 to 30 seconds
  const [showPrompt, setShowPrompt] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [videoFailed, setVideoFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true) // Track if component is mounted

  // Safely play video with error handling
  const safePlayVideo = async () => {
    if (!videoRef.current || !mountedRef.current) return false

    try {
      // Make sure video is ready to play
      if (videoRef.current.readyState >= 2) {
        await videoRef.current.play()
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error("Error playing video:", error)
      return false
    }
  }

  // Simple function to start the countdown timer
  const startTimer = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Set a new timer
    timerRef.current = setInterval(() => {
      if (!mountedRef.current) return

      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // When time is up, show prompt and clear timer
          setShowPrompt(true)
          if (timerRef.current) {
            clearInterval(timerRef.current)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Change video when category changes
  useEffect(() => {
    // Reset states
    setIsLoading(true)
    setVideoFailed(false)
    setShowPrompt(false)
    setTimeRemaining(30) // Changed from 60 to 30 seconds
    setIsPlaying(false) // Set to false initially to avoid auto-play issues

    // Stop any current video playback
    if (videoRef.current) {
      videoRef.current.pause()

      // Remove any current source - important to avoid MEDIA_ELEMENT_ERROR
      videoRef.current.removeAttribute("src")
      videoRef.current.load()
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Get new event
    const getEventTitleForCategory = (category: Category) => {
      const titles = {
        "standup-comedy": [
          "Comedy Night: Laugh Out Loud",
          "Stand-up Showcase: Raw Talent",
          "Comedy Hour with Jamie Lee",
        ],
        "performance-art": [
          "Body in Motion: Contemporary Dance",
          "Performance Art: Breaking Boundaries",
          "Experimental Movement Workshop",
        ],
        "poetry-slam": ["Urban Verses: Poetry Slam", "Spoken Word Revolution", "Poetic Justice: Open Mic Night"],
        "open-mic": ["Open Mic: Discover New Talent", "Acoustic Sessions Live", "Improv Night: Unscripted"],
        "live-painting": [
          "Live Painting: Abstract Landscapes",
          "Artist at Work: Studio Session",
          "Canvas to Creation: Live Art",
        ],
        "creative-workshop": [
          "Digital Art Masterclass",
          "Creative Process Revealed",
          "Workshop: From Concept to Creation",
        ],
      }

      const categoryTitles = titles[category] || ["Event Preview"]
      return categoryTitles[Math.floor(Math.random() * categoryTitles.length)]
    }

    // When setting the current event
    const event = {
      id: Math.floor(Math.random() * 1000),
      title: getEventTitleForCategory(selectedCategory),
      creator: "artist.eth",
      category: selectedCategory,
      date: new Date().toISOString(),
      duration: 60,
      participants: Math.floor(Math.random() * 50) + 10,
      maxParticipants: 100,
      ticketPrice: Math.floor(Math.random() * 15) + 5,
      description: "Join this amazing event and experience art in its creation.",
      image: "/placeholder.svg?height=200&width=400",
    }
    setCurrentEvent(event)

    // Set a small timeout to ensure DOM has updated before we try to load new video
    setTimeout(() => {
      if (!mountedRef.current || !videoRef.current) return

      // Now set the new source
      videoRef.current.src = RELIABLE_VIDEOS[selectedCategory]
      videoRef.current.load()
    }, 50)

    return () => {
      // Clean up timer when component unmounts or category changes
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [selectedCategory])

  // Handle video loaded event
  const handleVideoLoaded = () => {
    if (!mountedRef.current) return

    setIsLoading(false)
    setVideoFailed(false)

    // Try to play video after it's loaded
    safePlayVideo().then((success) => {
      if (!mountedRef.current) return

      if (success) {
        setIsPlaying(true)
        // Start the timer when video starts playing
        startTimer()
      } else {
        setIsPlaying(false)
      }
    })
  }

  // Handle video error
  const handleVideoError = () => {
    if (!mountedRef.current) return

    console.error("Video failed to load")
    setIsLoading(false)

    // Try to use the fallback video instead of immediately showing the error state
    if (videoRef.current) {
      console.log("Attempting to use fallback video")
      videoRef.current.pause()
      videoRef.current.removeAttribute("src")
      videoRef.current.load()

      // Set fallback source after a small delay
      setTimeout(() => {
        if (!mountedRef.current || !videoRef.current) return

        videoRef.current.src = FALLBACK_VIDEO
        videoRef.current.load()

        // Try to play the fallback video
        videoRef.current.play().catch((err) => {
          console.error("Fallback video also failed:", err)
          setVideoFailed(true)
          setIsPlaying(false)
        })
      }, 50)
    } else {
      setVideoFailed(true)
      setIsPlaying(false)
    }

    // Clear timer if video fails
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
  }

  // Handle play/pause
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event from bubbling up
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)

      // Pause timer when video is paused
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    } else {
      safePlayVideo().then((success) => {
        if (!mountedRef.current) return

        if (success) {
          setIsPlaying(true)
          // Restart timer when video is played
          startTimer()
        }
      })
    }
  }

  // Handle mute/unmute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event from bubbling up
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Refresh video
  const refreshVideo = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event from bubbling up
    if (!mountedRef.current) return

    setIsLoading(true)
    setVideoFailed(false)
    setShowPrompt(false)
    setTimeRemaining(30) // Changed from 60 to 30 seconds
    setIsPlaying(false)

    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Get new event
    const getEventTitleForCategory = (category: Category) => {
      const titles = {
        "standup-comedy": [
          "Comedy Night: Laugh Out Loud",
          "Stand-up Showcase: Raw Talent",
          "Comedy Hour with Jamie Lee",
        ],
        "performance-art": [
          "Body in Motion: Contemporary Dance",
          "Performance Art: Breaking Boundaries",
          "Experimental Movement Workshop",
        ],
        "poetry-slam": ["Urban Verses: Poetry Slam", "Spoken Word Revolution", "Poetic Justice: Open Mic Night"],
        "open-mic": ["Open Mic: Discover New Talent", "Acoustic Sessions Live", "Improv Night: Unscripted"],
        "live-painting": [
          "Live Painting: Abstract Landscapes",
          "Artist at Work: Studio Session",
          "Canvas to Creation: Live Art",
        ],
        "creative-workshop": [
          "Digital Art Masterclass",
          "Creative Process Revealed",
          "Workshop: From Concept to Creation",
        ],
      }

      const categoryTitles = titles[category] || ["Event Preview"]
      return categoryTitles[Math.floor(Math.random() * categoryTitles.length)]
    }

    // When setting the current event
    const event = {
      id: Math.floor(Math.random() * 1000),
      title: getEventTitleForCategory(selectedCategory),
      creator: "artist.eth",
      category: selectedCategory,
      date: new Date().toISOString(),
      duration: 60,
      participants: Math.floor(Math.random() * 50) + 10,
      maxParticipants: 100,
      ticketPrice: Math.floor(Math.random() * 15) + 5,
      description: "Join this amazing event and experience art in its creation.",
      image: "/placeholder.svg?height=200&width=400",
    }
    setCurrentEvent(event)

    // Stop any current video playback
    if (videoRef.current) {
      videoRef.current.pause()

      // Remove any current source
      videoRef.current.removeAttribute("src")
      videoRef.current.load()

      // Set new source after a small delay
      setTimeout(() => {
        if (!mountedRef.current || !videoRef.current) return

        videoRef.current.src = RELIABLE_VIDEOS[selectedCategory]
        videoRef.current.load()
      }, 50)
    }
  }

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Handle video click to connect and redirect
  const handleVideoClick = () => {
    // Always trigger the connect action when video is clicked, regardless of showPrompt state
    const destinationPath = CATEGORY_DESTINATIONS[selectedCategory]
    onConnect(destinationPath)
  }

  // Handle connect button click
  const handleConnectClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event from bubbling up
    const destinationPath = CATEGORY_DESTINATIONS[selectedCategory]
    onConnect(destinationPath)
  }

  // Set up mounted ref for cleanup
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false

      // Clean up timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // Stop any playback
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.removeAttribute("src")
      }
    }
  }, [])

  // Handle video state changes
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    // Add event listeners
    videoElement.addEventListener("play", handlePlay)
    videoElement.addEventListener("pause", handlePause)

    return () => {
      // Clean up event listeners
      videoElement.removeEventListener("play", handlePlay)
      videoElement.removeEventListener("pause", handlePause)
    }
  }, [])

  return (
    <Card className="overflow-hidden border-2 border-primary/20 shadow-lg w-full">
      <div className="relative aspect-video w-full max-h-[400px] md:max-h-[500px] lg:max-h-[600px]">
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Video failed state */}
        {videoFailed ? (
          <div className="w-full h-full bg-black flex flex-col items-center justify-center text-white p-4">
            <Film className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-xl font-medium mb-2 text-white bauhaus-text">VIDEO PREVIEW</h3>
            <p className="text-base text-gray-200 mb-6 max-w-xs text-center">
              Connect your wallet to watch live performances in this category
            </p>
            <Button
              variant="default"
              className="bg-primary hover:bg-primary/90 text-white font-medium"
              onClick={refreshVideo}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              TRY AGAIN
            </Button>
          </div>
        ) : (
          <div className="w-full h-full relative cursor-pointer" onClick={handleVideoClick}>
            <video
              ref={videoRef}
              className="w-full h-full object-contain bg-black"
              loop
              muted={isMuted}
              playsInline
              onLoadedData={handleVideoLoaded}
              onError={handleVideoError}
              poster="/placeholder.svg?height=400&width=600"
              preload="auto"
            >
              {/* Add source element with explicit type for better browser compatibility */}
              <source src={RELIABLE_VIDEOS[selectedCategory]} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Wallet connection prompt */}
        {showPrompt && (
          <div
            className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 sm:p-6 text-center z-20 cursor-pointer"
            onClick={handleVideoClick}
          >
            <Tv className="h-12 w-12 sm:h-16 sm:w-16 text-primary mb-3 sm:mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3 bauhaus-text">
              SEE MORE. ENTER THE HAUS.
            </h3>
            <p className="text-base sm:text-lg text-gray-200 mb-6 sm:mb-8 max-w-md">
              Connect your wallet to access full performances and join the community.
            </p>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white font-medium px-6 py-2 sm:px-8 sm:py-6 text-base sm:text-lg group"
              onClick={handleConnectClick}
            >
              CONNECT WALLET
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}

        {/* Video controls */}
        {!videoFailed && !showPrompt && (
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center z-10">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10 p-0"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10 p-0"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10 p-0"
                onClick={refreshVideo}
              >
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-white text-xs sm:text-sm">{formatTime(timeRemaining)}</span>
              <div className="w-16 sm:w-24 h-1 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(timeRemaining / 30) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Event info */}
        {!videoFailed && !showPrompt && (
          <div className="absolute top-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium text-sm sm:text-base truncate max-w-[200px] sm:max-w-none bauhaus-text">
                  {currentEvent.title.toUpperCase()}
                </h3>
                <p className="text-gray-300 text-xs sm:text-sm">by {currentEvent.creator}</p>
              </div>
              <ArtCategoryIcon category={selectedCategory} size="sm" className="text-primary bg-white/10 p-1 rounded" />
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-0">
        <Tabs defaultValue={selectedCategory} className="w-full">
          <TabsList className="grid grid-cols-3 xs:grid-cols-6 rounded-none h-auto">
            <TabsTrigger
              value="standup-comedy"
              onClick={() => setSelectedCategory("standup-comedy")}
              className="data-[state=active]:bg-primary/10 py-2 px-1 sm:px-2 flex justify-center items-center h-12"
            >
              <ArtCategoryIcon
                category="standup-comedy"
                size="sm"
                className={selectedCategory === "standup-comedy" ? "text-primary" : "text-muted-foreground"}
              />
              <span className="sr-only">Comedy</span>
            </TabsTrigger>
            <TabsTrigger
              value="performance-art"
              onClick={() => setSelectedCategory("performance-art")}
              className="data-[state=active]:bg-primary/10 py-2 px-1 sm:px-2 flex justify-center items-center h-12"
            >
              <ArtCategoryIcon
                category="performance-art"
                size="sm"
                className={selectedCategory === "performance-art" ? "text-primary" : "text-muted-foreground"}
              />
              <span className="sr-only">Performance</span>
            </TabsTrigger>
            <TabsTrigger
              value="poetry-slam"
              onClick={() => setSelectedCategory("poetry-slam")}
              className="data-[state=active]:bg-primary/10 py-2 px-1 sm:px-2 flex justify-center items-center h-12"
            >
              <ArtCategoryIcon
                category="poetry-slam"
                size="sm"
                className={selectedCategory === "poetry-slam" ? "text-primary" : "text-muted-foreground"}
              />
              <span className="sr-only">Poetry</span>
            </TabsTrigger>
            <TabsTrigger
              value="open-mic"
              onClick={() => setSelectedCategory("open-mic")}
              className="data-[state=active]:bg-primary/10 py-2 px-1 sm:px-2 flex justify-center items-center h-12"
            >
              <ArtCategoryIcon
                category="open-mic"
                size="sm"
                className={selectedCategory === "open-mic" ? "text-primary" : "text-muted-foreground"}
              />
              <span className="sr-only">Open Mic</span>
            </TabsTrigger>
            <TabsTrigger
              value="live-painting"
              onClick={() => setSelectedCategory("live-painting")}
              className="data-[state=active]:bg-primary/10 py-2 px-1 sm:px-2 flex justify-center items-center h-12"
            >
              <ArtCategoryIcon
                category="live-painting"
                size="sm"
                className={selectedCategory === "live-painting" ? "text-primary" : "text-muted-foreground"}
              />
              <span className="sr-only">Painting</span>
            </TabsTrigger>
            <TabsTrigger
              value="creative-workshop"
              onClick={() => setSelectedCategory("creative-workshop")}
              className="data-[state=active]:bg-primary/10 py-2 px-1 sm:px-2 flex justify-center items-center h-12"
            >
              <ArtCategoryIcon
                category="creative-workshop"
                size="sm"
                className={selectedCategory === "creative-workshop" ? "text-primary" : "text-muted-foreground"}
              />
              <span className="sr-only">Workshop</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  )
})
