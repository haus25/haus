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
  ensName?: string | null
  displayName?: string
  avatar?: string | null
  bio?: string | null
  favoriteCategories: string[]
  socials: {
    twitter?: string
    discord?: string
    farcaster?: string
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

  // Load user profile and wallet data when wallet connects
  useEffect(() => {
    const loadUserData = async () => {
      if (isConnected && address) {
        setIsLoading(true)
        
        try {
          // Auto-validate and prompt network switch if needed
          if (!validateSeiNetwork(chainId)) {
            console.warn('Please switch to Sei Testnet (Chain ID: 1328)')
          }

          // Load profile data from IPFS/Pinata
          const profileData = await loadUserProfile(address)
          
          // Get wallet stats
          const walletData = await getWalletStatsWithCache(address)
          setWalletStats(walletData)

                     // Create or update profile
           const profile: UserProfile = {
             address: address.toLowerCase(),
             ensName: user?.email || primaryWallet?.connector?.name || undefined,
             displayName: profileData?.displayName || user?.email || primaryWallet?.connector?.name || undefined,
             avatar: profileData?.avatar || undefined,
             bio: profileData?.bio || undefined,
             favoriteCategories: profileData?.favoriteCategories || [],
             socials: profileData?.socials || {},
             isProfileComplete: profileData?.isProfileComplete || false,
             walletStats: walletData,
           }
          
          setUserProfile(profile)
          
          // Save to localStorage for quick access
          localStorage.setItem("haus_auth", JSON.stringify({ 
            isConnected: true, 
            userProfile: profile,
            walletStats: walletData,
          }))

        } catch (error) {
          console.error("Failed to load user data:", error)
          
          // Fallback to basic profile
          const basicProfile: UserProfile = {
            address: address.toLowerCase(),
            ensName: user?.email || primaryWallet?.connector?.name || null,
            favoriteCategories: [],
            socials: {},
            isProfileComplete: false,
          }
          setUserProfile(basicProfile)
        } finally {
          setIsLoading(false)
        }
      } else {
        setUserProfile(null)
        setWalletStats(null)
        localStorage.removeItem("haus_auth")
      }
    }

    loadUserData()
  }, [isConnected, address, chainId, user, primaryWallet])

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

      // Prepare profile data for IPFS storage
      const profileDataForIPFS = {
        address: address.toLowerCase(),
        ensName: profileUpdates.ensName ?? userProfile.ensName,
        displayName: profileUpdates.displayName ?? userProfile.displayName,
        bio: profileUpdates.bio ?? userProfile.bio,
        avatar: profileUpdates.avatar ?? userProfile.avatar,
        banner: profileUpdates.banner ?? userProfile.banner,
        favoriteCategories: profileUpdates.favoriteCategories ?? userProfile.favoriteCategories,
        socials: { ...userProfile.socials, ...profileUpdates.socials },
        isProfileComplete: profileUpdates.isProfileComplete ?? userProfile.isProfileComplete,
        createdAt: userProfile.createdAt || Date.now(),
        updatedAt: Date.now(),
      }

      // Save to IPFS/Pinata
      await updateUserProfile(address, profileDataForIPFS)

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
    if (!address) {
      throw new Error("No wallet address available")
    }

    try {
      const imageUrl = await uploadProfileImage(file, "avatar", address)
      await updateProfile({ avatar: imageUrl })
      return imageUrl
    } catch (error) {
      console.error("Failed to upload avatar:", error)
      throw error
    }
  }

  const uploadBanner = async (file: File): Promise<string> => {
    if (!address) {
      throw new Error("No wallet address available")
    }

    try {
      const imageUrl = await uploadProfileImage(file, "banner", address)
      await updateProfile({ banner: imageUrl })
      return imageUrl
    } catch (error) {
      console.error("Failed to upload banner:", error)
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
