import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquarePlus, StickyNote, Mail, Sun,
  Mic, Volume2,
  Headphones, MessagesSquare, AlertCircle, Search,
  HelpCircle, LogOut, ExternalLink
} from 'lucide-react';
import { brand, slate, tier as TIER, ink } from '../lib/colors.js';
import { useDemo } from '../demo/DemoContext.jsx';
import { useLiveData } from '../live/CockpitLiveData.jsx';
import { useLocale } from '../lib/i18n.jsx';
import IntegrationStatusPill from './IntegrationStatusPill.jsx';
import KeyboardShortcutsModal from '../modals/KeyboardShortcutsModal.jsx';

// ============================================================
// TopChrome v5 — LEAN COMMS-ONLY top bar
// v5 changes (comms-center dispatch 2026-06-16):
//   Slimmed to comms-only. REMOVED: ScheduleCluster (Zoom/Meeting/Call),
//   Brainstorm concierge, Browser button, Model-tier pillar, Doc Dump,
//   Mission button, Memory pulse, LOI chip, StatusCluster noise
//   (DailyMomentum "TODAY x/y" meter, PWA pill, fake all-green dot-row).
//   Row2 deal sub-strip removed (now-dead).
//   KEPT: APEX/urgent indicator, TERMINAL wordmark, PTT "Talk to Nora",
//   global Speechify SpeedSelector (5-step), clock + Shabbat countdown,
//   conditional Row3 Tier-1 lane, concierge actions Email/Invite/Note/Briefing.
//
// Row 1 (~80px): APEX NOW · TERMINAL · | · centered PTT cluster · | ·
//                Concierge (Search·Note·Email·Briefing·Invite) · clock + Shabbat
// Row 3 (~50px conditional): Tier-1 alert banner
// ============================================================

const CONCIERGE = [
  { k: 'Search',     icon: Search,              color: '#0891B2' },
  { k: 'Note',       icon: StickyNote,          color: '#7B1FA2' },
  { k: 'Email',      icon: Mail,                color: '#5C6BC0' },
  { k: 'Briefing',   icon: Sun,                 color: '#F9A825' },
  { k: 'Invite',     icon: MessageSquarePlus,   color: '#FFCC33' }
];

const SPEEDS = ['1.2', '1.4', '1.6', '1.8', '2.0'];

export default function TopChrome() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Global "?" listener — opens the keyboard shortcuts modal. Skips when the
  // user is typing in an input/textarea/contenteditable so it doesn't hijack
  // the chat composer.
  useEffect(() => {
    const onKey = (e) => {
      const tgt = e.target;
      const tag = tgt?.tagName;
      const editable = tgt?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return;
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      } else if (e.key === 'Escape' && shortcutsOpen) {
        setShortcutsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcutsOpen]);

  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: slate.gradient,
        borderBottom: `2px solid ${brand.goldSoft}`,
        zIndex: 40,
        color: '#FFFFFF',
        fontFamily: 'inherit'
      }}
    >
      <LiveMeetingAlertSync />
      <Row1 onOpenShortcuts={() => setShortcutsOpen(true)} />
      <Row3Tier1 />
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </header>
  );
}

// Watches live calendar events and raises a real Tier-1 alert when a meeting is
// imminent (≤20 min out) or in progress — replacing the hardcoded "Doron Zoom"
// demo content. Sets state.liveMeeting (read by Row3Tier1 + App.jsx height calc).
// Renders nothing. Ref-guarded so it only writes state when the alert changes.
function LiveMeetingAlertSync() {
  const { events } = useLiveData();
  const { set } = useDemo();
  const [now, setNow] = useState(() => new Date());
  const lastSigRef = useRef('__init__');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const list = Array.isArray(events) ? events : [];
    let best = null;
    for (const e of list) {
      if (!e || !e.time || e.time === 'all-day' || !e.date) continue;
      const start = new Date(`${e.date}T${e.time}:00`);
      if (Number.isNaN(start.getTime())) continue;
      const mins = Math.round((start.getTime() - now.getTime()) / 60000);
      const dur = typeof e.duration === 'number' ? e.duration : 30;
      const inProgress = mins <= 0 && mins > -dur;
      const upcoming = mins > 0 && mins <= 20;
      if (!inProgress && !upcoming) continue;
      const cand = {
        id: e.id,
        title: e.title || 'Meeting',
        joinUrl: e.joinUrl || null,
        minutesToStart: mins,
        inProgress,
      };
      if (!best || Math.abs(cand.minutesToStart) < Math.abs(best.minutesToStart)) best = cand;
    }
    const sig = best ? `${best.id}|${best.inProgress ? 'now' : best.minutesToStart}` : '';
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      set('liveMeeting', best);
    }
  }, [events, now, set]);

  return null;
}

