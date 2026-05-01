import { ImageResponse } from 'next/og'

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 40,
          background: '#0E3470',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#BC9C45',
          fontWeight: 700,
          borderRadius: 8,
        }}
      >
        R
      </div>
    ),
    { ...size }
  )
}
