import axios from "axios"

// Pinata configuration
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_URL

// Types for user profile data
export interface UserProfileData {
  address: string
  ensName?: string | null
  displayName?: string
  bio?: string | null
  avatar?: string | null
  banner?: string | null
  favoriteCategories: string[]
  socials: {
    twitter?: string
    discord?: string
    telegram?: string
    github?: string
    website?: string
  }
  isProfileComplete: boolean
  createdAt: number
  updatedAt: number
}

export interface ProfileMetadata {
  name: string
  description: string
  keyvalues: {
    address: string
    version: string
    profileType: "user-profile"
  }
}

/**
 * Stores user profile data to IPFS via Pinata
 */
export async function storeProfileData(profileData: UserProfileData): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error("Pinata JWT token not configured")
  }

  try {
    // Prepare profile data with timestamp
    const dataToStore = {
      ...profileData,
      updatedAt: Date.now(),
    }

    // Create metadata for better organization
    const metadata: ProfileMetadata = {
      name: `Profile for ${profileData.address}`,
      description: `User profile data for wallet address ${profileData.address}`,
      keyvalues: {
        address: profileData.address,
        version: "1.0",
        profileType: "user-profile",
      },
    }

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        pinataContent: dataToStore,
        pinataMetadata: metadata,
        pinataOptions: {
          cidVersion: 1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          "Content-Type": "application/json",
        },
      }
    )

    return response.data.IpfsHash
  } catch (error) {
    console.error("Error storing profile data to IPFS:", error)
    throw new Error("Failed to store profile data")
  }
}

/**
 * Retrieves user profile data from IPFS
 */
export async function getProfileData(profileCid: string): Promise<UserProfileData> {
  try {
    const response = await axios.get(`${PINATA_GATEWAY}${profileCid}`)
    return response.data as UserProfileData
  } catch (error) {
    console.error("Error fetching profile data from IPFS:", error)
    throw new Error("Failed to fetch profile data")
  }
}

/**
 * Uploads an image file (avatar/banner) to IPFS via Pinata
 */
export async function uploadProfileImage(
  file: File,
  imageType: "avatar" | "banner",
  userAddress: string
): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error("Pinata JWT token not configured")
  }

  try {
    const formData = new FormData()
    const fileName = `${imageType}-${userAddress}-${Date.now()}.${file.name.split('.').pop()}`
    formData.append("file", file, fileName)

    // Add metadata
    const metadata = JSON.stringify({
      name: `${imageType} for ${userAddress}`,
      keyvalues: {
        userAddress,
        imageType,
        timestamp: Date.now().toString(),
      },
    })
    formData.append("pinataMetadata", metadata)

    // Set pinning options
    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    })
    formData.append("pinataOptions", pinataOptions)

    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        "Content-Type": "multipart/form-data",
      },
    })

    return `${PINATA_GATEWAY}${response.data.IpfsHash}`
  } catch (error) {
    console.error("Error uploading image to IPFS:", error)
    throw new Error("Failed to upload image")
  }
}

/**
 * Creates a profile storage key for localStorage
 */
export function getProfileStorageKey(address: string): string {
  return `haus_profile_${address.toLowerCase()}`
}

/**
 * Saves profile CID to localStorage for quick access
 */
export function saveProfileCid(address: string, cid: string): void {
  const storageKey = getProfileStorageKey(address)
  const profileStorage = {
    cid,
    address: address.toLowerCase(),
    lastUpdated: Date.now(),
  }
  localStorage.setItem(storageKey, JSON.stringify(profileStorage))
}

/**
 * Gets profile CID from localStorage
 */
export function getStoredProfileCid(address: string): string | null {
  try {
    const storageKey = getProfileStorageKey(address)
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.cid
    }
    return null
  } catch (error) {
    console.error("Error getting stored profile CID:", error)
    return null
  }
}

/**
 * Loads user profile data, first checking localStorage cache, then IPFS
 */
export async function loadUserProfile(address: string): Promise<UserProfileData | null> {
  try {
    // First check if we have a stored CID for this address
    const storedCid = getStoredProfileCid(address)
    
    if (storedCid) {
      try {
        // Try to load from IPFS
        const profileData = await getProfileData(storedCid)
        return profileData
      } catch (error) {
        console.warn("Failed to load profile from IPFS, CID might be invalid:", error)
        // Remove invalid CID from storage
        localStorage.removeItem(getProfileStorageKey(address))
      }
    }

    // No stored profile found
    return null
  } catch (error) {
    console.error("Error loading user profile:", error)
    return null
  }
}

/**
 * Saves user profile data to IPFS and updates localStorage cache
 */
export async function saveUserProfile(profileData: UserProfileData): Promise<string> {
  try {
    // Store to IPFS
    const cid = await storeProfileData(profileData)
    
    // Update localStorage cache
    saveProfileCid(profileData.address, cid)
    
    return cid
  } catch (error) {
    console.error("Error saving user profile:", error)
    throw error
  }
}

/**
 * Updates an existing profile with new data
 */
export async function updateUserProfile(
  address: string,
  updates: Partial<UserProfileData>
): Promise<string> {
  try {
    // Load existing profile or create new one
    let existingProfile = await loadUserProfile(address)
    
    if (!existingProfile) {
      // Create new profile
      existingProfile = {
        address: address.toLowerCase(),
        favoriteCategories: [],
        socials: {},
        isProfileComplete: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    }

    // Merge updates
    const updatedProfile: UserProfileData = {
      ...existingProfile,
      ...updates,
      address: address.toLowerCase(), // Ensure address doesn't change
      updatedAt: Date.now(),
    }

    // Save updated profile
    return await saveUserProfile(updatedProfile)
  } catch (error) {
    console.error("Error updating user profile:", error)
    throw error
  }
} 