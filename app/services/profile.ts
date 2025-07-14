"use client"

import { getPinataService } from './pinata'

// Types for user profile data - matches the requested structure
export interface UserProfileData {
  address: string
  name: string // This is the unique username (haus_001, haus_002, etc.)
  displayName?: string // User's display name
  bio?: string | null
  avatar?: string | null // IPFS URL for avatar image
  banner?: string | null // IPFS URL for banner image
  preferences: string[] // Art categories selected (renamed from favoriteCategories)
  socials: {
    twitter?: string
    discord?: string
    farcaster?: string
    twitch?: string
    telegram?: string
    github?: string
    website?: string
  }
  isProfileComplete: boolean
  createdAt: number
  updatedAt: number
}

// Progressive user counter stored locally
let userCounter = 0

/**
 * Generate progressive user ID (haus_001, haus_002, etc.)
 */
async function generateProgressiveUserId(): Promise<string> {
  // Load counter from localStorage
  const storedCounter = localStorage.getItem('haus_user_counter')
  if (storedCounter) {
    userCounter = parseInt(storedCounter, 10)
  }
  
  // Increment and save
  userCounter++
  localStorage.setItem('haus_user_counter', userCounter.toString())
  
  // Format with leading zeros (haus_001, haus_002, etc.)
  return `haus_${userCounter.toString().padStart(3, '0')}`
}

/**
 * Upload profile image (avatar or banner) to Pinata IPFS
 */
export async function uploadProfileImage(
  file: File,
  imageType: "avatar" | "banner",
  username: string
): Promise<string> {
  console.log(`PROFILE_UPLOAD: Uploading ${imageType} for user ${username}`)
  console.log('PROFILE_UPLOAD: File size:', file.size, 'bytes')
  console.log('PROFILE_UPLOAD: File type:', file.type)
  
  try {
    const pinataService = getPinataService()
    const imageUrl = await pinataService.uploadImage(file, {
      name: `${username}-${imageType}-${Date.now()}`,
      keyvalues: {
        type: `profile-${imageType}`,
        username: username,
        uploadType: 'profile-image'
      }
    })
    
    console.log(`PROFILE_UPLOAD: ${imageType} uploaded successfully:`, imageUrl)
    return imageUrl
    
  } catch (error) {
    console.error(`PROFILE_UPLOAD: Failed to upload ${imageType}:`, error)
    throw new Error(`Failed to upload ${imageType}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Upload profile metadata JSON to Pinata IPFS
 */
async function uploadProfileMetadata(profileData: UserProfileData): Promise<string> {
  console.log('PROFILE_UPLOAD: Uploading profile metadata to Pinata IPFS')
  console.log('PROFILE_UPLOAD: Username:', profileData.name)
  console.log('PROFILE_UPLOAD: Display name:', profileData.displayName)
  
  try {
    const pinataService = getPinataService()
    const metadataUri = await pinataService.uploadJSON(profileData, {
      name: `${profileData.name}-profile-${Date.now()}`,
      keyvalues: {
        type: 'user-profile',
        username: profileData.name,
        address: profileData.address,
        uploadType: 'profile-metadata'
      }
    })
    
    console.log('PROFILE_UPLOAD: Profile metadata uploaded successfully:', metadataUri)
    return metadataUri
    
  } catch (error) {
    console.error('PROFILE_UPLOAD: Failed to upload profile metadata:', error)
    throw new Error(`Failed to upload profile metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Store profile CID in localStorage for quick access
 */
export function saveProfileCid(address: string, cid: string): void {
  const key = `haus_profile_cid_${address.toLowerCase()}`
  localStorage.setItem(key, cid)
}

/**
 * Get stored profile CID from localStorage
 */
export function getStoredProfileCid(address: string): string | null {
  const key = `haus_profile_cid_${address.toLowerCase()}`
  return localStorage.getItem(key)
}

/**
 * Load user profile from Pinata IPFS
 */
export async function loadUserProfile(address: string): Promise<UserProfileData | null> {
  try {
    console.log('PROFILE_LOAD: Loading profile for address:', address)
    
    // Try to get stored CID first
    const storedCid = getStoredProfileCid(address)
    if (!storedCid) {
      console.log('PROFILE_LOAD: No stored profile CID found for address')
      return null
    }
    
    console.log('PROFILE_LOAD: Found stored CID:', storedCid)
    
    // Convert IPFS URI to gateway URL for fetching
    const ipfsHash = storedCid.startsWith('ipfs://') ? storedCid.slice(7) : storedCid
    const gatewayUrl = `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsHash}`
    
    console.log('PROFILE_LOAD: Fetching from gateway:', gatewayUrl)
    
    const response = await fetch(gatewayUrl)
    if (!response.ok) {
      console.warn('PROFILE_LOAD: Failed to fetch profile, may not exist')
      return null
    }
    
    const profileData = await response.json()
    console.log('PROFILE_LOAD: Profile loaded successfully for:', profileData.name)
    
    return profileData
  } catch (error) {
    console.error('PROFILE_LOAD: Failed to load profile:', error)
    return null
  }
}

/**
 * Save user profile to Pinata IPFS
 */
export async function saveUserProfile(profileData: UserProfileData): Promise<string> {
  console.log('PROFILE_SAVE: Saving profile for:', profileData.name)
  
  const metadataUri = await uploadProfileMetadata(profileData)
  saveProfileCid(profileData.address, metadataUri)
  
  console.log('PROFILE_SAVE: Profile saved with CID:', metadataUri)
  return metadataUri
}

/**
 * Create or update user profile with Pinata persistence
 */
export async function updateUserProfile(
  address: string,
  updates: Partial<Omit<UserProfileData, 'name' | 'address' | 'createdAt'>>
): Promise<string> {
  console.log('PROFILE_UPDATE: Updating profile for address:', address)
  
  let existingProfile = await loadUserProfile(address)
  
  if (!existingProfile) {
    console.log('PROFILE_UPDATE: Creating new profile')
    
    // Generate progressive username for new user
    const newUsername = await generateProgressiveUserId()
    
    existingProfile = {
      address: address.toLowerCase(),
      name: newUsername,
      displayName: updates.displayName || newUsername,
      bio: null,
      avatar: null,
      banner: null,
      preferences: [],
      socials: {},
      isProfileComplete: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  const updatedProfile: UserProfileData = {
    ...existingProfile,
    ...updates,
    address: address.toLowerCase(),
    updatedAt: Date.now(),
  }

  console.log('PROFILE_UPDATE: Updated profile data:', updatedProfile)
  
  return await saveUserProfile(updatedProfile)
} 