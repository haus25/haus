// Contract addresses on Sei
export const CONTRACT_ADDRESSES = {
  EVENT_FACTORY: process.env.NEXT_PUBLIC_EVENT_FACTORY,
  EVENT_MANAGER: process.env.NEXT_PUBLIC_EVENT_MANAGER,
  CREATION_WRAPPER: process.env.NEXT_PUBLIC_CREATION_WRAPPER,
  LIVE_TIPPING: process.env.NEXT_PUBLIC_LIVE_TIPPING,
  DISTRIBUTOR: process.env.NEXT_PUBLIC_DISTRIBUTOR,
}

// Sei Network configuration
export const SEI_NETWORK_CONFIG = {
  chainId: 1328, // Sei Testnet (Atlantic-2)
  name: "Sei Testnet",
  currency: "SEI",
  rpcUrl: process.env.NEXT_PUBLIC_SEI_TESTNET_RPC || "https://evm-rpc-testnet.sei-apis.com",
  explorerUrl: "https://seitrace.com",
  testnet: true,
}

// Dynamic Wallet configuration - Updated for latest version
export const DYNAMIC_CONFIG = {
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || "",
  apiToken: process.env.NEXT_PUBLIC_DYNAMIC_API_TOKEN || "",
  jwksEndpoint: process.env.NEXT_PUBLIC_DYNAMIC_JWKS_ENDPOINT || "",
}

// Social platform configuration for profile links
// Note: Social authentication providers (Twitter, Discord, etc.) are configured
// in the Dynamic dashboard at app.dynamic.xyz/dashboard/log-in-user-profile
export const SUPPORTED_SOCIAL_PLATFORMS = {
  twitter: {
    name: "Twitter/X",
    icon: "twitter",
    baseUrl: "https://twitter.com/",
    placeholder: "@username",
  },
  discord: {
    name: "Discord",
    icon: "discord",
    baseUrl: "https://discord.com/users/",
    placeholder: "username#1234",
  },
  twitch: {
    name: "Twitch",
    icon: "twitch",
    baseUrl: "https://twitch.tv/",
    placeholder: "username",
  },
  farcaster: {
    name: "Farcaster",
    icon: "farcaster",
    baseUrl: "https://warpcast.com/",
    placeholder: "username",
  },
  telegram: {
    name: "Telegram",
    icon: "telegram",
    baseUrl: "https://t.me/",
    placeholder: "@username",
  },
  github: {
    name: "GitHub",
    icon: "github",
    baseUrl: "https://github.com/",
    placeholder: "username",
  },
  website: {
    name: "Website",
    icon: "globe",
    baseUrl: "",
    placeholder: "https://yourwebsite.com",
  },
} as const

export type SocialPlatform = keyof typeof SUPPORTED_SOCIAL_PLATFORMS

// IPFS configuration
export const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs/"

// Hidden message (encrypted)
export const HIDDEN_MESSAGE_1 = "cmVhbGl0eSAtIGlzIHlldCB0byBiZSBpbnZlbnRlZC4=" // "reality - is yet to be invented." in base64
export const HIDDEN_MESSAGE_2 = "anVzdCBhbm90aGVyIHF1b3RlLg==" // "just another quote." in base64

