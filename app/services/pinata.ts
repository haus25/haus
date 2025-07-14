"use client"

interface PinataResponse {
  IpfsHash: string
  PinSize: number
  Timestamp: string
}

interface PinataMetadata {
  name: string
  keyvalues?: Record<string, string>
}

export class PinataService {
  private jwt: string
  private gateway: string

  constructor() {
    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY

    if (!jwt) {
      throw new Error('NEXT_PUBLIC_PINATA_JWT environment variable is required')
    }
    if (!gateway) {
      throw new Error('NEXT_PUBLIC_PINATA_GATEWAY environment variable is required')
    }

    this.jwt = jwt
    this.gateway = gateway
  }

  /**
   * Upload an image file to Pinata IPFS
   */
  async uploadImage(file: File, metadata: PinataMetadata): Promise<string> {
    try {
      console.log('PINATA_UPLOAD: Uploading image to IPFS')
      console.log('PINATA_UPLOAD: File size:', file.size, 'bytes')
      console.log('PINATA_UPLOAD: File type:', file.type)
      console.log('PINATA_UPLOAD: Metadata name:', metadata.name)

      const formData = new FormData()
      // Get proper file extension from MIME type with support for all major image formats
      let fileExtension = 'jpg' // default fallback
      if (file.type) {
        const mimeType = file.type.toLowerCase()
        if (mimeType === 'image/jpeg') fileExtension = 'jpg'
        else if (mimeType === 'image/jpg') fileExtension = 'jpg'
        else if (mimeType === 'image/png') fileExtension = 'png'
        else if (mimeType === 'image/svg+xml') fileExtension = 'svg'
        else if (mimeType === 'image/webp') fileExtension = 'webp'
        else if (mimeType === 'image/gif') fileExtension = 'gif'
        else {
          // Fallback: try to extract from MIME type
          const typeparts = mimeType.split('/')
          if (typeparts.length === 2 && typeparts[0] === 'image') {
            fileExtension = typeparts[1]
          }
        }
      }
      const filename = `${metadata.name}.${fileExtension}`
      formData.append('file', file, filename)
      
      const pinataMetadata = {
        name: metadata.name,
        keyvalues: {
          type: 'event-banner',
          uploadedAt: new Date().toISOString(),
          ...metadata.keyvalues
        }
      }
      
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata))
      formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Pinata upload failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result: PinataResponse = await response.json()
      // Use custom Pinata gateway for better performance and reliability
      const imageUrl = `https://${this.gateway}/ipfs/${result.IpfsHash}`
      
      console.log('PINATA_UPLOAD: Image uploaded successfully')
      console.log('PINATA_UPLOAD: IPFS Hash:', result.IpfsHash)
      console.log('PINATA_UPLOAD: Custom Gateway URL:', imageUrl)
      console.log('PINATA_UPLOAD: Public IPFS URL:', `https://ipfs.io/ipfs/${result.IpfsHash}`)

      return imageUrl

    } catch (error) {
      console.error('PINATA_UPLOAD: Image upload failed:', error)
      throw error
    }
  }

  /**
   * Upload JSON metadata to Pinata IPFS
   */
  async uploadJSON(data: any, metadata: PinataMetadata): Promise<string> {
    try {
      console.log('PINATA_UPLOAD: Uploading JSON to IPFS')
      console.log('PINATA_UPLOAD: Metadata name:', metadata.name)
      console.log('PINATA_UPLOAD: JSON data keys:', Object.keys(data))

      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      
      const formData = new FormData()
      formData.append('file', blob, 'metadata.json')
      
      const pinataMetadata = {
        name: metadata.name,
        keyvalues: {
          type: 'event-metadata',
          uploadedAt: new Date().toISOString(),
          ...metadata.keyvalues
        }
      }
      
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata))
      formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Pinata JSON upload failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result: PinataResponse = await response.json()
      const metadataUri = `ipfs://${result.IpfsHash}`
      
      console.log('PINATA_UPLOAD: JSON uploaded successfully')
      console.log('PINATA_UPLOAD: IPFS Hash:', result.IpfsHash)
      console.log('PINATA_UPLOAD: IPFS URI:', metadataUri)

      return metadataUri

    } catch (error) {
      console.error('PINATA_UPLOAD: JSON upload failed:', error)
      throw error
    }
  }

  /**
   * Get the gateway URL for an IPFS hash (uses custom Pinata gateway)
   */
  getGatewayUrl(ipfsHash: string): string {
    // Handle both ipfs:// URIs and raw hashes
    const hash = ipfsHash.startsWith('ipfs://') ? ipfsHash.slice(7) : ipfsHash
    return `https://${this.gateway}/ipfs/${hash}`
  }

  /**
   * Get the public IPFS gateway URL for an IPFS hash (fallback option)
   */
  getPublicGatewayUrl(ipfsHash: string): string {
    // Handle both ipfs:// URIs and raw hashes
    const hash = ipfsHash.startsWith('ipfs://') ? ipfsHash.slice(7) : ipfsHash
    return `https://ipfs.io/ipfs/${hash}`
  }
}

// Singleton instance
let pinataService: PinataService | null = null

export const getPinataService = (): PinataService => {
  if (!pinataService) {
    pinataService = new PinataService()
  }
  return pinataService
} 