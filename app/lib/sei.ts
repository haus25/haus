import { createConfig, http } from 'wagmi'
import { createPublicClient, createWalletClient, custom, defineChain, type PublicClient, type WalletClient } from 'viem'
import { formatEther, parseEther } from 'viem'
import { SEI_NETWORK_CONFIG, CONTRACT_ADDRESSES } from './constants'

// Define Sei Testnet chain for Viem/Wagmi
export const seiTestnet = defineChain({
  id: SEI_NETWORK_CONFIG.chainId,
  name: SEI_NETWORK_CONFIG.name,
  nativeCurrency: {
    name: SEI_NETWORK_CONFIG.currency,
    symbol: SEI_NETWORK_CONFIG.currency,
    decimals: 18,
  },
  iconUrl: "https://assets.coingecko.com/coins/images/28205/large/Sei_Logo_-_Transparent.png",
  rpcUrls: {
    default: {
      http: [SEI_NETWORK_CONFIG.rpcUrl!],
    },
  },
  blockExplorers: {
    default: {
      name: 'Seitrace',
      url: SEI_NETWORK_CONFIG.explorerUrl,
    },
  },
  testnet: SEI_NETWORK_CONFIG.testnet,
})

// Create Wagmi config for Sei
export const wagmiConfig = createConfig({
  chains: [seiTestnet],
  multiInjectedProviderDiscovery: false,
  transports: {
    [seiTestnet.id]: http(SEI_NETWORK_CONFIG.rpcUrl),
  },
})

// Create public client for reading blockchain data
export const publicClient = createPublicClient({
  chain: seiTestnet,
  transport: http(SEI_NETWORK_CONFIG.rpcUrl),
})

// Helper function to create wallet client (when wallet is connected)
export const createWalletClientFromProvider = (provider: any) => {
  return createWalletClient({
    chain: seiTestnet,
    transport: custom(provider),
  })
}

// Helper function to format date to Unix timestamp
export const dateToUnixTimestamp = (date: Date): number => {
  return Math.floor(date.getTime() / 1000)
}

// Helper function to convert Unix timestamp to Date
export const unixTimestampToDate = (timestamp: number): Date => {
  return new Date(timestamp * 1000)
}

// Helper function to wait for transaction confirmation
export const waitForTransaction = async (publicClient: PublicClient, txHash: `0x${string}`) => {
  return await publicClient.waitForTransactionReceipt({ hash: txHash })
}

// Helper function to format Sei amounts (18 decimals)
export const formatSeiAmount = (amount: string | number | bigint): string => {
  return formatEther(BigInt(amount.toString()))
}

// Helper function to parse Sei amounts
export const parseSeiAmount = (amount: string): bigint => {
  return parseEther(amount)
}

// Contract interaction helpers
export const getContractConfig = (contractAddress: string, abi: any) => {
  return {
    address: contractAddress as `0x${string}`,
    abi,
  }
}

export const getEventFactoryConfig = (abi: any) => {
  if (!CONTRACT_ADDRESSES.EVENT_FACTORY) {
    throw new Error('Event Factory contract address not configured')
  }
  return getContractConfig(CONTRACT_ADDRESSES.EVENT_FACTORY, abi)
}

export const getTicketKioskConfig = (abi: any) => {
  if (!CONTRACT_ADDRESSES.TICKET_KIOSK) {
    throw new Error('Ticket Kiosk contract address not configured')
  }
  return getContractConfig(CONTRACT_ADDRESSES.TICKET_KIOSK, abi)
}

export const getLiveTippingConfig = (abi: any) => {
  if (!CONTRACT_ADDRESSES.LIVE_TIPPING) {
    throw new Error('Live Tipping contract address not configured')
  }
  return getContractConfig(CONTRACT_ADDRESSES.LIVE_TIPPING, abi)
}

// Network validation helper
export const validateSeiNetwork = (chainId: number): boolean => {
  return chainId === SEI_NETWORK_CONFIG.chainId
}

// Error handling helper for contract interactions
export const handleContractError = (error: any): never => {
  console.error('Contract interaction error:', error)
  
  if (error.code === 'INSUFFICIENT_FUNDS') {
    throw new Error('Insufficient SEI balance for this transaction')
  }
  
  if (error.code === 'USER_REJECTED') {
    throw new Error('Transaction was rejected by user')
  }
  
  if (error.message?.includes('network')) {
    throw new Error('Network error. Please check your connection to Sei Testnet')
  }
  
  throw new Error('Transaction failed. Please try again.')
} 