// ============================================================
// ROW 1 — All clusters in single row, PTT centered as anchor
// ============================================================
function Row1({ onOpenShortcuts }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        height: 80,
        borderBottom: `1px solid rgba(255,204,51,0.18)`
      }}
    >
      {/* LEFT — APEX NOW + Wordmark · AI tools moved to BottomTaskbar per B3 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <ApexNowIndicator />
        <ClusterDivider />
        <Wordmark />
      </div>

      {/* CENTER spacer */}
      <div style={{ flex: 1 }} />

      {/* CENTER ANCHOR — PTT cluster (B15) with mode indicator */}
      <PttCluster />

      {/* CENTER spacer */}
      <div style={{ flex: 1 }} />

      {/* RIGHT — Concierge (comms actions) + language + clock/Shabbat + status + help + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <ConciergeCluster />
        <ClusterDivider />
        <LangToggle />
        <ClockShabbat />
        <ClusterDivider />
        <IntegrationStatusPill />
        <TerminalButton />
        <HelpButton onOpen={onOpenShortcuts} />
        <UserPill />
      </div>
    </div>
  );
}

// Opens the external RePrime Terminal portal in a new tab. Public URL — safe
// to hardcode (user-provided portal entrypoint).
function TerminalButton() {
  const openTerminal = () => {
    try {
      window.open('https://portal.reprimeterminal.com/dashboard', '_blank', 'noopener,noreferrer');
    } catch { /* no window (SSR) */ }
  };
  return (
    <button
      type="button"
      onClick={openTerminal}
      title="Open RePrime Terminal portal (new tab)"
      aria-label="Open Terminal portal"
      style={{
        background: 'rgba(255,255,255,0.06)',
        color: brand.goldSoft,
        border: `1px solid rgba(255,204,51,0.22)`,
        borderRadius: 999,
        padding: '0 10px',
        height: 30,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.04em',
        flexShrink: 0,
      }}
    >
      <ExternalLink size={12} strokeWidth={2.4} />
      Terminal
    </button>
  );
}

function HelpButton({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Keyboard shortcuts (?)"
      aria-label="Show keyboard shortcuts"
      style={{
        background: 'rgba(255,255,255,0.06)',
        color: brand.goldSoft,
        border: `1px solid rgba(255,204,51,0.22)`,
        borderRadius: 999,
        width: 30,
        height: 30,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontFamily: 'inherit',
        flexShrink: 0,
      }}
    >
      <HelpCircle size={16} strokeWidth={2.2} />
    </button>
  );
}

