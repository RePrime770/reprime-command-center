import React, { useState } from 'react';
import { Star, Phone, MessageCircle, Mail, Linkedin, Video, Users, Search, FileText, Clock } from 'lucide-react';
import { ink, info, tier as TIER, channel as CH, tierABCD as ABCD, roleChip as ROLE, ilTagged as IL, semantic } from '../lib/colors.js';
import DrawerShell from './DrawerShell.jsx';
import TierStripe from '../primitives/TierStripe.jsx';
import ListenButton from '../primitives/ListenButton.jsx';
import { investors } from '../data/investors.js';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Investor Profile drawer — v4 §B7 (4 tabs + magenta + combined reply zone).
 *
 * Header — persistent 180px:
 *   Name · firm · status · ABCD medal · P/C distinction · IL chip (if tagged) · Listen
 *   Action row: Call · WhatsApp · Email · LinkedIn · Schedule Zoom · Schedule Meeting · Run Deep Research
 *
 * Sub-tabs (3 — Conversation dropped; chat lives in the Comms Investor lane now):
 *   RESEARCH — Deep Research 3-bucket synthesis
 *   DETAILS — Pipedrive card + Original_* reference + provenance flags
 *   TIMELINE — il_timeline Hebrew RTL + cross-channel comms + meetings + brainstorm refs (GOLD surface)
 *
 * Faded magenta bg on whole drawer body. NO escape-to-close.
 */

// Mock derive — until master xlsx ingest replaces with real fields (B10)
function deriveABCD(inv) {
  return inv.tierABCD || ({ L7: 'A', L6: 'A', L5: 'B', L4: 'C', L3: 'D', L2: 'D', L1: 'D' }[inv.tier] || 'C');
}
function deriveRole(inv) {
  // Principal vs Connector — mock alternation until master_role_tag arrives
  return inv.role || (inv.deals && inv.deals.length > 0 ? 'principal' : 'connector');
}
function deriveIL(inv) {
  return inv.ilTagged === true; // mock — only flagged when explicitly set on data
}

const SUB_TABS = [
  { id: 'research',     label: 'Research',     stateKey: 'profile-research',     icon: Search },
  { id: 'details',      label: 'Details',      stateKey: 'profile-details',      icon: FileText },
  { id: 'timeline',     label: 'Timeline',     stateKey: 'profile-timeline',     icon: Clock }
];

