"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StreamingStudio from "./streamingStudio"
import OBSStreamingStudio from "./obs"

interface StreamingOptionsProps {
  eventId: string
  eventTitle: string
  artistName: string
}

export default function StreamingOptions({ eventId, eventTitle, artistName }: StreamingOptionsProps) {
  const [activeTab, setActiveTab] = useState("browser")

  return (
    <Tabs defaultValue="browser" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="browser">Browser Camera</TabsTrigger>
        <TabsTrigger value="obs">OBS Studio</TabsTrigger>
      </TabsList>

      <TabsContent value="browser" className="mt-4">
        <StreamingStudio eventId={eventId} eventTitle={eventTitle} artistName={artistName} />
      </TabsContent>

      <TabsContent value="obs" className="mt-4">
        <OBSStreamingStudio eventId={eventId} eventTitle={eventTitle} artistName={artistName} />
      </TabsContent>
    </Tabs>
  )
}
