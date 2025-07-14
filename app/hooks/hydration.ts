import { useState, useEffect } from 'react'

/**
 * Hook to prevent hydration mismatches for dynamic content
 * Returns false on server-side and during initial client render,
 * then true after hydration is complete
 */
export function useIsHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}

/**
 * Format time consistently to prevent hydration mismatches
 */
export function formatTimeConsistently(timestamp: number): string {
  const date = new Date(timestamp)
  // Use a consistent format that doesn't depend on locale
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Hook that returns a time formatter that's safe for SSR
 */
export function useTimeFormatter() {
  const isHydrated = useIsHydrated()
  
  return (timestamp: number): string => {
    if (!isHydrated) {
      return '--:--' // Placeholder during hydration
    }
    return formatTimeConsistently(timestamp)
  }
}