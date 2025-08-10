"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { SocialVerification } from "./socialVerification"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { ScrollArea } from "./ui/scrollArea"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { 
  User, 
  Shield, 
  Bell, 
  Link as LinkIcon,
  X,
  Camera,
  ImageIcon,
  Check,
  Loader2
} from "lucide-react"
import { useAuth } from "../contexts/auth"
import { SUPPORTED_SOCIAL_PLATFORMS, type SocialPlatform } from "../lib/constants"
import { toast } from "sonner"

interface SettingsModalProps {
  children: React.ReactNode
}

export function SettingsModal({ children }: SettingsModalProps) {
  const { 
    userProfile, 
    updateProfile, 
    uploadAvatar, 
    uploadBanner, 
    isLoading 
  } = useAuth()
  const [open, setOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  
  // Profile data state
  const [profileData, setProfileData] = useState({
    displayName: userProfile?.displayName || userProfile?.name || "",
    bio: userProfile?.bio || "",
    avatar: userProfile?.avatar || "",
    banner: userProfile?.banner || "",
    socials: userProfile?.socials || {},
  })
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    userProfile?.preferences || []
  )
  
  // Settings state
  const [notifications, setNotifications] = useState({
    eventReminders: true,
    newFollowers: true,
    eventInvites: true,
    tipNotifications: true,
  })

  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showWalletBalance: false,
    allowDirectMessages: true,
  })

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  // Update local state when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        displayName: userProfile.displayName || userProfile.name || "",
        bio: userProfile.bio || "",
        avatar: userProfile.avatar || "",
        banner: userProfile.banner || "",
        socials: userProfile.socials || {},
      })
      setSelectedCategories(userProfile.preferences || [])
    }
  }, [userProfile])

  const handleNotificationChange = (setting: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }))
    toast.success("Notification settings updated")
  }

  const handlePrivacyChange = (setting: keyof typeof privacy) => {
    setPrivacy(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }))
    toast.success("Privacy settings updated")
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
        preferences: selectedCategories,
        isProfileComplete: true,
      })
      
      toast.success("Profile updated successfully!")
      setOpen(false)
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

  const handleSocialChange = (platform: SocialPlatform, value: string) => {
    setProfileData({
      ...profileData,
      socials: {
        ...profileData.socials,
        [platform]: value,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0 sm:h-[85vh] flex flex-col">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold">Edit Profile</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Update your profile information and social verification
              </DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setOpen(false)}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex h-full flex-col sm:flex-row overflow-hidden">
          <Tabs defaultValue="profile" orientation="vertical" className="w-full flex flex-col sm:flex-row h-full">
            {/* Navigation */}
            <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r flex-shrink-0">
              <div className="h-auto sm:h-full">
                <TabsList className="flex flex-row sm:flex-col h-auto w-full bg-transparent p-2 space-x-1 sm:space-x-0 sm:space-y-1 overflow-x-auto sm:overflow-x-visible">
                  <TabsTrigger 
                    value="profile" 
                    className="flex-shrink-0 sm:w-full justify-start p-2 sm:p-3 data-[state=active]:bg-accent text-xs sm:text-sm"
                  >
                    <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span>Profile</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="social" 
                    className="flex-shrink-0 sm:w-full justify-start p-2 sm:p-3 data-[state=active]:bg-accent text-xs sm:text-sm"
                  >
                    <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span>Social</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="preferences" 
                    className="flex-shrink-0 sm:w-full justify-start p-2 sm:p-3 data-[state=active]:bg-accent text-xs sm:text-sm"
                  >
                    <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span>Preferences</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 sm:p-6 space-y-6">

                  {/* Profile Tab */}
                  <TabsContent value="profile" className="mt-0 space-y-4 sm:space-y-6">
                    {/* Profile Images */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg sm:text-xl">
                          <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Profile Images
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Upload your avatar and banner images
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Banner */}
                        <div>
                          <Label className="text-sm font-medium">Banner</Label>
                          <div
                            className="mt-2 h-32 rounded-lg overflow-hidden cursor-pointer group border-2 border-dashed border-muted hover:border-primary transition-colors relative"
                            onClick={handleBannerUpload}
                          >
                            <img
                              src={profileData.banner || "/placeholder.svg"}
                              alt="Profile banner"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="bg-background/80 p-3 rounded-full">
                                {isUploadingBanner ? (
                                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                ) : (
                                  <ImageIcon className="h-6 w-6 text-primary" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Avatar */}
                        <div>
                          <Label className="text-sm font-medium">Avatar</Label>
                          <div className="mt-2 flex items-center space-x-4">
                            <div
                              className="relative cursor-pointer group"
                              onClick={handleAvatarUpload}
                            >
                              <Avatar className="h-20 w-20 border-2 border-muted">
                                <AvatarImage src={profileData.avatar || undefined} alt={profileData.displayName} />
                                <AvatarFallback>
                                  {profileData.displayName?.slice(0, 2).toUpperCase() || 
                                   userProfile?.address?.slice(2, 4).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                                <div className="bg-background/80 p-2 rounded-full">
                                  {isUploadingAvatar ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                  ) : (
                                    <Camera className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">
                                Click to upload a new avatar. Recommended size: 400x400px. Max file size: 5MB.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Basic Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg sm:text-xl">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Basic Information
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Update your display name and bio
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
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
                            className="min-h-24"
                            placeholder="Tell us about yourself..."
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Favorite Categories */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">
                          Favorite Categories
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Select up to 3 categories you're interested in
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            "standup-comedy",
                            "performance-art",
                            "poetry-slam",
                            "open-mic",
                            "live-streaming",
                            "creative-workshop",
                          ].map((category) => (
                            <div
                              key={category}
                              className={`p-3 rounded-lg border cursor-pointer flex items-center transition-colors ${
                                selectedCategories.includes(category) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                              }`}
                              onClick={() => handleCategoryToggle(category)}
                            >
                              {selectedCategories.includes(category) && <Check className="h-4 w-4 text-primary mr-2" />}
                              <span className="capitalize text-sm">{category.replace(/-/g, " ")}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {selectedCategories.length}/3 categories selected
                        </p>
                      </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button onClick={handleSaveProfile} disabled={isUpdating}>
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Save Profile
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Social Verification Tab */}
                  <TabsContent value="social" className="mt-0">
                    <SocialVerification />
                  </TabsContent>

                  {/* Preferences Tab */}
                  <TabsContent value="preferences" className="mt-0 space-y-4 sm:space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg sm:text-xl">
                          <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Notification Preferences
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Choose what notifications you want to receive
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {Object.entries(notifications).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                          <div className="space-y-0.5">
                              <Label className="text-sm font-medium capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {key === 'eventReminders' && 'Get reminded about upcoming events you\'re attending'}
                                {key === 'newFollowers' && 'Notify when someone follows you'}
                                {key === 'eventInvites' && 'Receive invitations to events'}
                                {key === 'tipNotifications' && 'Get notified when you receive tips'}
                            </p>
                          </div>
                          <Switch
                              checked={value}
                              onCheckedChange={() => handleNotificationChange(key as keyof typeof notifications)}
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg sm:text-xl">
                          <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Privacy Settings
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Control who can see your information and activity
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {Object.entries(privacy).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-medium capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {key === 'profilePublic' && 'Make your profile visible to everyone'}
                                {key === 'showWalletBalance' && 'Display your wallet balance on your profile'}
                                {key === 'allowDirectMessages' && 'Allow other users to send you direct messages'}
                            </p>
                          </div>
                            <Switch
                              checked={value}
                              onCheckedChange={() => handlePrivacyChange(key as keyof typeof privacy)}
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
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
      </DialogContent>
    </Dialog>
  )
} 