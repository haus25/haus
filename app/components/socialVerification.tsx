"use client"

import { useState } from "react"
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
  Loader2
} from "lucide-react"
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

export function SocialVerification({ className }: SocialVerificationProps) {
  const { userProfile, updateProfile, isLoading } = useAuth()
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState<SocialPlatform | null>(null)
  const [tempValues, setTempValues] = useState<Record<SocialPlatform, string>>({
    twitter: "",
    discord: "",
    telegram: "",
    github: "",
    website: "",
  })

  // Mock verification status - in a real app, this would come from your backend
  // that integrates with Dynamic's user verification APIs
  const [verificationStatus, setVerificationStatus] = useState<Record<SocialPlatform, boolean>>({
    twitter: false,
    discord: false,
    telegram: false,
    github: false,
    website: false,
  })

  const handleEditPlatform = (platform: SocialPlatform) => {
    setEditingPlatform(platform)
    setTempValues({
      ...tempValues,
      [platform]: userProfile?.socials[platform] || ""
    })
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
      telegram: "",
      github: "",
      website: "",
    })
  }

  const handleVerifyPlatform = async (platform: SocialPlatform) => {
    // In a real implementation, this would:
    // 1. Redirect to Dynamic's social authentication flow
    // 2. Handle the callback to verify the account
    // 3. Update the verification status
    
    toast.info("Social verification integration coming soon!")
    
    // For demo purposes, simulate verification
    setTimeout(() => {
      setVerificationStatus(prev => ({
        ...prev,
        [platform]: true
      }))
      toast.success(`${SUPPORTED_SOCIAL_PLATFORMS[platform].name} verified!`)
    }, 2000)
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
    switch (platform) {
      case 'twitter':
        return <X className="h-5 w-5" />
      case 'website':
        return <Globe className="h-5 w-5" />
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
        
        {/* Note about Dynamic configuration */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">Social Provider Setup</h4>
              <p className="text-sm text-blue-700 mt-1">
                Social authentication providers (Twitter, Discord, etc.) need to be configured in your{" "}
                <a 
                  href="https://app.dynamic.xyz/dashboard/log-in-user-profile" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Dynamic Dashboard
                </a>
                {" "}under the social providers section.
              </p>
            </div>
          </div>
        </div>

        {Object.entries(SUPPORTED_SOCIAL_PLATFORMS).map(([platform, config]) => {
          const typedPlatform = platform as SocialPlatform
          const value = userProfile?.socials[typedPlatform] || ""
          const isVerified = verificationStatus[typedPlatform]
          const isEditing = editingPlatform === typedPlatform

          return (
            <div key={platform} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getSocialIcon(typedPlatform)}
                  <div>
                    <h4 className="font-medium">{config.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {value || "Not connected"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isVerified && (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <Check className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {value && !isVerified && (
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
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleEditPlatform(typedPlatform)}
                    disabled={isLoading}
                  >
                    {value ? "Edit" : "Add"}
                  </Button>
                  
                  {value && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleOpenSocial(typedPlatform)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit
                      </Button>
                      
                      {!isVerified && (
                        <Button 
                          size="sm" 
                          onClick={() => handleVerifyPlatform(typedPlatform)}
                          disabled={isLoading}
                        >
                          Verify
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
              {Object.values(verificationStatus).filter(Boolean).length} of{" "}
              {Object.keys(verificationStatus).length} accounts verified
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {Math.round((Object.values(verificationStatus).filter(Boolean).length / Object.keys(verificationStatus).length) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground">Complete</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 