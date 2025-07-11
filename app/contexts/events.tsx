"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth"

// Define event type
export interface Event {
  id: string
  title: string
  creator: string
  creatorAddress: string
  category: string
  date: string
  duration: number
  participants: number
  maxParticipants: number
  ticketPrice: number
  description: string
  image: string
  status: "upcoming" | "live" | "completed"
  videoUrl?: string
}

interface EventsContextType {
  events: Event[]
  userEvents: Event[]
  addEvent: (event: Event) => void
  updateEvent: (event: Event) => void
  getEventById: (id: string) => Event | undefined
}

const EventsContext = createContext<EventsContextType | undefined>(undefined)

// Mock initial events
const INITIAL_EVENTS: Event[] = [
  {
    id: "1",
    title: "Comedy Night with John Doe",
    creator: "johndoe.eth",
    creatorAddress: "0x1a2b3c4d5e6f7g8h9i0j",
    category: "standup-comedy",
    date: "2025-04-15T19:00:00",
    duration: 90,
    participants: 42,
    maxParticipants: 100,
    ticketPrice: 5,
    description:
      "Join us for a night of laughter with John Doe, known for his witty observations and hilarious takes on everyday life.",
    image: "/placeholder.svg?height=200&width=400",
    status: "upcoming",
  },
  {
    id: "2",
    title: "Abstract Live Painting",
    creator: "artist.eth",
    creatorAddress: "0x2b3c4d5e6f7g8h9i0j1a",
    category: "live-painting",
    date: "2025-04-18T20:00:00",
    duration: 120,
    participants: 28,
    maxParticipants: 50,
    ticketPrice: 10,
    description:
      "Watch as an abstract masterpiece unfolds before your eyes, with the artist explaining their process and inspiration throughout.",
    image: "/placeholder.svg?height=200&width=400",
    status: "upcoming",
  },
  {
    id: "3",
    title: "Poetry Night: Urban Verses",
    creator: "poet.eth",
    creatorAddress: "0x3c4d5e6f7g8h9i0j1a2b",
    category: "poetry-slam",
    date: "2025-04-20T18:30:00",
    duration: 75,
    participants: 35,
    maxParticipants: 80,
    ticketPrice: 3,
    description:
      "Powerful spoken word performances addressing social issues, personal struggles, and urban life experiences.",
    image: "/placeholder.svg?height=200&width=400",
    status: "upcoming",
  },
]

export function EventsProvider({ children }: { children: ReactNode }) {
  const { userProfile, isConnected } = useAuth()
  const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS)

  // Load events from localStorage on mount
  useEffect(() => {
    const storedEvents = localStorage.getItem("haus_events")
    if (storedEvents) {
      try {
        setEvents(JSON.parse(storedEvents))
      } catch (error) {
        console.error("Failed to parse stored events:", error)
      }
    }
  }, [])

  // Save events to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("haus_events", JSON.stringify(events))
  }, [events])

  // Filter events created by the current user
  const userEvents =
    isConnected && userProfile
      ? events.filter((event) => event.creatorAddress === userProfile.address || event.creator === userProfile.ensName)
      : []

  // Add a new event
  const addEvent = (event: Event) => {
    setEvents((prev) => [...prev, event])
  }

  // Update an existing event
  const updateEvent = (updatedEvent: Event) => {
    setEvents((prev) => prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)))
  }

  // Get an event by ID
  const getEventById = (id: string) => {
    return events.find((event) => event.id === id)
  }

  return (
    <EventsContext.Provider
      value={{
        events,
        userEvents,
        addEvent,
        updateEvent,
        getEventById,
      }}
    >
      {children}
    </EventsContext.Provider>
  )
}

// Custom hook to use the events context
export function useEvents() {
  const context = useContext(EventsContext)
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider")
  }
  return context
}
