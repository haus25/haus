import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Improved utility function with memoization for better performance
const memoizedResults = new Map<string, string>()

export function cn(...inputs: ClassValue[]): string {
  const key = JSON.stringify(inputs)

  if (memoizedResults.has(key)) {
    return memoizedResults.get(key)!
  }

  const result = twMerge(clsx(inputs))
  memoizedResults.set(key, result)

  return result
}

// Add performance utilities
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
