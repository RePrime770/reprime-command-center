import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { warm, ink, info } from '../lib/colors.js';
import { useDemo } from './DemoContext.jsx';

/**
 * Floating Demo States Panel — bottom-right (Doc D Section 9 artifact-only construct).
 * Every interactive state from the constitution reachable here.
 * Collapsed: 48×48 round. Expanded: 320×560 scrollable.
 */
export default function DemoStatesPanel() {
  const [open, setOpen] = useState(false);
  const { state, set, reset } = useDemo();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Demo States Panel"
        style={{
          position: 'fixed',
          right: 20,
          bottom: 60,
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: info[500],
          color: warm[50],
          border: `4px solid ${ink[700]}`,
          fontSize: '14px',
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'inherit',
          letterSpacing: '0.12em',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4
        }}
      >
        <Settings size={32} strokeWidth={2.6} />
        <span style={{ fontSize: '12px', fontWeight: 800 }}>DEMO</span>
      </button>
    );
  }

  return (
    <aside
      style={{
        position: 'fixed',
        right: 20,
        bottom: 60,
        width: 420,
        height: 720,
        background: warm[50],
        border: `3px solid ${ink[700]}`,
        borderRadius: 14,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        fontSize: '14.66px',
        color: ink[700],
        letterSpacing: '0.04em'
      }}
    >
      <header
        style={{
          padding: '12px 16px',
          background: info[500],
          color: '#FCF6EA',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 700
        }}
      >
        <span>DEMO STATES</span>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#FCF6EA',
            fontSize: '22px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0
          }}
        >
          ×
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <Group label="✦ NEW IN V2 (FIX DISPATCH)">
          <Btn label="LOI counter-incoming (chip pulses red)" active={state.topBarState === 'counter-loi-incoming'} onClick={() => set('topBarState', state.topBarState === 'counter-loi-incoming' ? 'standard' : 'counter-loi-incoming')} />
          <Btn label="Investor Profile drawer (Doron)" active={state.investorState === 'profile-conversation' && state.investorOpenId === 'inv-001'} onClick={() => { set('investorOpenId', 'inv-001'); set('investorState', state.investorState === 'profile-conversation' ? 'grid' : 'profile-conversation'); }} />
          <Btn label="Invite Composer drawer" active={!!state.inviteComposerOpen} onClick={() => set('inviteComposerOpen', !state.inviteComposerOpen)} />
          <Btn label="Open Doron chat (from investor row)" active={state.openInvestorChat === 'th-001'} onClick={() => set('openInvestorChat', 'th-001')} />
          <Btn label="Cycle Model Tier (Haiku→Sonnet→Opus)" active={state.modelTier && state.modelTier !== 'Haiku'} onClick={() => set('modelTier', { Haiku: 'Sonnet', Sonnet: 'Opus', Opus: 'Haiku' }[state.modelTier || 'Haiku'])} />
          <Btn label="Mistake-detection toast (D4 mock)" active={state.toastStack === 'mistake-detect'} onClick={() => set('toastStack', state.toastStack === 'mistake-detect' ? 'empty' : 'mistake-detect')} />
          <Btn label="Confirmation pattern (D3 mock)" active={state.toastStack === 'confirm-send'} onClick={() => set('toastStack', state.toastStack === 'confirm-send' ? 'empty' : 'confirm-send')} />
          <Btn label="DCS visible output (D5 mock)" active={!!state.dcsVisible} onClick={() => set('dcsVisible', !state.dcsVisible)} />
        </Group>

        <Group label="COMMS">
          <Btn label="Default 3-pillar" active={state.commsState === 'default'} onClick={() => set('commsState', 'default')} />
          <Btn label="Thread with Nora-block" active={state.commsState === 'open-with-nora-block'} onClick={() => set('commsState', 'open-with-nora-block')} />
          <Btn label="Thread without Nora-block" active={state.commsState === 'open-without-nora-block'} onClick={() => set('commsState', 'open-without-nora-block')} />
          <Btn label="Channel Lock Warn 1" active={state.channelLockWarning === 1} onClick={() => set('channelLockWarning', 1)} />
          <Btn label="Channel Lock Warn 2" active={state.channelLockWarning === 2} onClick={() => set('channelLockWarning', 2)} />
          <Btn label="Channel Lock Warn 3 (lockout)" active={state.channelLockWarning === 3} onClick={() => set('channelLockWarning', 3)} />
        </Group>

        <Group label="CALENDAR">
          <Btn label="Normal day (60/40)" active={state.calendarMode === 'normal'} onClick={() => set('calendarMode', 'normal')} />
          <Btn label="Heavy calendar (75/25)" active={state.calendarMode === 'heavy-cal'} onClick={() => set('calendarMode', 'heavy-cal')} />
          <Btn label="Heavy reminders (50/50)" active={state.calendarMode === 'heavy-rem'} onClick={() => set('calendarMode', 'heavy-rem')} />
          <Btn label="Shabbat pre-shutdown" active={state.calendarMode === 'shabbat-pre-shutdown'} onClick={() => set('calendarMode', 'shabbat-pre-shutdown')} />
          <Btn label="Conflict Intervention drawer" active={state.conflictIntervention} onClick={() => set('conflictIntervention', !state.conflictIntervention)} />
          <Btn label="Meeting Now 30 min" active={state.meetingNow === 30} onClick={() => set('meetingNow', state.meetingNow === 30 ? null : 30)} />
          <Btn label="Meeting Now 15 min" active={state.meetingNow === 15} onClick={() => set('meetingNow', state.meetingNow === 15 ? null : 15)} />
          <Btn label="Meeting Now 5 min (pulse)" active={state.meetingNow === 5} onClick={() => set('meetingNow', state.meetingNow === 5 ? null : 5)} />
          <Btn label="Meeting Now at start" active={state.meetingNow === 'at-start'} onClick={() => set('meetingNow', state.meetingNow === 'at-start' ? null : 'at-start')} />
        </Group>

        <Group label="DEALS">
          <Btn label="Card grid" active={state.dealView === 'grid'} onClick={() => { set('activeWideTab', 'deals'); set('dealView', 'grid'); }} />
          <Btn label="Card expanded" active={state.dealView === 'expanded'} onClick={() => { set('activeWideTab', 'deals'); set('dealView', 'expanded'); }} />
          <Btn label="LOI Outstanding filter" active={state.dealView === 'loi-outstanding'} onClick={() => { set('activeWideTab', 'deals'); set('dealView', 'loi-outstanding'); }} />
        </Group>

        <Group label="TASKS">
          <Btn label="Bucket kanban" active={state.taskView === 'bucket'} onClick={() => { set('activeWideTab', 'bucket'); set('taskView', 'bucket'); }} />
          <Btn label="Delegated (L1-L7 balloons)" active={state.taskView === 'delegated'} onClick={() => { set('activeWideTab', 'delegated'); set('taskView', 'delegated'); }} />
          <Btn label="On-assignment toast" active={state.taskView === 'on-assignment'} onClick={() => { set('taskView', 'on-assignment'); set('toastStack', 'single'); }} />
          <Btn label="Completion toast" active={state.taskView === 'completion'} onClick={() => { set('taskView', 'completion'); set('toastStack', 'stacked'); }} />
        </Group>

        <Group label="INVESTORS">
          <Btn label="Grid view" active={state.investorState === 'grid'} onClick={() => { set('activeWideTab', 'investors'); set('investorState', 'grid'); }} />
          <Btn label="Profile · CONVERSATION" active={state.investorState === 'profile-conversation'} onClick={() => set('investorState', 'profile-conversation')} />
          <Btn label="Profile · RESEARCH" active={state.investorState === 'profile-research'} onClick={() => set('investorState', 'profile-research')} />
          <Btn label="Profile · DETAILS" active={state.investorState === 'profile-details'} onClick={() => set('investorState', 'profile-details')} />
          <Btn label="Promoted to Window" active={state.investorState === 'window-promoted'} onClick={() => { set('investorState', 'window-promoted'); set('windowCount', 1); }} />
        </Group>

        <Group label="MEMORY">
          <Btn label="Search drawer" active={state.searchOpen} onClick={() => set('searchOpen', !state.searchOpen)} />
        </Group>

        <Group label="DOCUMENTS">
          <Btn label="Folder browser" active={state.documentState === 'browser'} onClick={() => { set('activeWideTab', 'documents'); set('documentState', 'browser'); }} />
          <Btn label="Filing toast" active={state.documentState === 'filing'} onClick={() => { set('documentState', 'filing'); set('toastStack', 'single'); }} />
          <Btn label="Filed confirmation" active={state.documentState === 'filed'} onClick={() => { set('documentState', 'filed'); set('toastStack', 'stacked'); }} />
        </Group>

        <Group label="EMAIL">
          <Btn label="3-tier rows" active={state.emailMix === 'three-tier'} onClick={() => { set('activeWideTab', 'email'); set('emailMix', 'three-tier'); }} />
          <Btn label="Compose drawer" active={state.emailMix === 'compose'} onClick={() => set('emailMix', 'compose')} />
        </Group>

        <Group label="PHONE / SMS">
          <Btn label="Idle" active={state.phoneState === 'idle'} onClick={() => set('phoneState', 'idle')} />
          <Btn label="Caller-ID Tier-1 drawer" active={state.phoneState === 'caller-id-t1'} onClick={() => set('phoneState', 'caller-id-t1')} />
          <Btn label="Quick Call modal" active={state.phoneState === 'quick-call'} onClick={() => set('phoneState', 'quick-call')} />
          <Btn label="Quick Call DTMF" active={state.phoneState === 'quick-call-dtmf'} onClick={() => set('phoneState', 'quick-call-dtmf')} />
          <Btn label="Quick Call conference" active={state.phoneState === 'quick-call-conference'} onClick={() => set('phoneState', 'quick-call-conference')} />
        </Group>

        <Group label="VOICE / PTT">
          <Btn label="IDLE" active={state.pttState === 'idle'} onClick={() => set('pttState', 'idle')} />
          <Btn label="ACTIVE (peach glow)" active={state.pttState === 'active'} onClick={() => set('pttState', 'active')} />
          <Btn label="NOTE mode" active={state.pttState === 'note'} onClick={() => set('pttState', 'note')} />
          <Btn label="MISSION mode" active={state.pttState === 'mission'} onClick={() => set('pttState', 'mission')} />
        </Group>

        <Group label="MEETING">
          <Btn label="Zoom + Susan placeholder" active={state.meetingState === 'zoom-with-susan'} onClick={() => { set('meetingState', 'zoom-with-susan'); set('windowCount', 1); }} />
          <Btn label="Conflict Intervention" active={state.meetingState === 'conflict'} onClick={() => { set('meetingState', 'conflict'); set('conflictIntervention', true); }} />
          <Btn label="Post-call summary" active={state.meetingState === 'post-summary'} onClick={() => set('meetingState', 'post-summary')} />
        </Group>

        <Group label="BRAINSTORM">
          <Btn label="DECODE" active={state.brainstormState === 'decode'} onClick={() => { set('brainstormState', 'decode'); set('windowCount', 1); }} />
          <Btn label="MIRROR" active={state.brainstormState === 'mirror'} onClick={() => { set('brainstormState', 'mirror'); set('windowCount', 1); }} />
          <Btn label="ELEVATE (split-pane)" active={state.brainstormState === 'elevate'} onClick={() => { set('brainstormState', 'elevate'); set('windowCount', 1); }} />
          <Btn label="REALITY-CHECK" active={state.brainstormState === 'reality-check'} onClick={() => { set('brainstormState', 'reality-check'); set('windowCount', 1); }} />
          <Btn label="EXECUTE" active={state.brainstormState === 'execute'} onClick={() => { set('brainstormState', 'execute'); set('windowCount', 1); }} />
        </Group>

        <Group label="AI LAUNCHER">
          <Btn label="All 10 pillars visible" active={state.aiLauncherState === 'pillars'} onClick={() => set('aiLauncherState', 'pillars')} />
          <Btn label="AI window open" active={state.aiLauncherState === 'window-open'} onClick={() => { set('aiLauncherState', 'window-open'); set('windowCount', 1); }} />
        </Group>

        <Group label="TOP BAR">
          <Btn label="Standard" active={state.topBarState === 'standard'} onClick={() => set('topBarState', 'standard')} />
          <Btn label="Model Tier money-gate" active={state.topBarState === 'model-tier-gate'} onClick={() => { set('topBarState', 'model-tier-gate'); set('toastStack', 'single'); }} />
          <Btn label="Document Dump filing" active={state.topBarState === 'doc-dump-filing'} onClick={() => { set('topBarState', 'doc-dump-filing'); set('toastStack', 'single'); }} />
          <Btn label="Mission Toast active" active={state.topBarState === 'mission-active'} onClick={() => { set('topBarState', 'mission-active'); set('toastStack', 'mixed-with-mission'); }} />
        </Group>

        <Group label="WIDE-TABS">
          <Btn label="Notes semi-expanded" active={state.wideTabState === 'notes-semi'} onClick={() => set('wideTabState', 'notes-semi')} />
          <Btn label="Pinned semi-expanded" active={state.wideTabState === 'pinned-semi'} onClick={() => set('wideTabState', 'pinned-semi')} />
          <Btn label="Smart Rotation rationale" active={state.wideTabState === 'smart-rotation'} onClick={() => set('wideTabState', 'smart-rotation')} />
          <Btn label="Calendar adaptive" active={state.wideTabState === 'calendar-adaptive'} onClick={() => set('wideTabState', 'calendar-adaptive')} />
        </Group>

        <Group label="WINDOWS">
          <Btn label="0 windows" active={state.windowCount === 0} onClick={() => set('windowCount', 0)} />
          <Btn label="1 window" active={state.windowCount === 1} onClick={() => set('windowCount', 1)} />
          <Btn label="2 windows" active={state.windowCount === 2} onClick={() => set('windowCount', 2)} />
          <Btn label="3 windows" active={state.windowCount === 3} onClick={() => set('windowCount', 3)} />
          <Btn label="PiP overlay" active={state.pipVisible} onClick={() => set('pipVisible', !state.pipVisible)} />
        </Group>

        <Group label="TAB MANAGER">
          <Btn label="End-of-day prompt" active={state.tabManagerOpen} onClick={() => set('tabManagerOpen', !state.tabManagerOpen)} />
        </Group>

        <Group label="ALERTS / TOASTS">
          <Btn label="Empty" active={state.toastStack === 'empty'} onClick={() => set('toastStack', 'empty')} />
          <Btn label="Single standard" active={state.toastStack === 'single'} onClick={() => set('toastStack', 'single')} />
          <Btn label="Stacked standard" active={state.toastStack === 'stacked'} onClick={() => set('toastStack', 'stacked')} />
          <Btn label="Mission + standard mix" active={state.toastStack === 'mixed-with-mission'} onClick={() => set('toastStack', 'mixed-with-mission')} />
          <Btn label="System status detail" active={state.toastStack === 'system-detail'} onClick={() => set('toastStack', 'system-detail')} />
        </Group>

        <Group label="PWA">
          <Btn label="PWA Preview drawer" active={state.pwaPreviewOpen} onClick={() => set('pwaPreviewOpen', !state.pwaPreviewOpen)} />
        </Group>

        <Group label="RELIGIOUS CALENDAR">
          <Btn label="Widget drawer" active={state.religiousCalendarOpen} onClick={() => set('religiousCalendarOpen', !state.religiousCalendarOpen)} />
        </Group>

        <Group label="TASKBAR">
          <Btn label="Empty" active={state.taskbarFill === 'empty'} onClick={() => set('taskbarFill', 'empty')} />
          <Btn label="1 window" active={state.taskbarFill === 'one'} onClick={() => set('taskbarFill', 'one')} />
          <Btn label="12 windows" active={state.taskbarFill === 'twelve'} onClick={() => set('taskbarFill', 'twelve')} />
          <Btn label="Overflow (+N more)" active={state.taskbarFill === 'overflow'} onClick={() => set('taskbarFill', 'overflow')} />
        </Group>
      </div>

      <div
        style={{
          padding: 12,
          borderTop: `1px solid ${warm[600]}`,
          background: warm[200]
        }}
      >
        <button
          onClick={reset}
          style={{
            width: '100%',
            background: info[500],
            color: '#FCF6EA',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: '14.66px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.06em'
          }}
        >
          RESET ALL
        </button>
      </div>
    </aside>
  );
}

function Group({ label, children }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: ink[500],
          marginBottom: 6,
          padding: '4px 0',
          borderBottom: `1px solid ${warm[600]}`
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </section>
  );
}

function Btn({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? warm[100] : 'transparent',
        color: ink[700],
        border: `1px solid ${active ? info[500] : warm[600]}`,
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: '13.33px',
        fontWeight: active ? 700 : 400,
        fontFamily: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
        letterSpacing: '0.03em'
      }}
    >
      {label}
    </button>
  );
}
