"use client"

import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog"
import { Clock, Sparkles, Layers, Users, DollarSign, ArrowRight } from "lucide-react"

interface RtaInfoModalProps {
  open: boolean
  onClose: () => void
}

export function RtaInfoModal({ open, onClose }: RtaInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl bauhaus-text">
            HOW REAL-TIME ASSETS (RTA<span className="lowercase">s</span>) WORK
          </DialogTitle>
          <DialogDescription>Understanding the revolutionary approach to digital ownership in Web3</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              The RTA Process
            </h3>

            <ol className="space-y-4 list-decimal list-inside">
              <li className="pl-2">
                <span className="font-medium">Artist creates an event</span>
                <p className="text-muted-foreground mt-1 pl-6">
                  The artist mints an Event NFT that will evolve during the performance
                </p>
              </li>
              <li className="pl-2">
                <span className="font-medium">Audience participates live</span>
                <p className="text-muted-foreground mt-1 pl-6">
                  Viewers purchase tickets as NFTs and can tip during the performance
                </p>
              </li>
              <li className="pl-2">
                <span className="font-medium">Content is captured in real-time</span>
                <p className="text-muted-foreground mt-1 pl-6">
                  The performance is streamed and stored on IPFS/Filecoin as it happens
                </p>
              </li>
              <li className="pl-2">
                <span className="font-medium">RTA value is determined</span>
                <p className="text-muted-foreground mt-1 pl-6">
                  The final value is based on cumulative tips, with the highest tipper becoming the new owner
                </p>
              </li>
              <li className="pl-2">
                <span className="font-medium">Value is distributed</span>
                <p className="text-muted-foreground mt-1 pl-6">
                  Artists receive 80%, platform takes 10%, and up to 10% goes to curators
                </p>
              </li>
            </ol>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-primary" />
              Benefits for Artists
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                <span>Direct monetization of the creative process, not just the final product</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                <span>Deeper connection with audience through real-time interaction</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                <span>Ongoing royalties from secondary sales of the RTA</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center">
              <Users className="h-5 w-5 mr-2 text-primary" />
              Benefits for Collectors
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                <span>Ownership of a unique asset that captures the entire creative journey</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                <span>Direct influence on the value and development of the artwork</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                <span>Participation in a community of like-minded art enthusiasts</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center">
              <Layers className="h-5 w-5 mr-2 text-primary" />
              Benefits for Curators
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                <span>Earn a percentage of the final RTA value by helping promote and improve events</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                <span>Build reputation and influence within the Haus ecosystem</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-5 w-5 mr-2 text-primary shrink-0 mt-0.5" />
                <span>Shape the future of digital art by elevating quality performances</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-primary" />
              Economic Model
            </h3>
            <p className="text-muted-foreground">
              RTA<span className="lowercase">s</span> introduce a new economic model for digital art that rewards
              participation and contribution at all levels. The value of an RTA is not predetermined but emerges
              organically from the collective appreciation of the audience.
            </p>
            <p className="text-muted-foreground">
              This creates a more equitable and dynamic marketplace where quality and engagement determine success,
              rather than marketing budgets or existing fame.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
