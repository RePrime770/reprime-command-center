// === Terminal v2 design tokens ===
// v4 dispatch 2026-05-18 — channel palette + slate-dark TopChrome + medal ABCD + role chips.
// Cockpit = productivity-first colors (brand chrome is outbound-only per dashboard_brand_colors_dont_apply.md).
// Brand gold #FFCC33 retained ONLY as TERMINAL wordmark Cinzel anchor.
//
// API surface preserved (warm/ink/info/success/warning/danger/tier/channel/brand/semantic/activeState)
// + net-new (emailInbox/tierABCD/roleChip/slate) so existing imports keep working.

// === NEUTRAL "warm" (was peach #EDD1B0 — now true gray scale) ===
export const warm = {
  50:  '#FAFAFA',
  100: '#F5F5F5',
  200: '#EEEEEE',
  300: '#FAFAFA',
  400: '#E0E0E0',
  500: '#BDBDBD',
  600: '#9E9E9E',
  700: '#757575',
  800: '#616161'
};

export const ink = {
  100: '#94A3B8',
  300: '#64748B',
  500: '#475569',
  700: '#1E293B',
  900: '#0F172A'
};

export const info = {
  50:  '#E3F2FD',
  100: '#BBDEFB',
  300: '#64B5F6',
  500: '#1E88E5',
  700: '#1565C0',
  900: '#0D47A1'
};

export const success = {
  50:  '#E8F5E9',
  100: '#C8E6C9',
  300: '#66BB6A',
  500: '#43A047',
  700: '#2E7D32',
  900: '#1B5E20'
};

export const warning = {
  50:  '#FFF8E1',
  100: '#FFECB3',
  300: '#FFCA28',
  500: '#FFA726',
  700: '#FB8C00',
  900: '#E65100'
};

export const danger = {
  50:  '#FFEBEE',
  100: '#FFCDD2',
  300: '#EF5350',
  500: '#E53935',
  700: '#C62828',
  900: '#B71C1C'
};

// === L1-L7 urgency ladder (per dispatch) ===
export const tier = {
  L1: { hex: '#5F249F', label: 'PARK',   meaning: 'defer' },
  L2: { hex: '#FBC02D', label: 'SCAN',   meaning: 'monitor passively' },
  L3: { hex: '#FF4F00', label: 'FLAG',   meaning: 'note for later action' },
  L4: { hex: '#E91E63', label: 'WORK',   meaning: 'routine active task' },
  L5: { hex: '#C0DC2E', label: 'CHASE',  meaning: 'actively pursuing' },
  L6: { hex: '#D32F2F', label: 'HUNT',   meaning: 'top pursuit' },
  L7: { hex: '#00E676', label: 'STRIKE', meaning: 'drop everything, apex urgency' }
};

// === Channel sub-colors (v4 dispatch §M6 — Comms 5 + Investor magenta + Email neutral) ===
// faded = card-bg tint, textOnFaded = readable text on faded card
export const channel = {
  '305-WA':  { hex: '#F59E0B', faded: '#FEF3C7', textOnFaded: '#92400E', label: '305 WhatsApp',  variant: 'WHATSAPP', family: '305', icon: 'whatsapp' },
  '305-SMS': { hex: '#EF4444', faded: '#FEE2E2', textOnFaded: '#991B1B', label: '305 TEXT',      variant: 'TEXT',     family: '305', icon: 'sms' },
  '718-WA':  { hex: '#10B981', faded: '#D1FAE5', textOnFaded: '#065F46', label: '718 WhatsApp',  variant: 'WHATSAPP', family: '718', icon: 'whatsapp' },
  '718-SMS': { hex: '#8B5CF6', faded: '#EDE9FE', textOnFaded: '#5B21B6', label: '718 TEXT',      variant: 'TEXT',     family: '718', icon: 'sms' },
  '718-iM':  { hex: '#0EA5E9', faded: '#E0F2FE', textOnFaded: '#075985', label: '718 iMessage',  variant: 'iMESSAGE', family: '718', icon: 'imessage' },
  'email':   { hex: '#475569', faded: '#E2E8F0', textOnFaded: '#1E293B', label: 'Email',         variant: 'EMAIL',    family: 'email', icon: 'email' },
  'investor':{ hex: '#DB2777', faded: '#FCE7F3', textOnFaded: '#9D174D', label: 'Investor',      variant: 'INVESTOR', family: 'investor', icon: 'star' },
  'staff':   { hex: '#0D9488', faded: '#CCFBF1', textOnFaded: '#115E59', label: 'Staff',         variant: 'STAFF',    family: 'staff', icon: 'staff' }
};

// === Email inbox colors (v4 §M / handoff §3.1 — 4 inboxes) ===
export const emailInbox = {
  'g@reprime.com':            { hex: '#2563EB', faded: '#DBEAFE', textOnFaded: '#1E3A8A', label: 'g@reprime.com' },
  'g@floridastatetrust.com':  { hex: '#0D9488', faded: '#CCFBF1', textOnFaded: '#115E59', label: 'g@floridastatetrust.com' },
  'gm@cr-pro.com':            { hex: '#4F46E5', faded: '#E0E7FF', textOnFaded: '#3730A3', label: 'gm@cr-pro.com' },
  'all':                      { hex: '#475569', faded: '#E2E8F0', textOnFaded: '#1E293B', label: 'All inboxes' }
};

