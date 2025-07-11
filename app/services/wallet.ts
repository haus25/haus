import { type Address } from 'viem'
import { getBalance, getTransactionCount } from 'viem/actions'
import { publicClient, seiTestnet, formatSeiAmount } from '../lib/sei'

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

/**
 * Gets the current SEI balance for an address
 */
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

/**
 * Gets the transaction count for an address
 */
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

/**
 * Fetches transaction history for a wallet address
 * Note: This is a simplified version. In production, you'd want to use
 * proper blockchain indexing services or APIs for better performance
 */
export async function getWalletTransactions(
  address: string,
  limit: number = 10
): Promise<Transaction[]> {
  try {
    // For now, we'll return a placeholder array since Viem doesn't provide
    // a direct way to fetch transaction history without an indexing service
    // In production, you'd integrate with services like:
    // - Alchemy
    // - Moralis
    // - The Graph
    // - Or a custom indexer

    // Placeholder for now - this would be replaced with actual API calls
    const transactions: Transaction[] = []

    // You might want to call an external API here like:
    // const response = await fetch(`${SEI_EXPLORER_API}/address/${address}/transactions?limit=${limit}`)
    // const data = await response.json()
    // return data.transactions.map(tx => parseTransaction(tx))

    return transactions
  } catch (error) {
    console.error('Error fetching wallet transactions:', error)
    return []
  }
}

/**
 * Gets comprehensive wallet statistics
 */
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

/**
 * Validates if an address is a valid Ethereum/Sei address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Formats an address for display (0x1234...5678)
 */
export function formatAddress(address: string, startLength: number = 6, endLength: number = 4): string {
  if (!isValidAddress(address)) return address
  
  if (address.length <= startLength + endLength) return address
  
  return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`
}

/**
 * Creates a wallet storage key for localStorage
 */
export function getWalletStorageKey(address: string): string {
  return `haus_wallet_${address.toLowerCase()}`
}

/**
 * Saves wallet stats to localStorage for caching
 */
export function saveWalletStats(walletStats: WalletStats): void {
  try {
    const storageKey = getWalletStorageKey(walletStats.address)
    localStorage.setItem(storageKey, JSON.stringify(walletStats))
  } catch (error) {
    console.error('Error saving wallet stats to localStorage:', error)
  }
}

/**
 * Gets cached wallet stats from localStorage
 */
export function getCachedWalletStats(address: string): WalletStats | null {
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

/**
 * Gets wallet stats with caching support
 */
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

/**
 * Clears cached wallet data for an address
 */
export function clearWalletCache(address: string): void {
  try {
    const storageKey = getWalletStorageKey(address)
    localStorage.removeItem(storageKey)
  } catch (error) {
    console.error('Error clearing wallet cache:', error)
  }
}

/**
 * Gets the network info for display
 */
export function getNetworkInfo() {
  return {
    name: seiTestnet.name,
    symbol: seiTestnet.nativeCurrency.symbol,
    chainId: seiTestnet.id,
    explorerUrl: seiTestnet.blockExplorers.default.url,
    isTestnet: seiTestnet.testnet,
  }
} 