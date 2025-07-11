export function Web3InnovationGraphic() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="white" stroke="#FF3B30" strokeWidth="8" />

      {/* Top row */}
      <rect x="20" y="20" width="180" height="180" fill="black" />
      <rect x="220" y="20" width="160" height="180" fill="#F5F5F5" />

      {/* Bottom row */}
      <rect x="20" y="220" width="180" height="160" fill="#F5F5F5" />
      <rect x="220" y="220" width="160" height="160" fill="black" />

      {/* Small overlay square */}
      <rect x="320" y="320" width="60" height="60" fill="#FF3B30" fillOpacity="0.2" />
    </svg>
  )
}
