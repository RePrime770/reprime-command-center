'use client'

export function TavMark({ size = 32, color = '#BC9C45' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="56" fontWeight="700" fill={color}>ת</text>
    </svg>
  )
}
