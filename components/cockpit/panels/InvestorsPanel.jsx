import React, { useState } from 'react';
import { Star, Phone, MessageCircle, Mail, ArrowUpDown } from 'lucide-react';
import { ink, tier as TIER, channel as CH, semantic, tierABCD as ABCD, ilTagged as IL } from '../lib/colors.js';
import { investors } from '../data/investors.js';
import { threads } from '../data/threads.js';
import { fmtRelative } from '../lib/format.js';
import { useDemo } from '../demo/DemoContext.jsx';
import PanelShell from './PanelShell.jsx';

// v4 §B28/B29/B32 — derive ABCD + P/C + IL until master xlsx ingest (B10) replaces these mocks.
function deriveABCD(inv) {
  return inv.tierABCD || ({ L7: 'A', L6: 'A', L5: 'B', L4: 'C', L3: 'D', L2: 'D', L1: 'D' }[inv.tier] || 'C');
}
function deriveRole(inv) {
  return inv.role || (inv.deals && inv.deals.length > 0 ? 'principal' : 'connector');
}

const STATUS_COLORS = {
  HOT:  { bg: '#FFEBEE', fg: '#C62828' },
  WARM: { bg: '#FFF8E1', fg: '#E65100' },
  COLD: { bg: '#E3F2FD', fg: '#1565C0' }
};

const SORT_OPTIONS = [
  { id: 'hot',        label: 'HOT first' },
  { id: 'cadence',    label: 'Cadence' },
  { id: 'observance', label: 'Observance' },
  { id: 'deal',       label: 'By deal' }
];

const CADENCE_OVERDUE_DAYS = 14;
const MS_PER_DAY = 86400000;

function getLastContactAt(inv) {
  return inv.lastContactAt || inv.lastContact || inv.last_message_at || inv.last_email_at || null;
}

function daysSinceLastContact(inv, now = Date.now()) {
  const ts = getLastContactAt(inv);
  if (!ts) return null;
  const t = new Date(ts).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now - t) / MS_PER_DAY);
}

// Sort key: overdue rows (no contact OR > threshold) bubble up; otherwise oldest contact first.
function overdueSortKey(inv) {
  const days = daysSinceLastContact(inv);
  if (days === null) return -Infinity; // no contact → very top
  if (days > CADENCE_OVERDUE_DAYS) return -days; // older overdue → higher
  return 1; // not overdue → bottom group
}

const sortFn = {
  hot: (a, b) => {
    const sa = overdueSortKey(a);
    const sb = overdueSortKey(b);
    if (sa !== sb) return sa - sb;
    return ({ HOT: 0, WARM: 1, COLD: 2 }[a.status] ?? 9) - ({ HOT: 0, WARM: 1, COLD: 2 }[b.status] ?? 9);
  },
  cadence: (a, b) => new Date(b.lastContact) - new Date(a.lastContact),
  observance: (a, b) => (b.observance ? 1 : 0) - (a.observance ? 1 : 0),
  deal: (a, b) => b.deals.length - a.deals.length
};

export default function InvestorsPanel({ width }) {
  const [sort, setSort] = useState('hot');
  const sorted = [...investors].sort(sortFn[sort]);
  const hot = sorted.filter((i) => i.status === 'HOT').length;
  const magenta = CH.investor.hex;
  return (
    <PanelShell width={width} accent={magenta} title="INVESTORS" subtitle={`${investors.length} TOTAL · ${hot} HOT`}>
      {/* Sort toggle row */}
      <div
        style={{
          padding: '5px 6px',
          background: '#FFFFFF',
          borderBottom: `1px solid ${semantic.divider}`,
          display: 'flex',
          gap: 3,
          flexShrink: 0,
          alignItems: 'center'
        }}
      >
        <ArrowUpDown size={15} strokeWidth={2.4} color={magenta} style={{ marginLeft: 4 }} />
        {SORT_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSort(o.id)}
            style={{
              flex: 1,
              padding: '8px 10px',
              background: sort === o.id ? magenta : 'transparent',
              color: sort === o.id ? '#FFFFFF' : ink[500],
              border: `1px solid ${sort === o.id ? magenta : 'rgba(15,23,42,0.12)'}`,
              borderRadius: 7,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              transition: 'all 0.12s ease'
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 6, background: CH.investor.faded }}>
        {sorted.map((inv) => <Row key={inv.id} inv={inv} />)}
      </div>
    </PanelShell>
  );
}