export default function InvestorProfileDrawer() {
  const { state, set } = useDemo();
  const isOpen = state.investorState?.startsWith('profile-');
  if (!isOpen) return null;

  const inv = investors.find((i) => i.id === state.investorOpenId) || investors[0];
  // Conversation tab was dropped — its chat now lives in the Comms Investor lane.
  // Any stale 'profile-conversation' state falls through to Research.
  const active = state.investorState === 'profile-conversation' ? 'profile-research' : state.investorState;
  const abcd = deriveABCD(inv);
  const role = deriveRole(inv);
  const il = deriveIL(inv);
  const ilTaggedInfo = il ? { owner: inv.ilOwner || 'Monday board', status: inv.ilStatus || 'opt-in confirmed' } : null;
  const investorMagenta = CH.investor.hex;
  const investorFaded = CH.investor.faded;

  return (
    <DrawerShell
      open
      title={inv.name}
      onClose={() => set('investorState', 'grid')}
    >
      {/* Persistent 180px header — faded magenta bg */}
      <div
        style={{
          background: investorFaded,
          borderBottom: `2px solid ${investorMagenta}`,
          padding: '18px 24px',
          minHeight: 180,
          position: 'relative',
          direction: inv.language === 'he' ? 'rtl' : 'ltr',
          textAlign: inv.language === 'he' ? 'right' : 'left'
        }}
        className={inv.language === 'he' ? 'hebrew' : ''}
      >
        <TierStripe tier={inv.tier} width={7} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar slot — color-only per "no avatars" rule, but initials retained for identity */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#FFFFFF',
              border: `3px solid ${investorMagenta}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              color: investorMagenta
            }}
          >
            {inv.avatarInitials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 21, fontWeight: 800, color: ink[700] }}>{inv.name}</div>
            <div style={{ fontSize: 21, color: ink[500], marginTop: 2 }}>
              {inv.firm} · {inv.city}
            </div>

            {/* Badge row — ABCD + P/C + IL chip + tier + status */}
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <ABCDBadge tier={abcd} role={role} />
              {il && <ILChip />}
              {inv.tier && (
                <span
                  style={{
                    background: TIER[inv.tier].hex,
                    color: '#FFFFFF',
                    padding: '3px 9px',
                    borderRadius: 999,
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: '0.06em'
                  }}
                >
                  {inv.tier} · {TIER[inv.tier].label}
                </span>
              )}
              <StatusPill status={inv.status} />
              {inv.observance && (
                <span style={{ fontSize: 16, color: '#7B1FA2', fontWeight: 700, letterSpacing: '0.04em' }}>
                  ✡ {inv.observance}
                </span>
              )}
              <ListenButton compact />
            </div>
          </div>
        </div>

        {/* Action row */}
        <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <ActionBtn color={CH['305-WA'].hex} icon={Phone}>Call</ActionBtn>
          <ActionBtn color={CH['718-WA'].hex} icon={MessageCircle}>WhatsApp</ActionBtn>
          <ActionBtn color={CH.email.hex} icon={Mail}>Email</ActionBtn>
          <ActionBtn color="#0A66C2" icon={Linkedin}>LinkedIn</ActionBtn>
          <ActionBtn color="#2D8CFF" icon={Video}>Schedule Zoom</ActionBtn>
          <ActionBtn color="#00897B" icon={Users}>Schedule Meeting</ActionBtn>
          <ActionBtn color={investorMagenta} icon={Search}>Run Deep Research</ActionBtn>
        </div>

        {/* IL banner — v4 §B32, only when tagged */}
        {ilTaggedInfo && (
          <div
            style={{
              marginTop: 10,
              background: `${IL.hex}11`,
              border: `1px solid ${IL.hex}55`,
              borderLeft: `4px solid ${IL.hex}`,
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 16,
              color: IL.hex,
              fontWeight: 700,
              letterSpacing: '0.04em'
            }}
          >
            Source: Monday.com Israel cohort · owner: {ilTaggedInfo.owner} · status: {ilTaggedInfo.status}
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: 'flex',
          background: '#FFFFFF',
          borderBottom: `1px solid ${semantic.divider}`,
          padding: '6px 16px',
          gap: 4
        }}
      >
        {SUB_TABS.map((s) => {
          const isActive = active === s.stateKey;
          const isTimelineGold = s.id === 'timeline'; // Highlighted as the GOLD surface per handoff §3.11
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => set('investorState', s.stateKey)}
              style={{
                background: isActive ? investorMagenta : 'transparent',
                color: isActive ? '#FFFFFF' : ink[500],
                border: `1px solid ${isActive ? investorMagenta : semantic.divider}`,
                borderBottom: isActive ? `3px solid ${investorMagenta}` : 'none',
                borderRadius: '8px 8px 0 0',
                padding: '8px 14px',
                fontSize: 19,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <s.icon size={12} strokeWidth={2.4} />
              {s.label}
              {isTimelineGold && !isActive && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: '#FFCC33',
                    boxShadow: '0 0 0 2px rgba(255,204,51,0.30)'
                  }}
                  title="Timeline is the GOLD surface — il_timeline Hebrew RTL chronology"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content — faded magenta lightly tinted body */}
      <div style={{ padding: '16px 20px', background: `${investorMagenta}05`, minHeight: 320 }}>
        {active === 'profile-research'  && <Research inv={inv} />}
        {active === 'profile-details'   && <Details inv={inv} />}
        {active === 'profile-timeline'  && <Timeline inv={inv} />}
      </div>
    </DrawerShell>
  );
}

function ABCDBadge({ tier, role }) {
  const m = ABCD[tier] || ABCD.C;
  const isPrincipal = role === 'principal';
  // Principal = filled pill. Connector = outlined ring. Same color, different weight.
  return (
    <span
      title={`${m.read} · ${isPrincipal ? 'Principal' : 'Connector'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: isPrincipal ? m.hex : 'transparent',
        color: isPrincipal ? '#FFFFFF' : m.hex,
        border: `2px solid ${m.hex}`,
        borderRadius: 999,
        padding: '2px 10px',
        fontSize: 16,
        fontWeight: 800,
        letterSpacing: '0.08em'
      }}
    >
      {m.label}
      <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.86 }}>
        · {isPrincipal ? 'P' : 'C'}
      </span>
    </span>
  );
}

