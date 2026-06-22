import React, { useState } from 'react';
import { Snowflake, Check, ChevronDown, ChevronRight, Plus, Mic } from 'lucide-react';
import { ink, tier as TIER, semantic, brand } from '../lib/colors.js';
import { bucket } from '../data/tasks.js';
import PanelShell from './PanelShell.jsx';

/**
 * Bucket panel — A-NEW-3.
 * Tabs: Active | Waiting
 *
 * Active tab (vertical accordion):
 *   TODAY     (always expanded, biggest weight)
 *   THIS WEEK (collapsed header, click to expand)
 *   DONE      (collapsed header at bottom, click to expand)
 *
 * Waiting tab — dedicated full list.
 */

// Mock waiting items — things blocked on others
const WAITING_ITEMS = [
  { id: 'wait-001', tier: 'L7', title: 'Bay Valley DD environmental Phase-I — vendor', who: 'EnviroPro', since: '2d' },
  { id: 'wait-002', tier: 'L6', title: 'Service FCU wire confirmation', who: 'Bruce Smoler', since: '4h' },
  { id: 'wait-003', tier: 'L5', title: 'Watermills appraisal — bank-side', who: 'Service FCU credit', since: '6d' },
  { id: 'wait-004', tier: 'L5', title: '500 West Monroe OSINT result', who: 'C2 / Yaron Sitbon', since: '1d' },
  { id: 'wait-005', tier: 'L4', title: 'IGA Houchens guarantee review', who: 'In-house legal', since: '3d' },
  { id: 'wait-006', tier: 'L4', title: 'Pipedrive cleanup → re-pull list', who: 'Adir Yonasi', since: '2d', overdue: true },
  { id: 'wait-007', tier: null, title: 'Knox tax cert response', who: 'Knox County', since: '8d' },
  { id: 'wait-008', tier: null, title: 'Neil Bane Q3 capital meeting slot', who: 'Neil Bane', since: '5d' },
  { id: 'wait-009', tier: null, title: 'Amir Shenkman returns deck review', who: 'Amir Shenkman', since: '12h' }
];

export default function BucketPanel({ width }) {
  const [tab, setTab] = useState('active');
  return (
    <PanelShell width={width} accent="#43A047" title="BUCKET" subtitle="ACTIVE · WAITING">
      <Tabs tab={tab} setTab={setTab} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 6, background: '#F1F8E9' }}>
        {tab === 'active' ? <ActiveAccordion /> : <WaitingList />}
      </div>
      <QuickAdd />
    </PanelShell>
  );
}

function Tabs({ tab, setTab }) {
  return (
    <div
      style={{
        display: 'flex',
        background: '#FFFFFF',
        borderBottom: `1px solid ${semantic.divider}`,
        flexShrink: 0
      }}
    >
      {[
        { id: 'active',  label: 'Active',  color: '#43A047', count: bucket.today.length + bucket.thisWeek.length + bucket.later.length },
        { id: 'waiting', label: 'Waiting', color: '#FB8C00', count: WAITING_ITEMS.length }
      ].map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: active ? t.color : 'transparent',
              color: active ? '#FFFFFF' : ink[500],
              border: 'none',
              borderBottom: active ? `3px solid ${t.color}` : '3px solid transparent',
              fontSize: 18,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.06em',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            {t.label}
            <span
              style={{
                background: active ? '#FFFFFF' : t.color,
                color: active ? t.color : '#FFFFFF',
                borderRadius: 999,
                padding: '0 6px',
                fontSize: 14,
                fontWeight: 800
              }}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ActiveAccordion() {
  const [thisWeekOpen, setThisWeekOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);

  return (
    <>
      {/* TODAY — always expanded, primary visual weight */}
      <AccordionSection
        title="TODAY"
        accent="#1B5E20"
        count={bucket.today.length}
        items={bucket.today}
        expanded
        primary
      />

      {/* THIS WEEK — collapsed by default */}
      <AccordionSection
        title="THIS WEEK"
        accent="#2E7D32"
        count={bucket.thisWeek.length}
        items={bucket.thisWeek}
        expanded={thisWeekOpen}
        toggle={() => setThisWeekOpen((o) => !o)}
      />

      {/* DONE — collapsed by default, at bottom */}
      <AccordionSection
        title="DONE"
        accent="#90A4AE"
        count={bucket.later.length}
        items={bucket.later}
        expanded={doneOpen}
        toggle={() => setDoneOpen((o) => !o)}
        muted
      />
    </>
  );
}

function AccordionSection({ title, accent, count, items, expanded, toggle, primary, muted }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${semantic.divider}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 8,
        marginBottom: 6,
        overflow: 'hidden'
      }}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={!toggle}
        style={{
          width: '100%',
          padding: primary ? '8px 12px' : '6px 12px',
          background: primary ? '#E8F5E9' : 'transparent',
          color: accent,
          border: 'none',
          borderBottom: expanded ? `1px solid ${semantic.divider}` : 'none',
          cursor: toggle ? 'pointer' : 'default',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          textAlign: 'left'
        }}
      >
        {toggle && (expanded ? <ChevronDown size={13} strokeWidth={2.6} /> : <ChevronRight size={13} strokeWidth={2.6} />)}
        <span style={{ fontSize: primary ? 12 : 11, fontWeight: 800, letterSpacing: '0.12em', flex: 1 }}>
          {title}
        </span>
        <span
          style={{
            background: '#FFFFFF',
            color: accent,
            borderRadius: 999,
            padding: '0 7px',
            fontSize: 14,
            fontWeight: 800,
            border: `1px solid ${accent}33`
          }}
        >
          {count}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '4px 6px' }}>
          {items.map((it) => (
            <Card key={it.id} item={it} accent={accent} muted={muted} />
          ))}
          {items.length === 0 && (
            <div style={{ fontSize: 16, color: ink[300], padding: '8px 4px', fontStyle: 'normal' }}>
              No work waiting.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Card({ item, accent, muted }) {
  const tierHex = item.tier ? TIER[item.tier]?.hex : null;
  return (
    <div
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: `1px solid ${semantic.divider}`,
        borderRadius: 6,
        padding: '5px 6px 5px 12px',
        marginBottom: 3,
        opacity: muted ? 0.75 : 1
      }}
    >
      {tierHex && <span className="tier-stripe" style={{ background: tierHex, width: 6 }} />}
      <div style={{ fontSize: 16, color: ink[700], lineHeight: 1.35 }}>{item.title}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 3, marginTop: 4 }}>
        <button
          type="button"
          title="Snooze"
          style={iconBtn('#FFF59D')}
        >
          <Snowflake size={10} strokeWidth={2.4} color="#F57F17" />
        </button>
        <button
          type="button"
          title="Done"
          style={iconBtn('#C5E1A5')}
        >
          <Check size={11} strokeWidth={2.6} color="#33691E" />
        </button>
      </div>
    </div>
  );
}

