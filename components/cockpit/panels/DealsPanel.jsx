import React from 'react';
import { Clock, Flame, FileText } from 'lucide-react';
import { ink, tier as TIER, semantic } from '../lib/colors.js';
import { deals, formatAmount } from '../data/deals.js';
import { ListenButton } from '../lib/voice.jsx';
import PanelShell from './PanelShell.jsx';

/**
 * Active Deals panel — NON-PSA only per dispatch B4.
 * PSA-signed deals are surfaced in the top-chrome sub-strip (Row 2).
 * This panel shows pre-PSA stages only — Sourced / Underwriting / LOI Out / Negotiating.
 */
export default function DealsPanel({ width }) {
  const nonPsa = deals.filter((d) => !d.psaSigned);
  const sorted = [...nonPsa].sort((a, b) => {
    const order = { L7: 0, L6: 1, L5: 2, L4: 3, L3: 4, L2: 5, L1: 6 };
    return (order[a.tier] ?? 99) - (order[b.tier] ?? 99);
  });
  const loiOut = sorted.filter((d) => d.stageLabel === 'LOI Out').length;
  return (
    <PanelShell
      width={width}
      accent="#43A047"
      title="ACTIVE DEALS"
      subtitle={`PRE-PSA · ${sorted.length} ACTIVE · ${loiOut} LOI OUT`}
    >
      <div
        style={{
          padding: '5px 10px',
          background: '#E8F5E9',
          fontSize: 13,
          fontWeight: 700,
          color: '#1B5E20',
          letterSpacing: '0.08em',
          flexShrink: 0,
          borderBottom: `1px solid ${semantic.divider}`
        }}
      >
        PSA-SIGNED DEALS LIVE IN TOP CHROME SUB-STRIP ↑
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
        {sorted.map((d) => <DealRow key={d.id} deal={d} />)}
      </div>
    </PanelShell>
  );
}

function DealRow({ deal }) {
  const tierHex = deal.tier ? TIER[deal.tier]?.hex : '#90A4AE';
  return (
    <div
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: `1px solid ${tierHex}33`,
        borderRadius: 8,
        padding: '8px 10px 8px 16px',
        marginBottom: 4,
        cursor: 'pointer'
      }}
    >
      <span className="tier-stripe" style={{ background: tierHex, width: 7 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 19, fontWeight: 800, color: ink[700] }}>{deal.name}</span>
            {deal.stageLabel === 'LOI Out' && (
              <span
                style={{
                  background: '#FFCC33',
                  color: '#0E3470',
                  borderRadius: 4,
                  padding: '0 6px',
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3
                }}
              >
                <FileText size={9} strokeWidth={2.4} />
                LOI OUT
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, color: ink[300], marginTop: 2 }}>
            {deal.type} · {deal.broker || (deal.investorIds.length ? `${deal.investorIds.length} investor${deal.investorIds.length > 1 ? 's' : ''}` : 'unassigned')}
          </div>
          <div style={{ fontSize: 14, color: tierHex, fontWeight: 700, marginTop: 2, letterSpacing: '0.06em' }}>
            {deal.stageLabel.toUpperCase()} · {TIER[deal.tier]?.label}
          </div>
          {deal.notes && (
            <div style={{ fontSize: 14, color: ink[500], marginTop: 3, fontStyle: 'normal' }}>
              · {deal.notes}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="mono" style={{ fontSize: 21, fontWeight: 800, color: ink[900] }}>
            {formatAmount(deal.amount)}
          </div>
          {deal.daysToDdEnd != null && (
            <div
              style={{
                marginTop: 4,
                background: tierHex,
                color: '#FFFFFF',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 14,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Clock size={10} strokeWidth={2.4} />
              {deal.daysToDdEnd}d
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
        <ListenButton compact />
      </div>
    </div>
  );
}