function ILChip() {
  return (
    <span
      title={IL.read}
      style={{
        background: IL.hex,
        color: '#FFFFFF',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 14,
        fontWeight: 800,
        letterSpacing: '0.10em'
      }}
    >
      {IL.label}
    </span>
  );
}

function ActionBtn({ color, icon: Icon, children }) {
  return (
    <button
      type="button"
      style={{
        background: color,
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 6,
        padding: '6px 12px',
        fontSize: 18,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        letterSpacing: '0.04em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5
      }}
    >
      {Icon && <Icon size={12} strokeWidth={2.4} />}
      {children}
    </button>
  );
}

function StatusPill({ status }) {
  const map = {
    HOT:  { bg: '#FEE2E2', fg: '#991B1B' },
    WARM: { bg: '#FEF3C7', fg: '#92400E' },
    COLD: { bg: '#E0F2FE', fg: '#075985' }
  };
  const v = map[status] || map.WARM;
  return (
    <span style={{ background: v.bg, color: v.fg, padding: '2px 9px', borderRadius: 999, fontSize: 16, fontWeight: 800, letterSpacing: '0.06em' }}>
      {status}
    </span>
  );
}

// ============================================================
// RESEARCH tab — Deep Research 3-bucket
// ============================================================
function Research({ inv }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
        <span style={{ fontSize: 16, color: ink[500], letterSpacing: '0.06em' }}>
          DEEP RESEARCH · 3-BUCKET
        </span>
        <ListenButton compact />
      </div>
      <Block title="(a) What exists" body={`Public record on ${inv.name} / ${inv.firm}. Mock until Deep Research runs.`} />
      <Block title="(b) What we plug in" body="Connective brain: cross-referenced anchor memories from CRE relationships, prior co-investments, family-office network." />
      <Block title="(c) What we build" body="Suggested moves: tailored to current deal context. Nora drafts the next message based on synthesis." />
    </div>
  );
}

