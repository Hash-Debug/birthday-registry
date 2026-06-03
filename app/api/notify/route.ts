import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { giftTitle, reserverName } = await req.json()
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return NextResponse.json({ ok: true })

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Birthday Registry <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL,
      subject: `🎁 ${reserverName} just reserved "${giftTitle}"!`,
      html: `<p>Great news! <strong>${reserverName}</strong> has reserved <strong>${giftTitle}</strong> from your birthday registry.</p><p>Log in to your admin panel to see all reservations.</p>`
    })
  })
  return NextResponse.json({ ok: true })
}