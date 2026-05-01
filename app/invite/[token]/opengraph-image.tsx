import { ImageResponse } from '@vercel/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Google Fonts official repo on GitHub — direct .ttf access.
// Edge runtime fetches these at request time. Same bytes as the
// brief's "place in public/fonts/" approach, but with zero manual setup.
const FONT_BASE = 'https://raw.githubusercontent.com/google/fonts/main'
const FONT_URLS = {
  playfairBold: `${FONT_BASE}/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf`,
  playfairReg: `${FONT_BASE}/ofl/playfairdisplay/static/PlayfairDisplay-Regular.ttf`,
  playfairItalic: `${FONT_BASE}/ofl/playfairdisplay/static/PlayfairDisplay-Italic.ttf`,
  poppinsSemi: `${FONT_BASE}/ofl/poppins/Poppins-SemiBold.ttf`,
  poppinsMed: `${FONT_BASE}/ofl/poppins/Poppins-Medium.ttf`,
  poppinsReg: `${FONT_BASE}/ofl/poppins/Poppins-Regular.ttf`,
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const [playfairBold, playfairReg, playfairItalic, poppinsSemi, poppinsMed, poppinsReg] =
    await Promise.all([
      fetch(FONT_URLS.playfairBold).then((r) => r.arrayBuffer()),
      fetch(FONT_URLS.playfairReg).then((r) => r.arrayBuffer()),
      fetch(FONT_URLS.playfairItalic).then((r) => r.arrayBuffer()),
      fetch(FONT_URLS.poppinsSemi).then((r) => r.arrayBuffer()),
      fetch(FONT_URLS.poppinsMed).then((r) => r.arrayBuffer()),
      fetch(FONT_URLS.poppinsReg).then((r) => r.arrayBuffer()),
    ])

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: inv } = await supabase
    .from('invitations')
    .select('contact_name, contact_first_name')
    .eq('id', token)
    .single()

  const displayName = inv?.contact_name || inv?.contact_first_name || 'Guest'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#07101E',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '50px 80px',
        }}
      >
        {/* NAME — hero element */}
        <div
          style={{
            fontFamily: 'Playfair Display',
            fontWeight: 700,
            fontSize: 90,
            color: '#E8C96D',
            lineHeight: 1.05,
            textAlign: 'center',
          }}
        >
          {displayName}
        </div>

        {/* PRIVATE INTRODUCTION */}
        <div
          style={{
            fontFamily: 'Poppins',
            fontWeight: 600,
            fontSize: 22,
            color: '#C4A84E',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginTop: 18,
            textAlign: 'center',
          }}
        >
          Private Introduction
        </div>

        {/* DIVIDER */}
        <div style={{ width: 56, height: 1, background: '#5A4822', margin: '28px 0' }} />

        {/* TERMINAL wordmark */}
        <div
          style={{
            fontFamily: 'Playfair Display',
            fontWeight: 400,
            fontSize: 56,
            color: '#E8C96D',
            letterSpacing: '0.34em',
            textAlign: 'center',
          }}
        >
          TERMINAL
        </div>

        {/* by RePrime */}
        <div
          style={{
            fontFamily: 'Playfair Display',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 26,
            color: '#B09040',
            marginTop: 10,
            letterSpacing: '0.05em',
            textAlign: 'center',
          }}
        >
          by RePrime
        </div>

        {/* DIVIDER */}
        <div style={{ width: 56, height: 1, background: '#5A4822', margin: '28px 0 22px' }} />

        {/* PRIVATE MEMBERSHIP */}
        <div
          style={{
            fontFamily: 'Poppins',
            fontWeight: 600,
            fontSize: 20,
            color: '#C4A84E',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          Private Membership
        </div>

        {/* BY INVITATION ONLY */}
        <div
          style={{
            fontFamily: 'Poppins',
            fontWeight: 400,
            fontSize: 20,
            color: '#A08A3E',
            letterSpacing: '0.10em',
            marginTop: 10,
            textAlign: 'center',
          }}
        >
          By Invitation Only
        </div>

        {/* MINI DIVIDER */}
        <div style={{ width: 36, height: 1, background: '#4A3820', margin: '22px 0 18px' }} />

        {/* SELECT A TIME */}
        <div
          style={{
            fontFamily: 'Poppins',
            fontWeight: 500,
            fontSize: 26,
            color: '#E8C96D',
            letterSpacing: '0.08em',
            textAlign: 'center',
          }}
        >
          Select a time →
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Playfair Display', data: playfairBold, weight: 700, style: 'normal' },
        { name: 'Playfair Display', data: playfairReg, weight: 400, style: 'normal' },
        { name: 'Playfair Display', data: playfairItalic, weight: 400, style: 'italic' },
        { name: 'Poppins', data: poppinsSemi, weight: 600, style: 'normal' },
        { name: 'Poppins', data: poppinsMed, weight: 500, style: 'normal' },
        { name: 'Poppins', data: poppinsReg, weight: 400, style: 'normal' },
      ],
    }
  )
}