function CadenceBadge({ inv }) {
  const days = daysSinceLastContact(inv);
  if (days === null) {
    return (
      <span
        title="No last-contact timestamp on record"
        style={{
          background: '#FFF3E0',
          color: '#E65100',
          borderRadius: 999,
          padding: '0 6px',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.04em',
          flexShrink: 0
        }}
      >
        No contact on record
      </span>
    );
  }
  if (days > CADENCE_OVERDUE_DAYS) {
    return (
      <span
        title={`Overdue cadence: ${days} days since last contact (threshold ${CADENCE_OVERDUE_DAYS}d)`}
        style={{
          background: '#FFEBEE',
          color: '#C62828',
          borderRadius: 999,
          padding: '0 6px',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.04em',
          flexShrink: 0
        }}
      >
        Overdue · {days} days
      </span>
    );
  }
  return null;
}

function Row({ inv }) {
  const { set } = useDemo();
  const isHe = inv.language === 'he';
  const tierHex = inv.tier ? TIER[inv.tier]?.hex : null;
  const status = STATUS_COLORS[inv.status];
  const ch = CH[inv.primaryChannel];
  const magenta = CH.investor.hex;
  const abcd = deriveABCD(inv);
  const abcdMeta = ABCD[abcd] || ABCD.C;
  const role = deriveRole(inv);
  const isPrincipal = role === 'principal';
  const il = inv.ilTagged === true;

  // Row click → opens CHAT (find thread for this contact) — investor_panel_chat_first.md
  const openChat = () => {
    const thread = threads.find((t) => t.contactId === inv.id);
    if (thread) set('openInvestorChat', thread.id);
    else set('openInvestorChat', `no-thread:${inv.id}`);
  };

  // ★ Open Profile is the ONLY way to surface profile drawer
  const openProfile = (e) => {
    e.stopPropagation();
    set('investorOpenId', inv.id);
    set('investorState', 'profile-conversation');
  };

  // Quick-action handlers — wire stubs to real flows.
  const openWhatsApp = (e) => {
    e.stopPropagation();
    const thread = threads.find((t) => t.contactId === inv.id);
    if (thread) {
      set('openInvestorChat', thread.id);
    } else {
      // Fall back to comms-by-contact event so the Comms hub can spin a new thread.
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(
          new CustomEvent('comms:openByContact', {
            detail: { contactName: inv.name, phone: inv.phone, channel: 'whatsapp' }
          })
        );
      }
    }
  };

  const openEmail = (e) => {
    e.stopPropagation();
    // Use existing EmailPanel compose trigger (state.emailComposeOpen) for reliable wiring.
    set('emailComposeTo', inv.email || '');
    set('emailComposeOpen', true);
    // Also dispatch a custom event for any external listener that wants the full payload.
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent('email:compose', { detail: { to: inv.email, subject: '' } })
      );
    }
  };

  return (
    <div
      onClick={openChat}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: `1px solid ${semantic.divider}`,
        borderRadius: 8,
        padding: '7px 10px 7px 16px',
        marginBottom: 4,
        cursor: 'pointer',
        direction: isHe ? 'rtl' : 'ltr',
        textAlign: isHe ? 'right' : 'left',
        fontFamily: 'inherit'
      }}
    >
      {tierHex && <span className="tier-stripe" style={{ background: tierHex, width: 7 }} />}

      {/* Row top: channel dot · name · ABCD+P/C medal · IL chip · status pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: ch?.hex || '#90A4AE', flexShrink: 0 }} />
        <span
          style={{
            fontSize: 18, fontWeight: 800, color: ink[700],
            flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}
        >
          <Star size={10} fill={magenta} stroke={magenta} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
          {inv.name}
        </span>

        {/* ABCD medal (B28) + P/C (B29) — fixed-position slot per handoff §3.15 */}
        <span
          title={`${abcdMeta.read} · ${isPrincipal ? 'Principal' : 'Connector'}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            background: isPrincipal ? abcdMeta.hex : 'transparent',
            color: isPrincipal ? '#FFFFFF' : abcdMeta.hex,
            border: `2px solid ${abcdMeta.hex}`,
            borderRadius: 999,
            padding: '0 7px',
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '0.06em',
            flexShrink: 0,
            lineHeight: 1.4
          }}
        >
          {abcdMeta.label}
          <span style={{ fontSize: 8, fontWeight: 700, opacity: 0.86 }}>· {isPrincipal ? 'P' : 'C'}</span>
        </span>

        {il && (
          <span
            title={IL.read}
            style={{
              background: IL.hex,
              color: '#FFFFFF',
              padding: '0 6px',
              borderRadius: 3,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.10em',
              flexShrink: 0
            }}
          >
            {IL.label}
          </span>
        )}

        <span
          style={{
            background: status.bg,
            color: status.fg,
            borderRadius: 999,
            padding: '0 6px',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.06em',
            flexShrink: 0
          }}
        >
          {inv.status}
        </span>

        <CadenceBadge inv={inv} />
      </div>

      <div style={{ fontSize: 14, color: ink[500] }}>
        {inv.firm} · {inv.city}
        <span style={{ marginLeft: 6, color: magenta, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }} title="Synced via Pipedrive">
          ⊕ Pipedrive
        </span>
      </div>
      <div className={isHe ? 'hebrew' : ''} style={{ fontSize: 16, color: ink[700], marginTop: 3, lineHeight: 1.35 }}>
        "{inv.snippet}"
      </div>
      <div style={{ fontSize: 13, color: ink[300], marginTop: 3, letterSpacing: '0.04em' }}>
        last {fmtRelative(inv.lastContact)}
        {inv.observance && <span style={{ marginLeft: 6, color: '#7B1FA2', fontWeight: 700 }}>· {inv.observance}</span>}
      </div>

      {/* Action chips */}
      <div style={{ marginTop: 6, display: 'flex', gap: 3 }}>
        <ActionChip
          color="#1E88E5"
          icon={Phone}
          disabled
          title="Call dispatch coming next pass"
          onClick={(e) => { e.stopPropagation(); }}
        >
          Call
        </ActionChip>
        <ActionChip color={CH['305-WA'].hex} icon={MessageCircle} onClick={openWhatsApp}>WA</ActionChip>
        <ActionChip color={CH.email.hex} icon={Mail} onClick={openEmail}>Email</ActionChip>
        <button
          type="button"
          onClick={openProfile}
          style={{
            flex: 1,
            background: magenta,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            padding: '9px 14px',
            fontSize: 16,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.12s ease',
            boxShadow: '0 1px 2px rgba(15,23,42,0.06)'
          }}
        >
          <Star size={15} fill="#FFFFFF" stroke="#FFFFFF" />
          Open Profile
        </button>
      </div>
    </div>
  );
}

function ActionChip({ color, icon: Icon, onClick, children, disabled = false, title }) {
  return (
    <button
      type="button"
      onClick={disabled ? (e) => e.stopPropagation() : onClick}
      disabled={disabled}
      title={title}
      aria-disabled={disabled || undefined}
      style={{
        flex: 1,
        background: '#FFFFFF',
        color,
        border: `1px solid ${color}55`,
        borderRadius: 8,
        padding: '9px 12px',
        fontSize: 15,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'all 0.12s ease'
      }}
    >
      <Icon size={15} strokeWidth={2.4} />
      {children}
    </button>
  );
}
