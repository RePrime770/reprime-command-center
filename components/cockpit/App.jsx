import React from 'react';
import { DemoProvider, useDemo } from './demo/DemoContext.jsx';

// v3 chrome — 2 rows + conditional Tier-1 alert lane in Row 3. PTT centered, sub-strip + browser button + memory + momentum integrated.
import TopChrome from './chrome/TopChrome.jsx';
import RecentlyActiveStrip from './chrome/RecentlyActiveStrip.jsx';

// LEAN COMMUNICATION CENTER — TWO-ZONE layout
//   LEFT FLANK     · Calendar / Brief / Email
//   CENTER         · Comms (4 columns: 305 / 718 / Staff / Investors) / Nora's Desk
import CommsPanel from './panels/CommsPanel.jsx';
import EmailPanel from './panels/EmailPanel.jsx';
import CalendarPanel from './panels/CalendarPanel.jsx';
import BriefPanel from './panels/BriefPanel.jsx';
import NorasDesk from './panels/NorasDesk.jsx';
import NotesPanel from './panels/NotesPanel.jsx';

// Slot windows — Zoom only (lean center keeps only the meeting window)
import ZoomWindow from './windows/ZoomWindow.jsx';

// Drawers driven by the top-bar Concierge buttons (these read demo-state flags
// the buttons set — previously several were never mounted, making the buttons
// dead). InviteComposerDrawer ← inviteComposerOpen, BriefingDrawer ←
// briefingOpen, ReligiousCalendarDrawer ← religiousCalendarOpen.
import InviteComposerDrawer from './drawers/InviteComposerDrawer.jsx';
import BriefingDrawer from './drawers/BriefingDrawer.jsx';
import ReligiousCalendarDrawer from './drawers/ReligiousCalendarDrawer.jsx';
import SearchPalette from './chrome/SearchPalette.jsx';

// Toasts
import ToastStack from './toasts/ToastStack.jsx';
// Live reminder toasts — Supabase Realtime on `reminders` (fired by the cron).
import ReminderToast from '@/components/center/ReminderToast';

// === Lean two-zone widths === (Gideon 2026-06-16: Email moved LEFT, Nora's Desk takes the right)
// LEFT FLANK:  calendar 360 + brief 380 + email 600 = 1340
// CENTER:      comms 1840 (305 / 718 / Staff / Investors) + Nora's Desk 660 = 2500
// Total: ~3840 + gaps + padding + divider → fits ~4000
const PANEL_WIDTHS = {
  calendar: 360,
  brief: 380,
  email: 600,
  notes: 340,
  comms: 1840,
  norasdesk: 660
};

export default function App() {
  return (
    <DemoProvider>
      <Cockpit />
    </DemoProvider>
  );
}

function Cockpit() {
  const { state } = useDemo();

  // TopChrome: Row1 80 (Row2 Active-Deals sub-strip removed)
  // Row 3 Tier-1 banner (conditional) = +50
  const tier1Active = !!state.liveMeeting || state.meetingNow !== null || state.topBarState === 'counter-loi-incoming' || state.tier1Alert;
  const topChromeH = 80 + (tier1Active ? 50 : 0);
  const recentlyStripH = 60; // v4 §B4 — doubled from 30→60, split 1/3 investors + 2/3 minimized tabs
  const taskbarH = 0; // BottomTaskbar removed in lean layout — main area reclaims this height
  const mainTop = topChromeH + recentlyStripH;
  const mainHeight = 1440 - mainTop - taskbarH;

  return (
    <div
      style={{
        width: 4000, // lean two-zone canvas — Email left + Nora's Desk right
        height: 1440,
        position: 'relative',
        background: '#FAFAFA',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}
    >
      {/* CHROME */}
      <TopChrome />
      <RecentlyActiveStrip top={topChromeH} />

      {/* MAIN — LEAN TWO-ZONE horizontal scroll */}
      <main
        style={{
          position: 'absolute',
          top: mainTop,
          left: 0,
          right: 0,
          height: mainHeight,
          overflowX: 'auto',
          overflowY: 'hidden',
          zIndex: 10
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 14,
            padding: '12px 16px',
            height: '100%'
          }}
        >
          {/* LEFT FLANK — context: calendar · brief · email */}
          <ZoneLabel label="LEFT · time · brief · email" color="#5C6BC0">
            <CalendarPanel width={PANEL_WIDTHS.calendar} />
            <BriefPanel width={PANEL_WIDTHS.brief} />
            <EmailPanel width={PANEL_WIDTHS.email} />
            <NotesPanel width={PANEL_WIDTHS.notes} />
          </ZoneLabel>

          <ZoneDivider color="#FFCC33" />

          {/* CENTER — operational core: comms hub + Nora's Desk */}
          <ZoneLabel label="CENTER · comms + Nora’s Desk" color="#FFCC33" emphasized>
            <CommsPanel width={PANEL_WIDTHS.comms} />
            <NorasDesk width={PANEL_WIDTHS.norasdesk} />
          </ZoneLabel>
        </div>
      </main>

      {/* WINDOWS — Zoom only — z 50 */}
      {state.meetingState === 'zoom-with-susan' && <Windows />}

      {/* DRAWERS — gated on demo-state flags set by the Concierge buttons */}
      <InviteComposerDrawer />
      <BriefingDrawer />
      <ReligiousCalendarDrawer />
      {/* Global command/search palette — Concierge "Search" button or ⌘K */}
      <SearchPalette />

      {/* TOASTS */}
      <ToastStack />
      {/* Live reminder toasts — surfaces reminders the cron fires (Realtime) */}
      <ReminderToast />
    </div>
  );
}

// Subtle zone wrapper — pin a thin top label so the three zones are visually grouped
function ZoneLabel({ label, color, emphasized, children }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        height: '100%',
        position: 'relative',
        padding: emphasized ? '0 6px' : 0,
        ...(emphasized
          ? {
              background: 'rgba(255,204,51,0.04)',
              border: `1px dashed rgba(255,204,51,0.32)`,
              borderRadius: 12
            }
          : {})
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: -10,
          left: 14,
          background: '#FAFAFA',
          color,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '0.16em',
          padding: '0 6px',
          zIndex: 5
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function ZoneDivider({ color }) {
  return (
    <div
      style={{
        width: 2,
        background: `linear-gradient(180deg, transparent 0%, ${color}55 30%, ${color}55 70%, transparent 100%)`,
        flexShrink: 0,
        margin: '0 -4px'
      }}
    />
  );
}

function Windows() {
  const { set } = useDemo();

  const closeAll = () => {
    set('windowCount', 0);
    set('meetingState', null);
  };

  return <ZoomWindow key="zoom" slot={0} total={1} onClose={closeAll} />;
}
