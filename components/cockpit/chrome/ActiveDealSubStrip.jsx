import React from 'react';
import { Flame, Clock } from 'lucide-react';
import { brand, tier as TIER, semantic } from '../lib/colors.js';
import { subStripDeals, formatAmount } from '../data/deals.js';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Active Deal sub-strip — PSA-signed deals only.
 * Bay Valley pulses if <7 days to DD end.
 */
export default function ActiveDealSubStrip() {
  const { state } = useDemo();
  const top = 112 + (state.meetingNow !== null ? 50 : 0);
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        height: 32,
        background: '#FFFFFF',
        borderBottom: `1px solid ${semantic.divider}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        zIndex: 38
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 800, color: '#475569', letterSpacing: '0.14em' }}>
        ACTIVE DEALS
      </span>
      <div style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto' }}>
        {subStripDeals.map((d) => {
          const tierHex = TIER[d.tier]?.hex || '#90A4AE';
          return (
            <div
              key={d.id}
              className={d.pulseActive ? 'meeting-pulse' : ''}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#F8FAFC',
                border: `1px solid ${tierHex}55`,
                borderLeft: `4px solid ${tierHex}`,
                borderRadius: 6,
                padding: '2px 10px 2px 8px',
                fontSize: 16,
                fontWeight: 600,
                color: '#1E293B',
                whiteSpace: 'nowrap'
              }}
            >
              {d.pulseActive ? <Flame size={11} color="#D32F2F" strokeWidth={2.6} /> : <Clock size={11} color={tierHex} strokeWidth={2.4} />}
              <span style={{ fontWeight: 700 }}>{d.name}</span>
              <span className="mono" style={{ color: '#475569' }}>{formatAmount(d.amount)}</span>
              <span
                style={{
                  background: tierHex,
                  color: '#FFFFFF',
                  borderRadius: 999,
                  padding: '0 6px',
                  fontSize: 13,
                  fontWeight: 800
                }}
              >
                {d.daysToDdEnd}d
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
