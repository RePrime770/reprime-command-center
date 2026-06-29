import { NextResponse, type NextRequest } from 'next/server'
import { createMeeting } from '@/lib/zoom/client'

export const dynamic = 'force-dynamic'

// Create a REAL Zoom meeting and return its join_url. Replaces the random
// `zoom.us/j/<11 digits>` links the comms + email reply boxes used to inject
// (which were dead links that could be sent to an investor).
//
// Behind the dashboard auth gate (proxy.ts) — the cockpit calls it with the
// session cookie. Uses the Server-to-Server OAuth account owner ('me').
//
// On any failure (Zoom creds missing / API error) it returns 200 with
// { joinUrl: STATIC_ZOOM_FALLBACK_URL | null, fallback: true } so the caller
// can degrade gracefully instead of fabricating a fake link.
export async function POST(request: NextRequest) {
  let body: { topic?: string; startTime?: string; durationMinutes?: number; contactName?: string } = {}
  try {
    body = await request.json()
  } catch {
    // empty body is fine — use defaults
  }

  const topic = (body.topic || (body.contactName ? `RePrime — ${body.contactName}` : 'RePrime — Meeting')).slice(0, 200)
  const start_time = body.startTime || new Date().toISOString()
  const duration = Math.min(Math.max(body.durationMinutes ?? 30, 15), 240)

  try {
    const meeting = await createMeeting('me', {
      topic,
      start_time,
      duration,
      timezone: 'America/Chicago',
    })
    return NextResponse.json({
      joinUrl: meeting.join_url,
      meetingId: meeting.id,
      startTime: meeting.start_time,
      fallback: false,
    })
  } catch (err) {
    const fallback = process.env.STATIC_ZOOM_FALLBACK_URL || null
    console.error('[zoom/create-meeting] failed:', (err as Error).message)
    return NextResponse.json({
      joinUrl: fallback,
      meetingId: null,
      startTime: null,
      fallback: true,
      error: 'zoom_unavailable',
    })
  }
}
