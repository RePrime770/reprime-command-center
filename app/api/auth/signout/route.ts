import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/auth/signout
 *
 * Clears the Supabase session and its auth cookies (the SSR adapter writes the
 * Set-Cookie headers via createServerClient's cookie sink). Returns `{ ok: true }`
 * so the cockpit can then redirect to /login.
 */
export async function POST() {
  try {
    const supabase = await createServerClient()
    await supabase.auth.signOut()
  } catch (err) {
    // Already signed out / no session is not an error path for the caller.
    console.error('[auth/signout] sign-out failed:', err)
  }
  return NextResponse.json({ ok: true }, { status: 200 })
}
