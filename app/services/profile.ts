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

/**
 * Stores user profile data to localStorage
 */
export async function storeProfileData(profileData: UserProfileData): Promise<string> {
  try {
    const dataToStore = {
      ...profileData,
      updatedAt: Date.now(),
    }

    const key = getProfileStorageKey(profileData.address)
    localStorage.setItem(key, JSON.stringify(dataToStore))
    
    // Return a mock CID for compatibility
    return `profile_${profileData.address.toLowerCase()}`
  } catch (error) {
    console.error("Failed to store profile data:", error)
    throw new Error("Profile storage failed")
  }
}

/**
 * Retrieves profile data from localStorage
 */
export async function getProfileData(profileCid: string): Promise<UserProfileData> {
  try {
    // Extract address from mock CID
    const address = profileCid.replace('profile_', '')
    const key = getProfileStorageKey(address)
    const data = localStorage.getItem(key)
    
    if (!data) {
      throw new Error("Profile not found")
    }
    
    return JSON.parse(data)
  } catch (error) {
    console.error("Failed to retrieve profile data:", error)
    throw new Error("Profile retrieval failed")
  }
}

/**
 * Mock image upload - returns placeholder URL
 */
export async function uploadProfileImage(
  file: File,
  imageType: "avatar" | "banner",
  userAddress: string
): Promise<string> {
  // Return placeholder image URLs
  if (imageType === "avatar") {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userAddress}`
  } else {
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${userAddress}-banner`
  }
}

export function getProfileStorageKey(address: string): string {
  return `haus_profile_${address.toLowerCase()}`
}

export function saveProfileCid(address: string, cid: string): void {
  const key = `haus_profile_cid_${address.toLowerCase()}`
  localStorage.setItem(key, cid)
}

export function getStoredProfileCid(address: string): string | null {
  const key = `haus_profile_cid_${address.toLowerCase()}`
  return localStorage.getItem(key)
}

/**
 * Loads user profile from localStorage
 */
export async function loadUserProfile(address: string): Promise<UserProfileData | null> {
  try {
    const key = getProfileStorageKey(address)
    const data = localStorage.getItem(key)
    
    if (!data) {
      return null
    }
    
    return JSON.parse(data)
  } catch (error) {
    console.error("Failed to load user profile:", error)
    return null
  }
}

/**
 * Saves user profile to localStorage
 */
export async function saveUserProfile(profileData: UserProfileData): Promise<string> {
  const cid = await storeProfileData(profileData)
  saveProfileCid(profileData.address, cid)
  return cid
}

/**
 * Updates user profile in localStorage
 */
export async function updateUserProfile(
  address: string,
  updates: Partial<UserProfileData>
): Promise<string> {
  let existingProfile = await loadUserProfile(address)
  
  if (!existingProfile) {
    // Create new profile if none exists
    existingProfile = {
      address: address.toLowerCase(),
      favoriteCategories: [],
      socials: {},
      isProfileComplete: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  const updatedProfile = {
    ...existingProfile,
    ...updates,
    address: address.toLowerCase(),
    updatedAt: Date.now(),
  }

  return await saveUserProfile(updatedProfile)
} 