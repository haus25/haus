"use client"

import { Navbar } from "../../components/navbar"
import { Breadcrumbs } from "../../components/breadcrumbs"
import { QuickAccess } from "../../components/quickAccess"
import { SocialVerification } from "../../components/socialVerification"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Switch } from "../../components/ui/switch"
import { Label } from "../../components/ui/label"
import { Separator } from "../../components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { 
  Settings, 
  Shield, 
  Bell, 
  Users, 
  Link as LinkIcon,
  Eye,
  Lock,
  Globe
} from "lucide-react"
import { useAuth } from "../../contexts/auth"
import { useState } from "react"
import { toast } from "sonner"

export default function SettingsPage() {
  const { userProfile, updateProfile, isLoading } = useAuth()
  
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
    <div className="min-h-screen flex flex-col texture-bg">
      <Navbar />
      <QuickAccess />

      <main className="flex-1 container py-12">
        <Breadcrumbs items={[
          { label: "Profile", href: "/profile" }, 
          { label: "Settings" }
        ]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences, privacy settings, and social verification
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Navigation */}
          <div className="space-y-2">
            <Tabs defaultValue="social" orientation="vertical" className="w-full">
              <TabsList className="grid w-full grid-rows-4">
                <TabsTrigger value="social" className="justify-start">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Social Verification
                </TabsTrigger>
                <TabsTrigger value="privacy" className="justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Privacy & Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="justify-start">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="account" className="justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Account
                </TabsTrigger>
              </TabsList>

              {/* Settings Content */}
              <div className="lg:col-span-2">
                <TabsContent value="social" className="mt-0 ml-6">
                  <SocialVerification />
                </TabsContent>

                <TabsContent value="privacy" className="mt-0 ml-6 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="h-5 w-5 mr-2" />
                        Privacy Settings
                      </CardTitle>
                      <CardDescription>
                        Control who can see your information and activity
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Public Profile</Label>
                          <p className="text-sm text-muted-foreground">
                            Make your profile visible to everyone
                          </p>
                        </div>
                        <Switch
                          checked={privacy.profilePublic}
                          onCheckedChange={() => handlePrivacyChange('profilePublic')}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Show Wallet Balance</Label>
                          <p className="text-sm text-muted-foreground">
                            Display your wallet balance on your profile
                          </p>
                        </div>
                        <Switch
                          checked={privacy.showWalletBalance}
                          onCheckedChange={() => handlePrivacyChange('showWalletBalance')}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Show Transaction History</Label>
                          <p className="text-sm text-muted-foreground">
                            Make your transaction history visible to others
                          </p>
                        </div>
                        <Switch
                          checked={privacy.showTransactionHistory}
                          onCheckedChange={() => handlePrivacyChange('showTransactionHistory')}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Allow Direct Messages</Label>
                          <p className="text-sm text-muted-foreground">
                            Let other users send you direct messages
                          </p>
                        </div>
                        <Switch
                          checked={privacy.allowDirectMessages}
                          onCheckedChange={() => handlePrivacyChange('allowDirectMessages')}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Lock className="h-5 w-5 mr-2" />
                        Security
                      </CardTitle>
                      <CardDescription>
                        Your wallet security is managed by Dynamic
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Wallet Security</h4>
                        <p className="text-sm text-green-700">
                          Your wallet is secured using Dynamic's advanced multi-party computation (MPC) technology. 
                          Your private keys are encrypted and distributed across multiple secure environments.
                        </p>
                      </div>
                      <Button variant="outline" className="w-full">
                        <Globe className="h-4 w-4 mr-2" />
                        Learn More About Dynamic Security
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notifications" className="mt-0 ml-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Bell className="h-5 w-5 mr-2" />
                        Notification Preferences
                      </CardTitle>
                      <CardDescription>
                        Choose what notifications you want to receive
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Event Reminders</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified 30 minutes before events you're attending
                          </p>
                        </div>
                        <Switch
                          checked={notifications.eventReminders}
                          onCheckedChange={() => handleNotificationChange('eventReminders')}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">New Followers</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when someone follows you
                          </p>
                        </div>
                        <Switch
                          checked={notifications.newFollowers}
                          onCheckedChange={() => handleNotificationChange('newFollowers')}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Event Invites</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when you're invited to private events
                          </p>
                        </div>
                        <Switch
                          checked={notifications.eventInvites}
                          onCheckedChange={() => handleNotificationChange('eventInvites')}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Tip Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when you receive tips during live events
                          </p>
                        </div>
                        <Switch
                          checked={notifications.tipNotifications}
                          onCheckedChange={() => handleNotificationChange('tipNotifications')}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Weekly Digest</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive a weekly summary of platform activity
                          </p>
                        </div>
                        <Switch
                          checked={notifications.weeklyDigest}
                          onCheckedChange={() => handleNotificationChange('weeklyDigest')}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="account" className="mt-0 ml-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Account Information
                      </CardTitle>
                      <CardDescription>
                        Your account details and wallet information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Display Name</Label>
                          <p className="text-base">
                            {userProfile?.displayName || userProfile?.ensName || "Not set"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Wallet Address</Label>
                          <p className="text-base font-mono">
                            {userProfile?.address ? 
                              `${userProfile.address.slice(0, 6)}...${userProfile.address.slice(-4)}` : 
                              "Not connected"
                            }
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Profile Status</Label>
                          <p className="text-base">
                            {userProfile?.isProfileComplete ? "Complete" : "Incomplete"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Favorite Categories</Label>
                          <p className="text-base">
                            {userProfile?.favoriteCategories?.length || 0} selected
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="font-medium">Account Actions</h4>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => window.location.href = '/profile'}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => window.location.href = '/profile/wallet'}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Wallet
                          </Button>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
                        <p className="text-sm text-blue-700 mb-3">
                          If you need assistance with your account or have questions about the platform, 
                          our support team is here to help.
                        </p>
                        <Button variant="outline" size="sm">
                          Contact Support
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
} 