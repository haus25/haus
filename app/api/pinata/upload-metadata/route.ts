import { NextRequest, NextResponse } from 'next/server'

const PINATA_JWT = process.env.PINATA_JWT!
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_PINATA_URL!

interface EventMetadata {
  name: string
  description: string
  image: string
  category: string
  duration: number
  chunks: any[]
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
}

export async function POST(request: NextRequest) {
  try {
    const metadata: EventMetadata = await request.json()

    // Validate required fields
    if (!metadata.name || !metadata.description || !metadata.image) {
      return NextResponse.json(
        { error: 'Missing required metadata fields: name, description, or image' },
        { status: 400 }
      )
    }

    // Create JSON string
    const jsonString = JSON.stringify(metadata, null, 2)
    const jsonBlob = new Blob([jsonString], { type: 'application/json' })

    // Create form data for Pinata
    const formData = new FormData()
    formData.append('file', jsonBlob, `${metadata.name.replace(/[^a-zA-Z0-9]/g, '_')}_metadata.json`)

    // Add metadata for Pinata
    const pinataMetadata = JSON.stringify({
      name: `${metadata.name} - Event Metadata`,
      keyvalues: {
        type: 'event_metadata',
        event_name: metadata.name,
        category: metadata.category,
        duration: metadata.duration.toString(),
        timestamp: new Date().toISOString()
      }
    })
    formData.append('pinataMetadata', pinataMetadata)

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
    })
    formData.append('pinataOptions', options)

    // Upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pinata metadata upload failed:', errorText)
      return NextResponse.json(
        { error: `Failed to upload metadata to Pinata: ${response.statusText}` },
        { status: response.status }
      )
    }

    const result = await response.json()
    const ipfsHash = result.IpfsHash
    const pinataUrl = `${PINATA_GATEWAY_URL}${ipfsHash}`

    console.log('Metadata uploaded successfully to Pinata:', ipfsHash)

    return NextResponse.json({
      success: true,
      ipfsHash,
      pinataUrl,
      metadata
    })

  } catch (error) {
    console.error('Error uploading metadata to Pinata:', error)
    return NextResponse.json(
      { error: 'Internal server error during metadata upload' },
      { status: 500 }
    )
  }
} 