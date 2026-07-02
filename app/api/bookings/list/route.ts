import { NextResponse } from 'next/server'
import { safeError } from '@/lib/api/safe-error'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAIL = 'g@reprime.com'

export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('invitations')
    .select(
      'id, contact_first_name, contact_name, status, confirmed_slot_iso, zoom_join_url, created_at, expires_at'
    )
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return safeError('bookings/list', error, { code: 'list_failed', status: 500 })
  }
  return NextResponse.json({ invitations: data ?? [] })
}
