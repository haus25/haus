"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchOnChainEvents, OnChainEventData } from '../services/tickets'

interface EventsContextType {
  events: OnChainEventData[]
  loading: boolean
  error: string | null
  refreshEvents: () => Promise<void>
}

const EventsContext = createContext<EventsContextType | undefined>(undefined)

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<OnChainEventData[]>([])
  const [loading, setLoading] = useState(false) // Start with false to avoid SSR issues
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(0)
  
  // Prevent too frequent refreshes
  const MIN_REFRESH_INTERVAL = 10000 // 10 seconds

  const refreshEvents = async (force = false) => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    // Prevent too frequent refreshes unless forced
    const now = Date.now()
    if (!force && now - lastRefresh < MIN_REFRESH_INTERVAL) {
      console.log('EVENTS_CONTEXT: Skipping refresh (too soon)')
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log('EVENTS_CONTEXT: Refreshing events...')
      
      const onChainEvents = await fetchOnChainEvents()
      setEvents(onChainEvents)
      setLastRefresh(now)
      
      console.log('EVENTS_CONTEXT: Successfully loaded', onChainEvents.length, 'events')
    } catch (err) {
      console.error('EVENTS_CONTEXT: Error loading events:', err)
      setError(err instanceof Error ? err.message : 'Failed to load events')
      setEvents([]) // Clear events on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      refreshEvents()
    }
  }, [])

  const value: EventsContextType = {
    events,
    loading,
    error,
    refreshEvents,
  }

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  )
}

export function useEvents() {
  const context = useContext(EventsContext)
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider')
  }
  return context
}
