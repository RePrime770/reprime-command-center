import React from 'react';
import { warm, ink, info, tier as TIER } from '../lib/colors.js';
import { deals, loiOutstanding, formatAmount, stages } from '../data/deals.js';
import TierStripe from '../primitives/TierStripe.jsx';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Active Deals wide-tab. Card grid by default. LOI Outstanding filter view via demo state.
 */
export default function ActiveDealsWideTab() {
  const { state } = useDemo();
  const list = state.dealView === 'loi-outstanding' ? loiOutstanding : deals;

  if (state.dealView === 'expanded') {
    return <ExpandedView deal={deals.find((d) => d.leftmost) || deals[0]} />;
  }

  return (
    <div style={{ padding: '14px 16px' }}>
      {state.dealView === 'loi-outstanding' && (
        <div
          style={{
            background: warm[100],
            border: `1px solid ${warm[700]}`,
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: '18.66px',
            fontWeight: 700,
            color: info[500],
            marginBottom: 12
          }}
        >
          LOI Outstanding — {list.length} deals · Stage 3
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12
        }}
      >
        {list.map((d) => (
          <Card key={d.id} deal={d} />
        ))}
      </div>
    </div>
  );
}

function Card({ deal }) {
  return (
    <div
      style={{
        position: 'relative',
        background: warm[200],
        border: `1px solid ${warm[700]}`,
        borderRadius: 12,
        padding: deal.tier ? '14px 18px 14px 22px' : '14px 18px'
      }}
    >
      <TierStripe tier={deal.tier} width={4} />
      <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3 }}>{deal.name}</div>
      <div style={{ fontSize: '18.66px', color: ink[500], marginTop: 4 }}>
        {formatAmount(deal.amount)} · {deal.type}
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Chip>
          Stage {deal.stage} · {deal.stageLabel}
        </Chip>
        {deal.daysToDdEnd !== null && <Chip>{deal.daysToDdEnd}d to DD end</Chip>}
        {deal.psaSigned && <Chip variant="success">PSA</Chip>}
        {deal.counterLoi && <Chip variant="danger">Counter-LOI</Chip>}
      </div>
    </div>
  );
}

function Chip({ children, variant = 'neutral' }) {
  const bg = variant === 'success' ? '#E0F0E8' : variant === 'danger' ? '#F2E0E0' : warm[100];
  const fg = variant === 'success' ? '#154E36' : variant === 'danger' ? '#5C1414' : ink[500];
  return (
    <span
      style={{
        background: bg,
        color: fg,
        padding: '4px 10px',
        borderRadius: 9999,
        fontSize: '14.66px',
        fontWeight: 700,
        letterSpacing: '0.04em'
      }}
    >
      {children}
    </span>
  );
}

function ExpandedView({ deal }) {
  return (
    <div style={{ padding: '18px 22px' }}>
      <div style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1.2 }}>{deal.name}</div>
      <div style={{ fontSize: '22px', color: ink[500], marginTop: 6 }}>
        {formatAmount(deal.amount)} · {deal.type}
      </div>
      <div style={{ marginTop: 18, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <Block title="Stage" value={`${deal.stage} · ${deal.stageLabel}`} />
        <Block title="Tier" value={deal.tier ? `${deal.tier} · ${TIER[deal.tier].label}` : 'untagged'} />
        <Block title="DD remaining" value={deal.daysToDdEnd !== null ? `${deal.daysToDdEnd} days` : '—'} />
        <Block title="Extensions" value={`${deal.extensionsUsed} / ${deal.extensionsAvailable ?? '—'}`} />
      </div>
      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: '16px', color: ink[500], letterSpacing: '0.06em', marginBottom: 8 }}>
          8-STAGE LIFECYCLE
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {stages.map((s) => (
            <span
              key={s.num}
              style={{
                flex: 1,
                background: s.num <= deal.stage ? info[500] : warm[100],
                color: s.num <= deal.stage ? '#FCF6EA' : ink[500],
                padding: '8px 6px',
                fontSize: '13.33px',
                fontWeight: 700,
                textAlign: 'center',
                borderRadius: 4,
                letterSpacing: '0.04em'
              }}
            >
              {s.num} · {s.label}
            </span>
          ))}
        </div>
      </div>
      {deal.counterLoi && (
        <div
          style={{
            marginTop: 22,
            background: '#F2E0E0',
            border: '1px solid #7F1D1D',
            borderLeft: '5px solid #7F1D1D',
            borderRadius: 10,
            padding: '14px 18px'
          }}
        >
          <div style={{ fontSize: '16px', color: '#5C1414', fontWeight: 700, letterSpacing: '0.05em' }}>
            COUNTER-LOI RECEIVED
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: 4 }}>
            From Doron Sagiv · 30-day DD extension requested
          </div>
        </div>
      )}
    </div>
  );
}

function Block({ title, value }) {
  return (
    <div>
      <div style={{ fontSize: '14.66px', color: ink[500], letterSpacing: '0.05em' }}>{title}</div>
      <div style={{ fontSize: '22px', fontWeight: 700 }}>{value}</div>
    </div>
  );
}
