import { NextRequest, NextResponse } from 'next/server'

/**
 * Jupiter Swap API Proxy
 * 
 * This proxies requests to Jupiter's swap API to bypass CORS and DNS restrictions.
 * Runs server-side where network access is typically more permissive.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.quote || !body.userPublicKey) {
      return NextResponse.json(
        { error: 'Missing required fields: quote, userPublicKey' },
        { status: 400 }
      )
    }

    console.log('🔄 Proxying Jupiter swap request...')
    console.log('   User:', body.userPublicKey)

    // Make request to Jupiter API from server-side
    // NOTE: Correct domain is api.jup.ag (NOT quote-api.jup.ag)
    // Path: /v6/swap (NOT /swap/v6)
    
    // Get API key from environment if available
    const apiKey = process.env.JUPITER_API_KEY
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'ShadowSwap/1.0',
      'Origin': 'https://jup.ag'
    }
    
    // Add API key header if available
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }
    
    const response = await fetch('https://api.jup.ag/v6/swap', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        quote: body.quote,
        userPublicKey: body.userPublicKey,
        wrapAndUnwrapSol: body.wrapAndUnwrapSol !== false,
        dynamicComputeUnitLimit: body.dynamicComputeUnitLimit !== false,
        prioritizationFeeLamports: body.prioritizationFeeLamports || 'auto'
      }),
      cache: 'no-store'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Jupiter swap API error:', errorText)
      
      return NextResponse.json(
        { 
          error: `Jupiter API error: ${response.statusText}`,
          details: errorText 
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ Swap transaction received')

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('❌ Jupiter swap proxy error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get swap transaction from Jupiter',
        message: error.message 
      },
      { status: 500 }
    )
  }
}

