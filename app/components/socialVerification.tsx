"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Separator } from "./ui/separator"
import { 
  Globe, 
  Check, 
  X, 
  ExternalLink, 
  Link as LinkIcon,
  AlertCircle,
  Loader2,
  Twitch,
  Cast
} from "lucide-react"
import { useSocialAccounts } from "@dynamic-labs/sdk-react-core"
import { SocialIcon } from '@dynamic-labs/iconic'
import { SUPPORTED_SOCIAL_PLATFORMS, type SocialPlatform } from "../lib/constants"
import { useAuth } from "../contexts/auth"
import { toast } from "sonner"

interface SocialVerificationProps {
  className?: string
}

interface SocialAccount {
  platform: SocialPlatform
  username: string
  isVerified: boolean
  isConnected: boolean
  lastVerified?: Date
}

// Dynamic social providers that support verification
const DYNAMIC_PROVIDERS = ['twitter', 'discord', 'github', 'google', 'twitch', 'farcaster'] as const
type DynamicProvider = typeof DYNAMIC_PROVIDERS[number]

// Map our platform types to Dynamic's provider names
const PLATFORM_TO_DYNAMIC: Record<string, DynamicProvider | null> = {
  twitter: 'twitter',
  discord: 'discord', 
  github: 'github',
  twitch: 'twitch',
  farcaster: 'farcaster',
  telegram: null, // Not supported by Dynamic
  website: null, // Custom verification
}

const Avatar = ({ avatarUrl }: { avatarUrl?: string }) => {
  return (
    <div className="avatar w-8 h-8 rounded-full overflow-hidden">
      <img src={avatarUrl || "/placeholder-user.jpg"} alt="avatar" className="w-full h-full object-cover" />
    </div>
  )
}

const Icon = ({ provider }: { provider: DynamicProvider }) => {
  return (
    <div className="icon-container w-8 h-8 flex items-center justify-center">
      <SocialIcon name={provider} />
    </div>
  )
}

