import { NextRequest, NextResponse } from 'next/server'

const PINATA_JWT = process.env.PINATA_JWT!

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Pinata authentication...')
    console.log('JWT Token length:', PINATA_JWT?.length)
    console.log('JWT Token parts:', PINATA_JWT?.split('.').length)
    console.log('JWT Token first 50 chars:', PINATA_JWT?.substring(0, 50))
    console.log('JWT Token last 50 chars:', PINATA_JWT?.substring(PINATA_JWT.length - 50))
    
    // Test authentication with Pinata
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${PINATA_JWT}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pinata auth test failed:', errorText)
      return NextResponse.json(
        { error: `Authentication failed: ${response.statusText}`, details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    console.log('Pinata authentication successful:', result)

    return NextResponse.json({
      success: true,
      message: 'Pinata authentication successful',
      result
    })

  } catch (error: any) {
    console.error('Error testing Pinata authentication:', error)
    return NextResponse.json(
      { error: `Failed to test authentication: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
} 