// === Tier ABCD investor quality (medal palette per v4 §B28) ===
// Principal = filled pill, Connector = outlined ring (per B29)
export const tierABCD = {
  A: { hex: '#EAB308', label: 'A', read: 'top capital — drop-everything, imperial' },
  B: { hex: '#94A3B8', label: 'B', read: 'solid actives — strong cadence' },
  C: { hex: '#CD7F32', label: 'C', read: 'middling/warm — needs work' },
  D: { hex: '#A8A29E', label: 'D', read: 'cold/fading — off radar, not dead' }
};

// === Non-investor role chips (v4 §B33) ===
export const roleChip = {
  attorney:   { hex: '#1E3A8A', label: 'Attorney' },
  rabbi:      { hex: '#7B1FA2', label: 'Rabbi' },
  broker:     { hex: '#0D9488', label: 'Broker' },
  vendor:     { hex: '#57534E', label: 'Vendor' },
  community:  { hex: '#DB2777', label: 'Community' },
  family:     { hex: '#43A047', label: 'Family' },
  other:      { hex: '#94A3B8', label: 'Other' }
};

// === IL_Tagged Monday.com Israel cohort badge (v4 §B32) ===
export const ilTagged = {
  hex: '#4F46E5',
  label: 'IL',
  read: 'Monday.com Israel cohort — strict opt-in'
};

// === RePrime brand chrome (cockpit usage scoped to TERMINAL wordmark only) ===
// Brand colors are OUTBOUND-ONLY per dashboard_brand_colors_dont_apply.md.
// Inside cockpit, TopChrome uses slate-dark gradient (below) — navy is alias-retained for outbound surfaces.
export const brand = {
  gold: '#FFCC33',
  goldSoft: 'rgba(255, 204, 51, 0.55)',
  // navy* retained for outbound Terminal Invitation surfaces only — DO NOT use inside cockpit
  navy: '#0E3470',
  navyMid: '#102E5C',
  navyDeep: '#080F24',
  navyLight: '#1E4FA0',
  navyGradient: 'linear-gradient(180deg, #0E3470 0%, #102E5C 50%, #080F24 100%)'
};

// === Slate-dark TopChrome gradient (v4 §M / §B2 — cockpit replacement for brand navy) ===
export const slate = {
  dark900: '#0F172A',
  dark950: '#020617',
  gradient: 'linear-gradient(180deg, #0F172A 0%, #020617 100%)'
};

// === Semantic surface aliases ===
export const semantic = {
  canvas: '#FAFAFA',
  ink: ink[700],
  divider: 'rgba(15, 23, 42, 0.08)',
  border: 'rgba(15, 23, 42, 0.12)',
  panelBg: '#FFFFFF',
  panelShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
  surfaceRaised: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSunken: '#F5F5F5'
};

// === Active state pattern ===
export const activeState = {
  bg: '#FFFFFF',
  indicator: info[500]
};

// === Helpers ===
export const tierHex = (t) => (t && tier[t] ? tier[t].hex : ink[300]);
export const tierLabel = (t) => (t && tier[t] ? tier[t].label : '');
export const channelHex = (c) => (c && channel[c] ? channel[c].hex : ink[300]);
export const channelLabel = (c) => (c && channel[c] ? channel[c].label : '');
export const channelVariant = (c) => (c && channel[c] ? channel[c].variant : '');
export const channelFamily = (c) => (c && channel[c] ? channel[c].family : '');
export const channelFaded = (c) => (c && channel[c] ? channel[c].faded : warm[100]);
export const channelTextOnFaded = (c) => (c && channel[c] ? channel[c].textOnFaded : ink[700]);

// Email-inbox helpers
export const emailInboxHex = (e) => (e && emailInbox[e] ? emailInbox[e].hex : emailInbox.all.hex);
export const emailInboxFaded = (e) => (e && emailInbox[e] ? emailInbox[e].faded : emailInbox.all.faded);
export const emailInboxTextOnFaded = (e) => (e && emailInbox[e] ? emailInbox[e].textOnFaded : emailInbox.all.textOnFaded);
export const emailInboxLabel = (e) => (e && emailInbox[e] ? emailInbox[e].label : emailInbox.all.label);

// Tier ABCD helpers
export const tierABCDHex = (t) => (t && tierABCD[t] ? tierABCD[t].hex : ink[300]);
export const tierABCDLabel = (t) => (t && tierABCD[t] ? tierABCD[t].label : '');

// Role chip helpers
export const roleChipHex = (r) => (r && roleChip[r] ? roleChip[r].hex : ink[300]);
export const roleChipLabel = (r) => (r && roleChip[r] ? roleChip[r].label : '');
