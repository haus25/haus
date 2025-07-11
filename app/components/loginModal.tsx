"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog"
import { HausLogo } from "./logo"
import { Check } from "lucide-react"
import { Input } from "./ui/input"
import { useAuth, DynamicWidget } from "../contexts/auth"
import { RadioGroup, RadioGroupItem } from "./ui/radioGroup"
import { Label } from "./ui/label"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  redirectPath?: string
}

type LoginStep = "initial" | "profile-setup"

export function LoginModal({ isOpen, onClose, redirectPath }: LoginModalProps) {
  const { isConnected, updateProfile, userProfile } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<LoginStep>("initial")
  const [nameChoice, setNameChoice] = useState<"detected" | "custom">("detected")
  const [customName, setCustomName] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [bio, setBio] = useState("")

  // Check if user is connected and proceed to profile setup if needed
  useEffect(() => {
    if (isConnected && userProfile && !userProfile.isProfileComplete) {
      setStep("profile-setup")
    } else if (isConnected && userProfile && userProfile.isProfileComplete) {
      // User is fully set up, close modal and redirect
      onClose()
      if (redirectPath) {
        router.push(redirectPath)
      }
    }
  }, [isConnected, userProfile, onClose, redirectPath, router])

  const handleNameSelection = () => {
    if (nameChoice === "custom" && !customName.trim()) {
      return // Don't proceed if custom name is empty
    }

    // Update profile with selected name
    updateProfile({
      ensName: nameChoice === "detected" ? "jabyl.eth" : customName,
    })
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : prev.length < 3 ? [...prev, category] : prev,
    )
  }

  const handleCompleteSetup = async () => {
    // Update profile with bio and categories
    updateProfile({
      bio: bio || null,
      favoriteCategories: selectedCategories,
      isProfileComplete: true,
    })

    // Close the modal
    onClose()

    // Redirect to the specified path if provided
    if (redirectPath) {
      router.push(redirectPath)
    }
  }

  const renderContent = () => {
    switch (step) {
      case "initial":
        return (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <HausLogo className="w-12 h-6 mr-2" />
                <DialogTitle className="text-2xl bauhaus-text">WELCOME TO HAUS</DialogTitle>
              </div>
              <DialogDescription className="text-center">
                Connect with your preferred wallet to access the platform
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex justify-center">
              <DynamicWidget />
            </div>

            <div className="mt-4 text-xs text-center text-muted-foreground">
              By connecting, you agree to our{" "}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </div>
          </>
        )

      case "profile-setup":
        return (
          <>
            <DialogHeader>
              <DialogTitle>Complete Your Profile</DialogTitle>
              <DialogDescription>Add a few more details to personalize your experience</DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-6">
              <div>
                <Label className="text-base font-medium mb-2 block">Choose Your Display Name</Label>
                <RadioGroup value={nameChoice} onValueChange={(value) => setNameChoice(value as "detected" | "custom")}>
                  <div className="flex items-start space-x-2 p-4 rounded-lg border">
                    <RadioGroupItem value="detected" id="detected" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="detected" className="font-medium text-lg">
                        {userProfile?.ensName || (userProfile?.address ? `${userProfile.address.slice(0, 6)}...${userProfile.address.slice(-4)}` : "Anonymous")}
                      </Label>
                      <p className="text-sm text-muted-foreground">Use your wallet address or connected name</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 p-4 rounded-lg border mt-2">
                    <RadioGroupItem value="custom" id="custom" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="custom" className="font-medium text-lg">
                        Custom Handle
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">Create your own unique handle</p>
                      <Input
                        placeholder="Enter your custom handle"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        disabled={nameChoice !== "custom"}
                      />
                    </div>
                  </div>
                </RadioGroup>
                <Button 
                  onClick={handleNameSelection} 
                  disabled={nameChoice === "custom" && !customName.trim()}
                  className="mt-2"
                  size="sm"
                >
                  Update Name
                </Button>
              </div>

              <div>
                <Label htmlFor="bio" className="text-base font-medium mb-2 block">
                  Add Bio (Optional)
                </Label>
                <div className="relative">
                  <textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    className="w-full min-h-24 p-3 rounded-md border border-input bg-transparent text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-base font-medium mb-2 block">Pick Your Favorites (Up to 3)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "standup-comedy",
                    "performance-art",
                    "poetry-slam",
                    "open-mic",
                    "live-painting",
                    "creative-workshop",
                  ].map((category) => (
                    <div
                      key={category}
                      className={`p-3 rounded-lg border cursor-pointer flex items-center ${
                        selectedCategories.includes(category) ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => handleCategoryToggle(category)}
                    >
                      {selectedCategories.includes(category) && <Check className="h-4 w-4 text-primary mr-2" />}
                      <span className="capitalize">{category.replace(/-/g, " ")}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{selectedCategories.length}/3 categories selected</p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleCompleteSetup}>Complete Setup</Button>
            </DialogFooter>
          </>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">{renderContent()}</DialogContent>
    </Dialog>
  )
}
