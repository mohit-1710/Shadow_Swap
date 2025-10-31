import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Required because we use req.url for searchParams
export const revalidate = 120 // cache for 2 minutes on the server

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const days = searchParams.get('days') || '7'

    const url = `https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=${encodeURIComponent(
      days
    )}&precision=full`

    const response = await fetch(url, { next: { revalidate } })
    if (!response.ok) {
      // surface 429 to client so UI can render rate-limit message
      return NextResponse.json(
        { error: `Upstream error ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in CoinGecko history proxy:', err)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}

