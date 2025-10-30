import { NextRequest, NextResponse } from 'next/server'

/**
 * Jupiter Quote API Proxy
 * 
 * This proxies requests to Jupiter's quote API to bypass CORS and DNS restrictions.
 * Runs server-side where network access is typically more permissive.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const inputMint = searchParams.get('inputMint')
    const outputMint = searchParams.get('outputMint')
    const amount = searchParams.get('amount')
    const slippageBps = searchParams.get('slippageBps') || '100'

    // Validate required parameters
    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: inputMint, outputMint, amount' },
        { status: 400 }
      )
    }

    console.log('🔄 Proxying Jupiter quote request...')
    console.log('   Input Mint:', inputMint)
    console.log('   Output Mint:', outputMint)
    console.log('   Amount:', amount)

    // Make request to Jupiter API from server-side
    // NOTE: Correct domain is api.jup.ag (NOT quote-api.jup.ag)
    // Path: /v6/quote (NOT /quote/v6)
    const jupiterUrl = `https://api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
    
    // Get API key from environment if available
    const apiKey = process.env.JUPITER_API_KEY
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'ShadowSwap/1.0',
      'Origin': 'https://jup.ag'
    }
    
    // Add API key header if available
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }
    
    const response = await fetch(jupiterUrl, {
      method: 'GET',
      headers,
      cache: 'no-store'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Jupiter API error:', errorText)
      
      return NextResponse.json(
        { 
          error: `Jupiter API error: ${response.statusText}`,
          details: errorText 
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ Quote received successfully')
    console.log('   In Amount:', data.inAmount)
    console.log('   Out Amount:', data.outAmount)

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('❌ Jupiter proxy error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch quote from Jupiter',
        message: error.message 
      },
      { status: 500 }
    )
  }
}

