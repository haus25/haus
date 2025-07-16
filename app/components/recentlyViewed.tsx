"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "./ui/card"
import { ScrollArea } from "./ui/scrollArea"
import { ArtCategoryIcon } from "./categoryIcons"
import { Clock } from "lucide-react"

interface RecentItem {
  id: number
  title: string
  category: string
  href: string
  timestamp: number
}

export function RecentlyViewed() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])

  useEffect(() => {
    // In a real app, this would be stored in localStorage or a database
    // For demo purposes, we'll use mock data
    const mockRecentItems: RecentItem[] = [
      {
        id: 1,
        title: "Comedy Night with John Doe",
        category: "standup-comedy",
        href: "/ticket-kiosk/1",
        timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      },
      {
        id: 2,
        title: "Abstract Live Painting",
        category: "live-painting",
        href: "/ticket-kiosk/2",
        timestamp: Date.now() - 1000 * 60 * 15, // 15 minutes ago
      },
      {
        id: 3,
        title: "Poetry Night: Urban Verses",
        category: "poetry-slam",
        href: "/ticket-kiosk/3",
        timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      },
    ]

    setRecentItems(mockRecentItems)
  }, [])

  if (recentItems.length === 0) {
    return null
  }

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)

    if (seconds < 60) return `${seconds} seconds ago`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`

    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? "s" : ""} ago`
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            Recently Viewed
          </h3>
        </div>

        <ScrollArea className="h-[120px]">
          <div className="space-y-2">
            {recentItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center p-2 rounded-md hover:bg-muted transition-colors"
              >
                <div className="mr-3">
                  <ArtCategoryIcon category={item.category as any} size="sm" className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeAgo(item.timestamp)}</p>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
