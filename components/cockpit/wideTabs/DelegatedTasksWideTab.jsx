import React from 'react';
import { warm, ink, info, tier as TIER } from '../lib/colors.js';
import { delegated } from '../data/tasks.js';

/**
 * Delegated Tasks — L1-L7 balloons (Doc B Section 7.8).
 * Each row shows assignee + due + status. Tier as balloon next to title.
 */
export default function DelegatedTasksWideTab() {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {delegated.map((t) => (
        <Row key={t.id} task={t} />
      ))}
    </div>
  );
}

function Row({ task }) {
  const bg = task.status === 'overdue' ? warm[100] : warm[200];
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${warm[700]}`,
        borderRadius: 10,
        padding: '14px 20px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {task.tier && (
          <span
            style={{
              background: TIER[task.tier].hex,
              color: '#FCF6EA',
              padding: '4px 12px',
              borderRadius: 9999,
              fontSize: '14.66px',
              fontWeight: 800,
              minWidth: 56,
              textAlign: 'center'
            }}
          >
            {task.tier}
          </span>
        )}
        <span style={{ fontSize: '22px', fontWeight: 700, flex: 1 }}>{task.title}</span>
        {task.status === 'overdue' && (
          <span
            style={{
              fontSize: '14.66px',
              color: '#7F1D1D',
              fontWeight: 700,
              letterSpacing: '0.06em'
            }}
          >
            OVERDUE
          </span>
        )}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: '16px',
          color: ink[500],
          display: 'flex',
          gap: 16
        }}
      >
        <span>→ {task.assignee}</span>
        <span>· due {task.due}</span>
        <span>· {task.status}</span>
      </div>
    </div>
  );
}
