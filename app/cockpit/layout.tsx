import type { ReactNode } from 'react'

// STRICT PASSTHROUGH — architecture §2.1 "Always-green".
//
// This layout exists only so deck routes (app/cockpit/<deck>/page.tsx, Phase 3+)
// share the /cockpit segment (and its proxy.ts session gating) without touching
// the Flight Deck. It MUST stay a bare `children` return: no wrapper elements,
// no styles, no providers — any wrapper div would alter /cockpit's rendered DOM,
// which is required to stay pixel-identical.
//
// Verified inert against Next 16 (node_modules/next/dist/docs/.../layout.md):
// a layout returning `children` adds zero DOM, and app/cockpit/page.tsx's
// `export const dynamic = 'force-dynamic'` is page-segment config that a
// config-less layout does not override.
export default function CockpitLayout({ children }: { children: ReactNode }) {
  return children
}
