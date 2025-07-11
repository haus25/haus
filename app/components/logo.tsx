import Link from "next/link"

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-20 h-10",
    md: "w-32 h-16",
    lg: "w-48 h-24",
  }

  return (
    <Link href="/">
      <HausLogo className={sizes[size]} />
    </Link>
  )
}

export function HausLogo({ className, variant = "default" }: { className?: string; variant?: "default" | "minimal" }) {
  if (variant === "minimal") {
    return (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="40" height="40" fill="currentColor" />
        <path d="M10 10H30V30H10V10Z" stroke="white" strokeWidth="2" />
        <circle cx="20" cy="20" r="5" stroke="white" strokeWidth="2" />
      </svg>
    )
  }

  // More Bauhaus-inspired logo with geometric shapes
  return (
    <svg viewBox="0 0 80 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="40" height="40" fill="black" />
      <rect x="10" y="10" width="20" height="20" stroke="white" strokeWidth="2" />
      <circle cx="20" cy="20" r="5" stroke="white" strokeWidth="2" />
      <rect x="40" y="0" width="40" height="40" fill="#FF0000" />
      <rect x="50" y="10" width="20" height="20" stroke="white" strokeWidth="2" />
      <circle cx="60" cy="20" r="5" fill="white" />
    </svg>
  )
}
