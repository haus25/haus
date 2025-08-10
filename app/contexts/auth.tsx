"use client"

import { createContext, useContext, useState, useEffect, lazy, Suspense, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { DynamicContextProvider, DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector'
import { WagmiProvider, useAccount, useDisconnect, useChainId } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type Address } from 'viem'
import { getBalance, getTransactionCount } from 'viem/actions'
import { Button } from "../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { RadioGroup, RadioGroupItem } from "../components/ui/radioGroup"
import { Label } from "../components/ui/label"
import { HausLogo } from "../components/logo"
import { Check, Clock, Compass, HelpCircle, Plus, Ticket, Loader2 } from "lucide-react"
import { wagmiConfig, seiTestnet, validateSeiNetwork, publicClient, formatSeiAmount } from '../lib/sei'
import { DYNAMIC_CONFIG, HIDDEN_MESSAGE_2 } from "../lib/constants"
import { 
  UserProfileData, 
  loadUserProfile, 
  updateUserProfile,
  uploadProfileImage 
} from "../services/profile"

// Public routes that don't require authentication (users can browse but may need auth for actions)
const PUBLIC_ROUTES = ["/", "/about", "/help", "/kiosk", "/factory", "/room"]

// Lazy load the RTA info modal
const RtaInfoModal = lazy(() => import("../components/rtaInfo").then((mod) => ({ default: mod.RtaInfoModal })))

// Loading fallback
const LoadingFallback = () => <div className="hidden">Loading...</div>

// Types for wallet data
export interface WalletBalance {
  balance: string
  formattedBalance: string
  symbol: string
  decimals: number
}

export interface Transaction {
  hash: string
  from: string
  to: string | null
  value: string
  formattedValue: string
  blockNumber: number
  timestamp: number
  status: 'success' | 'failed' | 'pending'
  type: 'send' | 'receive' | 'contract'
}

export interface WalletStats {
  address: string
  balance: WalletBalance
  transactionCount: number
  transactions: Transaction[]
  lastUpdated: number
}

// Enhanced user profile interface that extends the profile service interface
interface UserProfile extends Partial<UserProfileData> {
  address: string
  name: string // Progressive username (haus_001, haus_002, etc.)
  displayName?: string
  avatar?: string | null
  banner?: string | null
  bio?: string | null
  preferences: string[] // Art categories (renamed from favoriteCategories)
  socials: {
    twitter?: string
    discord?: string
    farcaster?: string
    twitch?: string
    telegram?: string
    github?: string
    website?: string
  }
  isProfileComplete: boolean
  // Wallet specific data
  walletStats?: WalletStats
}

interface AuthContextType {
  isConnected: boolean
  isLoading: boolean
  userProfile: UserProfile | null
  walletStats: WalletStats | null
  connect: () => void
  disconnect: () => void
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>
  uploadAvatar: (file: File) => Promise<string>
  uploadBanner: (file: File) => Promise<string>
  refreshWalletData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create QueryClient instance with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds
    },
  },
})

// Wallet utility functions
export async function getWalletBalance(address: string): Promise<WalletBalance> {
  try {
    const balance = await getBalance(publicClient, {
      address: address as Address,
    })

    const formattedBalance = formatSeiAmount(balance)

    return {
      balance: balance.toString(),
      formattedBalance,
      symbol: seiTestnet.nativeCurrency.symbol,
      decimals: seiTestnet.nativeCurrency.decimals,
    }
  } catch (error) {
    console.error('Error fetching wallet balance:', error)
    throw new Error('Failed to fetch wallet balance')
  }
}

export async function getWalletTransactionCount(address: string): Promise<number> {
  try {
    const count = await getTransactionCount(publicClient, {
      address: address as Address,
    })
    return Number(count)
  } catch (error) {
    console.error('Error fetching transaction count:', error)
    throw new Error('Failed to fetch transaction count')
  }
}

