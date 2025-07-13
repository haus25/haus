import { NextRequest, NextResponse } from 'next/server'
import { PinataSDK } from 'pinata'

const PINATA_JWT = process.env.PINATA_JWT!
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_PINATA_URL!

// Initialize Pinata SDK
const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_GATEWAY_URL.replace('https://', '').replace('/ipfs/', '')
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size too large. Maximum 10MB allowed.' }, { status: 400 })
    }

    console.log('Uploading file to Pinata:', file.name, file.size, 'bytes')

    // Upload to Pinata using the official SDK v3
    const upload = await pinata.upload.public.file(file)
      .name(file.name)
      .keyvalues({
        type: 'banner_image',
        timestamp: new Date().toISOString()
      })

    const ipfsHash = upload.cid
    const pinataUrl = `${PINATA_GATEWAY_URL}${ipfsHash}`

    console.log('File uploaded successfully to Pinata:', ipfsHash)

    return NextResponse.json({
      success: true,
      ipfsHash,
      pinataUrl,
      size: file.size,
      type: file.type
    })

  } catch (error: any) {
    console.error('Error uploading file to Pinata:', error)
    return NextResponse.json(
      { error: `Failed to upload to Pinata: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
} 