import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/server'

// Locked Screen 1 OG Card spec — dashboard/_terminal-design-reference/01_Screen1_OG_Card.html
// 1200×630 native canvas, Brand Navy background, Imperial Gold typography,
// Cinzel TERMINAL wordmark + Playfair Display recipient name + EB Garamond
// "by RePrime" italic. Rendered via @vercel/og ImageResponse at edge.

export const runtime = 'edge'
export const alt = 'Terminal Introduction — RePrime Group'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const NAVY = '#0E3470'
const GOLD = '#FFCC33'
const GOLD_RGBA_85 = 'rgba(255, 204, 51, 0.85)'
const GOLD_RGBA_70 = 'rgba(255, 204, 51, 0.70)'
const GOLD_RGBA_45 = 'rgba(255, 204, 51, 0.45)'

async function fetchFont(family: string, weight: number, italic = false): Promise<ArrayBuffer | null> {
  try {
    const ital = italic ? 'ital,' : ''
    const style = italic ? `1,${weight}` : `${weight}`
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:${ital}wght@${style}&display=swap`
    const cssRes = await fetch(cssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })
    if (!cssRes.ok) return null
    const css = await cssRes.text()
    const fontUrlMatch = css.match(/url\((https:\/\/[^)]+\.(?:woff2|woff|ttf|otf))\)/)
    if (!fontUrlMatch) return null
    const fontRes = await fetch(fontUrlMatch[1])
    if (!fontRes.ok) return null
    return await fontRes.arrayBuffer()
  } catch {
    return null
  }
}

export default async function OGImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Fetch recipient name from invitation row
  let displayName = 'Guest'
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('invitations')
      .select('contact_first_name, contact_name')
      .eq('id', token)
      .maybeSingle()
    if (data) {
      displayName = data.contact_name || data.contact_first_name || 'Guest'
    }
  } catch {
    // fall through with 'Guest'
  }

  // Load brand fonts in parallel. Use Mozilla UA so Google Fonts returns TTF
  // (Satori in @vercel/og doesn't support WOFF2).
  const [cinzelBuf, playfairBuf, ebGaramondBuf, poppinsBuf] = await Promise.all([
    fetchFont('Cinzel', 600),
    fetchFont('Playfair Display', 700),
    fetchFont('EB Garamond', 400, true),
    fetchFont('Poppins', 600),
  ])

  // Adaptive sizing — long names shrink so they fit on one line
  const nameLength = displayName.length
  const nameFontSize = nameLength > 22 ? 88 : nameLength > 16 ? 112 : nameLength > 11 ? 124 : 140

  const fonts: Array<{ name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style?: 'normal' | 'italic' }> = []
  if (cinzelBuf) fonts.push({ name: 'Cinzel', data: cinzelBuf, weight: 600, style: 'normal' })
  if (playfairBuf) fonts.push({ name: 'Playfair Display', data: playfairBuf, weight: 700, style: 'normal' })
  if (ebGaramondBuf) fonts.push({ name: 'EB Garamond', data: ebGaramondBuf, weight: 400, style: 'italic' })
  if (poppinsBuf) fonts.push({ name: 'Poppins', data: poppinsBuf, weight: 600, style: 'normal' })

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: NAVY,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '60px 80px',
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        {/* TOP: TERMINAL wordmark with spindle accents */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* Top spindle */}
          <div
            style={{
              width: '780px',
              height: '2px',
              background: `linear-gradient(90deg, rgba(255,204,51,0) 0%, ${GOLD} 6%, ${GOLD} 94%, rgba(255,204,51,0) 100%)`,
              display: 'flex',
            }}
          />
          {/* TERMINAL — Cinzel SemiBold per logo spec */}
          <div
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              fontWeight: 600,
              fontSize: '70px',
              color: GOLD,
              letterSpacing: '10px',
              textTransform: 'uppercase',
              margin: '14px 0',
              display: 'flex',
            }}
          >
            TERMINAL
          </div>
          {/* Bottom spindle */}
          <div
            style={{
              width: '780px',
              height: '2px',
              background: `linear-gradient(90deg, rgba(255,204,51,0) 0%, ${GOLD} 6%, ${GOLD} 94%, rgba(255,204,51,0) 100%)`,
              display: 'flex',
            }}
          />
          {/* by RePrime */}
          <div
            style={{
              fontFamily: 'EB Garamond, Georgia, serif',
              fontStyle: 'italic',
              fontSize: '32px',
              color: GOLD_RGBA_85,
              marginTop: '12px',
              display: 'flex',
            }}
          >
            by RePrime
          </div>
        </div>

        {/* MIDDLE: Recipient name in Playfair Display */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* Private Introduction label */}
          <div
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 600,
              fontSize: '16px',
              letterSpacing: '5px',
              color: GOLD_RGBA_70,
              textTransform: 'uppercase',
              marginBottom: '24px',
              display: 'flex',
            }}
          >
            Private Introduction
          </div>
          {/* Name */}
          <div
            style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              fontWeight: 700,
              fontSize: `${nameFontSize}px`,
              color: GOLD,
              lineHeight: 1.0,
              letterSpacing: '-1.5px',
              textAlign: 'center',
              maxWidth: '1040px',
              display: 'flex',
            }}
          >
            {displayName}
          </div>
        </div>

        {/* BOTTOM: Private Membership · By Invitation Only */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 600,
              fontSize: '14px',
              letterSpacing: '4px',
              color: GOLD_RGBA_70,
              textTransform: 'uppercase',
              marginBottom: '6px',
              display: 'flex',
            }}
          >
            Private Membership
          </div>
          <div
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 500,
              fontSize: '12px',
              letterSpacing: '3.5px',
              color: GOLD_RGBA_45,
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            By Invitation Only
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fonts.length > 0 ? fonts : undefined,
    }
  )
}
