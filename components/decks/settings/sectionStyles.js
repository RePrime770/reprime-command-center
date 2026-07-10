// Shared style tokens for the Settings deck sections — one place for the
// panel/badge/mono-block look so the three sections stay visually consistent
// (kiosk spec: Lexend, 16px prose floor, ≥44pt targets).

import { ink, semantic, success, warning, danger } from '../../cockpit/lib/colors.js';

export const PANEL = {
  background: semantic.panelBg,
  border: `1px solid ${semantic.border}`,
  borderRadius: 12,
  boxShadow: semantic.panelShadow,
  padding: '16px 18px',
};

export const MONO_BLOCK = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 14,
  background: 'rgba(15,23,42,0.06)',
  padding: '8px 10px',
  borderRadius: 6,
  wordBreak: 'break-all',
  whiteSpace: 'pre-wrap',
};

export const SECTION_TITLE = {
  margin: 0,
  fontSize: 20,
  fontWeight: 700,
  color: ink[900],
};

export const SECTION_HINT = {
  margin: '4px 0 0',
  fontSize: 16,
  lineHeight: 1.5,
  color: ink[500],
};

export const MUTED_TEXT = { fontSize: 16, color: ink[300], lineHeight: 1.5 };

const BADGE_BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  padding: '4px 10px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
};

export const BADGE = {
  ok: { ...BADGE_BASE, background: success[50], color: success[900], border: `1px solid ${success[300]}` },
  warn: { ...BADGE_BASE, background: warning[50], color: warning[900], border: `1px solid ${warning[500]}` },
  err: { ...BADGE_BASE, background: danger[50], color: danger[900], border: `1px solid ${danger[300]}` },
  idle: { ...BADGE_BASE, background: 'rgba(15,23,42,0.06)', color: ink[500], border: `1px solid ${semantic.border}` },
};

/** Error panel copy helper — stable code shown in mono, never raw messages. */
export const ERROR_CODE_STYLE = {
  fontFamily: MONO_BLOCK.fontFamily,
  fontSize: 14,
  color: ink[500],
};
