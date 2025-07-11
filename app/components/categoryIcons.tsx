import { cn } from "../lib/utils"

type ArtCategoryType =
  | "standup-comedy"
  | "performance-art"
  | "poetry-slam"
  | "open-mic"
  | "live-painting"
  | "creative-workshop"

interface ArtCategoryIconProps {
  category: ArtCategoryType
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ArtCategoryIcon({ category, size = "md", className }: ArtCategoryIconProps) {
  // Update the sizes to ensure all icons have consistent dimensions
  const sizes = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  }

  // Use the improved SVG icons with currentColor
  const getIcon = () => {
    switch (category) {
      case "standup-comedy":
        return (
          <svg className={cn(sizes[size], className)} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="25" width="80" height="5" fill="currentColor" />
            <rect x="47.5" y="25" width="5" height="50" fill="currentColor" />
            <circle cx="50" cy="80" r="5" fill="currentColor" />
          </svg>
        )
      case "performance-art":
        return (
          <svg className={cn(sizes[size], className)} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="25" width="20" height="50" fill="currentColor" />
            <rect x="55" y="25" width="20" height="20" fill="currentColor" />
            <rect x="55" y="55" width="20" height="20" fill="currentColor" />
          </svg>
        )
      case "poetry-slam":
        return (
          <svg className={cn(sizes[size], className)} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="30" width="30" height="30" fill="currentColor" />
            <rect x="60" y="40" width="20" height="30" fill="currentColor" />
          </svg>
        )
      case "open-mic":
        return (
          <svg className={cn(sizes[size], className)} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect x="30" y="20" width="15" height="15" fill="currentColor" />
            <rect x="55" y="20" width="15" height="15" fill="currentColor" />
            <rect x="30" y="45" width="15" height="15" fill="currentColor" />
            <rect x="55" y="45" width="15" height="15" fill="currentColor" />
            <rect x="42.5" y="70" width="15" height="15" fill="currentColor" />
          </svg>
        )
      case "live-painting":
        return (
          <svg className={cn(sizes[size], className)} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="50" width="30" height="30" fill="currentColor" />
            <rect x="60" y="30" width="20" height="20" fill="currentColor" />
            <rect x="60" y="60" width="20" height="20" fill="currentColor" />
          </svg>
        )
      case "creative-workshop":
        return (
          <svg className={cn(sizes[size], className)} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="20" width="15" height="15" fill="currentColor" />
            <rect x="45" y="20" width="15" height="15" fill="currentColor" />
            <rect x="70" y="20" width="15" height="15" fill="currentColor" />
            <rect x="20" y="45" width="15" height="15" fill="currentColor" />
            <rect x="45" y="45" width="15" height="15" fill="currentColor" />
            <rect x="70" y="45" width="15" height="15" fill="currentColor" />
            <rect x="45" y="70" width="15" height="15" fill="currentColor" />
          </svg>
        )
      default:
        return (
          <svg className={cn(sizes[size], className)} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="25" fill="currentColor" />
          </svg>
        )
    }
  }

  return getIcon()
}
