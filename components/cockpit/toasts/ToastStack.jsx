import React from 'react';
import StandardToast from './StandardToast.jsx';
import MissionToast from './MissionToast.jsx';
import { useDemo } from '../demo/DemoContext.jsx';

/**
 * ToastStack — Layer 1.5a + 1.5b coordinator (Doc B Section 8).
 * Mission toasts always at TOP of stack. Standard below. Right-aligned column.
 */
const sampleStandard = [
  { id: 't-1', variant: 'info', tier: 'L4', title: 'Filing Bay-Valley-Counter-LOI-v2.pdf', body: 'Routing to deal-002 folder…' },
  { id: 't-2', variant: 'success', tier: null, title: 'Filed: Frayser model', body: 'Saved to deal-008/underwriting/' },
  { id: 't-3', variant: 'warning', tier: 'L5', title: 'Yaron Sitbon — 3 weeks silent', body: 'Suggest follow-up today' }
];

const sampleSystemDetail = {
  id: 't-sys',
  variant: 'warning',
  tier: null,
  title: 'Quo line: still healthy — last check 14:32',
  body: 'Polling resumes on the hour'
};

const sampleMission = {
  id: 'm-1',
  tier: 'L6',
  name: 'Call Steve · ask if he can join Zoom in 6 min',
  status: 'DISPATCHED — dialing Steve via Quo'
};

export default function ToastStack() {
  const { state, set } = useDemo();

  let toasts = [];
  let mission = null;

  if (state.toastStack === 'single') toasts = [sampleStandard[0]];
  else if (state.toastStack === 'stacked') toasts = sampleStandard;
  else if (state.toastStack === 'mixed-with-mission') {
    toasts = sampleStandard;
    mission = sampleMission;
  } else if (state.toastStack === 'system-detail') toasts = [sampleSystemDetail];

  if (state.topBarState === 'mission-active' && !mission) mission = sampleMission;

  if (!mission && toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 88 + 50 + 32 + 40,
        right: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 60,
        alignItems: 'flex-end'
      }}
    >
      {mission && <MissionToast mission={mission} />}
      {toasts.map((t) => (
        <StandardToast key={t.id} toast={t} onDismiss={() => set('toastStack', 'empty')} />
      ))}
    </div>
  );
}
