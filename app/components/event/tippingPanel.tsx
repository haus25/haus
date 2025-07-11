"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAccount } from "wagmi"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth"

interface TippingPanelProps {
  eventId: string
  onTip: (amount: number) => void
}

export default function TippingPanel({ eventId, onTip }: TippingPanelProps) {
  const [customAmount, setCustomAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const { isConnected } = useAccount()
  const { connect } = useAuth()
  const { toast } = useToast()

  // Handle preset tip amount
  const handlePresetTip = async (amount: number) => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to tip the artist.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsProcessing(true)
      await onTip(amount)
      setIsProcessing(false)
    } catch (error) {
      console.error("Error processing tip:", error)
      toast({
        title: "Error",
        description: "Failed to process tip. Please try again.",
        variant: "destructive",
      })
      setIsProcessing(false)
    }
  }

  // Handle custom tip amount
  const handleCustomTip = async () => {
    if (!customAmount || isNaN(Number.parseFloat(customAmount))) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid tip amount.",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(customAmount)
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Tip amount must be greater than 0.",
        variant: "destructive",
      })
      return
    }

    await handlePresetTip(amount)
    setCustomAmount("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Support the Artist</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Tip the artist to show your appreciation. The highest tipper will receive the final RTA NFT!
          </p>

          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => handlePresetTip(0.1)} disabled={isProcessing || !isConnected} variant="outline">
              0.1 SEI
            </Button>
            <Button onClick={() => handlePresetTip(0.5)} disabled={isProcessing || !isConnected} variant="outline">
              0.5 SEI
            </Button>
            <Button onClick={() => handlePresetTip(1)} disabled={isProcessing || !isConnected} variant="outline">
              1 SEI
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-amount">Custom Amount (SEI)</Label>
            <div className="flex">
              <Input
                id="custom-amount"
                type="number"
                min="0.000001"
                step="0.1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                disabled={isProcessing || !isConnected}
                className="flex-1"
              />
              <Button
                onClick={handleCustomTip}
                disabled={isProcessing || !isConnected || !customAmount}
                className="ml-2"
              >
                Tip
              </Button>
            </div>
          </div>

          {!isConnected && (
            <div className="space-y-2">
              <p className="text-sm text-red-500">Please connect your wallet to tip the artist.</p>
              <Button onClick={connect} variant="outline" className="w-full">
                Connect Wallet
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