export async function getWalletTransactions(
  address: string,
  limit: number = 10
): Promise<Transaction[]> {
  try {
    // Placeholder for now - in production integrate with indexing services
    const transactions: Transaction[] = []
    return transactions
  } catch (error) {
    console.error('Error fetching wallet transactions:', error)
    return []
  }
}

export async function getWalletStats(address: string): Promise<WalletStats> {
  try {
    const [balance, transactionCount, transactions] = await Promise.all([
      getWalletBalance(address),
      getWalletTransactionCount(address),
      getWalletTransactions(address),
    ])

    return {
      address: address.toLowerCase(),
      balance,
      transactionCount,
      transactions,
      lastUpdated: Date.now(),
    }
  } catch (error) {
    console.error('Error fetching wallet stats:', error)
    throw new Error('Failed to fetch wallet statistics')
  }
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function formatAddress(address: string, startLength: number = 6, endLength: number = 4): string {
  if (!isValidAddress(address)) return address
  
  if (address.length <= startLength + endLength) return address
  
  return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`
}

function getWalletStorageKey(address: string): string {
  return `haus_wallet_${address.toLowerCase()}`
}

function saveWalletStats(walletStats: WalletStats): void {
  try {
    const storageKey = getWalletStorageKey(walletStats.address)
    localStorage.setItem(storageKey, JSON.stringify(walletStats))
  } catch (error) {
    console.error('Error saving wallet stats to localStorage:', error)
  }
}

function getCachedWalletStats(address: string): WalletStats | null {
  try {
    const storageKey = getWalletStorageKey(address)
    const cached = localStorage.getItem(storageKey)
    
    if (cached) {
      const parsed = JSON.parse(cached)
      // Check if cache is older than 5 minutes
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
      if (parsed.lastUpdated > fiveMinutesAgo) {
        return parsed
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting cached wallet stats:', error)
    return null
  }
}

export async function getWalletStatsWithCache(address: string, useCache: boolean = true): Promise<WalletStats> {
  // Check cache first if enabled
  if (useCache) {
    const cached = getCachedWalletStats(address)
    if (cached) {
      return cached
    }
  }

  // Fetch fresh data
  const walletStats = await getWalletStats(address)
  
  // Save to cache
  saveWalletStats(walletStats)
  
  return walletStats
}

export function clearWalletCache(address: string): void {
  try {
    const storageKey = getWalletStorageKey(address)
    localStorage.removeItem(storageKey)
  } catch (error) {
    console.error('Error clearing wallet cache:', error)
  }
}

export function getNetworkInfo() {
  return {
    name: seiTestnet.name,
    symbol: seiTestnet.nativeCurrency.symbol,
    chainId: seiTestnet.id,
    explorerUrl: seiTestnet.blockExplorers.default.url,
    isTestnet: seiTestnet.testnet,
  }
}

// Login Modal Component
type LoginStep = "initial" | "profile-setup"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  redirectPath?: string
}

function LoginModal({ isOpen, onClose, redirectPath }: LoginModalProps) {
  const { isConnected, updateProfile, userProfile } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<LoginStep>("initial")
  const [nameChoice, setNameChoice] = useState<"detected" | "custom">("detected")
  const [customName, setCustomName] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [bio, setBio] = useState("")
  const [hasJustAuthenticated, setHasJustAuthenticated] = useState(false)

  // Track when user first connects during this modal session
  useEffect(() => {
    if (isConnected && isOpen) {
      setHasJustAuthenticated(true)
    }
  }, [isConnected, isOpen])

  // Handle profile setup and redirects only after authentication during modal session
  useEffect(() => {
    if (!isConnected || !userProfile) return

    if (!userProfile.isProfileComplete) {
      setStep("profile-setup")
    } else if (userProfile.isProfileComplete && hasJustAuthenticated && isOpen) {
      // Only redirect if user just authenticated in this modal session
      onClose()
      if (redirectPath) {
        router.push(redirectPath)
      } else {
        // Default redirect to profile page after successful login - ONLY for first time
        router.push("/profile?tab=info")
      }
      setHasJustAuthenticated(false)
    }
  }, [isConnected, userProfile, hasJustAuthenticated, isOpen, onClose, redirectPath, router])

  // Reset authentication flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasJustAuthenticated(false)
    }
  }, [isOpen])

  const handleNameSelection = () => {
    if (nameChoice === "custom" && !customName.trim()) {
      return // Don't proceed if custom name is empty
    }

    // Update profile with selected name
    updateProfile({
      displayName: nameChoice === "detected" ? "jabyl.eth" : customName,
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
      preferences: selectedCategories,
      isProfileComplete: true,
    })

    // Close the modal
    onClose()

    // Redirect to the specified path if provided, otherwise default to profile info tab for first setup
    if (redirectPath) {
      router.push(redirectPath)
    } else {
      router.push("/profile?tab=info")
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
                        {userProfile?.displayName || (userProfile?.address ? `${userProfile.address.slice(0, 6)}...${userProfile.address.slice(-4)}` : "Anonymous")}
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
                    "live-streaming",
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

// Quick Access Component
export function QuickAccess() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { isConnected } = useAuth()
  const router = useRouter()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRtaModal, setShowRtaModal] = useState(false)
  const [redirectPath, setRedirectPath] = useState("")

  const handleButtonClick = (path: string) => {
    if (isConnected) {
      router.push(path)
    } else {
      setRedirectPath(path)
      setShowLoginModal(true)
    }
  }

  const handleHelpClick = () => {
    setShowRtaModal(true)
  }

  return (
    <>
      <div
        className={`fixed right-4 bottom-4 z-40 flex flex-col items-end transition-all duration-300 ${
          isExpanded ? "gap-2" : ""
        }`}
      >
        {isExpanded && (
          <div className="flex flex-col gap-2 mb-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background shadow-md"
              onClick={() => handleButtonClick("/factory")}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Create Event</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background shadow-md"
              onClick={() => handleButtonClick("/kiosk")}
            >
              <Compass className="h-4 w-4" />
              <span className="sr-only">Discover Events</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background shadow-md"
              onClick={() => handleButtonClick("/profile")}
            >
              <Ticket className="h-4 w-4" />
              <span className="sr-only">My Tickets</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background shadow-md"
              onClick={handleHelpClick}
            >
              <HelpCircle className="h-4 w-4" />
              <span className="sr-only">Help</span>
            </Button>
          </div>
        )}

        <Button size="icon" className="rounded-full shadow-lg" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <Clock className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          <span className="sr-only">Quick Access</span>
        </Button>
      </div>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} redirectPath={redirectPath} />

      <Suspense fallback={<LoadingFallback />}>
        {showRtaModal && <RtaInfoModal open={showRtaModal} onClose={() => setShowRtaModal(false)} />}
      </Suspense>
    </>
  )
}

// Auth Guard Component
interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isConnected, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    // Skip auth check for public routes and their sub-routes
    const isPublicRoute = PUBLIC_ROUTES.some(route => 
      pathname === route || pathname.startsWith(route + "/")
    )
    
    if (isPublicRoute) {
      // Don't show login modal for public routes
      setShowLoginModal(false)
      return
    }

    // Only show login modal for protected routes when not authenticated
    if (!isLoading && !isConnected) {
      setShowLoginModal(true)
    }
  }, [isConnected, isLoading, pathname])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Check if current route is public (including sub-routes)
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  )

  // If not authenticated and not on a public route, show login modal
  if (!isConnected && !isPublicRoute) {
    return (
      <>
        {children}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => {
            setShowLoginModal(false)
          }}
          redirectPath={pathname}
        />
      </>
    )
  }

  // If authenticated or on a public route, render children
  return <>{children}</>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Add hidden message to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("_jabyl_signature", HIDDEN_MESSAGE_2)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <DynamicContextProvider
          settings={{
            environmentId: DYNAMIC_CONFIG.environmentId,
            walletConnectors: [EthereumWalletConnectors],
            networkValidationMode: 'always',
            initialAuthenticationMode: 'connect-only',
            socialProvidersFilter: (providers) => providers.filter((provider) =>
              ['twitter', 'discord', 'github', 'google', 'twitch', 'farcaster'].includes(provider)
            ),
          }}
        >
          <DynamicWagmiConnector>
            <AuthContextContent children={children} />
          </DynamicWagmiConnector>
        </DynamicContextProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}

// Inner component that has access to Dynamic hooks
function AuthContextContent({ children }: { children: ReactNode }) {
  const { primaryWallet, user, setShowAuthFlow } = useDynamicContext()
  const { isConnected, address } = useAccount()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const chainId = useChainId()
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load user profile data from IPFS
  useEffect(() => {
    const loadUserData = async () => {
      if (!address || !isConnected) {
        console.log('AUTH: No address or not connected, skipping profile load')
        return
      }

      setIsLoading(true)
      console.log('AUTH: Loading user profile for address:', address)

      try {
        // Try to load existing profile from localStorage
        const existingProfile = await loadUserProfile(address)
        
        if (existingProfile) {
          console.log('AUTH: Loaded existing profile from IPFS')
          console.log('AUTH: Profile name:', existingProfile.name)
          console.log('AUTH: Display name:', existingProfile.displayName)
          
          setUserProfile({
            address,
            name: existingProfile.name,
            displayName: existingProfile.displayName || existingProfile.name,
            avatar: existingProfile.avatar,
            banner: existingProfile.banner,
            bio: existingProfile.bio,
            preferences: existingProfile.preferences || [],
            socials: existingProfile.socials || {},
            isProfileComplete: existingProfile.isProfileComplete || false,
            walletStats: walletStats || undefined
          })
        } else {
          console.log('AUTH: No existing profile found, creating new profile with progressive username')
          
          // Create profile using the updateUserProfile function which will generate progressive username
          try {
            await updateUserProfile(address, {
              displayName: user?.email || primaryWallet?.connector?.name || undefined,
              preferences: [],
              socials: {},
              isProfileComplete: false
            })
            
            // Load the newly created profile
            const newProfile = await loadUserProfile(address)
            if (newProfile) {
              setUserProfile({
                address,
                name: newProfile.name,
                displayName: newProfile.displayName || newProfile.name,
                avatar: newProfile.avatar,
                banner: newProfile.banner,
                bio: newProfile.bio,
                preferences: newProfile.preferences || [],
                socials: newProfile.socials || {},
                isProfileComplete: newProfile.isProfileComplete || false,
                walletStats: walletStats || undefined
              })
              console.log('AUTH: New profile created with username:', newProfile.name)
            }
          } catch (error) {
            console.error('AUTH: Failed to create new profile:', error)
            // Fallback to basic profile without persistence
            setUserProfile({
              address,
              name: `haus_temp_${address.slice(0, 6)}`,
              displayName: `User ${address.slice(0, 6)}`,
              preferences: [],
              socials: {},
              isProfileComplete: false,
              walletStats: walletStats || undefined
            })
          }
        }

      } catch (error) {
        console.error('AUTH: Error loading user profile:', error)
        
        // Fallback to basic profile
        setUserProfile({
          address,
          name: `haus_temp_${address.slice(0, 6)}`,
          displayName: user?.email || primaryWallet?.connector?.name || `Creator ${address.slice(0, 6)}`,
          preferences: [],
          socials: {},
          isProfileComplete: false,
          walletStats: walletStats || undefined
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [isConnected, address, chainId, user, primaryWallet, walletStats])

  // Load saved auth state on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem("haus_auth")
    if (storedAuth && !isConnected) {
      try {
        const { userProfile: savedProfile } = JSON.parse(storedAuth)
        // Don't restore if wallet isn't actually connected
        if (!isConnected) {
          localStorage.removeItem("haus_auth")
        }
      } catch (error) {
        console.error("Failed to parse stored auth:", error)
        localStorage.removeItem("haus_auth")
      }
    }
  }, [isConnected])

  const connect = () => {
    setIsLoading(true)
    try {
      setShowAuthFlow(true)
    } catch (error) {
      console.error("Failed to show auth flow:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = async () => {
    try {
      await wagmiDisconnect()
      
      // Clear cached data
      if (address) {
        clearWalletCache(address)
      }
      
      setUserProfile(null)
      setWalletStats(null)
      localStorage.removeItem("haus_auth")
    } catch (error) {
      console.error("Failed to disconnect:", error)
    }
  }

  const updateProfile = async (profileUpdates: Partial<UserProfile>) => {
    if (!userProfile || !address) {
      throw new Error("No user profile or address available")
    }

    try {
      setIsLoading(true)

      // Prepare profile data for Pinata IPFS storage
      const profileUpdatesForIPFS = {
        displayName: profileUpdates.displayName ?? userProfile.displayName,
        bio: profileUpdates.bio ?? userProfile.bio,
        avatar: profileUpdates.avatar ?? userProfile.avatar,
        banner: profileUpdates.banner ?? userProfile.banner,
        preferences: profileUpdates.preferences ?? userProfile.preferences,
        socials: { ...userProfile.socials, ...profileUpdates.socials },
        isProfileComplete: profileUpdates.isProfileComplete ?? userProfile.isProfileComplete,
      }

      // Save to Pinata IPFS
      await updateUserProfile(address, profileUpdatesForIPFS)

      // Update local state
      const updatedProfile = { ...userProfile, ...profileUpdates }
      setUserProfile(updatedProfile)
      
      // Update localStorage
      localStorage.setItem("haus_auth", JSON.stringify({ 
        isConnected: true, 
        userProfile: updatedProfile,
        walletStats,
      }))

    } catch (error) {
      console.error("Failed to update profile:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!address || !userProfile?.name) {
      throw new Error("No wallet address or username available")
    }

    try {
      console.log('AUTH: Uploading avatar for user:', userProfile.name)
      const imageUrl = await uploadProfileImage(file, "avatar", userProfile.name)
      await updateProfile({ avatar: imageUrl })
      console.log('AUTH: Avatar uploaded and profile updated:', imageUrl)
      return imageUrl
    } catch (error) {
      console.error("AUTH: Failed to upload avatar:", error)
      throw error
    }
  }

  const uploadBanner = async (file: File): Promise<string> => {
    if (!address || !userProfile?.name) {
      throw new Error("No wallet address or username available")
    }

    try {
      console.log('AUTH: Uploading banner for user:', userProfile.name)
      const imageUrl = await uploadProfileImage(file, "banner", userProfile.name)
      await updateProfile({ banner: imageUrl })
      console.log('AUTH: Banner uploaded and profile updated:', imageUrl)
      return imageUrl
    } catch (error) {
      console.error("AUTH: Failed to upload banner:", error)
      throw error
    }
  }

  const refreshWalletData = async () => {
    if (!address) return

    try {
      setIsLoading(true)
      
      // Force refresh wallet data (bypass cache)
      const freshWalletData = await getWalletStatsWithCache(address, false)
      setWalletStats(freshWalletData)

      // Update profile with fresh wallet data
      if (userProfile) {
        const updatedProfile = { ...userProfile, walletStats: freshWalletData }
        setUserProfile(updatedProfile)
        
        localStorage.setItem("haus_auth", JSON.stringify({ 
          isConnected: true, 
          userProfile: updatedProfile,
          walletStats: freshWalletData,
        }))
      }
    } catch (error) {
      console.error("Failed to refresh wallet data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const contextValue: AuthContextType = {
    isConnected: isConnected && Boolean(address),
    isLoading,
    userProfile,
    walletStats,
    connect,
    disconnect,
    updateProfile,
    uploadAvatar,
    uploadBanner,
    refreshWalletData,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {/* Hidden comment with encrypted message */}
      {/* <!-- jabyl: anVzdCBhbm90aGVyIHF1b3RlLg== --> */}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Re-export Dynamic components for convenience
export { DynamicWidget }
