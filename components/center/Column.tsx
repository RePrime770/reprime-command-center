'use client'

import type { ReactNode } from 'react'

/**
 * Top-border colors per column meaning, from the existing meaning-based
 * palette in app/globals.css. Keys mirror the column labels.
 */
const ACCENT: Record<string, string> = {
  Pipeline: 'var(--rp-gold)',         // #FFCC33 — meetings, brand
  Inbox:    'var(--c-warn)',          // #F59E0B — heads-up, triage
  Bucket:   'var(--c-live-now)',      // #A855F7 — in-progress projects
  Crew:     'var(--c-channel-718)',   // #25D366 — team / OK
}

export type ColumnProps = {
  label: 'Pipeline' | 'Inbox' | 'Bucket' | 'Crew'
  children?: ReactNode
  /**
   * When true, the column body skips its own padding + scroll so a column-
   * level child (e.g. PipelineColumn) can manage them itself. The accent
   * border and the label header still render.
   */
  fullBleed?: boolean
}

/**
 * Column — single kiosk column with sticky header + scrollable body.
 *
 * Width is driven by the parent Canvas grid (target ~1280px on a 5120-wide
 * monitor). Each column scrolls independently in the vertical axis.
 *
 * Tracks B/C/D/E mount their column-specific contents as `children`. When a
 * track ships its own scrolling/padding (PipelineColumn does), pass
 * `fullBleed` to suppress the wrapper's body styles.
 */
export default function Column({ label, children, fullBleed }: ColumnProps) {
  const accent = ACCENT[label] ?? 'var(--rp-gold)'

  return (
    <section
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100%',
        background: 'rgba(14, 52, 112, 0.55)',
        borderTop: `3px solid ${accent}`,
        borderRight: '1px solid rgba(255, 204, 51, 0.10)',
        fontFamily: 'inherit',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: 'rgba(14, 52, 112, 0.96)',
          borderBottom: '1px solid rgba(255, 204, 51, 0.18)',
          padding: '12px 16px',
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            margin: 0,
            color: 'var(--rp-gold)',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </h2>
      </header>

      <div
        data-column-body={label}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: fullBleed ? 'hidden' : 'auto',
          overflowX: 'hidden',
          padding: fullBleed ? 0 : '12px 16px 16px',
          display: fullBleed ? 'flex' : undefined,
          flexDirection: fullBleed ? 'column' : undefined,
        }}
      >
        {children}
      </div>
    </section>
  )
}
