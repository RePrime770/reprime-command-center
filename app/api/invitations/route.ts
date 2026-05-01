import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type CreateBody = {
  contact_first_name?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  contact_pipedrive_id?: number | null
  proposed_slots?: Array<{ iso: string; display: string }>
  meeting_type?: 'terminal' | 'meeting' | null
  expires_in_days?: number
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== 'g@reprime.com') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: CreateBody
  try {
    payload = (await request.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const firstName = (payload.contact_first_name || '').trim() || null
  const fullName = (payload.contact_name || '').trim() || null

  if (!firstName && !fullName) {
    return NextResponse.json(
      { error: 'name_required', message: 'contact_first_name or contact_name is required' },
      { status: 400 }
    )
  }

  const id = randomUUID()
  const expiresInDays = Math.max(1, Math.min(60, payload.expires_in_days ?? 14))
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()

  const row = {
    id,
    contact_first_name: firstName,
    contact_name: fullName,
    contact_email: payload.contact_email ?? null,
    contact_phone: payload.contact_phone ?? null,
    contact_pipedrive_id: payload.contact_pipedrive_id ?? null,
    proposed_slots: payload.proposed_slots ?? [],
    meeting_type: payload.meeting_type ?? 'terminal',
    status: 'sent' as const,
    expires_at: expiresAt,
  }

  const service = createServiceClient()
  const { error: insertErr } = await service.from('invitations').insert(row)

  if (insertErr) {
    return NextResponse.json(
      { error: 'db_insert_failed', message: insertErr.message },
      { status: 500 }
    )
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://project-7e87w.vercel.app'
  ).replace(/\/$/, '')
  const invite_url = `${appUrl}/invite/${id}`

  return NextResponse.json({
    id,
    invite_url,
    expires_at: expiresAt,
  })
}
