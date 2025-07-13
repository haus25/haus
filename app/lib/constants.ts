// Contract addresses on Sei
export const CONTRACT_ADDRESSES = {
  EVENT_FACTORY: process.env.NEXT_PUBLIC_EVENT_FACTORY || "",
  EVENT_STATION: process.env.NEXT_PUBLIC_EVENT_STATION || "",
  TICKET_FACTORY: process.env.NEXT_PUBLIC_TICKET_FACTORY || "",
  LIVE_TIPPING: process.env.NEXT_PUBLIC_LIVE_TIPPING || "",
  DISTRIBUTOR: process.env.NEXT_PUBLIC_DISTRIBUTOR || "",
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

// Updated contract ABIs for latest Solidity patterns
export const EVENT_FACTORY_ABI = [
  {
    inputs: [
      {
        internalType: "string",
        name: "_title",
        type: "string",
      },
      {
        internalType: "string",
        name: "_description",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_startTime",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_duration",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_maxTickets",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_ticketPrice",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "_metadataURI",
        type: "string",
      },
    ],
    name: "createEvent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

export const TICKET_FACTORY_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_eventId",
        type: "uint256",
      },
    ],
    name: "buyTicket",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const

export const LIVE_TIPPING_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_eventId",
        type: "uint256",
      },
    ],
    name: "tipCreator",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
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
    "live-painting": [
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
