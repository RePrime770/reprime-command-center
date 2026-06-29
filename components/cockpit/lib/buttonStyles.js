// Shared button style helpers for cockpit UI.
// Kiosk-grade sizing: larger touch targets, consistent transitions, focus-visible outlines.
//
// Usage: import { BTN_PRIMARY, BTN_PILL, BTN_ICON, BTN_TAB, BTN_CHROME, BTN_ROW_ICON, INPUT_BASE } from '../lib/buttonStyles';
// Then spread at the call site: <button style={{ ...BTN_PRIMARY, ...overrides }}>...

export const TRANSITION = 'all 0.12s ease';

// Primary action buttons (Send, Compose, Confirm)
export const BTN_PRIMARY = {
  fontSize: 19,
  fontWeight: 600,
  padding: '12px 18px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  transition: TRANSITION,
  boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
};

// Pill buttons (Zoom, Move-to-Staff, Back, channel chips)
export const BTN_PILL = {
  fontSize: 15,
  fontWeight: 500,
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid transparent',
  cursor: 'pointer',
  transition: TRANSITION,
};

// Icon-only buttons (X, mic, paperclip, inline send icons)
export const BTN_ICON = {
  fontSize: 16,
  padding: '8px 10px',
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  transition: TRANSITION,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// Tab buttons (Today/Tomorrow/Week, lane filter pills)
export const BTN_TAB = {
  fontSize: 16,
  fontWeight: 500,
  padding: '9px 14px',
  borderRadius: 8,
  border: '1px solid transparent',
  cursor: 'pointer',
  transition: TRANSITION,
};

// Header chrome buttons (PTT, Concierge cluster, Listen)
export const BTN_CHROME = {
  fontSize: 16,
  fontWeight: 500,
  padding: '9px 14px',
  borderRadius: 8,
  border: '1px solid transparent',
  cursor: 'pointer',
  transition: TRANSITION,
};

// Row interactive icons (star, remind, voice-note)
export const BTN_ROW_ICON = {
  fontSize: 15,
  padding: '8px 10px',
  borderRadius: 7,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  transition: TRANSITION,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// Form inputs (email, search, textarea)
export const INPUT_BASE = {
  fontSize: 16,
  padding: '11px 14px',
  borderRadius: 8,
  transition: TRANSITION,
};
