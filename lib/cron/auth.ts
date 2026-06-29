import { timingSafeEqual } from 'node:crypto'

/**
 * Shared cron authentication gate. Fail-closed: if CRON_SECRET is unset on the
 * server, every request is rejected. Hardcoded fallbacks are unsafe in a
 * public repo. Set CRON_SECRET on Vercel; see docs/ENVIRONMENT_AUDIT.md.
 *
 * Returns true when the request carries the expected bearer token (or the
 * Vercel-set x-vercel-cron header for built-in cron triggers).
 */
export function cronAuthed(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false

  // Vercel cron sets this header on its scheduled invocations.
  if (req.headers.get('x-vercel-cron') === '1') return true

  const auth = req.headers.get('authorization') || ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    timingSafeEqual(b, b)
    return false
  }
  return timingSafeEqual(a, b)
}
