/**
 * RePrime brand tokens — single source of truth.
 *
 * Migration brief (May 3, 2026): one gold (#FFCC33 Imperial Gold) and one navy (#0E3470).
 * Hierarchy comes from opacity, never from a different gold hex.
 *
 * Brand reference: dashboard/_terminal-design-reference/brand/TerminalLogo.jsx
 *                  dashboard/_terminal-design-reference/brand/CLAUDE_CODE_MIGRATION_BRIEF.md
 *
 * RULE: do not introduce new navy or gold hex values. Use these tokens or rgba() with
 * the brand RGB triplets defined below.
 */

/** Imperial Gold — the only brand gold. */
export const GOLD = '#FFCC33' as const

/** Brand Navy — the only brand navy. */
export const NAVY = '#0E3470' as const

/** Cream paper. Used as a content-card background on navy. */
export const CREAM = '#F4EEE0' as const

/** Cream gradient stops used on speech bubbles and confirmation letters. */
export const CREAM_TOP = '#F8F0DA' as const
export const CREAM_BOTTOM = '#EFE2C4' as const

/** Brand RGB triplets — for building rgba() values. */
export const GOLD_RGB = '255, 204, 51' as const
export const NAVY_RGB = '14, 52, 112' as const

/**
 * Gold opacity scale. Hierarchy comes from these levels — never from a different hex.
 * Match call sites that previously used legacy gold variants:
 *   #FFD700 / #FFEC8A / #BC9C45 / #D4B86A → gold[100]
 *   #E8B840                                → gold[85]
 *   #C4A84E                                → gold[85]
 *   #B09040                                → gold[70]
 *   #A88B40 / #A08A3E                      → gold[55]
 *   subtle borders                         → gold[35] / gold[25] / gold[15]
 */
export const gold = {
  100: GOLD,
  92:  `rgba(${GOLD_RGB}, 0.92)`,
  85:  `rgba(${GOLD_RGB}, 0.85)`,
  70:  `rgba(${GOLD_RGB}, 0.70)`,
  55:  `rgba(${GOLD_RGB}, 0.55)`,
  45:  `rgba(${GOLD_RGB}, 0.45)`,
  35:  `rgba(${GOLD_RGB}, 0.35)`,
  25:  `rgba(${GOLD_RGB}, 0.25)`,
  18:  `rgba(${GOLD_RGB}, 0.18)`,
  15:  `rgba(${GOLD_RGB}, 0.15)`,
  12:  `rgba(${GOLD_RGB}, 0.12)`,
  10:  `rgba(${GOLD_RGB}, 0.10)`,
  08:  `rgba(${GOLD_RGB}, 0.08)`,
  06:  `rgba(${GOLD_RGB}, 0.06)`,
  04:  `rgba(${GOLD_RGB}, 0.04)`,
} as const

/**
 * Navy opacity scale. Used for surface elevation and depth — every navy variation derives
 * from the single brand navy via opacity. No separate navy hex values anywhere.
 *
 *   surfaceDeep — replaces #0A1F44 (deeper surface, modal backgrounds)
 *   border      — replaces #1A3560 (elevated surface borders)
 *   labelOnCream — replaces #7A5A30 / #5A3F18 in cream-bubble label/name positions
 */
export const navy = {
  100:         NAVY,
  surfaceDeep: `rgba(${NAVY_RGB}, 0.85)`,
  border:      `rgba(${NAVY_RGB}, 0.70)`,
  labelOnCream:    `rgba(${NAVY_RGB}, 0.55)`,
  nameOnCream:     NAVY,
} as const

/**
 * Convenience export matching the contract in TerminalLogo.jsx.
 * Use this when JS code wants the same shape as the React component's exports.
 */
export const REPRIME_BRAND = {
  gold: GOLD,
  navy: NAVY,
  cream: CREAM,
  black: '#000000',
  white: '#FFFFFF',
} as const

/** Non-brand functional colors — kept as-is per migration brief §2 "Specific exceptions". */
export const status = {
  success: '#00A980',
  warning: GOLD, // unified to gold per migration brief
  error:   '#FF7474',
  info:    '#1D5FB8',
  amber:   '#FFBC7D',
  teal:    '#009080',
} as const
