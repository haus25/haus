"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { AlertCircle, CheckCircle, Info, Shield } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"

export function WalletDelegationSettings() {
  const [delegateSignatures, setDelegateSignatures] = useState(false)
  const [payForGas, setPayForGas] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSaveChanges = () => {
    // Simulate saving changes
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
    }, 3000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2 text-primary" />
          Wallet Delegation Settings
        </CardTitle>
        <CardDescription>Configure how you want to interact with the blockchain</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Settings saved</AlertTitle>
            <AlertDescription className="text-green-700">
              Your wallet delegation settings have been updated successfully.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center">
                <Label htmlFor="delegate-signatures" className="font-medium">
                  Delegate Signatures
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground ml-2 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Allow Haus to sign transactions on your behalf. This means you won't need to approve each
                        transaction manually.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">Authorize Haus to sign transactions on your behalf</p>
            </div>
            <Switch id="delegate-signatures" checked={delegateSignatures} onCheckedChange={setDelegateSignatures} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center">
                <Label htmlFor="pay-for-gas" className="font-medium">
                  Pay for Gas
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground ml-2 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Allow Haus to pay for gas fees on your behalf. This enables gasless transactions for a seamless
                        experience.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">Let Haus handle gas fees for your transactions</p>
            </div>
            <Switch id="pay-for-gas" checked={payForGas} onCheckedChange={setPayForGas} />
          </div>
        </div>

        <Alert variant="outline" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Security Note</AlertTitle>
          <AlertDescription>
            Delegation is powered by Account Abstraction and is secured by the Haus protocol. You can revoke these
            permissions at any time.
          </AlertDescription>
        </Alert>

        <Button onClick={handleSaveChanges} className="w-full">
          Save Changes
        </Button>
      </CardContent>
    </Card>
  )
}