// EventFactory ABI
export const EVENT_FACTORY_ABI = [
  {
    "type": "function",
    "name": "getEvent",
    "inputs": [{"name": "eventId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IEventFactory.EventData",
        "components": [
          {"name": "creator", "type": "address", "internalType": "address"},
          {"name": "KioskAddress", "type": "address", "internalType": "address"},
          {"name": "curationAddress", "type": "address", "internalType": "address"},
          {"name": "startDate", "type": "uint96", "internalType": "uint96"},
          {"name": "eventDuration", "type": "uint96", "internalType": "uint96"},
          {"name": "reservePrice", "type": "uint96", "internalType": "uint96"},
          {"name": "finalized", "type": "bool", "internalType": "bool"},
          {"name": "metadataURI", "type": "string", "internalType": "string"},
          {"name": "artCategory", "type": "string", "internalType": "string"}
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalEvents",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAllTicketKiosks",
    "inputs": [],
    "outputs": [
      {"name": "eventIds", "type": "uint256[]", "internalType": "uint256[]"},
      {"name": "kioskAddresses", "type": "address[]", "internalType": "address[]"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCurationContract",
    "inputs": [{"name": "eventId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "address", "internalType": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "deployCurationForEvent",
    "inputs": [
      {"name": "eventId", "type": "uint256", "internalType": "uint256"},
      {"name": "scope", "type": "uint256", "internalType": "uint256"},
      {"name": "description", "type": "string", "internalType": "string"}
    ],
    "outputs": [{"name": "curationAddress", "type": "address", "internalType": "address"}],
    "stateMutability": "nonpayable"
  }
] as const

// TicketKiosk ABI - latest
export const TICKET_KIOSK_ABI = [
  {
    "type": "function",
    "name": "purchaseTicket",
    "inputs": [],
    "outputs": [{"name": "ticketId", "type": "uint256", "internalType": "uint256"}],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getSalesInfo",
    "inputs": [],
    "outputs": [
      {"name": "totalTickets", "type": "uint256", "internalType": "uint256"},
      {"name": "soldTickets", "type": "uint256", "internalType": "uint256"},
      {"name": "remainingTickets", "type": "uint256", "internalType": "uint256"},
      {"name": "price", "type": "uint256", "internalType": "uint256"},
      {"name": "artCategory", "type": "string", "internalType": "string"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasTicketForEvent",
    "inputs": [
      {"name": "user", "type": "address", "internalType": "address"},
      {"name": "_eventId", "type": "uint256", "internalType": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  }
] as const

// LiveTipping ABI - latest (shorter version for easy detection)
export const LIVE_TIPPING_ABI = [
  // === Core Tipping Functions ===
  {
    "type": "function",
    "name": "sendTip",
    "inputs": [
      {"name": "eventId", "type": "uint256", "internalType": "uint256"},
      {"name": "message", "type": "string", "internalType": "string"}
    ],
    "outputs": [],
    "stateMutability": "payable"
  },

  {
    "type": "function",
    "name": "isEventTippable",
    "inputs": [{"name": "eventId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [{"name": "", "type": "bool", "internalType": "bool"}],
    "stateMutability": "view"
  },
  // === Data Retrieval Functions ===
  {
    "type": "function",
    "name": "getEventTippingData",
    "inputs": [{"name": "eventId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [
      {"name": "creator", "type": "address", "internalType": "address"},
      {"name": "startDate", "type": "uint256", "internalType": "uint256"},
      {"name": "endDate", "type": "uint256", "internalType": "uint256"},
      {"name": "reservePrice", "type": "uint256", "internalType": "uint256"},
      {"name": "totalTips", "type": "uint256", "internalType": "uint256"},
      {"name": "highestTipper", "type": "address", "internalType": "address"},
      {"name": "highestTip", "type": "uint256", "internalType": "uint256"},
      {"name": "active", "type": "bool", "internalType": "bool"},
      {"name": "finalized", "type": "bool", "internalType": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEventTips",
    "inputs": [{"name": "eventId", "type": "uint256", "internalType": "uint256"}],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct LiveTipping.TipData[]",
        "components": [
          {"name": "tipper", "type": "address", "internalType": "address"},
          {"name": "amount", "type": "uint256", "internalType": "uint256"},
          {"name": "timestamp", "type": "uint256", "internalType": "uint256"},
          {"name": "message", "type": "string", "internalType": "string"}
        ]
      }
    ],
    "stateMutability": "view"
  }
] as const

// Function to get a random video URL based on category
export const getRandomVideo = (category: string) => {
  const videos: Record<string, string[]> = {
    "standup-comedy": [
      "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/mixkit-youtuber-vlogging-in-his-studio-41272-hd-ready-0rsj4lJ7mNHJy2Rv7BAlcJI31a8l9X.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-excited-man-dancing-shot-from-below-32746-large.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-man-dancing-under-multicolored-lights-32746-large.mp4",
    ],
    "performance-art": [
      "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/1817-360-4J7GucopM3hE57hZjSwWqko3n5ULym.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-in-a-club-with-colorful-lighting-1227-large.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-with-neon-lights-around-her-32757-large.mp4",
    ],
    "poetry-slam": [
      "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/2955-360-xLAcPRAAEvhA4gJV8bHULqhHaftej1.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-young-woman-talking-in-a-bar-1509-large.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-man-talking-in-a-bar-1512-large.mp4",
    ],
    "open-mic": [
      "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/29983-360-yI0kgZpZ7Bj7QUbZQGPxKmmKefwLav.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-man-playing-an-acoustic-guitar-on-stage-1725-large.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-man-playing-a-guitar-on-stage-1718-large.mp4",
    ],
    "live-streaming": [
      "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/443-360-kRKFI1NVe7SieGyQKFPiKQin2dY8LV.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-girl-drawing-on-a-notebook-168-large.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-top-view-of-woman-drawing-in-a-notebook-168-large.mp4",
    ],
    "creative-workshop": [
      "https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/40367-360-LovhxrX7kcdSINyPAu7xLgWlCNmTBJ.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-woman-taking-pictures-of-a-plant-1389-large.mp4",
      "https://assets.mixkit.co/videos/preview/mixkit-woman-taking-pictures-of-plants-1388-large.mp4",
    ],
    default: ["https://yddhyb5b6wwp3cqi.public.blob.vercel-storage.com/785-360-ykiufcPxRiluXzB1DWwD0VvDyM9efz.mp4"],
  }

  const categoryVideos = videos[category] || videos["default"]
  const randomIndex = Math.floor(Math.random() * categoryVideos.length)
  return categoryVideos[randomIndex]
}
