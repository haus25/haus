"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { Slider } from "./ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"

interface CurationProposalModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: number
  eventTitle: string
}

export function CurationProposalModal({ isOpen, onClose, eventId, eventTitle }: CurationProposalModalProps) {
  const [proposal, setProposal] = useState({
    description: "",
    timeframe: 7, // days
    percentage: 5, // default 5%
  })

  const handleSubmit = () => {
    // Here you would submit the proposal to the blockchain
    console.log("Submitting proposal:", proposal)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Propose to Curate</DialogTitle>
          <DialogDescription>Submit a curation proposal for "{eventTitle}"</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">What can you offer?</Label>
            <Textarea
              id="description"
              placeholder="Explain how you can improve the event/presentation..."
              value={proposal.description}
              onChange={(e) => setProposal({ ...proposal, description: e.target.value })}
              className="min-h-32"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeframe">How long will it take? ({proposal.timeframe} days)</Label>
            <Slider
              id="timeframe"
              min={1}
              max={30}
              step={1}
              value={[proposal.timeframe]}
              onValueChange={(value) => setProposal({ ...proposal, timeframe: value[0] })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentage">Percentage requested ({proposal.percentage}%)</Label>
            <Slider
              id="percentage"
              min={1}
              max={10}
              step={0.5}
              value={[proposal.percentage]}
              onValueChange={(value) => setProposal({ ...proposal, percentage: value[0] })}
            />
            <p className="text-xs text-muted-foreground">
              This is the percentage of the total value tipped during the livestreaming that you'll receive if your
              curation is accepted.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!proposal.description.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Submit Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
