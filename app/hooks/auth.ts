"use client"

import { useAccount, useConnect, useDisconnect } from "wagmi"
import { useWalletClient } from "wagmi"
import { useAuth as useAuthContext } from "../contexts/auth"
import { SEI_NETWORK_CONFIG, config } from "../lib/constants"

/**
 * Enhanced auth hook that combines Wagmi wallet connection with our auth context
 * This provides a unified interface for authentication and wallet operations
 */
export function useAuth() {
  const { 
    isConnected, 
    address, 
    connector, 
    isConnecting, 
    isReconnecting 
  } = useAccount()
  
  const { connect, connectors, error: connectError, isPending: isConnectLoading } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: walletClient } = useWalletClient()
  
  const {
    userProfile,
    isLoading: authLoading,
    hasInviteAccess,
    updateProfile,
    setHasInviteAccess,
    connect: showConnectModal
  } = useAuthContext()

  // Format address for display
  const formatAddress = (addr?: string | null) => {
    if (!addr) return ""
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  // Get display name from profile or formatted address
  const getDisplayName = () => {
    if (!isConnected || !address) return "Not Connected"
    if (userProfile?.ensName) return userProfile.ensName
    return formatAddress(address)
  }

  // Check if connected to the right network
  const isCorrectNetwork = () => {
    // This would need to be implemented based on the current chain
    // For now, assume we're on the correct network
    return true
  }

  // Connect to a specific wallet
  const connectWallet = async (connectorId?: string) => {
    try {
      if (connectorId) {
        const targetConnector = connectors.find(c => c.id === connectorId)
        if (targetConnector) {
          await connect({ connector: targetConnector })
        }
      } else {
        // Show the Dynamic connect modal
        showConnectModal()
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    }
  }

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      await disconnect()
    } catch (error) {
      console.error("Failed to disconnect wallet:", error)
    }
  }

  // Get connection status
  const getConnectionStatus = () => {
    if (isConnecting || isReconnecting) return "connecting"
    if (isConnected) return "connected"
    return "disconnected"
  }

  return {
    // Wallet connection state
    isConnected,
    isConnecting: isConnecting || isReconnecting,
    isLoading: authLoading || isConnectLoading,
    address,
    connector,
    walletClient,
    
    // User profile and auth state
    userProfile,
    hasInviteAccess,
    
    // Network state
    chainId: SEI_NETWORK_CONFIG.chainId,
    isCorrectNetwork: isCorrectNetwork(),
    
    // Helper functions
    formatAddress,
    getDisplayName,
    getConnectionStatus,
    
    // Actions
    connect: connectWallet,
    disconnect: disconnectWallet,
    showConnectModal,
    updateProfile,
    setHasInviteAccess,
    
    // Errors
    error: connectError,
    
    // Available connectors
    connectors,
  }
}