export function SocialVerification({ className }: SocialVerificationProps) {
  const { userProfile, updateProfile, isLoading } = useAuth()
  const {
    linkSocialAccount,
    unlinkSocialAccount,
    isProcessing,
    isLinked,
    getLinkedAccountInformation,
  } = useSocialAccounts()
  
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState<SocialPlatform | null>(null)
  const [tempValues, setTempValues] = useState<Record<SocialPlatform, string>>({
    twitter: "",
    discord: "",
    twitch: "",
    farcaster: "",
    telegram: "",
    github: "",
    website: "",
  })

  // Sync Dynamic's social account state with user profile
  useEffect(() => {
    const syncSocialAccounts = async () => {
      if (!userProfile) return

      let hasChanges = false
      const updatedSocials = { ...userProfile.socials }

      // Check each Dynamic provider and sync with user profile
      DYNAMIC_PROVIDERS.forEach(provider => {
        const platformKey = Object.keys(PLATFORM_TO_DYNAMIC).find(
          key => PLATFORM_TO_DYNAMIC[key] === provider
        ) as SocialPlatform

        if (platformKey) {
          const isCurrentlyLinked = isLinked(provider as any)
          const linkedInfo = getLinkedAccountInformation(provider as any)
          
          if (isCurrentlyLinked && linkedInfo?.publicIdentifier) {
            // If linked in Dynamic but not in profile, sync it
            if (!updatedSocials[platformKey] || updatedSocials[platformKey] !== linkedInfo.publicIdentifier) {
              updatedSocials[platformKey] = linkedInfo.publicIdentifier
              hasChanges = true
            }
          } else {
            // If not linked in Dynamic but exists in profile, we might want to keep the manual entry
            // Only clear if it was automatically set (you might want to add a flag to track this)
          }
        }
      })

      // Update profile if there are changes
      if (hasChanges) {
        try {
          await updateProfile({ socials: updatedSocials })
          console.log('Social accounts synced with profile')
        } catch (error) {
          console.error('Failed to sync social accounts:', error)
        }
      }
    }

    // Debounce the sync to avoid excessive calls
    const timeoutId = setTimeout(syncSocialAccounts, 1000)
    return () => clearTimeout(timeoutId)
  }, [userProfile, isLinked, getLinkedAccountInformation, updateProfile])

  const handleEditPlatform = (platform: SocialPlatform) => {
    setEditingPlatform(platform)
    setTempValues(prev => ({
      ...prev,
      [platform]: userProfile?.socials[platform] || ""
    }))
  }

  const handleSavePlatform = async (platform: SocialPlatform) => {
    try {
      setIsUpdating(true)
      
      const newSocials = {
        ...userProfile?.socials,
        [platform]: tempValues[platform] || ""
      }

      await updateProfile({
        socials: newSocials
      })

      setEditingPlatform(null)
      toast.success(`${SUPPORTED_SOCIAL_PLATFORMS[platform].name} updated successfully!`)
    } catch (error) {
      console.error("Failed to update social platform:", error)
      toast.error("Failed to update social platform")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingPlatform(null)
    setTempValues({
      twitter: "",
      discord: "",
      twitch: "",
      farcaster: "",
      telegram: "",
      github: "",
      website: "",
    })
  }

  const handleVerifyPlatform = async (platform: SocialPlatform) => {
    const dynamicProvider = PLATFORM_TO_DYNAMIC[platform]
    
    if (!dynamicProvider) {
      toast.info(`${SUPPORTED_SOCIAL_PLATFORMS[platform].name} verification is not supported yet`)
      return
    }

    try {
      await linkSocialAccount(dynamicProvider as any)
      toast.success(`${SUPPORTED_SOCIAL_PLATFORMS[platform].name} linked successfully!`)
      
      // The sync effect will automatically update the profile
    } catch (error) {
      console.error('Failed to link social account:', error)
      toast.error('Failed to link social account')
    }
  }

  const handleUnlinkPlatform = async (platform: SocialPlatform) => {
    const dynamicProvider = PLATFORM_TO_DYNAMIC[platform]
    
    if (!dynamicProvider) return

    try {
      await unlinkSocialAccount(dynamicProvider as any)
      toast.success(`${SUPPORTED_SOCIAL_PLATFORMS[platform].name} unlinked successfully!`)
      
      // Optionally clear from profile as well
      const newSocials = { ...userProfile?.socials }
      delete newSocials[platform]
      
      await updateProfile({ socials: newSocials })
    } catch (error) {
      console.error('Failed to unlink social account:', error)
      toast.error('Failed to unlink social account')
    }
  }

  const handleOpenSocial = (platform: SocialPlatform) => {
    const config = SUPPORTED_SOCIAL_PLATFORMS[platform]
    const value = userProfile?.socials[platform]
    
    if (!value) return

    let url: string
    if (platform === 'website') {
      url = value.startsWith('http') ? value : `https://${value}`
    } else {
      url = `${config.baseUrl}${value.replace('@', '')}`
    }

    window.open(url, '_blank')
  }

  const getSocialIcon = (platform: SocialPlatform) => {
    const dynamicProvider = PLATFORM_TO_DYNAMIC[platform]
    if (dynamicProvider) {
      return <Icon provider={dynamicProvider} />
    }
    
    switch (platform) {
      case 'website':
        return <Globe className="h-5 w-5" />
      case 'telegram':
        return <LinkIcon className="h-5 w-5" />
      case 'twitch':
        return <Twitch className="h-5 w-5" />
      case 'farcaster':
        return <Cast className="h-5 w-5" />
      default:
        return <LinkIcon className="h-5 w-5" />
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <LinkIcon className="h-5 w-5 mr-2" />
          Social Account Verification
        </CardTitle>
        <CardDescription>
          Link and verify your social accounts to build trust in the community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Dynamic Integration Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-green-900">Social Verification Ready</h4>
              <p className="text-sm text-green-700 mt-1">
                Connect and verify your social accounts through Dynamic's secure authentication system.
                Your verified accounts will be linked to your wallet and displayed on your profile.
              </p>
            </div>
          </div>
        </div>

        {Object.entries(SUPPORTED_SOCIAL_PLATFORMS).map(([platform, config]) => {
          const typedPlatform = platform as SocialPlatform
          const dynamicProvider = PLATFORM_TO_DYNAMIC[platform]
          const isProviderLinked = dynamicProvider ? isLinked(dynamicProvider as any) : false
          const connectedAccountInfo = dynamicProvider ? getLinkedAccountInformation(dynamicProvider as any) : null
          const value = userProfile?.socials[typedPlatform] || ""
          const isEditing = editingPlatform === typedPlatform

          return (
            <div key={platform} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isProviderLinked && connectedAccountInfo?.avatar ? (
                    <Avatar avatarUrl={connectedAccountInfo.avatar} />
                  ) : (
                    getSocialIcon(typedPlatform)
                  )}
                  <div>
                    <h4 className="font-medium">{config.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {connectedAccountInfo?.publicIdentifier || value || "Not connected"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isProviderLinked && (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <Check className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {!isProviderLinked && dynamicProvider && (
                    <Badge variant="secondary">
                      <X className="h-3 w-3 mr-1" />
                      Unverified
                    </Badge>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`${platform}-input`}>{config.name}</Label>
                    <Input
                      id={`${platform}-input`}
                      value={tempValues[typedPlatform] || ""}
                      onChange={(e) => setTempValues({
                        ...tempValues,
                        [typedPlatform]: e.target.value
                      })}
                      placeholder={config.placeholder}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleSavePlatform(typedPlatform)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-2">
                  {dynamicProvider ? (
                    // Dynamic provider - use their verification system
                    isProviderLinked ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleUnlinkPlatform(typedPlatform)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <X className="h-4 w-4 mr-2" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => handleVerifyPlatform(typedPlatform)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <LinkIcon className="h-4 w-4 mr-2" />
                        )}
                        Connect
                      </Button>
                    )
                  ) : (
                    // Non-Dynamic provider - manual entry
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEditPlatform(typedPlatform)}
                        disabled={isLoading}
                      >
                        {value ? "Edit" : "Add"}
                      </Button>
                      
                      {value && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleOpenSocial(typedPlatform)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {platform !== 'website' && <Separator />}
            </div>
          )
        })}

        {/* Verification Benefits */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-green-900 mb-2">Benefits of Verification</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Build trust with event attendees and creators</li>
            <li>• Get priority access to exclusive events</li>
            <li>• Unlock additional community features</li>
            <li>• Reduce spam and improve platform quality</li>
          </ul>
        </div>

        {/* Verification Status Summary */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <h4 className="font-medium">Verification Status</h4>
            <p className="text-sm text-muted-foreground">
              {DYNAMIC_PROVIDERS.filter(provider => isLinked(provider as any)).length} of{" "}
              {DYNAMIC_PROVIDERS.length} supported accounts verified
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {Math.round((DYNAMIC_PROVIDERS.filter(provider => isLinked(provider as any)).length / DYNAMIC_PROVIDERS.length) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground">Complete</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 