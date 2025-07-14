"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { DynamicContextProvider, DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector'
import { WagmiProvider, useAccount, useDisconnect, useChainId } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig, seiTestnet, validateSeiNetwork } from '../lib/sei'
import { DYNAMIC_CONFIG, HIDDEN_MESSAGE_2 } from "../lib/constants"
import { 
  UserProfileData, 
  loadUserProfile, 
  updateUserProfile,
  uploadProfileImage 
} from "../services/profile"
import { 
  WalletStats, 
  getWalletStatsWithCache,
  clearWalletCache 
} from "../services/wallet"

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
  hasInviteAccess: boolean
  userProfile: UserProfile | null
  walletStats: WalletStats | null
  connect: () => void
  disconnect: () => void
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>
  uploadAvatar: (file: File) => Promise<string>
  uploadBanner: (file: File) => Promise<string>
  refreshWalletData: () => Promise<void>
  setHasInviteAccess: (value: boolean) => void
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasInviteAccess, setHasInviteAccessState] = useState(false)

  // Check invite access and add hidden message on mount
  useEffect(() => {
    const hasAccess = localStorage.getItem("haus_invite_access") === "true"
    setHasInviteAccessState(hasAccess)

    // Add hidden message to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("_jabyl_signature", HIDDEN_MESSAGE_2)
    }
  }, [])

  const setHasInviteAccess = (value: boolean) => {
    setHasInviteAccessState(value)
    localStorage.setItem("haus_invite_access", value.toString())
  }

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
            <AuthContextContent 
              hasInviteAccess={hasInviteAccess}
              setHasInviteAccess={setHasInviteAccess}
              children={children}
            />
          </DynamicWagmiConnector>
        </DynamicContextProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}

// Inner component that has access to Dynamic hooks
function AuthContextContent({ 
  children, 
  hasInviteAccess, 
  setHasInviteAccess 
}: { 
  children: ReactNode
  hasInviteAccess: boolean
  setHasInviteAccess: (value: boolean) => void
}) {
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
    hasInviteAccess,
    userProfile,
    walletStats,
    connect,
    disconnect,
    updateProfile,
    uploadAvatar,
    uploadBanner,
    refreshWalletData,
    setHasInviteAccess,
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
