import React from 'react';
import { warm, ink, info } from '../lib/colors.js';
import EmailWideTab from './EmailWideTab.jsx';
import DelegatedTasksWideTab from './DelegatedTasksWideTab.jsx';
import BucketWideTab from './BucketWideTab.jsx';
import ActiveDealsWideTab from './ActiveDealsWideTab.jsx';
import InvestorsWideTab from './InvestorsWideTab.jsx';
import NotesWideTab from './NotesWideTab.jsx';
import PinnedWideTab from './PinnedWideTab.jsx';
import DocumentsWideTab from './DocumentsWideTab.jsx';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * Wide-tab strip — 4th column at ~1060px wide.
 * Smart Rotation container + 8 tabs + rationale strip.
 */
const tabs = [
  { id: 'email',     label: 'Email',     Component: EmailWideTab },
  { id: 'delegated', label: 'Delegated', Component: DelegatedTasksWideTab },
  { id: 'bucket',    label: 'Bucket',    Component: BucketWideTab },
  { id: 'deals',     label: 'Deals',     Component: ActiveDealsWideTab },
  { id: 'investors', label: 'Investors', Component: InvestorsWideTab },
  { id: 'notes',     label: 'Notes',     Component: NotesWideTab },
  { id: 'pinned',    label: 'Pinned',    Component: PinnedWideTab },
  { id: 'documents', label: 'Docs',      Component: DocumentsWideTab }
];

export default function WideTabStrip({ width, height }) {
  const { state, set } = useDemo();
  const active = state.activeWideTab || 'email';
  const ActiveCmp = tabs.find((t) => t.id === active)?.Component || EmailWideTab;

  return (
    <div
      style={{
        width,
        height,
        background: warm[300],
        border: `2px solid ${ink[700]}`,
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Tab strip */}
      <div
        style={{
          display: 'flex',
          background: warm[200],
          borderBottom: `2px solid ${ink[700]}`,
          padding: '10px 14px',
          gap: 6
        }}
      >
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => set('activeWideTab', t.id)}
              style={{
                background: isActive ? warm[50] : warm[100],
                color: ink[700],
                border: `2px solid ${ink[700]}`,
                borderBottom: isActive ? `4px solid ${info[500]}` : `2px solid ${ink[700]}`,
                boxShadow: isActive ? `0 0 0 3px ${info[500]}33` : 'none',
                borderRadius: '8px 8px 0 0',
                padding: '10px 22px',
                fontSize: '18px',
                fontWeight: 800,
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Rationale strip — Smart Rotation explanation */}
      {state.wideTabState === 'smart-rotation' && (
        <div
          style={{
            background: warm[50],
            padding: '10px 18px',
            borderBottom: `1px solid ${warm[600]}`,
            fontSize: '14.66px',
            color: ink[500],
            letterSpacing: '0.04em'
          }}
        >
          NORA · {active.toUpperCase()} surfaced because Bay Valley counter-LOI ↑ priority.
          <button
            type="button"
            style={{
              marginLeft: 12,
              background: warm[100],
              border: `1px solid ${warm[700]}`,
              borderRadius: 6,
              padding: '2px 10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: ink[700]
            }}
          >
            Keep this on
          </button>
          <button
            type="button"
            style={{
              marginLeft: 6,
              background: 'transparent',
              border: `1px solid ${warm[600]}`,
              borderRadius: 6,
              padding: '2px 10px',
              fontSize: '12px',
              fontFamily: 'inherit',
              color: ink[500],
              cursor: 'pointer'
            }}
          >
            Snooze
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ActiveCmp />
      </div>
    </div>
  );
}
