import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient as _createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/api/whatsapp/webhook',
  '/api/phone/bb-webhook',
  '/api/phone/quo-webhook',
  '/invite',
  '/api/bookings/confirm',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const response = NextResponse.next()
  const supabase = _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cs) {
          cs.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== 'g@reprime.com') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
}