// ============================================================
// DETAILS tab — Pipedrive card + Original_* + provenance
// ============================================================
function Details({ inv }) {
  // Mock provenance (B34) — collapsed by default
  const [provOpen, setProvOpen] = useState(false);
  const flags = [
    { k: 'source_count',         val: inv.source_count || 2, present: true },
    { k: 'all_name_variants',    val: inv.all_name_variants || `${inv.name}`, present: true },
    { k: 'Notes_Consolidated',   val: inv.notes?.length || 0, present: (inv.notes?.length || 0) > 0 },
    { k: 'last_audit_stamp',     val: inv.lastAudit || '—', present: !!inv.lastAudit },
    { k: 'sync_conflict_pending', val: inv.syncConflict || false, present: false }
  ];
  const presentCount = flags.filter((f) => f.present).length;
  return (
    <div>
      <Block title="Firm" body={`${inv.firm} · ${inv.city}`} />
      <Block title="Primary channel" body={CH[inv.primaryChannel]?.label || inv.primaryChannel} />
      <Block title="Language" body={inv.language} />
      <Block title="All notes" body={inv.notes && inv.notes.length ? inv.notes.join(' | ') : '—'} />
      <Block title="Observance" body={inv.observance || '—'} />
      <Block title="Active deals" body={inv.deals?.length ? inv.deals.join(', ') : '—'} />

      {/* Provenance footer (B34) — collapsible */}
      <div
        style={{
          marginTop: 12,
          background: '#FFFFFF',
          border: `1px solid ${semantic.divider}`,
          borderRadius: 8,
          padding: '8px 12px'
        }}
      >
        <button
          type="button"
          onClick={() => setProvOpen(!provOpen)}
          style={{
            background: 'transparent',
            border: 'none',
            color: ink[500],
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '0.12em',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          Data sources: {presentCount} of {flags.length} {provOpen ? '▴' : '▾'}
        </button>
        {provOpen && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {flags.map((f) => (
              <span
                key={f.k}
                style={{
                  background: f.present ? '#D1FAE5' : '#F1F5F9',
                  color: f.present ? '#065F46' : ink[300],
                  border: `1px solid ${f.present ? '#10B981' : semantic.divider}`,
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.06em'
                }}
              >
                {f.k} {f.present && typeof f.val === 'string' ? `· ${f.val}` : f.present && typeof f.val === 'number' ? `· ${f.val}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TIMELINE tab — GOLD surface. il_timeline Hebrew RTL + cross-channel comms.
// ============================================================
function Timeline({ inv }) {
  // Mock chronological entries — replace with il_timeline ingest when master xlsx wires up (B10/Phase 5 backend)
  const entries = inv.il_timeline || [
    { date: '2026-05-11', type: 'comm', body: inv.snippet || 'Latest channel touch', channel: inv.primaryChannel, hebrew: inv.language === 'he' },
    { date: '2026-05-10', type: 'meeting', body: 'Zoom call · 47 min · Bay Valley counter discussion', channel: null, hebrew: false },
    { date: '2026-05-08', type: 'brainstorm', body: 'Nora brainstorm cycle: positioning for retrade leverage', channel: null, hebrew: false },
    { date: '2026-04-22', type: 'comm', body: 'Reply to NPL package send-out', channel: 'email', hebrew: false }
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Clock size={14} strokeWidth={2.4} color="#EAB308" />
        <span style={{ fontSize: 16, fontWeight: 800, color: ink[500], letterSpacing: '0.14em' }}>
          TIMELINE · IL TIMELINE + ALL CHANNELS + MEETINGS + BRAINSTORM
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#EAB308', letterSpacing: '0.10em', marginLeft: 'auto' }}>
          GOLD
        </span>
        <ListenButton compact />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map((e, i) => {
          const ch = e.channel ? CH[e.channel] : null;
          const typeColor = { comm: ch?.hex || ink[500], meeting: '#0D9488', brainstorm: '#7B1FA2' }[e.type] || ink[500];
          return (
            <div
              key={i}
              className={e.hebrew ? 'hebrew' : ''}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${semantic.divider}`,
                borderLeft: `4px solid ${typeColor}`,
                borderRadius: 6,
                padding: '8px 12px',
                direction: e.hebrew ? 'rtl' : 'ltr',
                textAlign: e.hebrew ? 'right' : 'left'
              }}
            >
              <div style={{ fontSize: 13, color: ink[300], fontWeight: 800, letterSpacing: '0.10em', marginBottom: 2 }}>
                {e.date} · {e.type.toUpperCase()}{ch ? ` · ${ch.label}` : ''}
              </div>
              <div style={{ fontSize: 18, lineHeight: 1.45, color: ink[700] }}>
                {e.body}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Block({ title, body, hebrew }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${semantic.divider}`,
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 8,
        direction: hebrew ? 'rtl' : 'ltr',
        textAlign: hebrew ? 'right' : 'left'
      }}
      className={hebrew ? 'hebrew' : ''}
    >
      <div style={{ fontSize: 14, color: ink[500], letterSpacing: '0.12em', marginBottom: 4, fontWeight: 800 }}>
        {title.toUpperCase()}
      </div>
      <div style={{ fontSize: 19, lineHeight: 1.45, color: ink[700] }}>{body}</div>
    </div>
  );
}
