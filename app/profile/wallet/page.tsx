"use client"

import { useState } from "react"
import { Navbar } from "../../components/navbar"
import { Breadcrumbs } from "../../components/breadcrumbs"
import { QuickAccess } from "../../components/quickAccess"
import { WalletDelegationSettings } from "../../components/delegationSettings"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Badge } from "../../components/ui/badge"
import { 
  Copy, 
  ExternalLink, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react"
import { useAuth } from "../../contexts/auth"
import { getNetworkInfo, formatAddress } from "../../services/wallet"
import { toast } from "sonner"

export default function WalletPage() {
  const { userProfile, walletStats, refreshWalletData, isLoading } = useAuth()
  const [showFullAddress, setShowFullAddress] = useState(false)
  const networkInfo = getNetworkInfo()

  const handleCopyAddress = () => {
    if (userProfile?.address) {
      navigator.clipboard.writeText(userProfile.address)
      toast.success("Address copied to clipboard!")
    }
  }

  const handleRefreshWallet = async () => {
    try {
      await refreshWalletData()
      toast.success("Wallet data refreshed!")
    } catch (error) {
      toast.error("Failed to refresh wallet data")
    }
  }

  const handleViewOnExplorer = () => {
    if (userProfile?.address) {
      window.open(`${networkInfo.explorerUrl}/address/${userProfile.address}`, '_blank')
    }
  }

  // Show loading state if no wallet data
  if (!userProfile) {
    return (
      <div className="min-h-screen flex flex-col texture-bg">
        <Navbar />
        <QuickAccess />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading wallet...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col texture-bg">
      <Navbar />
      <QuickAccess />

      <main className="flex-1 container py-12">
        <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, { label: "Wallet" }]} />

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Wallet</h1>
            <p className="text-muted-foreground">
              Manage your wallet, view transactions, and configure delegation settings
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefreshWallet}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Wallet Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Balance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="h-5 w-5 mr-2" />
                  Wallet Balance
                </CardTitle>
                <CardDescription>Your current {networkInfo.symbol} balance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      {walletStats?.balance.formattedBalance || "0.00"} {networkInfo.symbol}
                    </div>
                    <p className="text-muted-foreground">
                      Balance on {networkInfo.name}
                      {networkInfo.isTestnet && (
                        <Badge variant="secondary" className="ml-2">Testnet</Badge>
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-lg font-semibold">
                        {walletStats?.transactionCount || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Transactions</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-lg font-semibold">
                        {networkInfo.chainId}
                      </div>
                      <p className="text-sm text-muted-foreground">Chain ID</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Address Card */}
            <Card>
              <CardHeader>
                <CardTitle>Wallet Address</CardTitle>
                <CardDescription>Your unique wallet identifier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono">
                        {showFullAddress 
                          ? userProfile.address 
                          : formatAddress(userProfile.address)
                        }
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFullAddress(!showFullAddress)}
                      >
                        {showFullAddress ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={handleCopyAddress} className="flex-1">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Address
                    </Button>
                    <Button variant="outline" onClick={handleViewOnExplorer} className="flex-1">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Explorer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your latest blockchain transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {walletStats?.transactions && walletStats.transactions.length > 0 ? (
                  <div className="space-y-3">
                    {walletStats.transactions.map((tx, index) => (
                      <div key={tx.hash || index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {tx.type === 'send' ? (
                              <ArrowUpRight className="h-5 w-5 text-red-500" />
                            ) : tx.type === 'receive' ? (
                              <ArrowDownRight className="h-5 w-5 text-green-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-blue-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {tx.type === 'send' ? 'Sent' : tx.type === 'receive' ? 'Received' : 'Contract Interaction'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {tx.to ? formatAddress(tx.to) : 'Contract Call'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {tx.formattedValue} {networkInfo.symbol}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Block #{tx.blockNumber}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No transactions found</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Transactions will appear here once you start using your wallet
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Network Info */}
            <Card>
              <CardHeader>
                <CardTitle>Network Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <div className="flex items-center">
                    <span>{networkInfo.name}</span>
                    {networkInfo.isTestnet && (
                      <Badge variant="secondary" className="ml-2 text-xs">Testnet</Badge>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chain ID</span>
                  <span>{networkInfo.chainId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency</span>
                  <span>{networkInfo.symbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Explorer</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(networkInfo.explorerUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full" onClick={() => window.open(`${networkInfo.explorerUrl}/address/${userProfile.address}`, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
                <Button variant="outline" className="w-full" onClick={handleCopyAddress}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Address
                </Button>
                <Button variant="outline" className="w-full" onClick={handleRefreshWallet} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh Data
                </Button>
              </CardContent>
            </Card>

            {/* Wallet Management */}
            <Card>
              <CardHeader>
                <CardTitle>Wallet Management</CardTitle>
                <CardDescription>Advanced wallet settings and delegation</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="settings" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="delegation">Delegation</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="settings" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Security</h4>
                      <p className="text-sm text-muted-foreground">
                        Your wallet is secured by Dynamic's infrastructure with multi-party computation.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Backup</h4>
                      <p className="text-sm text-muted-foreground">
                        Your wallet is automatically backed up to your connected account.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="delegation" className="mt-4">
                    <WalletDelegationSettings />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
