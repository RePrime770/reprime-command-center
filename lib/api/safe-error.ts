import { NextResponse } from 'next/server'

/**
 * Log the full error server-side and return a client-safe JSON error.
 *
 * This repo is public and the app is a live cockpit: raw `err.message` can
 * carry provider internals (Google/Timelines/Supabase URLs, SQL fragments,
 * upstream response bodies). Clients only ever get a stable `error` code —
 * every UI consumer already falls back to it (`data.message || data.error`).
 *
 * @param tag   log prefix, conventionally the route name, e.g. 'whatsapp/threads'
 * @param err   the caught error — logged verbatim server-side, never echoed
 * @param opts  code: stable machine-readable error string (default 'internal_error')
 *              status: HTTP status (default 500)
 */
export function safeError(
  tag: string,
  err: unknown,
  opts?: { code?: string; status?: number }
): NextResponse {
  console.error(`[${tag}]`, err)
  return NextResponse.json(
    { error: opts?.code ?? 'internal_error' },
    { status: opts?.status ?? 500 }
  )
}
