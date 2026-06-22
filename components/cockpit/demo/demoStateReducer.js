// Demo state machine — every interactive state from the v5.0 constitution
// reachable via the floating Demo States Panel. Surfaces read via DemoContext.
// Doc A Section 0.5 — artifact-only construct. Does NOT carry to Phase 5.

export const initialDemoState = {
  // COMMS
  commsState: 'default',           // 'default' | 'open-with-nora-block' | 'open-without-nora-block'
  channelLockWarning: null,        // null | 1 | 2 | 3

  // CALENDAR
  calendarMode: 'normal',          // 'normal' | 'heavy-cal' | 'heavy-rem' | 'shabbat-pre-shutdown'
  conflictIntervention: false,
  meetingNow: null,                // null | 30 | 15 | 5 | 'at-start'

  // DEALS
  dealView: 'grid',                // 'grid' | 'expanded' | 'loi-outstanding'

  // TASKS
  taskView: 'bucket',              // 'bucket' | 'delegated' | 'on-assignment' | 'completion'

  // INVESTORS
  investorState: 'grid',           // 'grid' | 'profile-conversation' | 'profile-research' | 'profile-details' | 'window-promoted'

  // SEARCH / MEMORY
  searchOpen: false,

  // DOCUMENTS
  documentState: 'browser',        // 'browser' | 'filing' | 'filed'

  // EMAIL
  emailMix: 'three-tier',          // 'three-tier' | 'compose'

  // PHONE
  phoneState: 'idle',              // 'idle' | 'caller-id-t1' | 'quick-call' | 'quick-call-dtmf' | 'quick-call-conference'

  // VOICE / PTT
  pttState: 'idle',                // 'idle' | 'active' | 'note' | 'mission'
  noraFocus: 0,                    // monotonically-rising; bump to focus Nora chat input

  // MEETING
  meetingState: null,              // null | 'zoom-with-susan' | 'conflict' | 'post-summary'

  // BRAINSTORM
  brainstormState: null,           // null | 'decode' | 'mirror' | 'elevate' | 'reality-check' | 'execute'

  // AI LAUNCHER
  aiLauncherState: 'pillars',      // 'pillars' | 'window-open'

  // TOP BAR
  topBarState: 'standard',         // 'standard' | 'model-tier-gate' | 'doc-dump-filing' | 'mission-active'

  // WIDE-TABS
  wideTabState: null,              // null | 'notes-semi' | 'pinned-semi' | 'smart-rotation' | 'calendar-adaptive'
  activeWideTab: 'email',          // 'email' | 'delegated' | 'bucket' | 'deals' | 'investors' | 'notes' | 'pinned' | 'documents'

  // WINDOWS
  windowCount: 0,                  // 0..3
  pipVisible: false,

  // TAB MANAGER
  tabManagerOpen: false,

  // ALERTS / TOASTS
  toastStack: 'empty',             // 'empty' | 'single' | 'stacked' | 'mixed-with-mission' | 'system-detail'

  // PWA
  pwaPreviewOpen: false,

  // RELIGIOUS
  religiousCalendarOpen: false,

  // TASKBAR
  taskbarFill: 'empty'             // 'empty' | 'one' | 'twelve' | 'overflow'
};

export function demoStateReducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.key]: action.value };
    case 'TOGGLE':
      return { ...state, [action.key]: !state[action.key] };
    case 'RESET':
      return initialDemoState;
    default:
      return state;
  }
}
