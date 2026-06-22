import React from 'react';
import { warm, ink, tier as TIER } from '../lib/colors.js';
import { bucket } from '../data/tasks.js';

/**
 * Bucket kanban — Today / This Week / Later columns (Doc B Section 7.7).
 */
const cols = [
  { id: 'today', title: 'Today' },
  { id: 'thisWeek', title: 'This Week' },
  { id: 'later', title: 'Later' }
];

export default function BucketWideTab() {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', gap: 12, height: '100%' }}>
      {cols.map((c) => (
        <Column key={c.id} title={c.title} items={bucket[c.id]} />
      ))}
    </div>
  );
}

function Column({ title, items }) {
  return (
    <div
      style={{
        flex: 1,
        background: warm[100],
        border: `1px solid ${warm[600]}`,
        borderRadius: 10,
        padding: '12px 14px',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}
    >
      <div
        style={{
          fontSize: '16px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: ink[500],
          paddingBottom: 6,
          borderBottom: `1px solid ${warm[600]}`
        }}
      >
        {title} · {items.length}
      </div>
      {items.map((it) => (
        <Item key={it.id} item={it} />
      ))}
    </div>
  );
}

function Item({ item }) {
  return (
    <div
      style={{
        background: warm[200],
        border: `1px solid ${warm[700]}`,
        borderLeft: `4px solid ${item.tier ? TIER[item.tier].hex : warm[600]}`,
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: '20px',
        lineHeight: 1.3,
        fontWeight: 700
      }}
    >
      {item.title}
    </div>
  );
}
