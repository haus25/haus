"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWalletClient } from 'wagmi'
import { Navbar } from "../components/navbar"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Label } from "../components/ui/label"
import { RadioGroup, RadioGroupItem } from "../components/ui/radioGroup"
import { Checkbox } from "../components/ui/checkbox"
import { ArtCategoryIcon } from "../components/categoryIcons"
import { Calendar } from "../components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover"
import { cn } from "../lib/utils"
import { format } from "date-fns"
import { X, CalendarIcon, Clock, Plus, Loader2 } from "lucide-react"
import { Breadcrumbs } from "../components/breadcrumbs"
import { QuickAccess } from "../components/quickAccess"
import { useAuth } from "../contexts/auth"
import { useEvents } from "../contexts/events"
import { createEventFactoryService, type EventFormData } from "../services/create"
import { streamingService } from "../services/streaming"


type Step = "category" | "details" | "format" | "sales" | "mint"
type Category =
  | "standup-comedy"
  | "performance-art"
  | "poetry-slam"
  | "open-mic"
  | "live-painting"
  | "creative-workshop"
type SaleType = "cumulative-tips" | "blind-auction" | "quadratic-tipping"
type Duration = 15 | 30 | 60

export default function EventFactory() {
  const router = useRouter()
  const { userProfile, isConnected } = useAuth()
  const { addEvent } = useEvents()
  const { data: walletClient, error: walletClientError } = useWalletClient()

  const [step, setStep] = useState<Step>("details")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string>("")
  const [creationProgress, setCreationProgress] = useState<{
    currentStep: string;
    completedSteps: string[];
    txHash?: string;
    eventId?: number;
    ticketFactoryAddress?: string;
    isComplete: boolean;
  }>({
    currentStep: "",
    completedSteps: [],
    isComplete: false
  })
  const [formData, setFormData] = useState({
    category: "" as Category,
    title: "",
    description: "",
    banner: null as File | null,
    date: null as Date | null,
    time: "19:00",
    duration: 30 as Duration,
    saleType: "cumulative-tips" as SaleType,
    reservePrice: 6, // Default based on duration/5
    useCustomReservePrice: false,
    ticketsAmount: 100,
    ticketPrice: 6, // Default based on duration/5
    useCustomTicketPrice: false,
    noCap: false,
  })
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string>("")

  // Update default prices when duration changes
  useEffect(() => {
    const defaultPrice = formData.duration / 5

    if (!formData.useCustomReservePrice) {
      setFormData((prev) => ({ ...prev, reservePrice: defaultPrice }))
    }

    if (!formData.useCustomTicketPrice) {
      setFormData((prev) => ({ ...prev, ticketPrice: defaultPrice }))
    }
  }, [formData.duration, formData.useCustomReservePrice, formData.useCustomTicketPrice])

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFormData((prev) => ({ ...prev, banner: file }))

      // Create a preview URL for the image
      const url = URL.createObjectURL(file)
      setBannerPreviewUrl(url)
    }
  }

  const updateCreationProgress = (currentStep: string, completedSteps?: string[]) => {
    setCreationProgress(prev => ({
      ...prev,
      currentStep,
      completedSteps: completedSteps || [...prev.completedSteps, prev.currentStep].filter(Boolean)
    }))
  }

  const handleNext = async () => {
    if (step === "details") setStep("category")
    else if (step === "category") setStep("format")
    else if (step === "format") setStep("sales")
    else if (step === "sales") setStep("mint")
    else if (step === "mint") {
      await createEventOnBlockchain()
    }
  }

  const createEventOnBlockchain = async () => {
    if (!isConnected || !userProfile?.address || !walletClient) {
      const errorMsg = !isConnected ? "Please connect your wallet first" : 
                      !userProfile?.address ? "User profile not loaded" :
                      !walletClient ? "Wallet client not available" : "Unknown wallet error"
      setError(errorMsg)
      return
    }

    if (!formData.title || !formData.date || !formData.category) {
      setError("Please fill in all required fields")
      return
    }

    setIsCreating(true)
    setError("")
    setCreationProgress({
      currentStep: "Initializing",
      completedSteps: [],
      isComplete: false
    })

    try {
      console.log("EVENT_CREATION: Starting blockchain event creation process")
      console.log("EVENT_CREATION: Wallet client initialized:", !!walletClient)
      console.log("EVENT_CREATION: User address:", userProfile.address)
      console.log("EVENT_CREATION: Network connected:", isConnected)
      
      if (walletClientError) {
        console.error("EVENT_CREATION: Wallet client error:", walletClientError)
        throw new Error(`Wallet client error: ${walletClientError.message}`)
      }

      // Step 1: Initialize service
      updateCreationProgress("Initializing service connection")
      console.log("EVENT_CREATION: Creating EventFactory service instance")
      const eventFactoryService = createEventFactoryService(walletClient)
      
      // Step 2: Prepare form data
      updateCreationProgress("Preparing event data")
      console.log("EVENT_CREATION: Preparing event form data")
      const eventFormData: EventFormData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        banner: formData.banner,
        date: formData.date,
        time: formData.time,
        duration: formData.duration,
        reservePrice: formData.reservePrice,
        ticketsAmount: formData.ticketsAmount,
        ticketPrice: formData.ticketPrice,
        noCap: formData.noCap,
      }

      console.log("EVENT_CREATION: Event parameters:")
      console.log("EVENT_CREATION: - Title:", eventFormData.title)
      console.log("EVENT_CREATION: - Category:", eventFormData.category)
      console.log("EVENT_CREATION: - Duration:", eventFormData.duration, "minutes")
      console.log("EVENT_CREATION: - Reserve price:", eventFormData.reservePrice, "SEI")
      console.log("EVENT_CREATION: - Ticket price:", eventFormData.ticketPrice, "SEI")
      console.log("EVENT_CREATION: - Max tickets:", eventFormData.noCap ? "unlimited" : eventFormData.ticketsAmount)

      // Step 3: Execute blockchain transaction
      updateCreationProgress("Executing blockchain transaction")
      console.log("EVENT_CREATION: Calling createEvent on CreationWrapper contract")
      console.log("EVENT_CREATION: This single transaction will:")
      console.log("EVENT_CREATION: 1. Mint RTA NFT")
      console.log("EVENT_CREATION: 2. Deploy TicketFactory contract")
      
      const contractEventData = await eventFactoryService.createEvent(
        eventFormData,
        userProfile.address
      )

      console.log("EVENT_CREATION: Transaction completed successfully")
      console.log("EVENT_CREATION: Transaction hash:", contractEventData.txHash)
      console.log("EVENT_CREATION: Event ID:", contractEventData.eventId)
      console.log("EVENT_CREATION: TicketFactory address:", contractEventData.ticketFactoryAddress)
      console.log("EVENT_CREATION: Metadata URI:", contractEventData.metadataURI)

      // Step 4: Reserve streaming URL
      updateCreationProgress("Reserving streaming URL")
      console.log("EVENT_CREATION: Reserving streaming URL for live event")
      
      const eventDate = formData.date ? 
        new Date(
          formData.date.setHours(
            Number.parseInt(formData.time.split(":")[0]),
            Number.parseInt(formData.time.split(":")[1]),
          ),
        ) : new Date()

      const streamReservation = await streamingService.reserveStreamUrl(
        contractEventData.eventId.toString(),
        eventDate.toISOString(),
        formData.duration
      )

      console.log("EVENT_CREATION: Stream URL reserved:", streamReservation.eventRoomUrl)

      // Step 5: Update local state
      updateCreationProgress("Updating application state")
      console.log("EVENT_CREATION: Creating local event object for state management")
      
      // Get the uploaded Banner URL from the metadata
      let eventImageUrl = "/placeholder.svg?height=200&width=400"
      
      try {
        // Fetch the metadata from IPFS to get the actual image URL
        const metadataUri = contractEventData.metadataURI
        console.log("EVENT_CREATION: Fetching metadata from:", metadataUri)
        
        if (metadataUri.startsWith('ipfs://')) {
          // Convert IPFS URI to gateway URL for fetching
          const ipfsHash = metadataUri.slice(7) // Remove 'ipfs://' prefix
          const gatewayUrl = `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsHash}`
          
          console.log("EVENT_CREATION: Fetching metadata from gateway:", gatewayUrl)
          
          const metadataResponse = await fetch(gatewayUrl)
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json()
            if (metadata.image) {
              eventImageUrl = metadata.image
              console.log("EVENT_CREATION: Using image URL from metadata:", eventImageUrl)
            }
          } else {
            console.warn("EVENT_CREATION: Failed to fetch metadata, using placeholder")
          }
        }
      } catch (error) {
        console.warn("EVENT_CREATION: Could not fetch metadata for image URL:", error)
      }
      
      const localEvent = {
        id: contractEventData.eventId.toString(),
        title: formData.title,
        creator: userProfile?.displayName || userProfile?.name || userProfile.address,
        creatorAddress: userProfile.address,
        category: formData.category,
        date: formData.date
          ? new Date(
              formData.date.setHours(
                Number.parseInt(formData.time.split(":")[0]),
                Number.parseInt(formData.time.split(":")[1]),
              ),
            ).toISOString()
          : new Date().toISOString(),
        duration: formData.duration,
        participants: 0,
        maxParticipants: formData.noCap ? 1000 : formData.ticketsAmount,
        ticketPrice: formData.ticketPrice,
        description: formData.description || "No description provided",
        image: eventImageUrl, // Use the actual IPFS URL instead of blob URL
        status: "upcoming" as const,
        contractEventId: contractEventData.eventId,
        ticketFactoryAddress: contractEventData.ticketFactoryAddress,
        txHash: contractEventData.txHash,
        metadataURI: contractEventData.metadataURI,
      }

      addEvent(localEvent)
      console.log("EVENT_CREATION: Event added to global application state")

      // Step 6: Complete
      setCreationProgress({
        currentStep: "Complete",
        completedSteps: ["Initializing", "Preparing event data", "Executing blockchain transaction", "Reserving streaming URL", "Updating application state"],
        txHash: contractEventData.txHash,
        eventId: contractEventData.eventId,
        ticketFactoryAddress: contractEventData.ticketFactoryAddress,
        isComplete: true
      })

      console.log("EVENT_CREATION: Process completed successfully")
      console.log("EVENT_CREATION: User can now view their event in the event market")

    } catch (error: any) {
      console.error("EVENT_CREATION: Error during event creation:", error)
      console.error("EVENT_CREATION: Error details:", {
        message: error.message,
        stack: error.stack,
        code: error.code
      })
      setError(error.message || 'Failed to create event. Please try again.')
      setCreationProgress({
        currentStep: "Error",
        completedSteps: [],
        isComplete: false
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleBack = () => {
    if (step === "category") setStep("details")
    else if (step === "format") setStep("category")
    else if (step === "sales") setStep("format")
    else if (step === "mint") setStep("sales")
  }

  const toggleCustomReservePrice = (checked: boolean) => {
    updateFormData({
      useCustomReservePrice: checked,
      reservePrice: checked ? formData.reservePrice : formData.duration / 5,
    })
  }

  const toggleCustomTicketPrice = (checked: boolean) => {
    updateFormData({
      useCustomTicketPrice: checked,
      ticketPrice: checked ? formData.ticketPrice : formData.duration / 5,
    })
  }

  const renderStepContent = () => {
    switch (step) {
      case "category":
        return (
          <div>
            <h2 className="text-2xl font-bold mb-8">Choose a Category</h2>
            <div className="grid grid-cols-2 gap-6">
              {[
                { id: "standup-comedy", label: "Standup Comedy" },
                { id: "performance-art", label: "Performance Art" },
                { id: "poetry-slam", label: "Poetry Slam" },
                { id: "open-mic", label: "Open Mic/Improv" },
                { id: "live-painting", label: "Live Painting" },
                { id: "creative-workshop", label: "Creative Workshop" },
              ].map((category) => (
                <div
                  key={category.id}
                  className={`border rounded-lg p-6 cursor-pointer transition-all flex flex-col items-center justify-center ${
                    formData.category === category.id ? "border-primary" : "hover:border-muted-foreground"
                  }`}
                  onClick={() => updateFormData({ category: category.id as Category })}
                >
                  <ArtCategoryIcon category={category.id as any} size="lg" className="mb-4 text-foreground" />
                  <span className="text-lg">{category.label}</span>
                </div>
              ))}
            </div>
          </div>
        )

      case "details":
        return (
          <div>
            <h2 className="text-2xl font-bold mb-8">Your Event</h2>
            <div className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Event title..."
                  value={formData.title}
                  onChange={(e) => updateFormData({ title: e.target.value })}
                  className="border"
                />
                <div className="text-right text-xs text-muted-foreground">{formData.title.length}/50 characters</div>
              </div>

              <div className="space-y-2">
                <Label>Banner Image</Label>
                <div className="border rounded-lg p-4 h-40 flex flex-col items-center justify-center">
                  {formData.banner ? (
                    <div className="relative w-full h-full">
                      <img
                        src={bannerPreviewUrl || "/placeholder.svg"}
                        alt="Event banner"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => {
                          updateFormData({ banner: null })
                          setBannerPreviewUrl("")
                        }}
                        className="absolute top-2 right-2 bg-background/80 p-1 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2">
                        <Plus className="h-8 w-8" />
                      </div>
                      <p className="text-center text-sm mb-2">Add Event Banner</p>
                      <p className="text-xs text-muted-foreground mb-2">Recommended size: 1200×630px</p>
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="banner-upload"
                        onChange={handleFileChange}
                      />
                      <Label htmlFor="banner-upload" className="cursor-pointer text-primary text-sm">
                        Browse files
                      </Label>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your event..."
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  className="min-h-32 border"
                />
                <div className="text-right text-xs text-muted-foreground">
                  {formData.description.length}/600 characters
                </div>
              </div>
            </div>
          </div>
        )

      case "format":
        return (
          <div>
            <h2 className="text-2xl font-bold mb-8">Event Format</h2>
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-xl font-medium">Date & Time</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Event Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.date && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.date ? format(formData.date, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.date || undefined}
                          onSelect={(date) => updateFormData({ date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Event Time</Label>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => updateFormData({ time: e.target.value })}
                        className="border"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-medium">Duration</h3>
                <p className="text-sm text-muted-foreground">
                  Select how long your event will last. This will affect the default pricing.
                </p>

                <div className="flex space-x-4">
                  {[15, 30, 60].map((duration) => (
                    <button
                      key={duration}
                      className={`border rounded-lg p-4 flex items-center ${
                        formData.duration === duration ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => updateFormData({ duration: duration as Duration })}
                    >
                      <span className="mr-2">{duration}</span>
                      <span>minutes</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case "sales":
        return (
          <div>
            <h2 className="text-2xl font-bold mb-8">Sale Type</h2>
            <div className="space-y-8">
              <div className="space-y-4">
                <RadioGroup
                  value={formData.saleType}
                  onValueChange={(value) => updateFormData({ saleType: value as SaleType })}
                >
                  <div
                    className={`border rounded-lg p-4 mb-4 ${formData.saleType === "cumulative-tips" ? "border-primary" : ""}`}
                  >
                    <div className="flex items-center mb-2">
                      <RadioGroupItem value="cumulative-tips" id="cumulative-tips" />
                      <Label htmlFor="cumulative-tips" className="ml-2 font-medium">
                        Cumulative Tips
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      Artwork value accumulates from all tips received during the event.
                    </p>
                  </div>

                  <div className="border rounded-lg p-4 mb-4 opacity-50 cursor-not-allowed">
                    <div className="flex items-center mb-2">
                      <RadioGroupItem value="blind-auction" id="blind-auction" disabled />
                      <Label htmlFor="blind-auction" className="ml-2 font-medium">
                        Blind Auction
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      Viewers bid on the artwork without seeing others' bids.
                    </p>
                  </div>

                  <div className="border rounded-lg p-4 opacity-50 cursor-not-allowed">
                    <div className="flex items-center mb-2">
                      <RadioGroupItem value="quadratic-tipping" id="quadratic-tipping" disabled />
                      <Label htmlFor="quadratic-tipping" className="ml-2 font-medium">
                        Quadratic Tipping
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      The impact of tips scales with the square root of the amount, favoring many small tips over few
                      large ones.
                    </p>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-medium">Reserve Price</h3>
                <p className="text-sm text-muted-foreground">
                  The minimum amount required to claim ownership of the RTA after the event.
                </p>

                <div className="flex flex-col space-y-4">
                  <div className="flex space-x-4">
                    {[20, 50, 100].map((price) => (
                      <button
                        key={price}
                        className={`border rounded-lg p-4 flex items-center ${
                          formData.reservePrice === price && formData.useCustomReservePrice
                            ? "border-primary bg-primary/5"
                            : ""
                        }`}
                        onClick={() => updateFormData({ reservePrice: price, useCustomReservePrice: true })}
                      >
                        <span className="mr-2">{price}</span>
                        <span>SEI</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="custom-reserve"
                      checked={formData.useCustomReservePrice}
                      onCheckedChange={(checked) => toggleCustomReservePrice(checked === true)}
                    />
                    <Label htmlFor="custom-reserve">Custom price</Label>

                    <div className="flex items-center border rounded-lg p-2 ml-4">
                      <Input
                        type="number"
                        className="w-16 h-8 border-0"
                        value={formData.reservePrice}
                        onChange={(e) => updateFormData({ reservePrice: Number.parseInt(e.target.value) || 0 })}
                        disabled={!formData.useCustomReservePrice}
                      />
                      <span className="ml-2">SEI</span>
                    </div>
                  </div>

                  <div className="flex items-center p-2 bg-muted/30 rounded-md">
                    <span className="text-sm text-muted-foreground">
                      Default price: {formData.duration / 5} SEI (based on duration)
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-medium">Tickets Amount</h3>
                <div className="flex items-center space-x-4">
                  <Input
                    type="number"
                    className="w-24"
                    value={formData.noCap ? "" : formData.ticketsAmount}
                    onChange={(e) => updateFormData({ ticketsAmount: Number.parseInt(e.target.value) || 0 })}
                    disabled={formData.noCap}
                  />
                  <span># participants</span>
                  <div className="flex items-center space-x-2 ml-4">
                    <Checkbox
                      id="no-cap"
                      checked={formData.noCap}
                      onCheckedChange={(checked) => updateFormData({ noCap: checked === true })}
                    />
                    <Label htmlFor="no-cap">No cap</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-medium">Ticket Price</h3>

                <div className="flex flex-col space-y-4">
                  <RadioGroup
                    value={formData.useCustomTicketPrice ? "custom" : "default"}
                    onValueChange={(value) => {
                      if (value === "default") {
                        toggleCustomTicketPrice(false)
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="default" id="default-price" />
                      <Label htmlFor="default-price">Default price ({formData.duration / 5} SEI)</Label>
                    </div>
                  </RadioGroup>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="custom-ticket"
                      checked={formData.useCustomTicketPrice}
                      onCheckedChange={(checked) => toggleCustomTicketPrice(checked === true)}
                    />
                    <Label htmlFor="custom-ticket">Custom price</Label>

                    <div className="flex items-center border rounded-lg p-2 ml-4">
                      <Input
                        type="number"
                        className="w-16 h-8 border-0"
                        value={formData.ticketPrice}
                        onChange={(e) => updateFormData({ ticketPrice: Number.parseInt(e.target.value) || 0 })}
                        disabled={!formData.useCustomTicketPrice}
                      />
                      <span className="ml-2">SEI</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  * The ticket price gives attendees access to the live event and the ability to tip during the
                  performance.
                </p>
              </div>
            </div>
          </div>
        )

      case "mint":
        return (
          <div>
            <h2 className="text-2xl font-bold mb-8">Mint Your Event</h2>
            <div className="space-y-8">
              {error && (
                <div className="border border-red-500 rounded-lg p-4 bg-red-50 text-red-700">
                  <h4 className="font-medium">Error</h4>
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              {!creationProgress.isComplete ? (
                <div className="border rounded-lg p-8 text-center">
                  <h3 className="text-2xl mb-4">Ready to Mint Your Event</h3>
                  <p className="text-muted-foreground mb-6">
                    Your event details are complete. Click the button below to mint your event NFT on the Sei blockchain
                    and deploy all necessary smart contracts.
                  </p>
                  
                  {!isConnected || !walletClient ? (
                    <div className="mb-6">
                      <p className="text-red-600 mb-4">Please connect your wallet to continue</p>
                    </div>
                  ) : null}
                  
                  <Button
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleNext}
                    disabled={isCreating || !isConnected || !walletClient}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Event...
                      </>
                    ) : (
                      "Mint Event NFT"
                    )}
                  </Button>
                  
                  {isCreating && (
                    <div className="mt-6 text-left">
                      <p className="text-sm text-muted-foreground mb-4">Creation Progress:</p>
                      <div className="space-y-3">
                        {[
                          "Initializing service connection",
                          "Preparing event data", 
                          "Executing blockchain transaction",
                          "Reserving streaming URL",
                          "Updating application state"
                        ].map((stepName, index) => {
                          const isCompleted = creationProgress.completedSteps.includes(stepName)
                          const isCurrent = creationProgress.currentStep === stepName
                          const isUpcoming = !isCompleted && !isCurrent
                          
                          return (
                            <div key={stepName} className="flex items-center space-x-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                isCompleted ? "bg-green-500 text-white" :
                                isCurrent ? "bg-primary text-white" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {isCompleted ? "✓" : 
                                 isCurrent ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                 index + 1}
                              </div>
                              <span className={`text-sm ${
                                isCompleted ? "text-green-600" :
                                isCurrent ? "text-primary font-medium" :
                                "text-muted-foreground"
                              }`}>
                                {stepName}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      
                      {creationProgress.currentStep === "Executing blockchain transaction" && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-800 font-medium">Single Transaction Process:</p>
                          <ul className="text-xs text-blue-700 mt-2 space-y-1">
                            <li>• Mint RTA NFT</li>
                            <li>• Deploy TicketFactory contract</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-green-500 rounded-lg p-8 bg-green-50">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">✓</span>
                    </div>
                    <h3 className="text-2xl font-bold text-green-800 mb-2">Event Created Successfully!</h3>
                    <p className="text-green-700 mb-6">
                      Your RTA NFT has been minted and all smart contracts have been deployed.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-800 mb-2">Event Details</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Event ID:</span>
                          <span className="font-mono">{creationProgress.eventId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Title:</span>
                          <span>{formData.title}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-800 mb-2">Smart Contracts</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">TicketFactory:</span>
                          <span className="font-mono text-xs">{creationProgress.ticketFactoryAddress?.slice(0, 10)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Transaction:</span>
                          <span className="font-mono text-xs">{creationProgress.txHash?.slice(0, 10)}...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={() => router.push("/event-market")}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      View in Event Market
                    </Button>
                    {creationProgress.txHash && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(`https://seitrace.com/tx/${creationProgress.txHash}?chain=atlantic-2`, '_blank')}
                        className="flex items-center gap-2"
                      >
                        View Transaction
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="border rounded-lg p-6">
                <h4 className="font-medium mb-4">Event Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span>{formData.category ? formData.category.replace("-", " ") : "Not selected"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span>{formData.title || "Untitled Event"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date & Time:</span>
                    <span>
                      {formData.date ? format(formData.date, "PPP") : "Not set"} at {formData.time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{formData.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sale Type:</span>
                    <span>{formData.saleType.replace("-", " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reserve Price:</span>
                    <span>{formData.reservePrice} SEI</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tickets:</span>
                    <span>{formData.noCap ? "Unlimited" : formData.ticketsAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ticket Price:</span>
                    <span>{formData.ticketPrice} SEI</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <QuickAccess />

      <main className="flex-1 container max-w-5xl py-12">
        <Breadcrumbs items={[{ label: "Event Factory" }]} />

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Event Factory</h1>
          <p className="text-muted-foreground">
            Performance art, in its creation. The RTA protocol introduces dynamic, real-time assets to the NFT space,
            and brings you directly into an artist's studio.
          </p>
        </div>

        <div className="flex mb-12">
          {/* Progress Sidebar */}
          <div className="mr-8 relative">
            <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-muted"></div>

            {[
              { id: "details", label: "Your Event" },
              { id: "category", label: "Labels" },
              { id: "format", label: "Event Format" },
              { id: "sales", label: "Sales & Tickets" },
              { id: "mint", label: "Mint Your Event" },
            ].map((s, i) => (
              <div key={s.id} className="flex items-center mb-16 relative z-10">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    step === s.id
                      ? "bg-primary text-white"
                      : i < ["details", "category", "format", "sales", "mint"].indexOf(step)
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`ml-4 ${step === s.id ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Form Content */}
          <div className="flex-1">{renderStepContent()}</div>
        </div>

        <div className="flex justify-between">
          {step !== "category" ? (
            <Button variant="outline" onClick={handleBack} disabled={isCreating}>
              Back
            </Button>
          ) : (
            <div></div> // Empty div to maintain flex spacing
          )}

          <Button
            onClick={handleNext}
            disabled={(step === "details" && !formData.title) || isCreating}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : step === "mint" ? "Create Event" : "Next"}
          </Button>
        </div>
      </main>
    </div>
  )
}
