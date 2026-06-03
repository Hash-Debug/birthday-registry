import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } })
    const html = await res.text()
    const get = (prop: string) => {
      const match = html.match(new RegExp(`<meta[^>]*property=["']og:${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))
                 || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${prop}["']`, 'i'))
      return match?.[1] || ''
    }
    const priceMatch = html.match(/["']price["']\s*:\s*["']?([\d,]+\.?\d*)["']?/) || html.match(/₹\s*([\d,]+)/)
    return NextResponse.json({
      title: get('title') || '',
      description: get('description') || '',
      image_url: get('image') || '',
      brand: get('site_name') || '',
      price: priceMatch ? parseFloat(priceMatch[1].replace(',','')) : ''
    })
  } catch {
    return NextResponse.json({ title:'', description:'', image_url:'', brand:'', price:'' })
  }
}