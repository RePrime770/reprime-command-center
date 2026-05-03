// TerminalLogo.jsx — v2 (CORRECTED VIEWBOX)
// RePrime Terminal — official forever mark
//
// IMPORTANT: This version corrects a clipping bug in v1 where the viewBox was 680
// wide but the wordmark rendered at ~620px, causing the L to clip off the right
// edge. New viewBox is 800 wide with the wordmark anchored at x=400 and
// letter-spacing tightened from 14.5 to 12 for safe horizontal fit.
//
// Brand gold:   #FFCC33  (Imperial Gold)
// Brand navy:   #0E3470
// Cream paper:  #F4EEE0
//
// Required fonts (load via Google Fonts):
//   Cinzel weight 600
//   EB Garamond italic 400
//
// Add to <head>:
// <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=EB+Garamond:ital,wght@1,400&display=swap" rel="stylesheet">

import React from 'react';

const GOLD = '#FFCC33';
const NAVY = '#0E3470';
const CREAM = '#F4EEE0';

/**
 * TerminalLogo — wide format (800x320 viewBox)
 * Use for: email hero, web hero, broker letterhead, LOI cover, brass plaque artwork.
 *
 * Props:
 *   variant: 'navy' (default) | 'cream' | 'mono'
 *   width:   number | string  (default '100%')
 *   className, style: standard React props
 */
export function TerminalLogo({ variant = 'navy', width = '100%', className, style }) {
  const isCream = variant === 'cream';
  const isMono = variant === 'mono';

  const bg = isCream ? CREAM : (isMono ? 'transparent' : NAVY);
  const fg = isCream ? NAVY : (isMono ? 'currentColor' : GOLD);
  const ruleColor = isMono ? 'currentColor' : GOLD;

  const ruleId = `tl-rule-${variant}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 320"
      width={width}
      role="img"
      aria-label="Terminal by RePrime"
      className={className}
      style={style}
    >
      <title>RePrime Terminal</title>
      <defs>
        <linearGradient id={ruleId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={ruleColor} stopOpacity="0" />
          <stop offset="6%" stopColor={ruleColor} stopOpacity="1" />
          <stop offset="94%" stopColor={ruleColor} stopOpacity="1" />
          <stop offset="100%" stopColor={ruleColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {!isMono && <rect width="800" height="320" fill={bg} />}
      <rect x="90" y="86" width="620" height="2" fill={`url(#${ruleId})`} />
      <text
        x="400"
        y="196"
        textAnchor="middle"
        fontFamily="Cinzel, 'Trajan Pro', Georgia, serif"
        fontWeight="600"
        fontSize="100"
        letterSpacing="12"
        fill={fg}
      >
        TERMINAL
      </text>
      <rect x="90" y="220" width="620" height="2" fill={`url(#${ruleId})`} />
      <text
        x="400"
        y="262"
        textAnchor="middle"
        fontFamily="'EB Garamond', Garamond, Georgia, serif"
        fontStyle="italic"
        fontSize="27"
        letterSpacing="1.4"
        fill={fg}
        opacity="0.9"
      >
        by RePrime
      </text>
    </svg>
  );
}

/**
 * TerminalLogoSquare — 1024x1024 viewBox
 * Use for: WhatsApp avatar, favicon, app icon, social profile.
 */
export function TerminalLogoSquare({ width = '100%', className, style }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      width={width}
      role="img"
      aria-label="Terminal by RePrime"
      className={className}
      style={style}
    >
      <title>RePrime Terminal — Square Medallion</title>
      <defs>
        <linearGradient id="tl-rule-sq" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0" />
          <stop offset="6%" stopColor={GOLD} stopOpacity="1" />
          <stop offset="94%" stopColor={GOLD} stopOpacity="1" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" fill={NAVY} />
      <circle cx="512" cy="512" r="496" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.55" />
      <rect x="170" y="430" width="684" height="2.5" fill="url(#tl-rule-sq)" />
      <text
        x="512"
        y="556"
        textAnchor="middle"
        fontFamily="Cinzel, 'Trajan Pro', Georgia, serif"
        fontWeight="600"
        fontSize="112"
        letterSpacing="13.5"
        fill={GOLD}
      >
        TERMINAL
      </text>
      <rect x="170" y="586" width="684" height="2.5" fill="url(#tl-rule-sq)" />
      <text
        x="512"
        y="638"
        textAnchor="middle"
        fontFamily="'EB Garamond', Garamond, Georgia, serif"
        fontStyle="italic"
        fontSize="32"
        letterSpacing="1.6"
        fill={GOLD}
        opacity="0.9"
      >
        by RePrime
      </text>
    </svg>
  );
}

// Default export = wide format navy variant
export default TerminalLogo;

// Brand tokens (use these everywhere, never hard-code another gold)
export const REPRIME_BRAND = {
  gold: '#FFCC33',     // Imperial Gold — primary brand accent
  navy: '#0E3470',     // Brand Navy
  cream: '#F4EEE0',    // Cream paper
  black: '#000000',
  white: '#FFFFFF',
};
