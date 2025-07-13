"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { SocialVerification } from "./socialVerification"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { ScrollArea } from "./ui/scrollArea"
import { 
  Settings, 
  Shield, 
  Bell, 
  Users, 
  Link as LinkIcon,
  Eye,
  Lock,
  Globe,
  X
} from "lucide-react"
import { useAuth } from "../contexts/auth"
import { toast } from "sonner"

interface SettingsModalProps {
  children: React.ReactNode
}

export function SettingsModal({ children }: SettingsModalProps) {
  const { userProfile, updateProfile, isLoading } = useAuth()
  const [open, setOpen] = useState(false)
  
  // Settings state
  const [notifications, setNotifications] = useState({
    eventReminders: true,
    newFollowers: true,
    eventInvites: true,
    tipNotifications: true,
    weeklyDigest: false,
  })

  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showWalletBalance: false,
    showTransactionHistory: false,
    allowDirectMessages: true,
  })

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0 sm:h-[85vh] flex flex-col">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold">Settings</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Manage your account preferences, privacy settings, and social verification
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
          <Tabs defaultValue="social" orientation="vertical" className="w-full flex flex-col sm:flex-row h-full">
            {/* Settings Navigation */}
            <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r flex-shrink-0">
              <div className="h-auto sm:h-full">
                <TabsList className="flex flex-row sm:flex-col h-auto w-full bg-transparent p-2 space-x-1 sm:space-x-0 sm:space-y-1 overflow-x-auto sm:overflow-x-visible">
                  <TabsTrigger 
                    value="social" 
                    className="flex-shrink-0 sm:w-full justify-start p-2 sm:p-3 data-[state=active]:bg-accent text-xs sm:text-sm"
                  >
                    <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Social Verification</span>
                    <span className="sm:hidden">Social</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="privacy" 
                    className="flex-shrink-0 sm:w-full justify-start p-2 sm:p-3 data-[state=active]:bg-accent text-xs sm:text-sm"
                  >
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Privacy & Security</span>
                    <span className="sm:hidden">Privacy</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notifications" 
                    className="flex-shrink-0 sm:w-full justify-start p-2 sm:p-3 data-[state=active]:bg-accent text-xs sm:text-sm"
                  >
                    <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Notifications</span>
                    <span className="sm:hidden">Notify</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="account" 
                    className="flex-shrink-0 sm:w-full justify-start p-2 sm:p-3 data-[state=active]:bg-accent text-xs sm:text-sm"
                  >
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Account</span>
                    <span className="sm:hidden">Account</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Settings Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 sm:p-6 space-y-6">
                  <TabsContent value="social" className="mt-0">
                    <SocialVerification />
                  </TabsContent>

                  <TabsContent value="privacy" className="mt-0 space-y-4 sm:space-y-6">
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
                      <CardContent className="space-y-4 sm:space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                          <div className="space-y-0.5">
                            <Label className="text-sm sm:text-base">Public Profile</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Make your profile visible to everyone
                            </p>
                          </div>
                          <Switch
                            checked={privacy.profilePublic}
                            onCheckedChange={() => handlePrivacyChange('profilePublic')}
                            className="self-start sm:self-auto"
                          />
                        </div>

                        <Separator />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                          <div className="space-y-0.5">
                            <Label className="text-sm sm:text-base">Show Wallet Balance</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Display your wallet balance on your profile
                            </p>
                          </div>
                          <Switch
                            checked={privacy.showWalletBalance}
                            onCheckedChange={() => handlePrivacyChange('showWalletBalance')}
                            className="self-start sm:self-auto"
                          />
                        </div>

                        <Separator />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                          <div className="space-y-0.5">
                            <Label className="text-sm sm:text-base">Show Transaction History</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Make your transaction history visible to others
                            </p>
                          </div>
                          <Switch
                            checked={privacy.showTransactionHistory}
                            onCheckedChange={() => handlePrivacyChange('showTransactionHistory')}
                            className="self-start sm:self-auto"
                          />
                        </div>

                        <Separator />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                          <div className="space-y-0.5">
                            <Label className="text-sm sm:text-base">Allow Direct Messages</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Let other users send you direct messages
                            </p>
                          </div>
                          <Switch
                            checked={privacy.allowDirectMessages}
                            onCheckedChange={() => handlePrivacyChange('allowDirectMessages')}
                            className="self-start sm:self-auto"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg sm:text-xl">
                          <Lock className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Security
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Your wallet security is managed by Dynamic
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-medium text-green-900 mb-2 text-sm sm:text-base">Wallet Security</h4>
                          <p className="text-xs sm:text-sm text-green-700">
                            Your wallet is secured using Dynamic's advanced multi-party computation (MPC) technology. 
                            Your private keys are encrypted and distributed across multiple secure environments.
                          </p>
                        </div>
                        <Button variant="outline" className="w-full text-sm">
                          <Globe className="h-4 w-4 mr-2" />
                          Learn More About Dynamic Security
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="notifications" className="mt-0">
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
                      <CardContent className="space-y-4 sm:space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                          <div className="space-y-0.5">
                            <Label className="text-sm sm:text-base">Event Reminders</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Get notified 30 minutes before events you're attending
                            </p>
                          </div>
                          <Switch
                            checked={notifications.eventReminders}
                            onCheckedChange={() => handleNotificationChange('eventReminders')}
                            className="self-start sm:self-auto"
                          />
                        </div>

                        <Separator />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                          <div className="space-y-0.5">
                            <Label className="text-sm sm:text-base">New Followers</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Get notified when someone follows you
                            </p>
                          </div>
                          <Switch
                            checked={notifications.newFollowers}
                            onCheckedChange={() => handleNotificationChange('newFollowers')}
                            className="self-start sm:self-auto"
                          />
                        </div>

                        <Separator />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                          <div className="space-y-0.5">
                            <Label className="text-sm sm:text-base">Event Invites</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Get notified when you're invited to private events
                            </p>
                          </div>
                          <Switch
                            checked={notifications.eventInvites}
                            onCheckedChange={() => handleNotificationChange('eventInvites')}
                            className="self-start sm:self-auto"
                          />
                        </div>

                        <Separator />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                          <div className="space-y-0.5">
                            <Label className="text-sm sm:text-base">Tip Notifications</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Get notified when you receive tips during live events
                            </p>
                          </div>
                          <Switch
                            checked={notifications.tipNotifications}
                            onCheckedChange={() => handleNotificationChange('tipNotifications')}
                            className="self-start sm:self-auto"
                          />
                        </div>

                        <Separator />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                          <div className="space-y-0.5">
                            <Label className="text-sm sm:text-base">Weekly Digest</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Receive a weekly summary of platform activity
                            </p>
                          </div>
                          <Switch
                            checked={notifications.weeklyDigest}
                            onCheckedChange={() => handleNotificationChange('weeklyDigest')}
                            className="self-start sm:self-auto"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="account" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg sm:text-xl">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Account Information
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Your account details and wallet information
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Display Name</Label>
                            <p className="text-sm sm:text-base">
                              {userProfile?.displayName || userProfile?.ensName || "Not set"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Wallet Address</Label>
                            <p className="text-sm sm:text-base font-mono break-all">
                              {userProfile?.address ? 
                                `${userProfile.address.slice(0, 6)}...${userProfile.address.slice(-4)}` : 
                                "Not connected"
                              }
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Profile Status</Label>
                            <p className="text-sm sm:text-base">
                              {userProfile?.isProfileComplete ? "Complete" : "Incomplete"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Favorite Categories</Label>
                            <p className="text-sm sm:text-base">
                              {userProfile?.favoriteCategories?.length || 0} selected
                            </p>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <h4 className="font-medium text-sm sm:text-base">Account Actions</h4>
                          <div className="flex flex-col gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setOpen(false)
                                window.location.href = '/profile'
                              }}
                              className="w-full text-sm"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setOpen(false)
                                window.location.href = '/profile/wallet'
                              }}
                              className="w-full text-sm"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Wallet
                            </Button>
                          </div>
                        </div>

                        <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                            Contact Support
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
} 