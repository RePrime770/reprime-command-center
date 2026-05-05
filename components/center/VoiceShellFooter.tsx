'use client'

/**
 * VoiceShellFooter — pinned bottom placeholder for Track G's voice shell.
 *
 * Track A ships the footer chrome only. Track G (feat/center-voice) replaces
 * the contents of the inner [data-slot="voice-shell"] element with the live
 * voice UI (mic state, transcript, status).
 *
 * The placeholder text is intentionally plain so it Speechifies cleanly if
 * Gideon's screen reader sweeps the page on first load.
 */
export default function VoiceShellFooter() {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 40,
        height: 96,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(14, 52, 112, 0.96)',
        borderTop: '1px solid rgba(255, 204, 51, 0.22)',
        fontFamily: 'inherit',
        padding: '0 24px',
      }}
    >
      <div
        data-slot="voice-shell"
        style={{
          width: '100%',
          maxWidth: 1280,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'rgba(255, 204, 51, 0.35)',
            boxShadow: '0 0 0 1px rgba(255, 204, 51, 0.55)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            color: '#F5EFD8',
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: '0.04em',
          }}
        >
          Hold space to talk
        </span>
      </div>
    </div>
  )
}
