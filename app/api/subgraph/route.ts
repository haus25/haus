import { NextRequest, NextResponse } from 'next/server'

// Environment variables (server-side only) - Try multiple possible variable names
const SUBGRAPH_API_KEY = process.env.SUBGRAPH_API_KEY || process.env.NEXT_PUBLIC_API_KEY || '0708a8065df87661560fd40255bb215f'
const RTAV1_QUERY_URL = process.env.RTAV1_QUERY_URL || 'https://gateway-testnet-arbitrum.network.thegraph.com/api/subgraphs/id/yrSg8JP1ikmEEWRSxrzkamAGEHKCHYob9yXVDj56f1z'

// Studio development URL (fallback when gateway returns 1016) - Updated to 0.0.6
const STUDIO_QUERY_URL = process.env.STUDIO_QUERY_URL || 'https://api.studio.thegraph.com/query/116111/rta-v-1/0.0.6'

export async function POST(request: NextRequest) {
  try {
    console.log('SUBGRAPH_API: POST route hit!')
    const body = await request.json()
    console.log('SUBGRAPH_API: Request body:', JSON.stringify(body, null, 2))
    
    const { query, variables } = body

    if (!query) {
      console.log('SUBGRAPH_API: No query provided')
      return NextResponse.json(
        { error: 'GraphQL query is required' },
        { status: 400 }
      )
    }
    
    console.log('SUBGRAPH_API: Query found, processing...')

    // Headers for gateway endpoint
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add API key for gateway endpoint
    if (SUBGRAPH_API_KEY) {
      headers['Authorization'] = `Bearer ${SUBGRAPH_API_KEY}`
    }

    // Use Studio endpoint directly - confirmed working
    console.log('SUBGRAPH_API: Using Studio endpoint:', STUDIO_QUERY_URL)
    
    try {
      const studioResponse = await fetch(STUDIO_QUERY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      })
      
      if (!studioResponse.ok) {
        const responseText = await studioResponse.text()
        throw new Error(`HTTP ${studioResponse.status}: ${studioResponse.statusText} - ${responseText}`)
      }
      
      const studioResult = await studioResponse.json()
      
      // Return the Studio result with source indicator - same as test-studio route
      return NextResponse.json({
        ...studioResult,
        source: 'studio'
      })
    } catch (studioError: any) {
      console.error('SUBGRAPH_API: Studio endpoint failed:', studioError.message)
      
      return NextResponse.json(
        { 
          error: `Studio query failed: ${studioError.message}`,
          studioError: studioError.message
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('SUBGRAPH_API: Request processing error:', error)
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    )
  }
}

// Health check endpoint
export async function GET() {
  try {
    const healthQuery = `
      query HealthCheck {
        _meta {
          block {
            number
          }
        }
      }
    `

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (SUBGRAPH_API_KEY) {
      headers['Authorization'] = `Bearer ${SUBGRAPH_API_KEY}`
    }

    let source = ''
    let blockNumber = 0

    try {
      const response = await fetch(RTAV1_QUERY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: healthQuery })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      source = 'gateway'
      blockNumber = result.data?._meta?.block?.number || 0
    } catch (gatewayError) {
      try {
        const response = await fetch(STUDIO_QUERY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: healthQuery })
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const result = await response.json()
        source = 'studio'
        blockNumber = result.data?._meta?.block?.number || 0
      } catch (studioError) {
        return NextResponse.json(
          { 
            healthy: false, 
            error: 'Both endpoints failed',
            gatewayError: gatewayError instanceof Error ? gatewayError.message : 'Unknown error',
            studioError: studioError instanceof Error ? studioError.message : 'Unknown error'
          },
          { status: 503 }
        )
      }
    }

    return NextResponse.json({
      healthy: true,
      source,
      blockNumber,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json(
      { healthy: false, error: error.message },
      { status: 500 }
    )
  }
} 