function UserPill() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);
  const email = 'g@reprime.com';
  const initial = email.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' });
    } catch { /* fall through to redirect regardless */ }
    window.location.href = '/login';
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={email}
        aria-label="User menu"
        style={{
          background: brand.gold,
          color: brand.navy,
          border: 'none',
          borderRadius: 999,
          width: 30,
          height: 30,
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {initial}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 220,
          background: '#0F172A', color: '#FFFFFF', border: `1px solid ${brand.goldSoft}`,
          borderRadius: 8, padding: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 60,
        }}>
          <div style={{ fontSize: 13, opacity: 0.85, padding: '4px 6px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {email}
          </div>
          <button type="button" onClick={signOut} disabled={busy} style={{
            marginTop: 6, width: '100%', background: 'transparent', color: '#FFFFFF',
            border: 'none', borderRadius: 6, padding: '8px 6px', fontSize: 14, fontWeight: 700,
            cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 8, textAlign: 'left',
          }}>
            <LogOut size={14} strokeWidth={2.2} />
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ROW 3 — Tier-1 alert (conditional). D-NEW-1 + B18.
// Activates for: Counter-LOI / Meeting Now / Urgent inbound
// ============================================================
function Row3Tier1() {
  const { state, set } = useDemo();
  // Live meeting alert (real calendar) takes top priority, then the demo-state
  // triggers (meetingNow / counter-LOI / custom) used by DemoStatesPanel.
  const live = state.liveMeeting;
  const meetingNow = state.meetingNow;
  const counterLoi = state.topBarState === 'counter-loi-incoming';
  const tier1Custom = state.tier1Alert;
  const active = live || meetingNow !== null || counterLoi || tier1Custom;
  if (!active) return null;

  // Build content based on what's firing — live meeting first.
  let cfg;
  if (live) {
    const soon = live.minutesToStart <= 5 || live.inProgress;
    cfg = {
      text: live.inProgress
        ? `In progress · ${live.title}`
        : `${live.minutesToStart} min to ${live.title}`,
      bg: soon ? '#E53935' : '#FB8C00',
      pulse: live.minutesToStart <= 10 || live.inProgress,
      cta: live.joinUrl ? 'Join now' : null,
      joinUrl: live.joinUrl,
      isLive: true,
    };
  } else if (meetingNow !== null) {
    const labels = {
      30: { text: '30 min to Doron Zoom · prep window open', bg: '#5C6BC0', pulse: false, cta: 'Open prep' },
      15: { text: '15 min to Doron Zoom · drafting prep notes', bg: '#FF9800', pulse: true, cta: 'Review prep' },
      10: { text: '10 min to Doron Zoom · open the deal card?', bg: '#FB8C00', pulse: true, cta: 'Open deal' },
      5:  { text: '5 min to Doron Zoom · joining momentarily', bg: '#E53935', pulse: true, cta: 'Join now' },
      'at-start': { text: 'Doron Zoom is starting now', bg: '#E53935', pulse: true, cta: 'Join now' }
    };
    cfg = labels[meetingNow] || labels[30];
  } else if (counterLoi) {
    cfg = { text: 'Counter-LOI inbound · Bay Valley · Doron · 4d to DD end', bg: '#D32F2F', pulse: true, cta: 'Open' };
  } else {
    cfg = { text: 'Urgent inbound · Tier-1 alert active', bg: '#D32F2F', pulse: true, cta: 'Open' };
  }

  return (
    <div
      className={cfg.pulse ? 'meeting-pulse' : ''}
      style={{
        height: 50,
        background: cfg.bg,
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        padding: '0 18px',
        gap: 12,
        borderBottom: `2px solid ${brand.goldSoft}`
      }}
    >
      <AlertCircle size={20} strokeWidth={2.4} />
      <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: '0.04em', flex: 1 }}>
        {cfg.text}
      </span>
      {cfg.cta && (
        <button
          type="button"
          onClick={() => {
            // Live meeting → open the real join URL. Demo triggers keep the old
            // no-op behavior (they're for DemoStatesPanel previews).
            if (cfg.isLive && cfg.joinUrl) {
              try { window.open(cfg.joinUrl, '_blank', 'noopener'); } catch { /* no window */ }
            }
          }}
          style={{
            background: brand.gold,
            color: ink[900],
            border: 'none',
            borderRadius: 6,
            padding: '5px 16px',
            fontSize: 18,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          {cfg.cta}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          if (live) set('liveMeeting', null);
          set('meetingNow', null);
          if (counterLoi) set('topBarState', 'standard');
          set('tier1Alert', false);
        }}
        style={{
          background: 'rgba(0,0,0,0.18)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit'
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

// ============================================================
// PTT cluster — centered in Row 1 (B15)
// PTT + Speed selector + Mode indicator
// ============================================================
function PttCluster() {
  const { state, set } = useDemo();
  const { t, locale } = useLocale();
  const ptt = state.pttState || 'idle';
  const mode = state.noraMode || 'listen'; // 'listen' | 'participate'
  const liveStatus = state.noraLiveStatus || 'idle'; // 'idle' | 'listening' | 'drafting' | 'researching' | 'speaking' | 'on-call'

  // Local UX-only states layered on top of the shared `pttState` (which only
  // distinguishes idle vs. active/listening). We do NOT extend pttState to
  // avoid breaking other consumers (NoteCapture, etc.).
  // 'idle' | 'recording' | 'transcribing' | 'sent' | 'mic-blocked' | 'transcribe-failed' | 'send-failed'
  const [pttPhase, setPttPhase] = useState('idle');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // Reset transient error/sent states after a brief moment.
  useEffect(() => {
    if (['sent', 'transcribe-failed', 'send-failed', 'mic-blocked'].includes(pttPhase)) {
      const ms = pttPhase === 'mic-blocked' ? 3500 : 2000;
      const id = setTimeout(() => setPttPhase('idle'), ms);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [pttPhase]);

  // Cleanup any open stream on unmount.
  useEffect(() => () => {
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
  }, []);

  // Visual cfg — recording/transcribing layer takes precedence over the
  // shared pttState (notes/missions). Falls back to the existing pttState map.
  const phaseCfg = {
    recording:           { bg: '#FFCDD2', fg: '#B71C1C', label: 'Recording…',       sub: 'tap to stop',     ring: '#E53935' },
    transcribing:        { bg: '#FFE082', fg: brand.navy, label: 'Transcribing…',   sub: 'one moment',      ring: '#1E88E5' },
    sent:                { bg: '#C8E6C9', fg: '#1B5E20', label: 'Sent ✓',           sub: 'message sent',    ring: '#43A047' },
    'mic-blocked':       { bg: '#FFCCBC', fg: '#BF360C', label: 'Mic blocked',      sub: 'allow mic in browser', ring: '#E64A19' },
    'transcribe-failed': { bg: '#FFCCBC', fg: '#BF360C', label: 'Transcribe failed', sub: 'try again',       ring: '#E64A19' },
    'send-failed':       { bg: '#FFCCBC', fg: '#BF360C', label: 'Send failed',      sub: 'try again',       ring: '#E64A19' },
  };
  const baseCfg = {
    idle:    { bg: brand.gold,   fg: brand.navy, label: 'Talk to Nora', sub: '', ring: brand.gold },
    active:  { bg: '#FFE082',    fg: brand.navy, label: 'Listening',    sub: 'tap to stop', ring: '#1E88E5' },
    note:    { bg: '#F3E5F5',    fg: '#4A148C',  label: 'Note mode',    sub: 'recording memo', ring: '#7B1FA2' },
    mission: { bg: '#E3F2FD',    fg: '#0D47A1',  label: 'Mission',      sub: 'capturing', ring: '#1E3A8A' }
  }[ptt];
  const cfg = phaseCfg[pttPhase] || baseCfg;

  const stopStream = () => {
    try { streamRef.current?.getTracks().forEach((tr) => tr.stop()); } catch { /* noop */ }
    streamRef.current = null;
  };

  const transcribeAndSend = async (blob) => {
    setPttPhase('transcribing');
    try {
      const endpoint = locale === 'he' ? '/api/voice/transcribe-he' : '/api/voice/transcribe-en';
      const fd = new FormData();
      fd.append('audio', blob, 'ptt.webm');
      const res = await fetch(endpoint, { method: 'POST', body: fd, credentials: 'same-origin' });
      if (!res.ok) { setPttPhase('transcribe-failed'); return; }
      const data = await res.json().catch(() => null);
      const text = typeof data?.text === 'string' ? data.text.trim()
                  : typeof data?.transcript === 'string' ? data.transcript.trim()
                  : '';
      if (!text) { setPttPhase('transcribe-failed'); return; }
      try {
        window.dispatchEvent(new CustomEvent('nora:sendMessage', { detail: { text } }));
        setPttPhase('sent');
      } catch {
        setPttPhase('send-failed');
      }
    } catch {
      setPttPhase('transcribe-failed');
    }
  };

  const startRecording = async () => {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      setPttPhase('mic-blocked');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.addEventListener('dataavailable', (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      });
      mr.addEventListener('stop', () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        chunksRef.current = [];
        stopStream();
        if (blob.size === 0) { setPttPhase('transcribe-failed'); return; }
        transcribeAndSend(blob);
      });
      mr.start();
      setPttPhase('recording');
      set('pttState', 'active');
      set('noraFocus', (state.noraFocus || 0) + 1);
    } catch {
      stopStream();
      setPttPhase('mic-blocked');
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    set('pttState', 'idle');
    if (mr && mr.state !== 'inactive') {
      try { mr.stop(); } catch { stopStream(); setPttPhase('transcribe-failed'); }
    } else {
      stopStream();
      setPttPhase('idle');
    }
  };

  const cycle = () => {
    if (pttPhase === 'recording') { stopRecording(); return; }
    // Don't restart mid-transcribe or while a terminal status is still showing.
    if (pttPhase === 'transcribing') return;
    startRecording();
  };
  const active = pttPhase === 'recording' || (pttPhase === 'idle' && ptt !== 'idle');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      {/* Live status indicator (D-NEW-4) */}
      <NoraLiveStatus mode={mode} status={liveStatus} setMode={(m) => set('noraMode', m)} />

      {/* PTT button */}
      <button
        type="button"
        onClick={cycle}
        style={{
          position: 'relative',
          background: cfg.bg,
          color: cfg.fg,
          border: `2px solid ${cfg.ring}`,
          borderRadius: 999,
          padding: '6px 18px',
          fontSize: 19,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          height: 48,
          boxShadow: active ? `0 0 0 4px ${cfg.ring}33` : '0 2px 8px rgba(0,0,0,0.18)'
        }}
      >
        {active && <span className="pulse-ring" style={{ position: 'absolute', inset: -2, border: `2px solid ${cfg.ring}`, borderRadius: 999 }} />}
        <Mic size={22} strokeWidth={2.4} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.05 }}>
          <span style={{ fontSize: 21, fontWeight: 800 }}>{t(cfg.label)}</span>
          {cfg.sub && (
            <span style={{ fontSize: 13, opacity: 0.78, letterSpacing: '0.06em' }}>
              {t(cfg.sub)}
            </span>
          )}
        </div>
      </button>

      {/* Speed selector — single global control (B15 + E3) */}
      <SpeedSelector />
    </div>
  );
}

function NoraLiveStatus({ mode, status, setMode }) {
  const isParticipate = mode === 'participate';
  const statusLabel = {
    idle: 'idle',
    listening: 'listening',
    drafting: 'drafting',
    researching: 'researching',
    speaking: 'speaking',
    'on-call': 'on call'
  }[status] || 'idle';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <button
        type="button"
        onClick={() => setMode(isParticipate ? 'listen' : 'participate')}
        title={isParticipate ? 'Switch to Listen mode' : 'Switch to Participate mode'}
        style={{
          background: isParticipate ? '#7B1FA2' : 'rgba(255,255,255,0.10)',
          color: isParticipate ? '#FFFFFF' : brand.goldSoft,
          border: `1px solid ${isParticipate ? '#CE93D8' : brand.goldSoft}`,
          borderRadius: 999,
          padding: '2px 10px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        {isParticipate ? <MessagesSquare size={11} strokeWidth={2.4} /> : <Headphones size={11} strokeWidth={2.4} />}
        {isParticipate ? 'Participate' : 'Listen'}
      </button>
      <span style={{ fontSize: 13, color: brand.goldSoft, letterSpacing: '0.06em' }}>
        Nora · {statusLabel}
      </span>
    </div>
  );
}

function SpeedSelector() {
  const { state, set } = useDemo();
  const current = state.speechifySpeed || '1.6';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <Volume2 size={13} strokeWidth={2.4} color={brand.goldSoft} />
      {SPEEDS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => set('speechifySpeed', s)}
          style={{
            background: current === s ? brand.gold : 'transparent',
            color: current === s ? brand.navy : brand.goldSoft,
            border: `1px solid ${current === s ? brand.gold : 'rgba(255,204,51,0.22)'}`,
            borderRadius: 6,
            padding: '2px 6px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            minWidth: 32
          }}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}

// ============================================================
// APEX NOW indicator (H2) — leftmost in Row 1
// v4 §B3: drop gold border + gold halo. Red bg + white text + pulse only.
// ============================================================
function ApexNowIndicator() {
  const { set } = useDemo();
  const { morningBrief } = useLiveData();
  const apex = morningBrief?.apex;
  // No live apex → render nothing rather than a stale mock.
  if (!apex) return null;

  const tierLabel = apex.tier && TIER[apex.tier] ? TIER[apex.tier].label : 'NOW';
  const label = apex.title || '';
  const sub = (apex.body || '').slice(0, 48);
  return (
    <button
      type="button"
      onClick={() => {
        // Route the apex item to Nora (prefill, not auto-send) so the card is a
        // real action, not a dead button. NoraChat listens for `nora:prefill`.
        const q = `What's the latest on "${label || sub || 'the apex item'}", and what's my next move?`;
        try { window.dispatchEvent(new CustomEvent('nora:prefill', { detail: q })); } catch { /* SSR / no window */ }
        set('noraFocus', (Date.now()));
      }}
      title="Ask Nora about this — prefills the chat (does not auto-send)"
      style={{
        background: '#DC2626',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 8,
        padding: '5px 12px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        lineHeight: 1.05,
        flexShrink: 0
      }}
      className="meeting-pulse"
    >
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.92 }}>
        APEX NOW · {tierLabel}
      </span>
      <span style={{ fontSize: 19, fontWeight: 800 }}>{label}</span>
      {sub && <span style={{ fontSize: 13, opacity: 0.82 }}>{sub}</span>}
    </button>
  );
}

// ============================================================
// SHARED PRIMITIVES
// ============================================================
function pillBtn({ bg, fg, border }) {
  return {
    background: bg,
    color: fg,
    border: border ? `1px solid ${border}` : '1px solid transparent',
    borderRadius: 999,
    padding: '5px 11px',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0
  };
}

function ClusterDivider() {
  return <div style={{ width: 1, height: 30, background: 'rgba(255,204,51,0.22)', flexShrink: 0 }} />;
}

function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
      <span style={{ fontFamily: "'Cinzel', serif", color: brand.gold, fontSize: 19, fontWeight: 700, letterSpacing: '0.18em' }}>
        TERMINAL
      </span>
      <span style={{ fontFamily: "'Cinzel', serif", color: brand.goldSoft, fontSize: 14, letterSpacing: '0.18em' }}>
        by RePrime
      </span>
    </div>
  );
}

// EN / עב language toggle — flips the cockpit chrome language (persisted) and
// sets <html lang>. Text-only (the kiosk layout stays LTR; Hebrew message
// bodies already render RTL per-element).
function LangToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
      {[{ k: 'en', label: 'EN' }, { k: 'he', label: 'עב' }].map((o) => (
        <button
          key={o.k}
          type="button"
          onClick={() => setLocale(o.k)}
          title={o.k === 'he' ? 'עברית' : 'English'}
          style={{
            background: locale === o.k ? brand.gold : 'transparent',
            color: locale === o.k ? brand.navy : brand.goldSoft,
            border: `1px solid ${locale === o.k ? brand.gold : 'rgba(255,204,51,0.22)'}`,
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'inherit',
            minWidth: 30,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ConciergeCluster() {
  const { state, set } = useDemo();
  const { t } = useLocale();
  const handle = (k) => {
    if (k === 'Search')     { set('searchOpen', !state.searchOpen); return; }
    if (k === 'Email')      { set('emailComposeOpen', true); return; }
    if (k === 'Invite')     { set('inviteComposerOpen', true); return; }
    if (k === 'Note')       { set('pttState', 'note'); return; }
    if (k === 'Briefing')   { set('briefingOpen', true); return; }
  };
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {CONCIERGE.map((c) => (
        <button key={c.k} type="button" onClick={() => handle(c.k)} style={pillBtn({ bg: c.color, fg: '#FFFFFF' })} title={t(c.k)}>
          <c.icon size={11} strokeWidth={2.4} />
          {t(c.k)}
        </button>
      ))}
    </div>
  );
}

// Approx local Shabbat window: candle-lighting ~Friday 18:00, ends ~Saturday 19:30.
const SHABBAT_START_HOUR = 18; // Friday candle-lighting (local, approx)
const SHABBAT_END_HOUR = 19;
const SHABBAT_END_MIN = 30; // Saturday ~19:30 local
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * Compute the Shabbat countdown label from a real Date.
 * Returns 'שבת now' during the Fri 18:00 → Sat 19:30 window, else
 * 'שבת in Nd' (>1 day out) or 'שבת in Nh' (<24h out). All local time.
 * @param {Date} now
 * @returns {string}
 */
function shabbatLabel(now) {
  // Upcoming Friday 18:00 local. getDay(): Sun=0 … Fri=5, Sat=6.
  const day = now.getDay();
  const start = new Date(now);
  start.setHours(SHABBAT_START_HOUR, 0, 0, 0);
  // Days until Friday (5). If today is Fri and already past 18:00, this Friday
  // is the active window — handled by the "now" branch below, not advanced.
  let daysToFri = (5 - day + 7) % 7;
  start.setDate(start.getDate() + daysToFri);

  // Shabbat ends Saturday ~19:30 — one day after candle-lighting.
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(SHABBAT_END_HOUR, SHABBAT_END_MIN, 0, 0);

  // If we're inside the current window (Fri 18:00 → Sat 19:30), say "now".
  // The start computed above could be a future Friday when we're mid-window,
  // so check the window anchored to the most recent Friday too.
  const windowStart = new Date(start);
  if (daysToFri !== 0) {
    // Most recent Friday 18:00 (could be earlier this week)
    windowStart.setDate(windowStart.getDate() - 7);
  }
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 1);
  windowEnd.setHours(SHABBAT_END_HOUR, SHABBAT_END_MIN, 0, 0);

  if (now >= windowStart && now <= windowEnd) return 'שבת now';
  if (now >= start && now <= end) return 'שבת now';

  const ms = start.getTime() - now.getTime();
  if (ms <= 0) return 'שבת now';
  if (ms < MS_PER_DAY) {
    const hours = Math.max(1, Math.round(ms / MS_PER_HOUR));
    return `שבת in ${hours}h`;
  }
  const days = Math.round(ms / MS_PER_DAY);
  return `שבת in ${days}d`;
}

/**
 * Compute the Shabbat/Yom Tov countdown label from REAL candle-lighting and
 * havdalah ISO timestamps (from /api/religious-calendar → Hebcal, Postville IA).
 * Returns 'שבת now' inside the window, else 'שבת in Nd' / 'שבת in Nh' / 'שבת in Nm'.
 * @param {Date} now
 * @param {{candleLighting: string|null, havdalah: string|null, isRestNow: boolean}} z
 * @returns {string}
 */
function shabbatLabelFromZmanim(now, z) {
  if (z.isRestNow) return 'שבת now';
  if (!z.candleLighting) return shabbatLabel(now); // no data → heuristic
  const ms = new Date(z.candleLighting).getTime() - now.getTime();
  if (Number.isNaN(ms)) return shabbatLabel(now);
  if (ms <= 0) return 'שבת now';
  if (ms < MS_PER_HOUR) {
    const mins = Math.max(1, Math.round(ms / 60000));
    return `שבת in ${mins}m`;
  }
  if (ms < MS_PER_DAY) {
    const hours = Math.max(1, Math.round(ms / MS_PER_HOUR));
    return `שבת in ${hours}h`;
  }
  const days = Math.round(ms / MS_PER_DAY);
  return `שבת in ${days}d`;
}

// Lean clock + Shabbat countdown — replaces the old StatusCluster noise
// (DailyMomentum meter, PWA pill, and fake all-green service dot-row removed).
// Live: ticks every second off the real local clock. The Shabbat pill now uses
// REAL candle-lighting/havdalah from /api/religious-calendar (Hebcal, Postville
// IA), falling back to the local heuristic if the fetch fails. The component
// mounts in a client tree ('use client' upstream), so the interval is safe.
function ClockShabbat() {
  const [now, setNow] = useState(() => new Date());
  const [zmanim, setZmanim] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch real zmanim on mount + hourly refresh (times only change daily).
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/religious-calendar', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!cancelled && d) setZmanim(d); })
        .catch(() => { /* keep heuristic fallback */ });
    };
    load();
    const id = setInterval(load, 60 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  // Build "Mon · May 11" with the cockpit's middot separator (en-US locale
  // would render "Mon, May 11" — we want the existing dot style).
  const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const date = `${weekday} · ${monthDay}`;
  const shabbat = zmanim ? shabbatLabelFromZmanim(now, zmanim) : shabbatLabel(now);
  // Surface the real candle-lighting clock time on hover when we have it.
  const candleTime = zmanim?.candleLighting && !zmanim?.isRestNow
    ? new Date(zmanim.candleLighting).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;
  const shabbatTitle = zmanim?.live
    ? (zmanim.isRestNow
        ? `${zmanim.title || 'Shabbat'} — havdalah ${zmanim.havdalah ? new Date(zmanim.havdalah).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}`
        : `Candle-lighting ${candleTime || ''} · ${zmanim.location}`)
    : 'Approximate (zmanim offline)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ color: brand.gold, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>
          {time}
        </div>
        <div style={{ color: brand.goldSoft, fontSize: 9 }}>{date}</div>
      </div>
      <span title={shabbatTitle} style={{ ...pillBtn({ bg: 'rgba(102,187,106,0.18)', fg: '#A5D6A7' }), padding: '3px 9px' }}>
        {shabbat}
      </span>
    </div>
  );
}
