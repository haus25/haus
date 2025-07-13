import { NextRequest, NextResponse } from 'next/server'

const PINATA_JWT = process.env.PINATA_JWT!
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_PINATA_URL!

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cid = searchParams.get('cid')

    if (!cid) {
      return NextResponse.json({ error: 'CID parameter is required' }, { status: 400 })
    }

    console.log('PINATA_RETRIEVAL: Fetching image for CID:', cid)

    // Create signed URL for the image
    const imageUrl = `${PINATA_GATEWAY_URL}${cid}`
    
    // Fetch the image with authentication
    const response = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
    })

    if (!response.ok) {
      console.error('PINATA_RETRIEVAL: Failed to fetch image:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      )
    }

    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    console.log('PINATA_RETRIEVAL: Image fetched successfully, size:', imageBuffer.byteLength, 'bytes')

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error: any) {
    console.error('PINATA_RETRIEVAL: Error fetching image:', error)
    return NextResponse.json(
      { error: `Failed to fetch image: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 