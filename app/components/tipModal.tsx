"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Slider } from "./ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Loader2, CheckCircle } from "lucide-react"

interface TipModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  tipAmount: number
  onTipAmountChange: (value: number) => void
}

export function TipModal({ isOpen, onClose, onSuccess, tipAmount, onTipAmountChange }: TipModalProps) {
  const [step, setStep] = useState<"initial" | "authorizing" | "recording" | "success" | "wallet">(
    "initial",
  )

  const handleSendTip = () => {
    setStep("wallet")
    setTimeout(() => {
      setStep("authorizing")
      setTimeout(() => {
        setStep("recording")
        setTimeout(() => {
          setStep("success")
          setTimeout(() => {
            onSuccess()
            setStep("initial")
          }, 1500)
        }, 1500)
      }, 1500)
    }, 2000)
  }

  const renderContent = () => {
    switch (step) {
      case "initial":
        return (
          <>
            <DialogHeader>
              <DialogTitle>Send a Tip</DialogTitle>
              <DialogDescription>Support the artist with a tip during their performance</DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <div className="text-center mb-6">
                <span className="text-4xl font-bold">{tipAmount} SEI </span>
              </div>

              <div className="space-y-4">
                <Slider
                  value={[tipAmount]}
                  min={1}
                  max={100}
                  step={1}
                  onValueChange={(value) => onTipAmountChange(value[0])}
                />

                <div className="flex justify-between">
                  {[5, 10, 20, 50].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => onTipAmountChange(amount)}
                      className={tipAmount === amount ? "border-primary" : ""}
                    >
                      {amount}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSendTip} className="bg-primary text-primary-foreground">
                Send Tip
              </Button>
            </DialogFooter>
          </>
        )

      case "authorizing":
        return (
          <div className="py-8 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Authorizing Transaction</h3>
            <p className="text-sm text-muted-foreground">
              Please approve the transaction in your wallet
            </p>
          </div>
        )

      case "recording":
        return (
          <div className="py-8 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Recording Tip</h3>
            <p className="text-sm text-muted-foreground">Your tip is being recorded on the blockchain</p>
          </div>
        )

      case "success":
        return (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Tip Sent Successfully!</h3>
            <p className="text-sm text-muted-foreground">Your tip of {tipAmount} SEI has been sent to the artist</p>
          </div>
        )

      case "wallet":
        return (
          <div className="py-8 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Connecting to Wallet</h3>
            <p className="text-sm text-muted-foreground">Please approve the transaction in your wallet</p>
          </div>
        )



      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={step === "initial" ? onClose : undefined}>
      <DialogContent className="sm:max-w-[425px]">{renderContent()}</DialogContent>
    </Dialog>
  )
}
