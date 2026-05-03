import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/server'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('invitations')
    .select('contact_name, contact_first_name')
    .eq('id', token)
    .maybeSingle()

  const name = data?.contact_name || data?.contact_first_name || 'Private Introduction'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#080d18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          gap: 60,
        }}
      >
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: '#0E3470',
            border: '3px solid #C9A84C',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ color: '#C9A84C', fontSize: 42, fontWeight: 700, letterSpacing: '0.18em', display: 'flex' }}>
            TERMINAL
          </div>
          <div style={{ width: 130, height: 1, background: '#C9A84C', margin: '10px 0', display: 'flex' }} />
          <div style={{ color: 'rgba(201,168,76,0.8)', fontSize: 20, fontStyle: 'italic', display: 'flex' }}>
            by RePrime
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: '#C9A84C', fontSize: 72, fontWeight: 700, lineHeight: 1, display: 'flex' }}>
            {name}
          </div>
          <div style={{ color: 'rgba(201,168,76,0.55)', fontSize: 22, letterSpacing: '0.28em', textTransform: 'uppercase', display: 'flex' }}>
            Private Introduction
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