function WaitingList() {
  return (
    <>
      <div
        style={{
          padding: '6px 8px',
          background: '#FFF8E1',
          border: `1px solid #FFE082`,
          borderLeft: `4px solid #FB8C00`,
          borderRadius: 6,
          fontSize: 14,
          color: '#E65100',
          letterSpacing: '0.06em',
          fontWeight: 700,
          marginBottom: 6
        }}
      >
        Blocked on others · sorted by tier
      </div>
      {WAITING_ITEMS.map((it) => (
        <WaitingRow key={it.id} item={it} />
      ))}
    </>
  );
}

function WaitingRow({ item }) {
  const tierHex = item.tier ? TIER[item.tier]?.hex : null;
  return (
    <div
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: item.overdue ? `1px solid #FB8C00` : `1px solid ${semantic.divider}`,
        borderRadius: 6,
        padding: '6px 8px 6px 14px',
        marginBottom: 4
      }}
    >
      {tierHex && <span className="tier-stripe" style={{ background: tierHex, width: 6 }} />}
      <div style={{ fontSize: 16, color: ink[700], lineHeight: 1.35 }}>{item.title}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
        <span style={{ fontSize: 14, color: ink[500] }}>
          waiting · {item.who}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: item.overdue ? 800 : 600,
            color: item.overdue ? '#E65100' : ink[300]
          }}
        >
          {item.overdue ? `${item.since} OVERDUE` : item.since}
        </span>
      </div>
    </div>
  );
}

function QuickAdd() {
  return (
    <div
      style={{
        padding: 6,
        background: '#FFFFFF',
        borderTop: `1px solid ${semantic.divider}`,
        display: 'flex',
        gap: 4,
        flexShrink: 0
      }}
    >
      <input
        type="text"
        placeholder="Quick-add task…"
        style={{
          flex: 1,
          padding: '5px 10px',
          background: '#F8FAFC',
          border: `1px solid ${semantic.border}`,
          borderRadius: 5,
          fontSize: 16,
          fontFamily: 'inherit',
          color: ink[700],
          outline: 'none'
        }}
      />
      <button
        type="button"
        title="Voice add"
        style={{
          background: '#7B1FA2',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 5,
          padding: '5px 8px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center'
        }}
      >
        <Mic size={12} strokeWidth={2.4} />
      </button>
      <button
        type="button"
        style={{
          background: '#43A047',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 5,
          padding: '5px 10px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 16,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3
        }}
      >
        <Plus size={11} strokeWidth={2.6} /> Add
      </button>
    </div>
  );
}

function iconBtn(bg) {
  return {
    width: 18,
    height: 18,
    background: bg,
    border: 'none',
    borderRadius: 999,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit'
  };
}
