"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "../components/navbar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Label } from "../components/ui/label"
import { ArtCategoryIcon } from "../components/categoryIcons"
import {
  Brush,
  Ticket,
  Settings,
  Wallet,
  Edit,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Twitter,
  Send,
  Camera,
  ImageIcon,
  Check,
  PlusCircle,
  User,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { QuickAccess } from "../components/quickAccess"
import { Breadcrumbs } from "../components/breadcrumbs"
import { useAuth } from "../contexts/auth"
import { useEvents } from "../contexts/events"
import { SUPPORTED_SOCIAL_PLATFORMS, type SocialPlatform } from "../lib/constants"
import { toast } from "sonner"

export default function Profile() {
  const router = useRouter()
  const { 
    userProfile, 
    walletStats, 
    updateProfile, 
    uploadAvatar, 
    uploadBanner, 
    refreshWalletData,
    isLoading 
  } = useAuth()
  const { userEvents } = useEvents()
  
  const [editMode, setEditMode] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  
  // Initialize profile data from auth context
  const [profileData, setProfileData] = useState({
    displayName: userProfile?.displayName || userProfile?.ensName || "",
    bio: userProfile?.bio || "",
    avatar: userProfile?.avatar || "",
    banner: userProfile?.banner || "",
    socials: userProfile?.socials || {},
  })
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    userProfile?.favoriteCategories || []
  )
  const [activeTab, setActiveTab] = useState("events")

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  // Handle tab from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tab = urlParams.get('tab')
      if (tab && ['events', 'tickets', 'favorites'].includes(tab)) {
        setActiveTab(tab)
      }
    }
  }, [])

  // Update local state when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        displayName: userProfile.displayName || userProfile.ensName || "",
        bio: userProfile.bio || "",
        avatar: userProfile.avatar || "",
        banner: userProfile.banner || "",
        socials: userProfile.socials || {},
      })
      setSelectedCategories(userProfile.favoriteCategories || [])
    }
  }, [userProfile])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleAvatarUpload = () => {
    if (avatarInputRef.current) {
      avatarInputRef.current.click()
    }
  }

  const handleBannerUpload = () => {
    if (bannerInputRef.current) {
      bannerInputRef.current.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "banner") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB")
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file")
        return
      }

      try {
        if (type === "avatar") {
          setIsUploadingAvatar(true)
          const imageUrl = await uploadAvatar(file)
          setProfileData({ ...profileData, avatar: imageUrl })
          toast.success("Avatar updated successfully!")
        } else {
          setIsUploadingBanner(true)
          const imageUrl = await uploadBanner(file)
          setProfileData({ ...profileData, banner: imageUrl })
          toast.success("Banner updated successfully!")
        }
      } catch (error) {
        console.error(`Failed to upload ${type}:`, error)
        toast.error(`Failed to upload ${type}. Please try again.`)
      } finally {
        if (type === "avatar") {
          setIsUploadingAvatar(false)
        } else {
          setIsUploadingBanner(false)
        }
      }
    }
  }

  const handleSaveProfile = async () => {
    try {
      setIsUpdating(true)
      
      await updateProfile({
        displayName: profileData.displayName,
        bio: profileData.bio,
        socials: profileData.socials,
        favoriteCategories: selectedCategories,
        isProfileComplete: true,
      })
      
      setEditMode(false)
      toast.success("Profile updated successfully!")
    } catch (error) {
      console.error("Failed to save profile:", error)
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : prev.length < 3 ? [...prev, category] : prev,
    )
  }

  const handleSaveBio = async () => {
    try {
      await updateProfile({
        bio: profileData.bio,
        isProfileComplete: true,
      })
      toast.success("Bio updated!")
    } catch (error) {
      toast.error("Failed to update bio")
    }
  }

  const handleSaveCategories = async () => {
    try {
      await updateProfile({
        favoriteCategories: selectedCategories,
        isProfileComplete: true,
      })
      toast.success("Preferences saved!")
    } catch (error) {
      toast.error("Failed to save preferences")
    }
  }

  const handleSocialChange = (platform: SocialPlatform, value: string) => {
    setProfileData({
      ...profileData,
      socials: {
        ...profileData.socials,
        [platform]: value,
      },
    })
  }

  const handleRefreshWallet = async () => {
    try {
      await refreshWalletData()
      toast.success("Wallet data refreshed!")
    } catch (error) {
      toast.error("Failed to refresh wallet data")
    }
  }

  // Check if profile needs completion
  const isProfileIncomplete = !userProfile?.isProfileComplete

  // Show loading state if no user profile yet
  if (!userProfile) {
    return (
      <div className="min-h-screen flex flex-col texture-bg">
        <Navbar />
        <QuickAccess />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col texture-bg">
      <Navbar />
      <QuickAccess />

      <main className="flex-1 container py-12">
        <Breadcrumbs items={[{ label: "Profile" }]} />

        {/* Profile Header */}
        <div className="mb-8">
          <div className="relative">
            <div
              className={`h-48 rounded-lg overflow-hidden ${editMode ? "cursor-pointer group" : ""}`}
              onClick={editMode ? handleBannerUpload : undefined}
            >
              <img
                src={profileData.banner || "/placeholder.svg"}
                alt="Profile banner"
                className="w-full h-full object-cover"
              />
              {editMode && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-background/80 p-3 rounded-full">
                    {isUploadingBanner ? (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-primary" />
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="absolute -bottom-16 left-8">
              <div
                className={`relative ${editMode ? "cursor-pointer group" : ""}`}
                onClick={editMode ? handleAvatarUpload : undefined}
              >
                <Avatar className="h-32 w-32 border-4 border-background">
                  <AvatarImage src={profileData.avatar} alt={profileData.displayName} />
                  <AvatarFallback>
                    {profileData.displayName?.slice(0, 2).toUpperCase() || 
                     userProfile.address?.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {editMode && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                    <div className="bg-background/80 p-2 rounded-full">
                      {isUploadingAvatar ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <Camera className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-background/80"
                onClick={handleRefreshWallet}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              {editMode ? (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-primary text-primary-foreground"
                  onClick={handleSaveProfile}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save Profile
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="bg-background/80" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
          <div className="mt-20 ml-8">
            <h1 className="text-3xl font-bold">
              {profileData.displayName || userProfile.ensName || "Anonymous User"}
            </h1>
            <p className="text-muted-foreground">{userProfile.address}</p>
            {walletStats && (
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center">
                  <Wallet className="h-4 w-4 mr-1" />
                  {walletStats.balance.formattedBalance} {walletStats.balance.symbol}
                </span>
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {walletStats.transactionCount} transactions
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          type="file"
          ref={avatarInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => handleFileChange(e, "avatar")}
        />
        <input
          type="file"
          ref={bannerInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => handleFileChange(e, "banner")}
        />

        {/* Profile Completion Cards (shown only if profile is incomplete) */}
        {isProfileIncomplete && (
          <div className="mb-8 space-y-4">
            <h2 className="text-xl font-bold">Complete Your Profile</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bio Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-primary" />
                    Add Your Bio
                  </CardTitle>
                  <CardDescription>Tell the community about yourself</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Share your story, interests, or expertise..."
                    className="min-h-24"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  />
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveBio} className="w-full" disabled={isLoading}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Bio
                  </Button>
                </CardFooter>
              </Card>

              {/* Categories Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brush className="h-5 w-5 mr-2 text-primary" />
                    Pick Your Favorites
                  </CardTitle>
                  <CardDescription>Select up to 3 art categories you're interested in</CardDescription>
                </CardHeader>
                <CardContent>
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
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedCategories.length}/3 categories selected
                  </p>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveCategories} className="w-full" disabled={isLoading}>
                    <Check className="h-4 w-4 mr-2" />
                    Save Preferences
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={profileData.displayName}
                        onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                        placeholder="Your display name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        className="min-h-32"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {profileData.bio || "No bio added yet. Click 'Edit Profile' to add one."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Social Links</CardTitle>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <div className="space-y-4">
                    {Object.entries(SUPPORTED_SOCIAL_PLATFORMS).map(([platform, config]) => (
                      <div key={platform} className="space-y-2">
                        <Label htmlFor={platform} className="flex items-center">
                          {config.name}
                        </Label>
                        <Input
                          id={platform}
                          value={profileData.socials[platform as SocialPlatform] || ""}
                          onChange={(e) => handleSocialChange(platform as SocialPlatform, e.target.value)}
                          placeholder={config.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(SUPPORTED_SOCIAL_PLATFORMS).map(([platform, config]) => {
                      const value = profileData.socials[platform as SocialPlatform]
                      if (!value) return null
                      
                      const url = platform === 'website' ? value : `${config.baseUrl}${value.replace('@', '')}`
                      
                      return (
                        <div key={platform} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{config.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto text-primary hover:text-primary/80"
                            onClick={() => window.open(url, "_blank")}
                          >
                            {value}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Wallet Info Card */}
            {walletStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wallet className="h-5 w-5 mr-2" />
                    Wallet Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-medium">
                        {walletStats.balance.formattedBalance} {walletStats.balance.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Transactions</span>
                      <span>{walletStats.transactionCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Address</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto text-primary hover:text-primary/80"
                        onClick={() => {
                          navigator.clipboard.writeText(userProfile.address)
                          toast.success("Address copied!")
                        }}
                      >
                        {userProfile.address.slice(0, 6)}...{userProfile.address.slice(-4)}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="events">Your Events</TabsTrigger>
                <TabsTrigger value="tickets">Your Tickets</TabsTrigger>
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
              </TabsList>

              <TabsContent value="events" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Brush className="h-5 w-5 mr-2" />
                      Your Created Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userEvents && userEvents.length > 0 ? (
                      <div className="grid gap-4">
                        {userEvents.map((event) => (
                          <div key={event.id} className="border rounded-lg p-4">
                            <h3 className="font-medium">{event.title}</h3>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Brush className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No events created yet</p>
                        <Button
                          className="mt-4"
                          onClick={() => router.push("/event-factory")}
                        >
                          Create Your First Event
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tickets" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Ticket className="h-5 w-5 mr-2" />
                      Your Tickets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No tickets purchased yet</p>
                      <Button
                        className="mt-4"
                        onClick={() => router.push("/event-market")}
                      >
                        Browse Events
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="favorites" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Favorite Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCategories.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedCategories.map((category) => (
                          <div key={category} className="flex items-center p-4 border rounded-lg">
                            <ArtCategoryIcon category={category as any} className="h-8 w-8 mr-3" />
                            <span className="capitalize font-medium">{String(category).replace(/-/g, " ")}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No favorite categories selected</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
