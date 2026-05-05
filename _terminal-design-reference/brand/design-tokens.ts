/**
 * RePrime Terminal — Locked Design Tokens
 *
 * Single source of truth for the WhatsApp invitation flow.
 * Aligned with the logo migration brief — Imperial Gold #FFCC33,
 * Brand Navy #0E3470, all surface variants derived via rgba.
 *
 * RULE: zero new hex values for navy or gold in the codebase.
 * If you need a new shade, derive it from REPRIME_BRAND.navy or
 * REPRIME_BRAND.gold via opacity. Add it as a named token here
 * so it doesn't drift.
 */

export const REPRIME_BRAND = {
  // ─── PRIMARY ─────────────────────────────────────────────
  navy:               '#0E3470',
  gold:               '#FFCC33',
  white:              '#FFFFFF',

  // ─── NAVY SURFACE LADDER (derived) ───────────────────────
  // Per migration brief Q4: keep depth, derive from #0E3470
  navySurfaceDeep:    'rgba(14, 52, 112, 0.85)',  // was #0A1F44
  navyBorder:         'rgba(14, 52, 112, 0.70)',  // was #1A3560

  // ─── GOLD ALPHA LADDER (derived) ─────────────────────────
  // For borders, fills, hover states. No new gold hexes.
  goldLine22:         'rgba(255, 204, 51, 0.22)',
  goldLine30:         'rgba(255, 204, 51, 0.30)',
  goldLine35:         'rgba(255, 204, 51, 0.35)',
  goldLine18:         'rgba(255, 204, 51, 0.18)',
  goldFill04:         'rgba(255, 204, 51, 0.04)',
  goldFill08:         'rgba(255, 204, 51, 0.08)',

  // ─── CREAM BUBBLE (functional UX surface) ────────────────
  // Personal/intimate panel — kept distinct per migration brief Q5
  creamTop:           '#F8F0DA',
  creamBottom:        '#EFE2C4',
  bronzeBold:         '#5A3F18',  // Greeting "David —", name in label
  bronzeSoft:         '#7A5A30',  // Soft italic prefix in label

  // ─── TYPOGRAPHY ──────────────────────────────────────────
  fontLogo:           "'Cinzel', Georgia, serif",      // TERMINAL wordmark only
  fontDisplay:        "'Playfair Display', Georgia, serif",  // names, italic body
  fontBy:             "'EB Garamond', Georgia, serif",       // "by RePrime"
  fontUI:             "'Poppins', sans-serif",          // labels, sans

  // ─── SCALE: LOGO TREATMENT ────────────────────────────────
  logoTracking:       '0.145em',    // Cinzel TERMINAL letter-spacing
  logoWeight:         600,          // Cinzel SemiBold

  // ─── RULE TAPER STOPS ────────────────────────────────────
  // The "spindle" — solid #FFCC33 across middle 88%, fades to
  // transparent at 6% endpoints. Replaces old peak-gradient.
  taperStops: [
    { offset: '0%',   color: '#FFCC33', opacity: 0 },
    { offset: '6%',   color: '#FFCC33', opacity: 1 },
    { offset: '94%',  color: '#FFCC33', opacity: 1 },
    { offset: '100%', color: '#FFCC33', opacity: 0 },
  ],
} as const;

// ─── DEPRECATED — DO NOT USE ─────────────────────────────────
// These hexes are swept by the migration brief. They must not
// reappear in the codebase. Regex check:
//   grep -rn -i -E "#(bc9c45|ffd700|ffec8a|e8b840|a88b40|e8c96d|c4a84e|b09040|a08a3e|d4af37|0a1f44|0a1430|0a1830|1a3560)"
// Expected result: zero matches outside legacy/ and unswept reference HTMLs.
